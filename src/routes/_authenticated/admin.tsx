import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, DollarSign, Package, PiggyBank, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState, ErrorState, RowsSkeleton } from "@/components/store/StateBlocks";
import { AdminOperations } from "@/components/admin/AdminOperations";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getSalesByPeriod,
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

const TODAY = new Date().toISOString().slice(0, 10);
const THIRTY_DAYS_AGO = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

function nextDay(value: string) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

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
  const { isAdmin, loading, error, refetch } = useIsAdmin();
  useNotifications();
  const [from, setFrom] = useState(THIRTY_DAYS_AGO);
  const [to, setTo] = useState(TODAY);
  const range = { from: `${from}T00:00:00`, to: nextDay(to) };

  const summary = useQuery({
    queryKey: ["admin", "summary", range.from, range.to],
    enabled: isAdmin,
    queryFn: () => getSalesSummary(range),
  });
  const topProducts = useQuery({
    queryKey: ["admin", "top-products", range.from, range.to],
    enabled: isAdmin,
    queryFn: () => getTopProducts(range, 5),
  });
  const salesSeries = useQuery({
    queryKey: ["admin", "sales-series", range.from, range.to],
    enabled: isAdmin,
    queryFn: () => getSalesByPeriod(range.from, range.to, "day"),
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

  if (error) {
    return (
      <StoreLayout>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <ErrorState onRetry={() => void refetch()} />
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

  const stats = summary.data;

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="eyebrow">Administración</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Tablero financiero</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <div>
            <Label htmlFor="metrics-from">Desde</Label>
            <Input
              id="metrics-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="metrics-to">Hasta</Label>
            <Input
              id="metrics-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>

        {summary.error ? (
          <div className="mt-8">
            <ErrorState onRetry={() => void summary.refetch()} />
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Ventas"
              value={formatMoney(stats?.gross_sales)}
              hint={`${stats?.orders_count ?? 0} pedidos`}
              icon={DollarSign}
            />
            <StatCard label="Costos" value={formatMoney(stats?.total_cost)} icon={Package} />
            <StatCard label="Utilidad" value={formatMoney(stats?.gross_profit)} icon={PiggyBank} />
            <StatCard
              label="Margen"
              value={formatPercent(stats?.margin)}
              hint={`Ticket promedio ${formatMoney(stats?.avg_ticket)}`}
              icon={TrendingUp}
            />
          </div>
        )}

        <section className="mt-8 surface-panel p-5">
          <div>
            <p className="eyebrow">Tendencia</p>
            <h2 className="font-display text-2xl">Ventas, costos y utilidad</h2>
          </div>
          <div className="mt-5 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesSeries.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip formatter={(value) => formatMoney(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Ventas"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Costos"
                  stroke="#a16207"
                  fill="#a16207"
                  fillOpacity={0.08}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Utilidad"
                  stroke="#15803d"
                  fill="#15803d"
                  fillOpacity={0.08}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

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
                    <TableCell className="text-right">{row.units}</TableCell>
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
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
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
                  <TableCell className="font-medium">
                    <Button asChild variant="link" className="h-auto px-0">
                      <Link to="/pedido-admin/$id" params={{ id: order.id }}>
                        {order.order_number}
                      </Link>
                    </Button>
                  </TableCell>
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

        <AdminOperations />
      </div>
    </StoreLayout>
  );
}
