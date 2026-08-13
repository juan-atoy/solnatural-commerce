import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ShieldCheck, Sprout, Truck } from "lucide-react";

import { ProductCard } from "@/components/store/ProductCard";
import { ErrorState, ProductGridSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { fetchCategories, fetchFeaturedProducts, fetchNewProducts } from "@/services/supabase/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SolNatural´s | Productos naturales para tu bienestar" },
      {
        name: "description",
        content:
          "Compra suplementos, superalimentos e infusiones naturales. Envíos a todo el país y precios transparentes.",
      },
      { property: "og:title", content: "SolNatural´s | Productos naturales" },
      {
        property: "og:description",
        content: "Suplementos, superalimentos y cuidado corporal 100% natural.",
      },
    ],
  }),
  component: Home,
});

const PILLARS = [
  { icon: Sprout, title: "Ingredientes trazables", text: "Cada lote con origen verificado." },
  { icon: ShieldCheck, title: "Fórmulas limpias", text: "Sin rellenos ni aditivos innecesarios." },
  { icon: Truck, title: "Envío nacional", text: "Despacho en 24-48 horas hábiles." },
  { icon: Leaf, title: "Empaques conscientes", text: "Materiales reciclables y reutilizables." },
];

function Home() {
  const featured = useQuery({ queryKey: ["featured"], queryFn: () => fetchFeaturedProducts(8) });
  const recent = useQuery({ queryKey: ["recent"], queryFn: () => fetchNewProducts(4) });
  const categories = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  return (
    <StoreLayout>
      <section className="surface-hero">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="eyebrow">Bienestar natural</p>
            <h1 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Rituales simples con ingredientes que tu cuerpo reconoce
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Seleccionamos suplementos, superalimentos y cuidado corporal de origen natural, con
              fórmulas limpias y stock siempre verificado antes de cobrarte.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/catalogo">Explorar catálogo</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/catalogo" search={{ sort: "price_asc", page: 1 }}>
                  Ver mejores precios
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src="/images/hero.jpg"
              alt="Composición de productos naturales SolNatural´s sobre fondo botánico"
              width={1200}
              height={900}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {PILLARS.map((pillar) => (
          <div key={pillar.title} className="surface-panel p-5">
            <pillar.icon className="size-5 text-primary" />
            <p className="mt-3 font-medium">{pillar.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{pillar.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6">
        <p className="eyebrow">Categorías</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(categories.data ?? []).map((category) => (
            <Button key={category.id} asChild variant="secondary" size="sm">
              <Link to="/categoria/$slug" params={{ slug: category.slug }}>
                {category.name}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Selección</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight">Destacados de la temporada</h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/catalogo">Ver todo</Link>
          </Button>
        </div>
        {featured.isLoading ? (
          <ProductGridSkeleton />
        ) : featured.error ? (
          <ErrorState onRetry={() => void featured.refetch()} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {(featured.data ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6">
          <p className="eyebrow">Recién llegados</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight">Novedades en tienda</h2>
        </div>
        {recent.isLoading ? (
          <ProductGridSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {(recent.data ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </StoreLayout>
  );
}
