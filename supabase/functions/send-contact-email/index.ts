import "edge-runtime";
import { createClient } from "supabase";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const NOTIFICATION_EMAILS = ["afafalguera@gmail.com"];

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    const record = payload.record;
    if (!record) {
      throw new Error("No record found in payload");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch full message data to be robust against partial payloads
    console.log(`Fetching message data for ID: ${record.id}...`);
    const { data: messageData, error: fetchError } = await supabase
      .from("contact_messages")
      .select("*")
      .eq("id", record.id)
      .single();

    if (fetchError || !messageData) {
      throw new Error(`Error fetching message: ${fetchError?.message || "Not found"}`);
    }

    const { name, email, subject, message, created_at } = messageData;
    const dateFormatted = new Date(created_at).toLocaleString('ca-ES', { 
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `FormularioAFA <${FROM_EMAIL}>`,
        to: NOTIFICATION_EMAILS,
        subject: `📩 Nou missatge web: ${subject}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; padding: 12px; background-color: #fef3c7; border-radius: 12px; margin-bottom: 16px;">
                <span style="font-size: 32px;">📩</span>
              </div>
              <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Nou Missatge de Contacte</h1>
              <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">S'ha rebut un missatge des del formulari de la web.</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
              <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Dades del Remitent</h3>
              <p style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 600;">${name}</p>
              <p style="margin: 4px 0 0 0; color: #2563eb; font-size: 14px; font-weight: 500;">
                <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
              </p>
              <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 12px;">Rebut el ${dateFormatted}</p>
            </div>

            <div style="margin-bottom: 24px;">
              <h3 style="margin: 0 0 8px 0; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Assumpte</h3>
              <p style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;">${subject}</p>
            </div>

            <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Missatge</h3>
              <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="text-align: center;">
              <a href="${supabaseUrl.replace('.supabase.co', '')}.supabase.co/dashboard/project/_/editor" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Gestionar al Panell d'Admin</a>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
              Aquest correu s'ha enviat automàticament des del sistema de contacte de l'AFA Escola Falguera.
            </p>
          </div>
        `,
      }),
    });

    const data = await res.json();
    console.log("Resend response status:", res.status);
    console.log("Resend response body:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Critical Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
