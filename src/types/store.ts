import type { Database } from "@/integrations/supabase/types";

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type MovementType = Database["public"]["Enums"]["movement_type"];
export type AppRole = Database["public"]["Enums"]["app_role"];

/** Public product shape (no cost or profit data ever reaches the client). */
export type PublicProduct = Database["public"]["Views"]["products_public"]["Row"];
/** Admin product shape, includes cost data. */
export type AdminProduct = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Address = Database["public"]["Tables"]["addresses"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type MyOrderItem = Database["public"]["Views"]["my_order_items"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type InventoryMovement = Database["public"]["Tables"]["inventory_movements"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type StoreSettings = Database["public"]["Tables"]["store_settings"]["Row"];

export type ShippingMethod = {
  code: string;
  name: string;
  type: "delivery" | "pickup";
  enabled: boolean;
  customer_cost: number;
  company_cost: number;
  free_from: number;
  estimated_days: string;
};

export function parseShippingMethods(value: unknown): ShippingMethod[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ShippingMethod => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ShippingMethod>;
    return (
      typeof candidate.code === "string" &&
      typeof candidate.name === "string" &&
      (candidate.type === "delivery" || candidate.type === "pickup") &&
      typeof candidate.enabled === "boolean" &&
      typeof candidate.customer_cost === "number" &&
      typeof candidate.company_cost === "number" &&
      typeof candidate.free_from === "number" &&
      typeof candidate.estimated_days === "string"
    );
  });
}

export type SalesSummary = Database["public"]["Functions"]["get_sales_summary"]["Returns"][number];
export type SalesByPeriod =
  Database["public"]["Functions"]["get_sales_by_period"]["Returns"][number];
export type TopProduct = Database["public"]["Functions"]["get_top_products"]["Returns"][number];
export type SalesByCategory =
  Database["public"]["Functions"]["get_sales_by_category"]["Returns"][number];
export type LowStockProduct =
  Database["public"]["Functions"]["get_low_stock_products"]["Returns"][number];
export type TopCustomer = Database["public"]["Functions"]["get_top_customers"]["Returns"][number];
export type SalesReportRow = Database["public"]["Functions"]["get_sales_report"]["Returns"][number];
export type OrdersByStatus =
  Database["public"]["Functions"]["get_orders_by_status"]["Returns"][number];

export type CartLine = {
  product_id: string;
  quantity: number;
};

export type CartLineDetailed = CartLine & {
  product: PublicProduct;
  unit_price: number;
  line_total: number;
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "En preparación",
  ready: "Listo para envío",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pago pendiente",
  paid: "Pagado",
  failed: "Pago fallido",
  refunded: "Reembolsado",
};

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  out_of_stock: "Agotado",
  discontinued: "Descontinuado",
  inactive: "Inactivo",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Transferencia bancaria",
  cash_on_delivery: "Pago contraentrega",
};

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  purchase: "Compra",
  sale: "Venta",
  return: "Devolución",
  adjustment: "Ajuste",
  cancellation: "Cancelación",
  manual_entry: "Entrada manual",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

export const PRODUCT_STATUSES: ProductStatus[] = [
  "draft",
  "active",
  "out_of_stock",
  "discontinued",
  "inactive",
];
