import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { EmptyCart, RowsSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Tu carrito | SolNatural´s" },
      { name: "description", content: "Revisa los productos naturales de tu carrito y continúa al pago." },
      { property: "og:title", content: "Tu carrito | SolNatural´s" },
      { property: "og:description", content: "Revisa tu selección antes de pagar." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { detailed, loading, subtotal, shipping, total, freeShippingMin, setQuantity, remove, clear } =
    useCart();

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl tracking-tight">Tu carrito</h1>

        <div className="mt-8">
          {loading ? (
            <RowsSkeleton />
          ) : detailed.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="divide-y rounded-2xl border">
                {detailed.map((line) => (
                  <div key={line.product_id} className="flex gap-4 p-4">
                    <img
                      src={line.product.image_url ?? "/images/hero.jpg"}
                      alt={line.product.name ?? "Producto"}
                      width={96}
                      height={96}
                      className="size-24 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <Link
                        to="/producto/$slug"
                        params={{ slug: line.product.slug! }}
                        className="font-medium hover:text-primary"
                      >
                        {line.product.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(line.unit_price)} · {line.product.unit}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <Input
                          type="number"
                          min={1}
                          max={line.product.stock ?? 99}
                          value={line.quantity}
                          aria-label={`Cantidad de ${line.product.name}`}
                          className="w-20"
                          onChange={(event) =>
                            void setQuantity(line.product_id, Number(event.target.value))
                          }
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(line.product_id)}
                          aria-label="Quitar producto"
                        >
                          <Trash2 className="size-4" /> Quitar
                        </Button>
                      </div>
                    </div>
                    <p className="font-display text-lg">{formatMoney(line.line_total)}</p>
                  </div>
                ))}
              </div>

              <aside className="surface-panel h-fit p-5">
                <p className="eyebrow">Resumen</p>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd>{formatMoney(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Envío</dt>
                    <dd>{shipping === 0 ? "Gratis" : formatMoney(shipping)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-display text-lg">
                    <dt>Total</dt>
                    <dd>{formatMoney(total)}</dd>
                  </div>
                </dl>
                {subtotal < freeShippingMin ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Te faltan {formatMoney(freeShippingMin - subtotal)} para envío gratis.
                  </p>
                ) : null}
                <Button asChild className="mt-5 w-full" size="lg">
                  <Link to="/checkout">Continuar al pago</Link>
                </Button>
                <Button variant="ghost" className="mt-2 w-full" onClick={() => void clear()}>
                  Vaciar carrito
                </Button>
              </aside>
            </div>
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
