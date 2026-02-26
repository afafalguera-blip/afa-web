import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const NOTIFICATION_EMAILS = ["afafalguera@gmail.com", "ampafalguera@hotmail.es"];

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    // Retry logic to allow items to be inserted (since it's a transaction)
    let order = null;
    let orderError = null;
    
    for (let i = 0; i < 3; i++) {
      console.log(`Fetching order data (attempt ${i + 1})...`);
      const { data, error } = await supabase
        .from("shop_orders")
        .select(`
          *,
          items:shop_order_items(
            *,
            variant:shop_variants(
              size,
              product:shop_products(name)
            )
          )
        `)
        .eq("id", record.id)
        .single();
      
      if (data && data.items && data.items.length > 0) {
        order = data;
        break;
      }
      
      orderError = error;
      console.log(`Order or items not found yet. Waiting 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!order) {
      throw new Error(`Error fetching order or no items found after retries: ${orderError?.message || "Not found"}`);
    }

    console.log(`Found order with ${order.items.length} items`);

    const itemsHtml = order.items.map((item: any) => `
      <tr>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${item.variant?.product?.name || 'Producte'}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: center;">${item.variant?.size || '-'}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: right;">${item.price_at_time}€</td>
      </tr>
    `).join("");

    const emailPayload = {
      from: `TiendaAFA <${FROM_EMAIL}>`,
      to: NOTIFICATION_EMAILS,
      subject: `👕 Nova comanda botiga: ${record.customer_name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
              <span style="font-size: 32px;">👕</span>
            </div>
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Nova Comanda d'AFA Roba</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">S'ha rebut una nova reserva des de la web.</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
            <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Dades del Client</h3>
            <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">${record.customer_name}</p>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">ID Comanda: <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${record.id.slice(0, 8)}</code></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr>
                <th style="padding: 12px 8px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Producte</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Talla</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Cant.</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">Preu</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 24px 8px 8px 8px; text-align: right; font-size: 16px; color: #64748b;">Total a pagar:</td>
                <td style="padding: 24px 8px 8px 8px; text-align: right; font-weight: 800; color: #2563eb; font-size: 24px;">${record.total_amount}€</td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 500;">🔔 Recorda contactar amb el client per a la recollida.</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA Escola Falguera.
          </p>
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
    console.log("Resend response status:", res.status);
    console.log("Resend response body:", JSON.stringify(data));

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: res.status, // Use the actual status from Resend
    });
  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
