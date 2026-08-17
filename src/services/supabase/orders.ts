import { supabase } from "@/integrations/supabase/client";
import type { CartLine, MyOrderItem, Order, PaymentMethod } from "@/types/store";

export type CheckoutPayload = {
  items: CartLine[];
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_region?: string | null;
  shipping_country?: string;
  payment_method: PaymentMethod;
  shipping_method: string;
  notes?: string | null;
};

export type CreatedOrder = {
  id: string;
  order_number: string;
  subtotal: number;
  shipping_total: number;
  total: number;
  payment_method: PaymentMethod;
  order_status: string;
  shipping_method_code: string;
  shipping_method_name: string;
};

/**
 * Creates the order through a transactional Postgres function.
 * Prices, costs, stock and totals are resolved server-side: the browser only
 * sends product ids and quantities.
 */
export async function createOrder(payload: CheckoutPayload): Promise<CreatedOrder> {
  const { data, error } = await supabase.rpc("create_order_v2", {
    p_items: payload.items.map((line) => ({
      product_id: line.product_id,
      quantity: line.quantity,
    })),
    p_customer_name: payload.customer_name,
    p_customer_email: payload.customer_email,
    p_customer_phone: payload.customer_phone,
    p_shipping_address: payload.shipping_address,
    p_shipping_city: payload.shipping_city,
    ...(payload.shipping_region ? { p_shipping_region: payload.shipping_region } : {}),
    p_shipping_country: payload.shipping_country ?? "Colombia",
    p_payment_method: payload.payment_method,
    p_shipping_method: payload.shipping_method,
    ...(payload.notes ? { p_notes: payload.notes } : {}),
  });
  if (error) throw error;
  const order = data as unknown as CreatedOrder;

  // Email is intentionally best-effort: a provider outage must never roll back
  // or hide an order that PostgreSQL already committed.
  void supabase.functions
    .invoke("send-order-notification", { body: { order_id: order.id } })
    .then(({ error: notificationError }) => {
      if (notificationError) console.error("Order email dispatch failed", notificationError);
    });

  return order;
}

export async function fetchMyOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,order_number,created_at,order_status,payment_status,payment_method,total,subtotal,shipping_total,shipping_method_code,shipping_method_name,shipping_address,shipping_city,shipping_region,customer_name,customer_email,customer_phone,notes",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Order[];
}

export async function fetchMyOrder(id: string) {
  const [orderResult, itemsResult] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id,order_number,created_at,order_status,payment_status,payment_method,total,subtotal,shipping_total,discount_total,shipping_method_code,shipping_method_name,shipping_address,shipping_city,shipping_region,shipping_country,customer_name,customer_email,customer_phone,notes",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("my_order_items").select("*").eq("order_id", id),
  ]);
  if (orderResult.error) throw orderResult.error;
  if (itemsResult.error) throw itemsResult.error;
  return {
    order: orderResult.data as Order | null,
    items: (itemsResult.data ?? []) as MyOrderItem[],
  };
}

export async function fetchOrderTimeline(orderId: string) {
  const { data, error } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
