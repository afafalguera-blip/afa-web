import "edge-runtime";
import { createClient } from "supabase";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
const ADMIN_EMAILS_DEFAULT = (Deno.env.get("ADMIN_EMAILS") || "afafalguera@gmail.com").split(",");

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

const getTranslations = (lang: string) => {
  const translations: Record<string, Record<string, string>> = {
    es: {
      subject: "👕 Confirmación de tu reserva AFA Falguera",
      title: "¡Reserva Confirmada!",
      subtitle: "Hemos recibido tu solicitud de reserva de ropa exitosamente.",
      customerContext: "Detalles del Cliente",
      product: "Producto",
      size: "Talla",
      qty: "Cant.",
      price: "Precio",
      totalMsg: "Total a pagar en efectivo:",
      pickupTitle: "🔔 Información de Recogida",
      pickupBody: "Puedes pasar a recoger y pagar (en efectivo) tu pedido los <b>Lunes o Miércoles de 9:00 a 10:00</b> en el despacho del AFA.",
      pickupAlt: "Si necesitas venir en otro momento, por favor responde a este correo para acordar otra cita.",
      footer: "Este correo se ha enviado automáticamente desde el sistema de gestión del AFA."
    },
    ca: {
      subject: "👕 Confirmació de la teva reserva AFA Falguera",
      title: "Reserva Confirmada!",
      subtitle: "Hem rebut la teva sol·licitud de reserva de roba correctament.",
      customerContext: "Detalls del Client",
      product: "Producte",
      size: "Talla",
      qty: "Quant.",
      price: "Preu",
      totalMsg: "Total a pagar en efectiu:",
      pickupTitle: "🔔 Informació de Recollida",
      pickupBody: "Pots passar a recollir i pagar (en efectiu) la teva comanda els <b>Dilluns o Dimecres de 9:00 a 10:00</b> al despatx de l'AFA.",
      pickupAlt: "Si necessites venir en un altre moment, si us plau respon a aquest correu per acordar una altra cita.",
      footer: "Aquest correu s'ha enviat automàticament des del sistema de gestió de l'AFA."
    },
    en: {
      subject: "👕 Booking Confirmation AFA Falguera",
      title: "Booking Confirmed!",
      subtitle: "We have successfully received your clothing reservation request.",
      customerContext: "Customer Details",
      product: "Product",
      size: "Size",
      qty: "Qty.",
      price: "Price",
      totalMsg: "Total to pay in cash:",
      pickupTitle: "🔔 Pickup Information",
      pickupBody: "You can pick up and pay (in cash) for your order on <b>Mondays or Wednesdays from 9:00 to 10:00</b> at the AFA office.",
      pickupAlt: "If you need to come at another time, please reply to this email to arrange an appointment.",
      footer: "This email was sent automatically from the AFA management system."
    }
  };
  return translations[lang] || translations['ca'];
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
      
      if (data) {
        order = data;
        // If it has items, we're good. If not, maybe it's a manual order just created.
        if (data.items && data.items.length > 0) break;
      }
      
      orderError = error;
      console.log(`Order or items not found yet. Waiting 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!order) {
      throw new Error(`Error fetching order or no items found after retries: ${orderError?.message || "Not found"}`);
    }

    const t = getTranslations(record.language || 'ca');

    // Fetch dynamic shop config
    let shopConfig = null;
    try {
      const { data: configData } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'shop')
        .single();
      shopConfig = configData?.value;
    } catch (e) {
      console.error("Could not fetch shop config", e);
    }

    const pickupBodyText = shopConfig?.translations?.[record.language || 'ca'] || shopConfig?.translations?.['ca'] || t.pickupBody;
    const adminEmails = shopConfig?.admin_emails || ADMIN_EMAILS_DEFAULT;
    const contactEmail = record.customer_email || order.customer_email || "";
    const contactPhone = record.customer_phone || order.customer_phone || "";

    const itemsHtml = order.items && order.items.length > 0 
      ? order.items.map((item: { variant: { product: { name: string }, size: string }, quantity: number, price_at_time: number }) => `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${item.variant?.product?.name || 'Producte'}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: center;">${item.variant?.size || '-'}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #e2e8f0; color: #1e293b; text-align: right;">${item.price_at_time}€</td>
        </tr>
      `).join("")
      : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Sense productes</td></tr>`;

    // Determine recipients. Send to the customer and the admins.
    const recipients = [...adminEmails];
    if (record.customer_email && record.customer_email.includes('@')) {
      recipients.push(record.customer_email);
    }

    // Try to get reply_to from admin emails or a fixed one
    const replyToEmail = adminEmails[0] || "afafalguera@gmail.com";

    const emailPayload = {
      from: `TiendaAFA <${FROM_EMAIL}>`,
      to: recipients,
      reply_to: replyToEmail,
      subject: t.subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 12px; background-color: #eff6ff; border-radius: 12px; margin-bottom: 16px;">
              <span style="font-size: 32px;">👕</span>
            </div>
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">${t.title}</h1>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 16px;">${t.subtitle}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; border: 1px solid #f1f5f9;">
            <h3 style="margin: 0 0 12px 0; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">${t.customerContext}</h3>
            <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 600;">${record.customer_name}</p>
            ${contactEmail ? `<p style="margin: 6px 0 0 0; color: #334155; font-size: 14px;">Email: ${contactEmail}</p>` : ""}
            ${contactPhone ? `<p style="margin: 4px 0 0 0; color: #334155; font-size: 14px;">Tel: ${contactPhone}</p>` : ""}
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">ID: <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 4px;">${record.id.slice(0, 8)}</code></p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr>
                <th style="padding: 12px 8px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">${t.product}</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">${t.size}</th>
                <th style="padding: 12px 8px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">${t.qty}</th>
                <th style="padding: 12px 8px; text-align: right; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #f1f5f9;">${t.price}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 24px 8px 8px 8px; text-align: right; font-size: 16px; color: #64748b;">${t.totalMsg}</td>
                <td style="padding: 24px 8px 8px 8px; text-align: right; font-weight: 800; color: #2563eb; font-size: 24px;">${order.total_amount}€</td>
              </tr>
            </tfoot>
          </table>

          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-size: 16px; font-weight: 800;">${t.pickupTitle}</p>
            <p style="margin: 0 0 12px 0; color: #15803d; font-size: 15px; line-height: 1.5;">${pickupBodyText}</p>
            <p style="margin: 0; color: #166534; font-size: 13px; opacity: 0.9;">${t.pickupAlt}</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
            ${t.footer}
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Critical Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
