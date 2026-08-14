// Aviso de que la web ha dejado de usarse.
//
// POR QUÉ EXISTE
// "El servidor contesta" y "la gente puede trabajar" son cosas distintas, y la
// primera no detecta el fallo de la segunda. Esta función no mira si la web
// responde: mira si alguien la está usando. Si durante cinco días laborables no
// entra ni una inscripción, ni un pedido, ni un mensaje de contacto, ni un
// formulario, y además nadie de la junta ha tocado nada en el panel, algo pasa
// — y puede llevar semanas pasando con todos los semáforos en verde.
//
// usage-alert es otra cosa: vigila la cuota del plan gratuito de Supabase.
//
// Se invoca desde pg_cron todas las mañanas. La autorización es el secreto
// compartido x-alert-secret (verify_jwt = false en config.toml), igual que el
// resto de funciones que abre alguien que no es el panel.

import "edge-runtime";
import { createClient } from "supabase";
import { timingSafeEqual } from "../_shared/security.ts";
import { decidirAviso } from "../_shared/businessDays.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ALERT_EMAILS = (Deno.env.get("NOTIFICATION_EMAILS") || "afafalguera@gmail.com").split(",");
const ALERT_SECRET = Deno.env.get("USAGE_ALERT_SECRET") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/** Días laborables seguidos sin ninguna señal antes de avisar. Decisión de la junta, 2026-08-14. */
const UMBRAL_LABORABLES = 5;
/** Días naturales de silencio entre dos avisos del mismo parón. */
const SILENCIO_DIAS = 7;
/** Clave de la fila que recuerda cuándo se avisó por última vez. */
const ESTADO = "activity-alert";

const NOMBRES: Record<string, string> = {
  inscripcions: "inscripcions noves",
  shop_orders: "comandes de la botiga",
  contact_messages: "missatges de contacte",
  form_submissions: "formularis enviats",
  audit_logs: "canvis al panell",
  admin_tasks: "tasques de la junta",
  news: "notícies publicades",
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (!ALERT_SECRET) {
      console.error("USAGE_ALERT_SECRET is not configured");
      return jsonResponse({ error: "Function not configured" }, 500);
    }
    if (!timingSafeEqual(req.headers.get("x-alert-secret") || "", ALERT_SECRET)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
    }

    // ?test=true fuerza el camino del correo con datos de mentira, para poder
    // comprobar que el aviso llega sin esperar a que haya un parón de verdad.
    const isTest = new URL(req.url).searchParams.get("test") === "true";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: fuentes, error } = await supabase.rpc("get_last_activity");
    if (error) {
      console.error("get_last_activity failed:", error.message);
      return jsonResponse({ error: error.message }, 500);
    }

    const filas = (fuentes ?? []) as Array<{ fuente: string; ultimo: string | null }>;
    const conFecha = filas.filter(f => f.ultimo);

    const ahora = new Date();
    const ultimaActividad = isTest
      ? new Date(ahora.getTime() - 12 * 24 * 60 * 60 * 1000)
      : conFecha.length > 0
        ? new Date(Math.max(...conFecha.map(f => new Date(f.ultimo as string).getTime())))
        : null;

    const { data: estado } = await supabase
      .from("alert_state")
      .select("last_sent_at")
      .eq("name", ESTADO)
      .maybeSingle();

    const decision = decidirAviso({
      ahora,
      ultimaActividad,
      ultimoAviso: isTest ? null : estado?.last_sent_at ? new Date(estado.last_sent_at) : null,
      umbralLaborables: UMBRAL_LABORABLES,
      silencioDias: SILENCIO_DIAS,
    });

    if (!decision.avisar) {
      console.log(
        `Activity OK — ${decision.motivo}, ${decision.laborablesSinActividad} laborables sin señal ` +
          `(última: ${ultimaActividad?.toISOString() ?? "ninguna"})`,
      );
      return jsonResponse({ ok: true, ...decision }, 200);
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured; cannot send activity alert");
      return jsonResponse({ error: "Missing RESEND_API_KEY", ...decision }, 500);
    }

    const detalle = filas
      .map(f => {
        const nombre = NOMBRES[f.fuente] ?? f.fuente;
        if (!f.ultimo) return `<li>${nombre}: <em>mai</em></li>`;
        const dies = Math.floor((ahora.getTime() - new Date(f.ultimo).getTime()) / 86_400_000);
        return `<li>${nombre}: fa ${dies} dies</li>`;
      })
      .join("");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AFA Web Sistema <${FROM_EMAIL}>`,
        to: ALERT_EMAILS,
        subject: `La web porta ${decision.laborablesSinActividad} dies laborables sense activitat`,
        // El texto empieza diciendo que NO es una caída, y ofrece primero la
        // causa más probable, que casi siempre es humana. Un aviso que parece
        // una alarma de sistema acaba en la carpeta de ignorados.
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #cbd5e1; border-radius: 16px; background: #f8fafc;">
          <h2 style="color: #0f172a; margin-top: 0;">La web funciona, però ningú l'està fent servir</h2>
          <p style="color: #334155;"><strong>Això no és una caiguda.</strong> La web respon; el que passa és que
          fa <strong>${decision.laborablesSinActividad} dies laborables</strong> que no hi entra cap senyal de vida.</p>
          <p style="color: #334155;">Causes, de més a menys probable:</p>
          <ol style="color: #334155; line-height: 1.9;">
            <li><strong>És normal:</strong> vacances, pont o període sense campanya d'inscripcions.</li>
            <li><strong>Ningú ha avisat:</strong> el servei ha tornat i no s'ha comunicat a les famílies.</li>
            <li><strong>Alguna cosa està trencada de cara enfora:</strong> el formulari no envia, els correus no arriben
            o la botiga peta. Comprova-ho des d'un mòbil, sense sessió iniciada.</li>
          </ol>
          <p style="color: #334155; margin-bottom: 4px;">Última senyal de cada font:</p>
          <ul style="color: #475569; font-size: 14px; line-height: 1.8;">${detalle}</ul>
          <p style="color: #64748b; font-size: 13px;">No es tornarà a avisar fins d'aquí a ${SILENCIO_DIAS} dies encara que el silenci continuï.</p>
        </div>
      `,
      }),
    });

    const emailResult = await res.json();
    console.log("Activity alert email status:", res.status, "id:", emailResult?.id ?? "none");

    if (!isTest) {
      await supabase
        .from("alert_state")
        .upsert({ name: ESTADO, last_sent_at: ahora.toISOString() }, { onConflict: "name" });
    }

    return jsonResponse({ alerted: true, ...decision }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Critical Error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
