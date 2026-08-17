import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, RowsSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/errors";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import {
  adminGetOrder,
  setOrderNotes,
  setOrderStatus,
  setPaymentStatus,
} from "@/services/supabase/admin";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  type OrderStatus,
  type PaymentStatus,
} from "@/types/store";

export const Route = createFileRoute("/_authenticated/pedido-admin/$id")({
  head: () => ({ meta: [{ title: "Detalle administrativo del pedido | SolNatural´s" }] }),
  component: AdminOrderDetailPage,
});

function AdminOrderDetailPage() {
  const { id } = Route.useParams();
  const { isAdmin, loading } = useIsAdmin();
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: ["admin", "order", id],
    enabled: isAdmin,
    queryFn: () => adminGetOrder(id),
  });
  const [notes, setNotes] = useState("");
  useEffect(() => setNotes(detail.data?.order?.notes ?? ""), [detail.data?.order?.notes]);
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "order", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
      ]);
      toast.success("Pedido actualizado");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  if (loading || detail.isLoading)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <RowsSkeleton rows={5} />
        </div>
      </StoreLayout>
    );
  if (!isAdmin)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState
            icon={<AlertTriangle className="size-5" />}
            title="Acceso restringido"
            description="Este pedido sólo puede consultarlo un administrador."
          />
        </div>
      </StoreLayout>
    );
  const order = detail.data?.order;
  if (!order)
    return (
      <StoreLayout>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState
            title="Pedido no encontrado"
            description="El pedido no existe o fue eliminado."
          />
        </div>
      </StoreLayout>
    );
  const margin =
    Number(order.subtotal) > 0 ? (Number(order.gross_profit) * 100) / Number(order.subtotal) : 0;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <Button asChild variant="ghost">
          <Link to="/admin">← Panel administrativo</Link>
        </Button>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Detalle administrativo</p>
            <h1 className="font-display text-4xl">{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="flex gap-2">
            <Badge>{ORDER_STATUS_LABEL[order.order_status]}</Badge>
            <Badge variant="outline">{PAYMENT_STATUS_LABEL[order.payment_status]}</Badge>
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Venta" value={formatMoney(order.subtotal)} />
          <Metric label="Costo" value={formatMoney(order.total_cost)} />
          <Metric label="Utilidad" value={formatMoney(order.gross_profit)} />
          <Metric label="Margen" value={formatPercent(margin)} />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="font-display text-2xl">Productos</h2>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Utilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(detail.data?.items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_name}
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{formatMoney(item.line_total)}</TableCell>
                    <TableCell>{formatMoney(item.line_cost)}</TableCell>
                    <TableCell>{formatMoney(item.line_profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <h2 className="mt-8 font-display text-2xl">Historial</h2>
            <ol className="mt-4 space-y-3">
              {(detail.data?.history ?? []).map((event) => (
                <li key={event.id} className="border-l-2 border-primary pl-4">
                  <p className="text-sm font-medium">{ORDER_STATUS_LABEL[event.to_status]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.created_at)}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <aside className="space-y-5">
            <div className="surface-panel p-5">
              <h2 className="font-display text-xl">Cliente y entrega</h2>
              <p className="mt-3 text-sm">
                {order.customer_name}
                <br />
                {order.customer_email}
                <br />
                {order.customer_phone}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {order.shipping_method_name}
                <br />
                {order.shipping_address}
                <br />
                {order.shipping_city}, {order.shipping_region || order.shipping_country}
              </p>
            </div>
            <div className="surface-panel space-y-4 p-5">
              <div>
                <Label>Estado del pedido</Label>
                <Select
                  value={order.order_status}
                  onValueChange={(value) =>
                    mutation.mutate(() => setOrderStatus(order.id, value as OrderStatus))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {ORDER_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado del pago</Label>
                <Select
                  value={order.payment_status}
                  onValueChange={(value) =>
                    mutation.mutate(() => setPaymentStatus(order.id, value as PaymentStatus))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {PAYMENT_STATUS_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin-notes">Notas internas</Label>
                <Textarea
                  id="admin-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(() => setOrderNotes(order.id, notes))}
              >
                Guardar notas
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </StoreLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
