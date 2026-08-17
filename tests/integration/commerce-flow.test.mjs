import assert from "node:assert/strict";
import { test } from "node:test";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Define SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY y SUPABASE_SERVICE_ROLE_KEY");
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function createTestUser(label) {
  const email = `${unique(label)}@example.test`;
  const password = `Test-${crypto.randomUUID()}-aA1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { client, user: data.user, email };
}

test(
  "commerce security, concurrency, finance, realtime and email queue",
  { timeout: 45_000 },
  async () => {
    const sku = unique("TEST-SKU");
    const slug = unique("test-product");
    const createdUserIds = [];
    const createdOrderIds = [];
    let productId;
    let channel;
    let realtimeClient;

    try {
      const admin = await createTestUser("admin");
      realtimeClient = admin.client;
      const customerA = await createTestUser("customer-a");
      const customerB = await createTestUser("customer-b");
      createdUserIds.push(admin.user.id, customerA.user.id, customerB.user.id);
      const { error: roleError } = await service
        .from("user_roles")
        .insert({ user_id: admin.user.id, role: "admin" });
      assert.equal(roleError, null);

      const { data: product, error: productError } = await service
        .from("products")
        .insert({
          sku,
          slug,
          name: "Producto de concurrencia",
          price: 50_000,
          cost_price: 20_000,
          stock: 1,
          min_stock: 1,
          status: "active",
        })
        .select()
        .single();
      assert.equal(productError, null);
      productId = product.id;

      const directProducts = await anonymous
        .from("products")
        .select("cost_price")
        .eq("id", productId);
      assert.ok(directProducts.error, "anon must not read the products table or cost_price");
      const publicProducts = await anonymous
        .from("products_public")
        .select("*")
        .eq("id", productId)
        .single();
      assert.equal(publicProducts.error, null);
      assert.equal(Object.hasOwn(publicProducts.data, "cost_price"), false);

      let realtimeResolve;
      const realtimeNotification = new Promise((resolve) => {
        realtimeResolve = resolve;
      });
      channel = admin.client
        .channel(unique("order-notifications"))
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${admin.user.id}`,
          },
          (payload) => realtimeResolve(payload.new),
        )
        .subscribe();
      await new Promise((resolve) => setTimeout(resolve, 800));

      const payload = {
        p_items: [{ product_id: productId, quantity: 1 }],
        p_customer_name: "Cliente concurrente",
        p_customer_email: "concurrente@example.test",
        p_customer_phone: "3000000000",
        p_shipping_address: "Calle de prueba 1",
        p_shipping_city: "Bogotá",
        p_shipping_method: "standard",
        p_payment_method: "bank_transfer",
      };
      const attempts = await Promise.all([
        anonymous.rpc("create_order_v2", payload),
        anonymous.rpc("create_order_v2", payload),
      ]);
      const successes = attempts.filter((result) => !result.error);
      const failures = attempts.filter((result) => result.error);
      assert.equal(successes.length, 1, "exactly one concurrent order must succeed");
      assert.equal(failures.length, 1, "exactly one concurrent order must fail");
      assert.match(failures[0].error.message, /INSUFFICIENT_STOCK|PRODUCT_NOT_AVAILABLE/);
      const orderId = successes[0].data.id;
      createdOrderIds.push(orderId);

      const event = await Promise.race([
        realtimeNotification,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Realtime notification timeout")), 8_000),
        ),
      ]);
      assert.equal(event.entity_id, orderId);

      const { data: depleted } = await service
        .from("products")
        .select("stock,status")
        .eq("id", productId)
        .single();
      assert.equal(depleted.stock, 0);
      assert.equal(depleted.status, "out_of_stock");

      const { data: item } = await service
        .from("order_items")
        .select("unit_price,unit_cost,line_total,line_cost,line_profit")
        .eq("order_id", orderId)
        .single();
      assert.equal(Number(item.line_total), 50_000);
      assert.equal(Number(item.line_cost), 20_000);
      assert.equal(Number(item.line_profit), 30_000);

      const { data: dispatch } = await service
        .from("order_email_dispatches")
        .select("status,attempts")
        .eq("order_id", orderId)
        .single();
      assert.equal(dispatch.status, "pending");
      assert.equal(dispatch.attempts, 0);

      const { error: confirmError } = await admin.client.rpc("set_order_status", {
        p_order_id: orderId,
        p_status: "confirmed",
        p_note: "Prueba financiera",
      });
      assert.equal(confirmError, null);
      await service.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
      const { data: summary, error: summaryError } = await admin.client.rpc(
        "get_sales_summary",
        {},
      );
      assert.equal(summaryError, null);
      assert.ok(Number(summary[0].gross_sales) >= 50_000);
      assert.ok(Number(summary[0].gross_profit) >= 30_000);

      const { error: cancelError } = await admin.client.rpc("set_order_status", {
        p_order_id: orderId,
        p_status: "cancelled",
        p_note: "Restaurar inventario",
      });
      assert.equal(cancelError, null);
      const { data: restored } = await service
        .from("products")
        .select("stock,status")
        .eq("id", productId)
        .single();
      assert.equal(restored.stock, 1);
      assert.equal(restored.status, "active");

      const customerOrder = await customerA.client.rpc("create_order_v2", {
        ...payload,
        p_customer_email: customerA.email,
        p_customer_name: "Cliente A",
      });
      assert.equal(customerOrder.error, null);
      createdOrderIds.push(customerOrder.data.id);
      const foreignRead = await customerB.client
        .from("orders")
        .select("id")
        .eq("id", customerOrder.data.id);
      assert.equal(foreignRead.error, null);
      assert.equal(foreignRead.data.length, 0, "a customer must not read another customer's order");

      if (process.env.TEST_EMAIL_DELIVERY === "true") {
        const delivery = await anonymous.functions.invoke("send-order-notification", {
          body: { order_id: customerOrder.data.id },
        });
        assert.equal(delivery.error, null);
        const { data: sent } = await service
          .from("order_email_dispatches")
          .select("status,admin_sent_at,customer_sent_at")
          .eq("order_id", customerOrder.data.id)
          .single();
        assert.equal(sent.status, "sent");
        assert.ok(sent.admin_sent_at);
        assert.ok(sent.customer_sent_at);
      }
    } finally {
      if (channel && realtimeClient) await realtimeClient.removeChannel(channel);
      if (createdOrderIds.length) await service.from("orders").delete().in("id", createdOrderIds);
      if (productId) await service.from("products").delete().eq("id", productId);
      for (const userId of createdUserIds) await service.auth.admin.deleteUser(userId);
    }
  },
);
