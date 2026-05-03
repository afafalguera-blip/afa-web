import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://afafalguera.com,https://www.afafalguera.com").split(",");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const LANG_NAMES: Record<string, string> = {
  ca: "Catalan",
  es: "Spanish",
  en: "English",
};

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeLang(value: string | undefined, fallback: string): string {
  const raw = (value || fallback).toLowerCase().trim();
  if (raw === "auto") return "auto";
  if (["ca", "es", "en"].includes(raw)) return raw;
  return fallback;
}

function jsonResponse(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });
}

async function callGemini(systemPrompt: string, userContent: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

// Bulk: translate multiple fields to multiple languages in one LLM call.
// Input:  { fields: { title, content, ... }, sourceLang, targetLangs }
// Output: { translations: { ca: { title, ... }, en: { ... } } }
async function translateBulk(
  fields: Record<string, string>,
  sourceLang: string,
  targetLangs: string[],
): Promise<Record<string, Record<string, string>>> {
  const sourceName = LANG_NAMES[sourceLang] || sourceLang;
  const targetNames = targetLangs.map((l) => `"${l}" (${LANG_NAMES[l] || l})`).join(", ");

  const systemPrompt = `You are a professional translator for an AFA (Associació de Famílies d'Alumnes), a school parents association in Catalonia, Spain.
Translate the JSON fields provided from ${sourceName} into the following languages: ${targetNames}.
Rules:
- Preserve all HTML tags exactly as-is; only translate the visible text between tags.
- Use a friendly, warm, informal tone appropriate for a school community.
- Do not add explanations or extra keys.
- Return ONLY a valid JSON object with exactly this structure (one key per target language code):
{ "<langCode>": { <same keys as input, translated values> }, ... }`;

  const raw = await callGemini(systemPrompt, JSON.stringify(fields));
  return JSON.parse(raw) as Record<string, Record<string, string>>;
}

// Single text translation (backward compat).
async function translateSingle(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const result = await translateBulk({ text }, sourceLang, [targetLang]);
  return result[targetLang]?.text ?? text;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const cors = getCorsHeaders(req);

  try {
    const payload = await req.json() as Record<string, unknown>;

    // --- Bulk mode ---
    if (payload.fields && payload.targetLangs) {
      const fields = payload.fields as Record<string, string>;
      const sourceLang = normalizeLang(payload.sourceLang as string | undefined, "es");
      const targetLangs = (payload.targetLangs as string[]).map((l) => normalizeLang(l, "ca"));

      if (!Object.keys(fields).length) {
        return new Response(JSON.stringify({ error: "fields is empty" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      const translations = await translateBulk(fields, sourceLang, targetLangs);
      return new Response(JSON.stringify({ translations }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // --- Single mode (backward compat) ---
    const text = ((payload.text as string) || "").trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (text.length > 16000) {
      return new Response(JSON.stringify({ error: "Text too long" }), { status: 413, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const sourceLang = normalizeLang(payload.sourceLang as string | undefined, "auto");
    const targetLang = normalizeLang(payload.targetLang as string | undefined, "es");

    if (targetLang === "auto") {
      return new Response(JSON.stringify({ error: "Invalid targetLang" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const translatedText = await translateSingle(text, sourceLang === "auto" ? "es" : sourceLang, targetLang);
    return new Response(JSON.stringify({ translatedText, sourceLang, targetLang }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
