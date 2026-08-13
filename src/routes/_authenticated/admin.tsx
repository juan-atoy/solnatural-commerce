import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, DollarSign, Package, PiggyBank, TrendingUp } from "lucide-react";

import { EmptyState, ErrorState, RowsSkeleton } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import {
  getLowStockProducts,
  getSalesSummary,
  getTopProducts,
  adminListOrders,
} from "@/services/supabase/admin";
import { ORDER_STATUS_LABEL } from "@/types/store";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Panel administrativo | SolNatural´s" },
      { name: "description", content: "Ventas, costos, utilidad e inventario en tiempo real." },
      { property: "og:title", content: "Panel administrativo | SolNatural´s" },
      { property: "og:description", content: "Métricas financieras y operativas de la tienda." },
    ],
  }),
  component: AdminDashboard,
});

const RANGE = { from: null, to: null };

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof DollarSign;
}) {
  return (
    <div className="surface-panel p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 font-display text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function AdminDashboard() {
  const { isAdmin, loading } = useIsAdmin();
  useNotifications();

  const summary = useQuery({
    queryKey: ["admin", "summary"],
    enabled: isAdmin,
    queryFn: () => getSalesSummary(RANGE),
  });
  const topProducts = useQuery({
    queryKey: ["admin", "top-products"],
    enabled: isAdmin,
    queryFn: () => getTopProducts(RANGE, 5),
  });
  const lowStock = useQuery({
    queryKey: ["admin", "low-stock"],
    enabled: isAdmin,
    queryFn: getLowStockProducts,
  });
  const orders = useQuery({
    queryKey: ["admin", "orders"],
    enabled: isAdmin,
    queryFn: () => adminListOrders({}),
  });

  if (loading) {
    return (
      <StoreLayout>
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <RowsSkeleton rows={4} />
        </div>
      </StoreLayout>
    );
  }

  if (!isAdmin) {
    return (
      <StoreLayout>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <EmptyState
            icon={<AlertTriangle className="size-5" />}
            title="Acceso restringido"
            description="Esta sección es solo para administradores de la tienda."
            action={
              <Button asChild>
                <Link to="/">Volver al inicio</Link>
              </Button>
            }
          />
        </div>
      </StoreLayout>
    );
  }

  const stats = summary.data?.[0];

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Tablero financiero</h1>

        {summary.error ? (
          <div className="mt-8">
            <ErrorState onRetry={() => void summary.refetch()} />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Ventas"
              value={formatMoney(stats?.total_revenue)}
              hint={`${stats?.total_orders ?? 0} pedidos`}
              icon={DollarSign}
            />
            <StatCard label="Costos" value={formatMoney(stats?.total_cost)} icon={Package} />
            <StatCard label="Utilidad" value={formatMoney(stats?.total_profit)} icon={PiggyBank} />
            <StatCard
              label="Margen"
              value={formatPercent(stats?.margin_percent)}
              hint={`Ticket promedio ${formatMoney(stats?.average_order_value)}`}
              icon={TrendingUp}
            />
          </div>
        )}

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-2xl tracking-tight">Productos más vendidos</h2>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Uds.</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(topProducts.data ?? []).map((row) => (
                  <TableRow key={row.product_id}>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell className="text-right">{row.units_sold}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section>
            <h2 className="font-display text-2xl tracking-tight">Inventario bajo</h2>
            <Table className="mt-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lowStock.data ?? []).map((row) => (
                  <TableRow key={row.product_id}>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell className="text-right">{row.stock}</TableCell>
                    <TableCell className="text-right">{row.min_stock}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="font-display text-2xl tracking-tight">Pedidos recientes</h2>
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders.data ?? []).slice(0, 10).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer_name}</TableCell>
                  <TableCell>{formatDateTime(order.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ORDER_STATUS_LABEL[order.order_status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(order.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </div>
    </StoreLayout>
  );
}
