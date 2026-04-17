import "edge-runtime";
import { createClient } from "supabase";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ALERT_EMAILS = (Deno.env.get("NOTIFICATION_EMAILS") || "afafalguera@gmail.com").split(",");
const ALERT_SECRET = Deno.env.get("USAGE_ALERT_SECRET") || "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Free tier limits (bytes)
const DB_LIMIT_BYTES    = 500 * 1024 * 1024;   // 500 MB
const STORE_LIMIT_BYTES = 1024 * 1024 * 1024;  // 1 GB
const WARN_THRESHOLD    = 0.75;                 // alert at 75%

Deno.serve(async (req: Request) => {
  // Only allow calls with the shared secret (set by pg_cron)
  const authHeader = req.headers.get("x-alert-secret") || "";
  if (ALERT_SECRET && authHeader !== ALERT_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Check DB size
  const { data: dbData } = await supabase.rpc("get_db_size_bytes");
  const dbBytes: number = dbData ?? 0;

  // 2. Check Storage size (sum of all objects)
  const { data: storData } = await supabase
    .from("storage.objects")
    .select("metadata->size")
    .limit(10000);
  const storageBytes: number = (storData ?? []).reduce(
    (acc: number, row: { size?: number }) => acc + (row.size ?? 0),
    0
  );

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
    return new Response(JSON.stringify({ ok: true, dbBytes, storageBytes }), { status: 200 });
  }

  // Send alert email
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
          <p style="color: #78350f;">Un o més recursos del pla gratuït han superat el <strong>75% del límit</strong>:</p>
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
  console.log("Alert email sent:", JSON.stringify(emailResult));
  return new Response(JSON.stringify({ alerted: true, alerts }), { status: 200 });
});

function formatBytes(b: number): string {
  if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}
