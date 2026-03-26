import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "supabase";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
};

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function renderHtmlPage(title: string, message: string): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .card {
        width: min(560px, calc(100vw - 2rem));
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 10px 25px rgba(2, 6, 23, 0.08);
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.25rem;
        line-height: 1.2;
      }
      p {
        margin: 0;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>${title}</h1>
      <p>${message}</p>
    </main>
  </body>
</html>`;
}

function extractSlug(requestUrl: URL): string | null {
  const segments = requestUrl.pathname.split("/").filter(Boolean);
  const prefixes = new Set(["functions", "v1", "go"]);
  while (segments.length > 0 && prefixes.has(segments[0])) {
    segments.shift();
  }

  const rawSlug = segments[0] ?? requestUrl.searchParams.get("slug") ?? "";
  if (!rawSlug) return null;

  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug);
  } catch {
    return null;
  }

  const normalizedSlug = decodedSlug.trim().toLowerCase().replace(/\/+$/, "");
  if (!normalizedSlug) return null;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) return null;
  return normalizedSlug;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing function environment variables" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const slug = extractSlug(new URL(req.url));
  if (!slug) {
    return new Response(
      renderHtmlPage("Enlace no encontrado", "El enlace corto solicitado no existe."),
      { status: 404, headers: htmlHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("short_urls")
    .select("target_url, expires_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Error querying short_urls:", error);
    return new Response(JSON.stringify({ error: "Database query failed" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (!data) {
    return new Response(
      renderHtmlPage("Enlace no encontrado", "El enlace corto solicitado no existe."),
      { status: 404, headers: htmlHeaders },
    );
  }

  if (data.expires_at) {
    const expiry = new Date(data.expires_at);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= Date.now()) {
      return new Response(
        renderHtmlPage("Enlace caducado", "Este enlace ha caducado y ya no está disponible."),
        { status: 410, headers: htmlHeaders },
      );
    }
  }

  let parsedTargetUrl: URL;
  try {
    parsedTargetUrl = new URL(data.target_url);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid target URL" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  if (parsedTargetUrl.protocol !== "http:" && parsedTargetUrl.protocol !== "https:") {
    return new Response(JSON.stringify({ error: "Unsupported target URL protocol" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const { error: clickError } = await supabase.rpc("increment_clicks", { p_slug: slug });
  if (clickError) {
    console.error("Error incrementing clicks:", clickError);
  }

  return Response.redirect(parsedTargetUrl.toString(), 302);
});
