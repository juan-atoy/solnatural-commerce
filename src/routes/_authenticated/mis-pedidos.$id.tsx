import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ErrorState, RowsSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatMoney } from "@/lib/format";
import { fetchMyOrder, fetchOrderTimeline } from "@/services/supabase/orders";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/types/store";

export const Route = createFileRoute("/_authenticated/mis-pedidos/$id")({
  component: MyOrderDetailPage,
});

function MyOrderDetailPage() {
  const { id } = Route.useParams();
  const detail = useQuery({ queryKey: ["my-order", id], queryFn: () => fetchMyOrder(id) });
  const timeline = useQuery({
    queryKey: ["my-order-timeline", id],
    queryFn: () => fetchOrderTimeline(id),
  });

  if (detail.isLoading)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <RowsSkeleton />
        </div>
      </StoreLayout>
    );
  if (detail.error || !detail.data?.order)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-4xl px-4 py-10">
          <ErrorState />
        </div>
      </StoreLayout>
    );

  const { order, items } = detail.data;
  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/mis-pedidos">← Mis pedidos</Link>
        </Button>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Pedido</p>
            <h1 className="font-display text-3xl">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Badge>{ORDER_STATUS_LABEL[order.order_status]}</Badge>
            <Badge variant="outline">{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          <section className="surface-panel p-5">
            <h2 className="font-display text-xl">Productos</h2>
            <ul className="mt-4 divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.quantity} × {item.product_name}
                  </span>
                  <span>{formatMoney(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-4 font-display text-xl">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </section>
          <aside className="space-y-6">
            <section className="surface-panel p-5">
              <h2 className="font-display text-lg">Entrega</h2>
              <p className="mt-3 text-sm">
                {order.customer_name}
                <br />
                {order.shipping_address}
                <br />
                {order.shipping_city}
                {order.shipping_region ? `, ${order.shipping_region}` : ""}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {PAYMENT_METHOD_LABEL[order.payment_method]}
              </p>
            </section>
            <section>
              <h2 className="font-display text-lg">Seguimiento</h2>
              <ol className="mt-3 space-y-3">
                {(timeline.data ?? []).map((event) => (
                  <li key={event.id} className="border-l-2 border-primary pl-3 text-sm">
                    <p>{ORDER_STATUS_LABEL[event.to_status]}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}
