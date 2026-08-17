import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  AdminProduct,
  Category,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from "@/types/store";

const untypedSupabase = supabase as unknown as SupabaseClient;

export type DateRange = { from: string | null; to: string | null };

/** Builds RPC date arguments, omitting empty bounds (exactOptionalPropertyTypes). */
function rangeArgs(range: DateRange) {
  return {
    ...(range.from ? { p_from: range.from } : {}),
    ...(range.to ? { p_to: range.to } : {}),
  };
}

/* ---------------------------------- Metrics --------------------------------- */

export async function getSalesSummary(range: DateRange) {
  const { data, error } = await supabase.rpc("get_sales_summary", {
    ...rangeArgs(range),
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getSalesByPeriod(from: string, to: string, bucket: "day" | "month") {
  const { data, error } = await supabase.rpc("get_sales_by_period", {
    p_from: from,
    p_to: to,
    p_bucket: bucket,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getTopProducts(range: DateRange, limit = 8) {
  const { data, error } = await supabase.rpc("get_top_products", {
    ...rangeArgs(range),
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getSalesByCategory(range: DateRange) {
  const { data, error } = await supabase.rpc("get_sales_by_category", {
    ...rangeArgs(range),
  });
  if (error) throw error;
  return data ?? [];
}

export async function getOrdersByStatus(range: DateRange) {
  const { data, error } = await supabase.rpc("get_orders_by_status", {
    ...rangeArgs(range),
  });
  if (error) throw error;
  return data ?? [];
}

export async function getLowStockProducts() {
  const { data, error } = await supabase.rpc("get_low_stock_products");
  if (error) throw error;
  return data ?? [];
}

export async function getTopCustomers(range: DateRange, limit = 10) {
  const { data, error } = await supabase.rpc("get_top_customers", {
    ...rangeArgs(range),
    p_limit: limit,
  });
  if (error) throw error;
  return data ?? [];
}

export async function getSalesReport(range: DateRange) {
  const { data, error } = await supabase.rpc("get_sales_report", {
    ...rangeArgs(range),
  });
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------- Products --------------------------------- */

export async function adminListProducts(filters: {
  search?: string;
  status?: ProductStatus | "all";
  categoryId?: string | "all";
}) {
  let request = supabase.from("products").select("*").order("created_at", { ascending: false });
  if (filters.status && filters.status !== "all") request = request.eq("status", filters.status);
  if (filters.categoryId && filters.categoryId !== "all")
    request = request.eq("category_id", filters.categoryId);
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    request = request.or(`name.ilike.${term},sku.ilike.${term}`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as AdminProduct[];
}

export type ProductInput = {
  sku: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  brand: string | null;
  price: number;
  cost_price: number;
  sale_price: number | null;
  stock: number;
  min_stock: number;
  unit: string;
  ingredients: string | null;
  benefits: string | null;
  usage_mode: string | null;
  warnings: string | null;
  image_url: string | null;
  status: ProductStatus;
  is_featured: boolean;
};

export async function createProduct(input: ProductInput) {
  const { data, error } = await supabase.from("products").insert(input).select().single();
  if (error) throw error;
  return data as AdminProduct;
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AdminProduct;
}

export async function duplicateProduct(product: AdminProduct) {
  const suffix = Date.now().toString().slice(-5);
  const { data, error } = await supabase
    .from("products")
    .insert({
      sku: `${product.sku}-C${suffix}`,
      name: `${product.name} (copia)`,
      slug: `${product.slug}-copia-${suffix}`,
      short_description: product.short_description,
      description: product.description,
      category_id: product.category_id,
      brand: product.brand,
      price: product.price,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      stock: 0,
      min_stock: product.min_stock,
      unit: product.unit,
      ingredients: product.ingredients,
      benefits: product.benefits,
      usage_mode: product.usage_mode,
      warnings: product.warnings,
      image_url: product.image_url,
      status: "draft" as ProductStatus,
      is_featured: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AdminProduct;
}

export async function setProductStatus(id: string, status: ProductStatus) {
  const { error } = await supabase.from("products").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function adjustStock(productId: string, newStock: number, notes?: string) {
  const { error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_new_stock: newStock,
    ...(notes ? { p_notes: notes } : {}),
  });
  if (error) throw error;
}

/* -------------------------------- Categories -------------------------------- */

export async function adminListCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

export type CategoryInput = {
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  parent_id: string | null;
};

export async function upsertCategory(input: CategoryInput, id?: string) {
  const request = id
    ? supabase.from("categories").update(input).eq("id", id)
    : supabase.from("categories").insert(input);
  const { error } = await request;
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------------------------- Orders ---------------------------------- */

export async function adminListOrders(filters: {
  search?: string;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
}) {
  let request = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (filters.status && filters.status !== "all")
    request = request.eq("order_status", filters.status);
  if (filters.paymentStatus && filters.paymentStatus !== "all")
    request = request.eq("payment_status", filters.paymentStatus);
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    request = request.or(
      `order_number.ilike.${term},customer_name.ilike.${term},customer_email.ilike.${term}`,
    );
  }
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function adminGetOrder(id: string) {
  const [order, items, history] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (order.error) throw order.error;
  if (items.error) throw items.error;
  if (history.error) throw history.error;
  return { order: order.data, items: items.data ?? [], history: history.data ?? [] };
}

export async function setOrderStatus(orderId: string, status: OrderStatus, note?: string) {
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: orderId,
    p_status: status,
    ...(note ? { p_note: note } : {}),
  });
  if (error) throw error;
}

export async function setPaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId);
  if (error) throw error;
}

export async function setOrderNotes(orderId: string, notes: string) {
  const { error } = await supabase.from("orders").update({ notes }).eq("id", orderId);
  if (error) throw error;
}

/* -------------------------- Inventory / audit / misc ------------------------- */

export async function listInventoryMovements(productId?: string) {
  let request = supabase
    .from("inventory_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (productId) request = request.eq("product_id", productId);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function listAuditLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function updateStoreSettings(
  input: Database["public"]["Tables"]["store_settings"]["Update"],
) {
  const { error } = await supabase.from("store_settings").update(input).eq("id", true);
  if (error) throw error;
}

export async function listProductImages(productId: string) {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function uploadProductImage(
  productId: string,
  file: File,
  options: { alt?: string; isPrimary?: boolean } = {},
) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif"];
  if (!allowed.includes(file.type)) throw new Error("Formato no permitido. Usa JPG, PNG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen supera el límite de 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
  const current = await listProductImages(productId);
  const { data, error: insertError } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      url: publicUrl.publicUrl,
      storage_path: path,
      alt: options.alt?.trim() || null,
      is_primary: options.isPrimary || current.length === 0,
      sort_order: current.length,
    })
    .select()
    .single();
  if (insertError) {
    await supabase.storage.from("product-images").remove([path]);
    throw insertError;
  }
  return data;
}

export async function setPrimaryProductImage(productId: string, imageId: string) {
  const { error } = await supabase
    .from("product_images")
    .update({ is_primary: true })
    .eq("id", imageId)
    .eq("product_id", productId);
  if (error) throw error;
}

export async function reorderProductImages(imageIds: string[]) {
  const results = await Promise.all(
    imageIds.map((id, sortOrder) =>
      supabase.from("product_images").update({ sort_order: sortOrder }).eq("id", id),
    ),
  );
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
}

export async function deleteProductImage(image: { id: string; storage_path: string | null }) {
  if (image.storage_path) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove([image.storage_path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from("product_images").delete().eq("id", image.id);
  if (error) throw error;
}

export type ProductSalesReportRow = {
  product_id: string | null;
  sku: string;
  product_name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};
export type CategorySalesReportRow = {
  category_id: string | null;
  category_name: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};
export type CustomerSalesReportRow = {
  customer_id: string | null;
  customer_email: string;
  customer_name: string;
  orders_count: number;
  total_spent: number;
  avg_ticket: number;
  last_order_at: string;
};

async function reportRpc<T>(name: string, range: DateRange): Promise<T[]> {
  const { data, error } = await untypedSupabase.rpc(name, rangeArgs(range));
  if (error) throw error;
  return (data ?? []) as T[];
}

export const getProductSalesReport = (range: DateRange) =>
  reportRpc<ProductSalesReportRow>("get_product_sales_report", range);
export const getCategorySalesReport = (range: DateRange) =>
  reportRpc<CategorySalesReportRow>("get_category_sales_report", range);
export const getCustomerSalesReport = (range: DateRange) =>
  reportRpc<CustomerSalesReportRow>("get_customer_sales_report", range);

export async function listCustomerProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export type EmailDispatchRow = {
  order_id: string;
  status: "pending" | "processing" | "sent" | "failed";
  attempts: number;
  admin_sent_at: string | null;
  customer_sent_at: string | null;
  last_error: string | null;
  created_at: string;
};

export async function listEmailDispatches() {
  const { data, error } = await untypedSupabase
    .from("order_email_dispatches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as EmailDispatchRow[];
}

export async function retryOrderEmail(orderId: string) {
  const { error } = await supabase.functions.invoke("send-order-notification", {
    body: { order_id: orderId },
  });
  if (error) throw error;
}
