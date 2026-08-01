import "edge-runtime";
import { createClient } from "supabase";
import { escapeHtml, timingSafeEqual } from "../_shared/security.ts";

// Sends a "we received your enrolment" confirmation to the parent's email
// right after an inscription row is inserted. Triggered by a DB webhook on
// public.inscripcions (INSERT) — payload shape is { type, table, record, ... }.
// Only record.id is trusted from that payload: recipients and contents are
// re-read from the database, otherwise this is an open mail relay.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "afafalguera@gmail.com").split(",");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://afafalguera.com,https://www.afafalguera.com").split(",");

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  };
}

const COURSE_LABELS: Record<string, string> = {
  I3: "I3", I4: "I4", I5: "I5",
  "1PRI": "1r Primària", "2PRI": "2n Primària", "3PRI": "3r Primària",
  "4PRI": "4t Primària", "5PRI": "5è Primària", "6PRI": "6è Primària",
};

const getTranslations = (lang: string) => {
  const translations: Record<string, Record<string, string>> = {
    es: {
      subject: "✅ Inscripción recibida — AFA Falguera",
      title: "¡Inscripción recibida!",
      subtitle: "Hemos recibido correctamente tu preinscripción a las extraescolares.",
      summaryTitle: "Resumen de la inscripción",
      studentLabel: "Alumno/a",
      courseLabel: "Curso",
      schoolLabel: "Escuela",
      activitiesLabel: "Actividades",
      nextTitle: "🔔 ¿Y ahora qué?",
      nextBody: "Tu plaza queda pendiente de confirmación. Para formalizar la inscripción recuerda hacer el pago por transferencia según las instrucciones de la web. Nos pondremos en contacto contigo si necesitamos algún dato más.",
      footer: "Este correo se ha enviado automáticamente desde el sistema de gestión del AFA. Si no reconoces esta inscripción, responde a este correo.",
    },
    ca: {
      subject: "✅ Inscripció rebuda — AFA Falguera",
      title: "Inscripció rebuda!",
      subtitle: "Hem rebut correctament la teva preinscripció a les extraescolars.",
      summaryTitle: "Resum de la inscripció",
      studentLabel: "Alumne/a",
      courseLabel: "Curs",
      schoolLabel: "Escola",
      activitiesLabel: "Activitats",
      nextTitle: "🔔 I ara què?",
      nextBody: "La teva plaça queda pendent de confirmació. Per formalitzar la inscripció recorda fer el pagament per transferència segons les instruccions del web. Ens posarem en contacte amb tu si necessitem alguna dada més.",
      footer: "Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA. Si no reconeixes aquesta inscripció, respon a aquest correu.",
    },
    en: {
      subject: "✅ Enrolment received — AFA Falguera",
      title: "Enrolment received!",
      subtitle: "We have successfully received your after-school enrolment request.",
      summaryTitle: "Enrolment summary",
      studentLabel: "Student",
      courseLabel: "Grade",
      schoolLabel: "School",
      activitiesLabel: "Activities",
      nextTitle: "🔔 What's next?",
      nextBody: "Your place is pending confirmation. To complete the enrolment, remember to pay by bank transfer following the instructions on the website. We will contact you if we need any further details.",
      footer: "This email was sent automatically from the AFA management system. If you do not recognise this enrolment, please reply to this email.",
    },
  };
  return translations[lang] || translations["ca"];
};

interface Student {
  name?: string;
  surname?: string;
  course?: string;
  activities?: string[];
  is_falguera?: boolean;
  external_school?: string | null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!WEBHOOK_SECRET) {
      console.error("WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Function not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!timingSafeEqual(req.headers.get("x-webhook-secret") || "", WEBHOOK_SECRET)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
    if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Missing Supabase environment variables");

    const payload = await req.json();
    const inscriptionId = payload?.record?.id;
    if (!inscriptionId) throw new Error("No record id found in payload");

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // The row may not be visible yet to a fresh connection when the trigger fires.
    let record: Record<string, unknown> | null = null;
    let fetchError: { message: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from("inscripcions")
        .select("*")
        .eq("id", inscriptionId)
        .single();

      if (data) {
        record = data;
        break;
      }
      fetchError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!record) {
      throw new Error(`Error fetching inscription: ${fetchError?.message || "Not found"}`);
    }

    const parentEmail = String(record.parent_email_1 || "");
    if (!parentEmail.includes("@")) {
      // Nothing to send to — succeed quietly so the webhook doesn't retry.
      return new Response(JSON.stringify({ skipped: "no parent email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const t = getTranslations(String(record.form_language || "ca"));
    const students: Student[] = Array.isArray(record.students) ? record.students : [];

    const studentsHtml = students.map((s) => {
      const fullName = escapeHtml([s.name, s.surname].filter(Boolean).join(" ") || "-");
      const course = escapeHtml(s.course ? (COURSE_LABELS[s.course] || s.course) : "-");
      const schoolLine = s.is_falguera === false
        ? `<p style="margin:0 0 8px 0;color:#64748b;font-size:13px;">${t.schoolLabel}: <strong style="color:#334155;">${escapeHtml(s.external_school || "-")}</strong></p>`
        : "";
      const acts = (s.activities && s.activities.length)
        ? s.activities.map((a) => `<li style="margin: 2px 0;">${escapeHtml(a)}</li>`).join("")
        : `<li style="margin: 2px 0; color:#94a3b8;">-</li>`;
      return `
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:16px;margin-bottom:12px;">
          <p style="margin:0;color:#0f172a;font-size:16px;font-weight:700;">${fullName}</p>
          <p style="margin:4px 0 8px 0;color:#64748b;font-size:13px;">${t.courseLabel}: <strong style="color:#334155;">${course}</strong></p>
          ${schoolLine}
          <p style="margin:0 0 4px 0;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">${t.activitiesLabel}</p>
          <ul style="margin:0;padding-left:18px;color:#1e293b;font-size:14px;">${acts}</ul>
        </div>`;
    }).join("");

    const recipients = [parentEmail];
    const parentEmail2 = String(record.parent_email_2 || "");
    if (parentEmail2.includes("@")) {
      recipients.push(parentEmail2);
    }
    const replyTo = ADMIN_EMAILS[0] || "afafalguera@gmail.com";

    const emailPayload = {
      from: `AFA Falguera <${FROM_EMAIL}>`,
      to: recipients,
      reply_to: replyTo,
      subject: t.subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background-color: #ecfdf5; border-radius: 12px; margin-bottom: 16px;">
              <span style="font-size: 32px;">✅</span>
            </div>
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">${t.title}</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">${t.subtitle}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${t.summaryTitle}</h3>
            ${studentsHtml || `<p style="color:#94a3b8;font-style:italic;">-</p>`}
          </div>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 16px; font-weight: 800;">${t.nextTitle}</p>
            <p style="margin: 0; color: #15803d; font-size: 15px; line-height: 1.5;">${t.nextBody}</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">${t.footer}</p>
        </div>
      `,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();
    console.log("Resend status:", res.status, "id:", data?.id ?? "none");

    return new Response(JSON.stringify({ ok: res.ok, id: data?.id ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Critical Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
