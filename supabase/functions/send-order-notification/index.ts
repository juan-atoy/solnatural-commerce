import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(value);
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiUrl = Deno.env.get("EMAIL_API_URL") ?? "https://api.resend.com/emails";
  const apiKey = Deno.env.get("EMAIL_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) throw new Error(`EMAIL_PROVIDER_${response.status}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return new Response("Server not configured", { status: 500 });

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let orderId = "";
  try {
    const body = await request.json();
    orderId = typeof body?.order_id === "string" ? body.order_id : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
    ) {
      return new Response(JSON.stringify({ error: "INVALID_ORDER_ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: dispatch, error: dispatchError } = await client
      .from("order_email_dispatches")
      .select("status,attempts,admin_sent_at,customer_sent_at,updated_at")
      .eq("order_id", orderId)
      .maybeSingle();
    if (dispatchError) throw dispatchError;
    if (!dispatch || dispatch.status === "sent") {
      return new Response(JSON.stringify({ ok: true, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const processingIsFresh =
      dispatch.status === "processing" &&
      Date.now() - new Date(dispatch.updated_at).getTime() < 5 * 60 * 1000;
    if (processingIsFresh || dispatch.attempts >= 5) {
      return new Response(JSON.stringify({ ok: false, retryable: false }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: claimed } = await client
      .from("order_email_dispatches")
      .update({ status: "processing", attempts: dispatch.attempts + 1, last_error: null })
      .eq("order_id", orderId)
      .eq("status", dispatch.status)
      .select("order_id")
      .maybeSingle();
    if (!claimed)
      return new Response(JSON.stringify({ ok: true, claimed: false }), { headers: corsHeaders });

    const [{ data: order, error: orderError }, { data: items, error: itemsError }, settingsResult] =
      await Promise.all([
        client.from("orders").select("*").eq("id", orderId).single(),
        client
          .from("order_items")
          .select("product_name,quantity,line_total")
          .eq("order_id", orderId),
        client.from("store_settings").select("email,store_name").eq("id", true).single(),
      ]);
    if (orderError) throw orderError;
    if (itemsError) throw itemsError;

    const itemRows = (items ?? [])
      .map(
        (item) =>
          `<li>${escapeHtml(item.quantity)} × ${escapeHtml(item.product_name)} — ${money(Number(item.line_total))}</li>`,
      )
      .join("");
    const details = `<h1>Pedido ${escapeHtml(order.order_number)}</h1><ul>${itemRows}</ul><p><strong>Total:</strong> ${money(Number(order.total))}</p><p><strong>Método de entrega:</strong> ${escapeHtml(order.shipping_method_name ?? "Envío estándar")}</p><p><strong>Entrega:</strong> ${escapeHtml(order.shipping_address)}, ${escapeHtml(order.shipping_city)}</p><p><strong>Pago:</strong> ${escapeHtml(order.payment_method)}</p>`;
    let adminSentAt = dispatch.admin_sent_at;
    let customerSentAt = dispatch.customer_sent_at;

    if (!adminSentAt) {
      const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? settingsResult.data?.email;
      if (!adminEmail) throw new Error("ADMIN_EMAIL_NOT_CONFIGURED");
      await sendEmail(
        adminEmail,
        `Nuevo pedido ${order.order_number} por ${money(Number(order.total))}`,
        `${details}<p><strong>Cliente:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)}) · ${escapeHtml(order.customer_phone)}</p><p><a href="${escapeHtml(Deno.env.get("APP_PUBLIC_URL") ?? "http://localhost:3000")}/pedido-admin/${escapeHtml(order.id)}">Abrir pedido en el panel</a></p>`,
      );
      adminSentAt = new Date().toISOString();
      await client
        .from("order_email_dispatches")
        .update({ admin_sent_at: adminSentAt })
        .eq("order_id", orderId);
    }

    if (!customerSentAt) {
      await sendEmail(
        order.customer_email,
        `${settingsResult.data?.store_name ?? "SolNatural"}: confirmación ${order.order_number}`,
        `${details}<p>Recibimos tu pedido correctamente. Te avisaremos cuando cambie de estado.</p>`,
      );
      customerSentAt = new Date().toISOString();
    }

    await client
      .from("order_email_dispatches")
      .update({ status: "sent", admin_sent_at: adminSentAt, customer_sent_at: customerSentAt })
      .eq("order_id", orderId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    if (orderId) {
      await client
        .from("order_email_dispatches")
        .update({
          status: "failed",
          last_error: error instanceof Error ? error.message : "UNKNOWN",
        })
        .eq("order_id", orderId);
    }
    return new Response(JSON.stringify({ error: "EMAIL_DISPATCH_FAILED" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
