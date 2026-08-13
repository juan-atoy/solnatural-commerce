import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductCard } from "@/components/store/ProductCard";
import { ErrorState, EmptyState } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCart } from "@/hooks/use-cart";
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import {
  effectivePrice,
  fetchProductBySlug,
  fetchRelatedProducts,
  isPurchasable,
} from "@/services/supabase/catalog";

export const Route = createFileRoute("/producto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | SolNatural´s` },
      {
        name: "description",
        content: "Ficha completa del producto natural: beneficios, ingredientes y modo de uso.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} | SolNatural´s` },
      {
        property: "og:description",
        content: "Beneficios, ingredientes y modo de uso del producto.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const product = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const result = await fetchProductBySlug(slug);
      if (!result) throw notFound();
      return result;
    },
  });

  const related = useQuery({
    queryKey: ["related", product.data?.id ?? null],
    enabled: Boolean(product.data?.id),
    queryFn: () => fetchRelatedProducts(product.data!.category_id ?? null, product.data!.id!),
  });

  if (product.isLoading) {
    return (
      <StoreLayout>
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-12 w-40" />
          </div>
        </div>
      </StoreLayout>
    );
  }

  if (product.error || !product.data) {
    return (
      <StoreLayout>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <EmptyState
            title="Producto no disponible"
            description="Este producto no existe o dejó de publicarse."
            action={
              <Button asChild>
                <Link to="/catalogo">Volver al catálogo</Link>
              </Button>
            }
          />
        </div>
      </StoreLayout>
    );
  }

  const item = product.data;
  const price = effectivePrice(item);
  const hasPromo = item.sale_price != null && Number(item.sale_price) < Number(item.price);
  const stock = item.stock ?? 0;
  const purchasable = isPurchasable(item);

  async function handleAdd() {
    setBusy(true);
    try {
      await add(item.id!, quantity);
      toast.success(`${quantity} × ${item.name} agregado al carrito`);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <nav className="text-sm text-muted-foreground">
          <Link to="/catalogo" className="hover:text-primary">
            Catálogo
          </Link>
          {item.category_slug ? (
            <>
              {" / "}
              <Link
                to="/categoria/$slug"
                params={{ slug: item.category_slug }}
                className="hover:text-primary"
              >
                {item.category_name}
              </Link>
            </>
          ) : null}
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="overflow-hidden rounded-3xl border bg-cream">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name ?? "Producto natural"}
                width={1200}
                height={1200}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-muted-foreground">
                SolNatural´s
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">{item.category_name}</p>
              {hasPromo ? <Badge className="bg-accent text-accent-foreground">Promoción</Badge> : null}
            </div>
            <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight">{item.name}</h1>
            <p className="mt-3 text-muted-foreground">{item.short_description}</p>

            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-3xl">{formatMoney(price)}</span>
              {hasPromo ? (
                <span className="text-sm text-muted-foreground line-through">
                  {formatMoney(item.price)}
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">/ {item.unit}</span>
            </div>

            <p className="mt-2 text-sm">
              {purchasable ? (
                <span className="text-primary">Disponible · {stock} unidades en stock</span>
              ) : (
                <span className="text-destructive">Sin stock por el momento</span>
              )}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Disminuir cantidad"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-10 text-center text-sm font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Aumentar cantidad"
                  onClick={() => setQuantity((value) => Math.min(Math.max(stock, 1), value + 1))}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button size="lg" onClick={handleAdd} disabled={!purchasable || busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />}
                Agregar al carrito
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/carrito">Ir al carrito</Link>
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="surface-panel flex items-start gap-3 p-4">
                <Truck className="mt-0.5 size-4 text-primary" />
                <p className="text-sm text-muted-foreground">Envío nacional en 24-48 h hábiles.</p>
              </div>
              <div className="surface-panel flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                <p className="text-sm text-muted-foreground">
                  Stock verificado al confirmar tu pedido.
                </p>
              </div>
            </div>

            <Tabs defaultValue="description" className="mt-10">
              <TabsList>
                <TabsTrigger value="description">Descripción</TabsTrigger>
                <TabsTrigger value="benefits">Beneficios</TabsTrigger>
                <TabsTrigger value="usage">Modo de uso</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="whitespace-pre-line text-sm text-muted-foreground">
                {item.description ?? "Sin descripción adicional."}
                {item.ingredients ? (
                  <p className="mt-4">
                    <span className="font-medium text-foreground">Ingredientes: </span>
                    {item.ingredients}
                  </p>
                ) : null}
              </TabsContent>
              <TabsContent value="benefits" className="whitespace-pre-line text-sm text-muted-foreground">
                {item.benefits ?? "Sin beneficios registrados."}
              </TabsContent>
              <TabsContent value="usage" className="whitespace-pre-line text-sm text-muted-foreground">
                {item.usage_mode ?? "Sigue las indicaciones del empaque."}
                {item.warnings ? (
                  <p className="mt-4 text-destructive">Advertencias: {item.warnings}</p>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <section className="mt-20">
          <h2 className="font-display text-2xl tracking-tight">También te puede gustar</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {(related.data ?? []).map((other) => (
              <ProductCard key={other.id} product={other} />
            ))}
          </div>
          {related.error ? <ErrorState /> : null}
        </section>
      </div>
    </StoreLayout>
  );
}
