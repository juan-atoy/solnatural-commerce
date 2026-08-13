import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { EmptyState, ErrorState, RowsSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";
import { fetchMyOrders } from "@/services/supabase/orders";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/types/store";

export const Route = createFileRoute("/_authenticated/mis-pedidos")({
  head: () => ({
    meta: [
      { title: "Mis pedidos | SolNatural´s" },
      { name: "description", content: "Consulta el estado y detalle de tus pedidos naturales." },
      { property: "og:title", content: "Mis pedidos | SolNatural´s" },
      { property: "og:description", content: "Historial y seguimiento de tus compras." },
    ],
  }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: fetchMyOrders });

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl tracking-tight">Mis pedidos</h1>

        <div className="mt-8 space-y-3">
          {orders.isLoading ? (
            <RowsSkeleton />
          ) : orders.error ? (
            <ErrorState onRetry={() => void orders.refetch()} />
          ) : (orders.data ?? []).length === 0 ? (
            <EmptyState
              title="Todavía no tienes pedidos"
              description="Cuando compres, verás aquí el estado de cada envío."
              action={
                <Button asChild>
                  <Link to="/catalogo">Ver catálogo</Link>
                </Button>
              }
            />
          ) : (
            (orders.data ?? []).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
                <div className="flex-1">
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                </div>
                <Badge variant="secondary">{ORDER_STATUS_LABEL[order.order_status]}</Badge>
                <Badge variant="outline">{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
                <p className="font-display text-lg">{formatMoney(order.total)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </StoreLayout>
  );
}
