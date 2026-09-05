import "edge-runtime";
import { createClient } from "supabase";
import { escapeHtml, timingSafeEqual } from "../_shared/security.ts";

// Tells a family what happened to their acollida request. Three moments, and
// the third is the one that made this function necessary: since places are
// given out in order of arrival and the queue moves on its own, somebody can
// go from the waiting list to having a place without anyone typing anything.
//
//   INSERT  + confirmada    -> "the place is yours"
//   INSERT  + llista_espera -> "you are in the queue"
//   UPDATE  llista_espera -> confirmada -> "a place freed up and it is yours"
//
// Triggered by DB webhooks on public.acollida_inscripcions. Only the row id and
// the kind of event are taken from the payload: recipients and contents are
// re-read from the database, otherwise this is an open mail relay.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ADMIN_EMAILS = (Deno.env.get("ADMIN_EMAILS") || "afa@falguera.org").split(",");
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

const WEEKDAY_LABELS: Record<string, string[]> = {
  ca: ["dilluns", "dimarts", "dimecres", "dijous", "divendres"],
  es: ["lunes", "martes", "miércoles", "jueves", "viernes"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
};

type Kind = "confirmed" | "waitlisted" | "promoted";

interface Copy {
  subject: string;
  icon: string;
  tint: string;
  title: string;
  subtitle: string;
  summaryTitle: string;
  childLabel: string;
  courseLabel: string;
  slotLabel: string;
  daysLabel: string;
  nextTitle: string;
  nextBody: string;
  footer: string;
  statusConfirmed: string;
  statusWaiting: string;
}

const COPY: Record<string, Record<Kind, Copy>> = {
  ca: {
    confirmed: {
      subject: "✅ Plaça d'acollida confirmada — AFA Falguera",
      icon: "✅", tint: "#ecfdf5",
      title: "Plaça confirmada",
      subtitle: "Hi havia lloc, així que la plaça ja és vostra.",
      summaryTitle: "Resum de la sol·licitud",
      childLabel: "Infant", courseLabel: "Curs", slotLabel: "Franja", daysLabel: "Dies",
      nextTitle: "🔔 I ara què?",
      nextBody: "No cal fer res més. Les places es donen per ordre d'arribada i la vostra ja està guardada. El rebut del mes venç el dia 10. Si heu de canviar la franja o els dies, o voleu donar-vos de baixa, responeu a aquest correu.",
      statusConfirmed: "Plaça confirmada", statusWaiting: "A la llista d'espera",
      footer: "Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA. Si no reconeixeu aquesta sol·licitud, responeu-hi.",
    },
    waitlisted: {
      subject: "⏳ Sou a la llista d'espera de l'acollida — AFA Falguera",
      icon: "⏳", tint: "#fffbeb",
      title: "Sou a la llista d'espera",
      subtitle: "Algun dels dies que heu demanat ja tenia les places plenes.",
      summaryTitle: "Resum de la sol·licitud",
      childLabel: "Infant", courseLabel: "Curs", slotLabel: "Franja", daysLabel: "Dies",
      nextTitle: "🔔 I ara què?",
      nextBody: "No cal que torneu a demanar-ho. La cua va per ordre d'arribada i avança sola: a la primera baixa hi entrareu i us arribarà un correu dient que la plaça és vostra.",
      statusConfirmed: "Plaça confirmada", statusWaiting: "A la llista d'espera",
      footer: "Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA. Si no reconeixeu aquesta sol·licitud, responeu-hi.",
    },
    promoted: {
      subject: "🎉 Ja teniu plaça a l'acollida — AFA Falguera",
      icon: "🎉", tint: "#eff6ff",
      title: "Ja teniu plaça",
      subtitle: "S'ha alliberat una plaça i us tocava per ordre d'arribada.",
      summaryTitle: "Resum de la plaça",
      childLabel: "Infant", courseLabel: "Curs", slotLabel: "Franja", daysLabel: "Dies",
      nextTitle: "🔔 I ara què?",
      nextBody: "Heu deixat la llista d'espera i la plaça ja està guardada. El rebut del mes venç el dia 10. Si ja no la necessiteu, responeu a aquest correu i l'alliberem per a la família següent.",
      statusConfirmed: "Plaça confirmada", statusWaiting: "A la llista d'espera",
      footer: "Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA. Si no reconeixeu aquesta sol·licitud, responeu-hi.",
    },
  },
  es: {
    confirmed: {
      subject: "✅ Plaza de acollida confirmada — AFA Falguera",
      icon: "✅", tint: "#ecfdf5",
      title: "Plaza confirmada",
      subtitle: "Había sitio, así que la plaza ya es vuestra.",
      summaryTitle: "Resumen de la solicitud",
      childLabel: "Niño/a", courseLabel: "Curso", slotLabel: "Franja", daysLabel: "Días",
      nextTitle: "🔔 ¿Y ahora qué?",
      nextBody: "No hay que hacer nada más. Las plazas se dan por orden de llegada y la vuestra ya está guardada. El recibo del mes vence el día 10. Si tenéis que cambiar la franja o los días, o queréis dar de baja, responded a este correo.",
      statusConfirmed: "Plaza confirmada", statusWaiting: "En lista de espera",
      footer: "Este correo se ha enviado automáticamente desde el sistema de gestión del AFA. Si no reconocéis esta solicitud, respondedlo.",
    },
    waitlisted: {
      subject: "⏳ Estáis en lista de espera de la acollida — AFA Falguera",
      icon: "⏳", tint: "#fffbeb",
      title: "Estáis en lista de espera",
      subtitle: "Alguno de los días que habéis pedido ya tenía las plazas llenas.",
      summaryTitle: "Resumen de la solicitud",
      childLabel: "Niño/a", courseLabel: "Curso", slotLabel: "Franja", daysLabel: "Días",
      nextTitle: "🔔 ¿Y ahora qué?",
      nextBody: "No hace falta que lo volváis a pedir. La cola va por orden de llegada y avanza sola: a la primera baja entraréis y os llegará un correo diciendo que la plaza es vuestra.",
      statusConfirmed: "Plaza confirmada", statusWaiting: "En lista de espera",
      footer: "Este correo se ha enviado automáticamente desde el sistema de gestión del AFA. Si no reconocéis esta solicitud, respondedlo.",
    },
    promoted: {
      subject: "🎉 Ya tenéis plaza en la acollida — AFA Falguera",
      icon: "🎉", tint: "#eff6ff",
      title: "Ya tenéis plaza",
      subtitle: "Se ha liberado una plaza y os tocaba por orden de llegada.",
      summaryTitle: "Resumen de la plaza",
      childLabel: "Niño/a", courseLabel: "Curso", slotLabel: "Franja", daysLabel: "Días",
      nextTitle: "🔔 ¿Y ahora qué?",
      nextBody: "Habéis dejado la lista de espera y la plaza ya está guardada. El recibo del mes vence el día 10. Si ya no la necesitáis, responded a este correo y la liberamos para la siguiente familia.",
      statusConfirmed: "Plaza confirmada", statusWaiting: "En lista de espera",
      footer: "Este correo se ha enviado automáticamente desde el sistema de gestión del AFA. Si no reconocéis esta solicitud, respondedlo.",
    },
  },
  en: {
    confirmed: {
      subject: "✅ Acollida place confirmed — AFA Falguera",
      icon: "✅", tint: "#ecfdf5",
      title: "Place confirmed",
      subtitle: "There was room, so the place is already yours.",
      summaryTitle: "Request summary",
      childLabel: "Child", courseLabel: "Grade", slotLabel: "Time slot", daysLabel: "Days",
      nextTitle: "🔔 What happens now?",
      nextBody: "Nothing else to do. Places go in order of arrival and yours is held. The monthly invoice is due on the 10th. To change the slot or the days, or to cancel, just reply to this email.",
      statusConfirmed: "Place confirmed", statusWaiting: "On the waiting list",
      footer: "This email was sent automatically by the AFA management system. If you do not recognise this request, reply to it.",
    },
    waitlisted: {
      subject: "⏳ You are on the acollida waiting list — AFA Falguera",
      icon: "⏳", tint: "#fffbeb",
      title: "You are on the waiting list",
      subtitle: "Some of the days you asked for were already full.",
      summaryTitle: "Request summary",
      childLabel: "Child", courseLabel: "Grade", slotLabel: "Time slot", daysLabel: "Days",
      nextTitle: "🔔 What happens now?",
      nextBody: "No need to ask again. The queue runs in order of arrival and moves on its own: at the first cancellation you move up and we email you to say the place is yours.",
      statusConfirmed: "Place confirmed", statusWaiting: "On the waiting list",
      footer: "This email was sent automatically by the AFA management system. If you do not recognise this request, reply to it.",
    },
    promoted: {
      subject: "🎉 You have an acollida place — AFA Falguera",
      icon: "🎉", tint: "#eff6ff",
      title: "You have a place",
      subtitle: "A place freed up and it was your turn in the queue.",
      summaryTitle: "Place summary",
      childLabel: "Child", courseLabel: "Grade", slotLabel: "Time slot", daysLabel: "Days",
      nextTitle: "🔔 What happens now?",
      nextBody: "You have left the waiting list and the place is held. The monthly invoice is due on the 10th. If you no longer need it, reply to this email and we will free it for the next family.",
      statusConfirmed: "Place confirmed", statusWaiting: "On the waiting list",
      footer: "This email was sent automatically by the AFA management system. If you do not recognise this request, reply to it.",
    },
  },
};

interface Row {
  id: string;
  created_at: string;
  child_name: string;
  child_surname: string;
  course: string;
  modality: string;
  weekdays: number[];
  occasional_dates: string[];
  parent_email: string;
  status: string;
  form_language: string;
  rate_id: string;
}

const describeDays = (row: Row, lang: string): string => {
  if (row.modality === "mensual") {
    const names = WEEKDAY_LABELS[lang] || WEEKDAY_LABELS.ca;
    return row.weekdays.map((d) => names[d - 1]).filter(Boolean).join(", ") || "-";
  }
  return row.occasional_dates.join(", ") || "-";
};

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
    const rowId = payload?.record?.id;
    if (!rowId) throw new Error("No record id found in payload");

    const wasWaiting = payload?.type === "UPDATE" && payload?.old_record?.status === "llista_espera";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // The row may not be visible yet to a fresh connection when the trigger fires.
    let row: Row | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data } = await supabase.from("acollida_inscripcions").select("*").eq("id", rowId).single();
      if (data) {
        row = data as Row;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!row) throw new Error("Acollida request not found");

    let kind: Kind = wasWaiting ? "promoted" : row.status === "llista_espera" ? "waitlisted" : "confirmed";

    // Nothing to say about a request that is neither placed nor queueing.
    if (!wasWaiting && row.status !== "confirmada" && row.status !== "llista_espera") {
      return new Response(JSON.stringify({ skipped: "status not notifiable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!row.parent_email.includes("@")) {
      return new Response(JSON.stringify({ skipped: "no parent email" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Siblings go in as one INSERT, one row per child, so this webhook fires
    // once per child. Three emails for one family reads as a broken system:
    // the first row of the batch sends a single email covering all of them,
    // and the rest keep quiet.
    let siblings: Row[] = [row];
    if (kind !== "promoted") {
      const from = new Date(new Date(row.created_at).getTime() - 5000).toISOString();
      const to = new Date(new Date(row.created_at).getTime() + 5000).toISOString();
      const { data } = await supabase
        .from("acollida_inscripcions")
        .select("*")
        .eq("parent_email", row.parent_email)
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at")
        .order("id");

      if (data && data.length > 1) {
        siblings = data as Row[];

        // Two brothers can land differently — same family, different slots, and
        // one of the two days already full. One email for the family must then
        // say the cautious thing, or the one left queueing goes unmentioned.
        if (kind === "confirmed" && siblings.some((s) => s.status === "llista_espera")) {
          kind = "waitlisted";
        }

        if (siblings[0].id !== row.id) {
          return new Response(JSON.stringify({ skipped: "sibling batch handled by first row" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    const lang = ["ca", "es", "en"].includes(row.form_language) ? row.form_language : "ca";
    const t = COPY[lang][kind];

    // Only worth labelling each child when they did not all land the same way.
    const mixed = siblings.length > 1 && new Set(siblings.map((s) => s.status)).size > 1;

    const { data: rates } = await supabase.from("acollida_rates").select("id, horari");
    const slotById = new Map((rates || []).map((r: { id: string; horari: string }) => [r.id, r.horari]));

    const childrenHtml = siblings.map((child) => `
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:16px;margin-bottom:12px;">
          <p style="margin:0;color:#0f172a;font-size:16px;font-weight:700;">${escapeHtml(`${child.child_name} ${child.child_surname}`.trim())}</p>
          <p style="margin:4px 0 8px 0;color:#64748b;font-size:13px;">${t.courseLabel}: <strong style="color:#334155;">${escapeHtml(COURSE_LABELS[child.course] || child.course)}</strong></p>
          <p style="margin:0 0 4px 0;color:#64748b;font-size:13px;">${t.slotLabel}: <strong style="color:#334155;">${escapeHtml(slotById.get(child.rate_id) || "-")}</strong></p>
          <p style="margin:0;color:#64748b;font-size:13px;">${t.daysLabel}: <strong style="color:#334155;">${escapeHtml(describeDays(child, lang))}</strong></p>
          ${mixed ? `<p style="margin:8px 0 0 0;font-size:13px;font-weight:700;color:${child.status === "llista_espera" ? "#b45309" : "#15803d"};">${child.status === "llista_espera" ? t.statusWaiting : t.statusConfirmed}</p>` : ""}
        </div>`).join("");

    const replyTo = ADMIN_EMAILS[0]?.trim() || "afa@falguera.org";
    const adminBcc = ADMIN_EMAILS.map((e) => e.trim()).filter((e) => e.includes("@"));

    const emailPayload = {
      from: `AFA Falguera <${FROM_EMAIL}>`,
      to: [row.parent_email],
      ...(adminBcc.length ? { bcc: adminBcc } : {}),
      reply_to: replyTo,
      subject: t.subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background-color: ${t.tint}; border-radius: 12px; margin-bottom: 16px;">
              <span style="font-size: 32px;">${t.icon}</span>
            </div>
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">${t.title}</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">${t.subtitle}</p>
          </div>

          <h2 style="color:#0f172a;font-size:15px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px 0;">${t.summaryTitle}</h2>
          ${childrenHtml}

          <div style="background-color:#f1f5f9;border-radius:12px;padding:16px;margin-top:8px;">
            <p style="margin:0 0 6px 0;color:#0f172a;font-size:14px;font-weight:700;">${t.nextTitle}</p>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">${t.nextBody}</p>
          </div>

          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0 0;line-height:1.5;">${t.footer}</p>
        </div>`,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Resend error: ${detail}`);
    }

    return new Response(JSON.stringify({ sent: kind, children: siblings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("send-acollida-email failed:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
