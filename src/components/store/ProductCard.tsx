import { Link } from "@tanstack/react-router";
import { Loader2, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { effectivePrice, isPurchasable } from "@/services/supabase/catalog";
import type { PublicProduct } from "@/types/store";

export function ProductCard({ product }: { product: PublicProduct }) {
  const { add } = useCart();
  const [busy, setBusy] = useState(false);
  const price = effectivePrice(product);
  const hasPromo = product.sale_price != null && Number(product.sale_price) < Number(product.price);
  const purchasable = isPurchasable(product);

  async function handleAdd() {
    setBusy(true);
    try {
      await add(product.id!, 1);
      toast.success("Producto agregado al carrito");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="hover-lift group flex flex-col overflow-hidden rounded-2xl border bg-card">
      <Link
        to="/producto/$slug"
        params={{ slug: product.slug! }}
        className="relative block aspect-square overflow-hidden bg-cream"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name ?? "Producto natural"}
            loading="lazy"
            width={900}
            height={900}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            SolNatural´s
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-col gap-2">
          {hasPromo ? <Badge className="bg-accent text-accent-foreground">Promoción</Badge> : null}
          {product.status === "out_of_stock" ? <Badge variant="secondary">Agotado</Badge> : null}
          {product.status === "discontinued" ? (
            <Badge variant="outline">Descontinuado</Badge>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1">
          <p className="eyebrow">{product.category_name ?? "SolNatural´s"}</p>
          <h3 className="mt-1 line-clamp-2 text-base leading-snug">
            <Link to="/producto/$slug" params={{ slug: product.slug! }} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.short_description}</p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="font-display text-lg">{formatMoney(price)}</p>
            {hasPromo ? (
              <p className="text-xs text-muted-foreground line-through">{formatMoney(product.price)}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{product.unit}</p>
            )}
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!purchasable || busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShoppingBag className="size-4" />
            )}
            {purchasable ? "Agregar" : "Agotado"}
          </Button>
        </div>
      </div>
    </article>
  );
}
