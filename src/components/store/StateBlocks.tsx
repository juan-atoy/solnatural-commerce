import { Link } from "@tanstack/react-router";
import { AlertTriangle, Leaf, PackageX, ShoppingBasket } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        {icon ?? <Leaf className="size-5" />}
      </div>
      <p className="font-display text-lg">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
      <AlertTriangle className="mb-3 size-6 text-destructive" />
      <p className="font-display text-lg">No pudimos cargar la información</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {message ?? "Revisa tu conexión e intenta nuevamente."}
      </p>
      {onRetry ? (
        <Button className="mt-5" variant="outline" onClick={onRetry}>
          Intentar de nuevo
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyCart() {
  return (
    <EmptyState
      icon={<ShoppingBasket className="size-5" />}
      title="Tu carrito está vacío"
      description="Descubre nuestros productos naturales y empieza tu ritual de bienestar."
      action={
        <Button asChild>
          <Link to="/catalogo">Ver catálogo</Link>
        </Button>
      }
    />
  );
}

export function NoProducts() {
  return (
    <EmptyState
      icon={<PackageX className="size-5" />}
      title="Sin resultados"
      description="Prueba con otra búsqueda, categoría u orden."
    />
  );
}
