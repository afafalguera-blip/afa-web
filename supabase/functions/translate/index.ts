import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "https://afafalguera.com,https://www.afafalguera.com").split(",");

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

interface TranslationRequest {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
}

const MAX_TEXT_LENGTH = 16000;

function normalizeLang(value: string | undefined, fallback: string): string {
  const raw = (value || fallback).toLowerCase().trim();

  if (raw === "auto") return "auto";
  if (["ca", "es", "en"].includes(raw)) return raw;

  return fallback;
}

async function translateViaGoogle(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(
    text
  )}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Provider error: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data[0]) {
    throw new Error("Invalid translation provider response");
  }

  return (data[0] as string[][]).map((part) => part[0]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    const payload = (await req.json()) as TranslationRequest;
    const text = (payload.text || "").trim();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: "Text too long" }), {
        status: 413,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const sourceLang = normalizeLang(payload.sourceLang, "auto");
    const targetLang = normalizeLang(payload.targetLang, "es");

    if (targetLang === "auto") {
      return new Response(JSON.stringify({ error: "Invalid targetLang" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const translatedText = await translateViaGoogle(text, sourceLang, targetLang);

    return new Response(
      JSON.stringify({ translatedText, sourceLang, targetLang }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
