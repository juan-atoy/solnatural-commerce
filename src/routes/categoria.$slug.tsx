import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ProductCard } from "@/components/store/ProductCard";
import { ErrorState, NoProducts, ProductGridSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { fetchCatalog, fetchCategories } from "@/services/supabase/catalog";

export const Route = createFileRoute("/categoria/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Categoría ${params.slug} | SolNatural´s` },
      {
        name: "description",
        content: `Productos naturales de la categoría ${params.slug} seleccionados por SolNatural´s.`,
      },
      { property: "og:title", content: `Categoría ${params.slug} | SolNatural´s` },
      {
        property: "og:description",
        content: "Selección natural por categoría en SolNatural´s.",
      },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const catalog = useQuery({
    queryKey: ["catalog-category", slug],
    queryFn: () => fetchCatalog({ categorySlug: slug, pageSize: 24 }),
  });

  const category = (categories.data ?? []).find((item) => item.slug === slug);

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <p className="eyebrow">Categoría</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">{category?.name ?? slug}</h1>
        {category?.description ? (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{category.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/catalogo">Todo el catálogo</Link>
          </Button>
          {(categories.data ?? [])
            .filter((item) => item.slug !== slug)
            .map((item) => (
              <Button key={item.id} asChild variant="ghost" size="sm">
                <Link to="/categoria/$slug" params={{ slug: item.slug }}>
                  {item.name}
                </Link>
              </Button>
            ))}
        </div>

        <div className="mt-10">
          {catalog.isLoading ? (
            <ProductGridSkeleton />
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
      </div>
    </StoreLayout>
  );
}
