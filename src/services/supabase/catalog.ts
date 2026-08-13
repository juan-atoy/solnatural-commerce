import { supabase } from "@/integrations/supabase/client";
import type { Category, PublicProduct } from "@/types/store";

export type CatalogSort = "recent" | "price_asc" | "price_desc" | "name_asc";

export type CatalogQuery = {
  search?: string;
  categorySlug?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
  onlyFeatured?: boolean;
};

const PUBLIC_COLUMNS =
  "id,sku,name,slug,short_description,category_id,category_name,category_slug,brand,price,sale_price,stock,unit,image_url,status,is_featured,created_at";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchCatalog(query: CatalogQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 12;
  const from = (page - 1) * pageSize;

  let request = supabase
    .from("products_public")
    .select(PUBLIC_COLUMNS, { count: "exact" })
    .in("status", ["active", "out_of_stock"]);

  if (query.categorySlug) request = request.eq("category_slug", query.categorySlug);
  if (query.onlyFeatured) request = request.eq("is_featured", true);
  if (query.search && query.search.trim().length > 1) {
    const term = `%${query.search.trim()}%`;
    request = request.or(`name.ilike.${term},short_description.ilike.${term},brand.ilike.${term}`);
  }

  switch (query.sort) {
    case "price_asc":
      request = request.order("price", { ascending: true });
      break;
    case "price_desc":
      request = request.order("price", { ascending: false });
      break;
    case "name_asc":
      request = request.order("name", { ascending: true });
      break;
    default:
      request = request.order("created_at", { ascending: false });
  }

  const { data, error, count } = await request.range(from, from + pageSize - 1);
  if (error) throw error;
  return { items: (data ?? []) as PublicProduct[], total: count ?? 0, page, pageSize };
}

export async function fetchFeaturedProducts(limit = 8): Promise<PublicProduct[]> {
  const { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_COLUMNS)
    .eq("is_featured", true)
    .in("status", ["active", "out_of_stock"])
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PublicProduct[];
}

export async function fetchNewProducts(limit = 4): Promise<PublicProduct[]> {
  const { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_COLUMNS)
    .in("status", ["active", "out_of_stock"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PublicProduct[];
}

export async function fetchProductBySlug(slug: string): Promise<PublicProduct | null> {
  const { data, error } = await supabase
    .from("products_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchRelatedProducts(
  categoryId: string | null,
  excludeId: string,
  limit = 4,
): Promise<PublicProduct[]> {
  let request = supabase
    .from("products_public")
    .select(PUBLIC_COLUMNS)
    .in("status", ["active", "out_of_stock"])
    .neq("id", excludeId)
    .limit(limit);
  if (categoryId) request = request.eq("category_id", categoryId);
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []) as PublicProduct[];
}

export async function fetchProductsByIds(ids: string[]): Promise<PublicProduct[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("products_public")
    .select(PUBLIC_COLUMNS)
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as PublicProduct[];
}

export async function fetchStoreSettings() {
  const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export function effectivePrice(product: Pick<PublicProduct, "price" | "sale_price">) {
  return Number(product.sale_price ?? product.price);
}

export function isPurchasable(product: Pick<PublicProduct, "status" | "stock">) {
  return product.status === "active" && (product.stock ?? 0) > 0;
}
