import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { ProductCard } from "@/components/store/ProductCard";
import { ErrorState, NoProducts, ProductGridSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCatalog, fetchCategories, type CatalogSort } from "@/services/supabase/catalog";

type CatalogSearch = {
  q?: string;
  category?: string;
  sort?: CatalogSort;
  page?: number;
};

const SORTS: { value: CatalogSort; label: string }[] = [
  { value: "recent", label: "Más recientes" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc", label: "Nombre A-Z" },
];

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    ...(typeof search["q"] === "string" && search["q"] ? { q: search["q"] } : {}),
    ...(typeof search["category"] === "string" && search["category"]
      ? { category: search["category"] }
      : {}),
    ...(SORTS.some((item) => item.value === search["sort"])
      ? { sort: search["sort"] as CatalogSort }
      : {}),
    page: Number(search["page"]) > 0 ? Number(search["page"]) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de productos naturales | SolNatural´s" },
      {
        name: "description",
        content:
          "Explora suplementos, superalimentos, infusiones y cuidado corporal natural. Filtra por categoría y precio.",
      },
      { property: "og:title", content: "Catálogo | SolNatural´s" },
      {
        property: "og:description",
        content: "Todos nuestros productos naturales en un solo lugar.",
      },
    ],
  }),
  component: CatalogPage,
});

const PAGE_SIZE = 12;

function CatalogPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const catalog = useQuery({
    queryKey: ["catalog", search],
    queryFn: () =>
      fetchCatalog({
        ...(search.q ? { search: search.q } : {}),
        ...(search.category ? { categorySlug: search.category } : {}),
        sort: search.sort ?? "recent",
        page: search.page ?? 1,
        pageSize: PAGE_SIZE,
      }),
  });

  const total = catalog.data?.total ?? 0;
  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function update(next: Partial<CatalogSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }) });
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Todos los productos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {total} {total === 1 ? "producto disponible" : "productos disponibles"}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input
            defaultValue={search.q ?? ""}
            placeholder="Buscar por nombre o marca"
            aria-label="Buscar productos"
            onChange={(event) => {
              const value = event.target.value;
              window.clearTimeout((window as unknown as { __t?: number }).__t);
              (window as unknown as { __t?: number }).__t = window.setTimeout(
                () => update({ ...(value ? { q: value } : { q: undefined }) }),
                350,
              );
            }}
          />
          <Select
            value={search.category ?? "all"}
            onValueChange={(value) => update({ category: value === "all" ? undefined : value })}
          >
            <SelectTrigger className="sm:w-52" aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={search.sort ?? "recent"}
            onValueChange={(value) => update({ sort: value as CatalogSort })}
          >
            <SelectTrigger className="sm:w-56" aria-label="Ordenar productos">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-10">
          {catalog.isLoading ? (
            <ProductGridSkeleton count={PAGE_SIZE} />
          ) : catalog.error ? (
            <ErrorState onRetry={() => void catalog.refetch()} />
          ) : (catalog.data?.items.length ?? 0) === 0 ? (
            <NoProducts />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {catalog.data!.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {pages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => update({ page: page - 1 })}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => update({ page: page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        ) : null}
      </div>
    </StoreLayout>
  );
}
