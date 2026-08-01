import "edge-runtime";
import { createClient } from "supabase";
import { timingSafeEqual } from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ALERT_EMAILS = (Deno.env.get("NOTIFICATION_EMAILS") || "afafalguera@gmail.com").split(",");
const ALERT_SECRET = Deno.env.get("USAGE_ALERT_SECRET") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Free tier limits (bytes)
const DB_LIMIT_BYTES    = 500 * 1024 * 1024;   // 500 MB
const STORE_LIMIT_BYTES = 1024 * 1024 * 1024;  // 1 GB
const WARN_THRESHOLD    = 0.50;                 // alert at 50%

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  try {
    // The shared secret is always required — pg_cron sets it on every call.
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

    // Simulates near-limit usage so the alert path can be exercised on demand.
    const isTest = new URL(req.url).searchParams.get("test") === "true";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: dbData } = await supabase.rpc("get_db_size_bytes");
    const dbBytes: number = isTest ? 420 * 1024 * 1024 : (dbData ?? 0);

    // Storage size goes through a SQL helper (REST can't access the storage schema).
    const { data: storData } = await supabase.rpc("get_storage_size_bytes");
    const storageBytes: number = isTest ? 820 * 1024 * 1024 : (storData ?? 0);

    const alerts: string[] = [];

    if (dbBytes > DB_LIMIT_BYTES * WARN_THRESHOLD) {
      const pct = ((dbBytes / DB_LIMIT_BYTES) * 100).toFixed(1);
      alerts.push(`🗄️ <strong>Base de datos:</strong> ${formatBytes(dbBytes)} / 500 MB (${pct}%)`);
    }
    if (storageBytes > STORE_LIMIT_BYTES * WARN_THRESHOLD) {
      const pct = ((storageBytes / STORE_LIMIT_BYTES) * 100).toFixed(1);
      alerts.push(`📦 <strong>Storage:</strong> ${formatBytes(storageBytes)} / 1 GB (${pct}%)`);
    }

    if (alerts.length === 0) {
      console.log(`Usage OK — DB: ${formatBytes(dbBytes)}, Storage: ${formatBytes(storageBytes)}`);
      return jsonResponse({ ok: true, dbBytes, storageBytes }, 200);
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured; cannot send usage alert");
      return jsonResponse({ error: "Missing RESEND_API_KEY", alerts }, 500);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AFA Web Sistema <${FROM_EMAIL}>`,
        to: ALERT_EMAILS,
        subject: `⚠️ Alerta: Supabase s'acosta al límit gratuït`,
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fbbf24; border-radius: 16px; background: #fffbeb;">
          <h2 style="color: #92400e; margin-top: 0;">⚠️ Alerta d'ús de Supabase</h2>
          <p style="color: #78350f;">Un o més recursos del pla gratuït han superat el <strong>50% del límit</strong>:</p>
          <ul style="color: #451a03; font-size: 15px; line-height: 2;">
            ${alerts.map(a => `<li>${a}</li>`).join("")}
          </ul>
          <p style="color: #78350f; font-size: 13px;">Revisa el panell de Supabase i elimina dades antigues si cal.</p>
          <a href="https://supabase.com/dashboard/project/zaxbtnjkidqwzqsehvld" style="display:inline-block;padding:10px 20px;background:#92400e;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Obrir Supabase Dashboard</a>
        </div>
      `,
      }),
    });

    const emailResult = await res.json();
    console.log("Alert email status:", res.status, "id:", emailResult?.id ?? "none");
    return jsonResponse({ alerted: true, alerts }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Critical Error:", message);
    return jsonResponse({ error: message }, 500);
  }
});

function formatBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
