import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Printer, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNotifications } from "@/hooks/use-notifications";
import { useStoreSettings } from "@/hooks/use-store-settings";
import type { Json } from "@/integrations/supabase/types";
import { friendlyError } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  getCategorySalesReport,
  getCustomerSalesReport,
  getProductSalesReport,
  getSalesReport,
  listAdminNotifications,
  listAuditLogs,
  listCustomerProfiles,
  listEmailDispatches,
  listInventoryMovements,
  retryOrderEmail,
  updateStoreSettings,
  type CategorySalesReportRow,
  type CustomerSalesReportRow,
  type ProductSalesReportRow,
} from "@/services/supabase/admin";
import { MOVEMENT_TYPE_LABEL, parseShippingMethods, type ShippingMethod } from "@/types/store";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function InventoryPanel() {
  const movements = useQuery({
    queryKey: ["admin", "inventory-movements"],
    queryFn: () => listInventoryMovements(),
  });
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Movimientos de inventario</h2>
          <p className="text-sm text-muted-foreground">Últimos 200 movimientos con trazabilidad.</p>
        </div>
        <Button
          variant="outline"
          disabled={!movements.data?.length}
          onClick={() =>
            downloadCsv(
              "inventario.csv",
              ["fecha", "producto", "tipo", "cantidad", "stock_anterior", "stock_nuevo", "notas"],
              (movements.data ?? []).map((row) => [
                row.created_at,
                row.product_id,
                row.movement_type,
                row.quantity,
                row.previous_stock,
                row.new_stock,
                row.notes,
              ]),
            )
          }
        >
          <Download className="size-4" /> CSV
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(movements.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDateTime(row.created_at)}</TableCell>
                <TableCell className="font-mono text-xs">{row.product_id.slice(0, 8)}</TableCell>
                <TableCell>{MOVEMENT_TYPE_LABEL[row.movement_type]}</TableCell>
                <TableCell className={row.quantity < 0 ? "text-destructive" : "text-primary"}>
                  {row.quantity > 0 ? "+" : ""}
                  {row.quantity}
                </TableCell>
                <TableCell>
                  {row.previous_stock} → {row.new_stock}
                </TableCell>
                <TableCell>{row.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function CustomersPanel() {
  const profiles = useQuery({ queryKey: ["admin", "profiles"], queryFn: listCustomerProfiles });
  const customers = useQuery({
    queryKey: ["admin", "customer-report", null, null],
    queryFn: () => getCustomerSalesReport({ from: null, to: null }),
  });
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            {profiles.data?.length ?? 0} perfiles registrados.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={!customers.data?.length}
          onClick={() =>
            downloadCsv(
              "clientes.csv",
              ["correo", "cliente", "pedidos", "total", "ticket_promedio", "ultima_compra"],
              (customers.data ?? []).map((row) => [
                row.customer_email,
                row.customer_name,
                row.orders_count,
                row.total_spent,
                row.avg_ticket,
                row.last_order_at,
              ]),
            )
          }
        >
          <Download className="size-4" /> CSV
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Total comprado</TableHead>
              <TableHead>Ticket promedio</TableHead>
              <TableHead>Última compra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(customers.data ?? []).map((row) => (
              <TableRow key={`${row.customer_id}-${row.customer_email}`}>
                <TableCell>
                  {row.customer_name}
                  <p className="text-xs text-muted-foreground">{row.customer_email}</p>
                </TableCell>
                <TableCell>{row.orders_count}</TableCell>
                <TableCell>{formatMoney(row.total_spent)}</TableCell>
                <TableCell>{formatMoney(row.avg_ticket)}</TableCell>
                <TableCell>{formatDateTime(row.last_order_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function NotificationsPanel() {
  const queryClient = useQueryClient();
  const { markRead, markAllRead } = useNotifications();
  const notifications = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: listAdminNotifications,
  });
  const dispatches = useQuery({
    queryKey: ["admin", "email-dispatches"],
    queryFn: listEmailDispatches,
  });
  const retry = useMutation({
    mutationFn: retryOrderEmail,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "email-dispatches"] });
      toast.success("Reintento de correo ejecutado");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
  return (
    <section className="mt-6">
      <Tabs defaultValue="realtime">
        <TabsList>
          <TabsTrigger value="realtime">En la aplicación</TabsTrigger>
          <TabsTrigger value="email">Correos</TabsTrigger>
        </TabsList>
        <TabsContent value="realtime">
          <div className="my-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => void markAllRead()}>
              Marcar todas leídas
            </Button>
          </div>
          <div className="space-y-3">
            {(notifications.data ?? []).map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border p-4 ${item.is_read ? "" : "bg-secondary/50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.entity_type === "order" && item.entity_id ? (
                      <Button asChild size="sm">
                        <Link
                          to="/pedido-admin/$id"
                          params={{ id: item.entity_id }}
                          onClick={() => void markRead(item.id)}
                        >
                          Ver pedido
                        </Link>
                      </Button>
                    ) : null}
                    {!item.is_read ? (
                      <Button variant="ghost" size="sm" onClick={() => void markRead(item.id)}>
                        Leída
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="email">
          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Intentos</TableHead>
                  <TableHead>Administrador</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dispatches.data ?? []).map((row) => (
                  <TableRow key={row.order_id}>
                    <TableCell>
                      <Button asChild variant="link" className="px-0">
                        <Link to="/pedido-admin/$id" params={{ id: row.order_id }}>
                          {row.order_id.slice(0, 8)}
                        </Link>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "sent"
                            ? "default"
                            : row.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.attempts}/5</TableCell>
                    <TableCell>{row.admin_sent_at ? "Enviado" : "Pendiente"}</TableCell>
                    <TableCell>{row.customer_sent_at ? "Enviado" : "Pendiente"}</TableCell>
                    <TableCell className="max-w-48 truncate">{row.last_error || "—"}</TableCell>
                    <TableCell>
                      {row.status === "failed" && row.attempts < 5 ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(row.order_id)}
                        >
                          <RefreshCw className="size-4" /> Reintentar
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

type ReportKind = "sales" | "products" | "categories" | "customers";

export function AdminReportsPanel() {
  const [kind, setKind] = useState<ReportKind>("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = useMemo(
    () => ({ from: from ? `${from}T00:00:00` : null, to: to ? `${to}T23:59:59.999` : null }),
    [from, to],
  );
  const sales = useQuery({
    queryKey: ["admin", "sales-report", range],
    enabled: kind === "sales",
    queryFn: () => getSalesReport(range),
  });
  const products = useQuery({
    queryKey: ["admin", "product-report", range],
    enabled: kind === "products",
    queryFn: () => getProductSalesReport(range),
  });
  const categories = useQuery({
    queryKey: ["admin", "category-report", range],
    enabled: kind === "categories",
    queryFn: () => getCategorySalesReport(range),
  });
  const customers = useQuery({
    queryKey: ["admin", "customer-report", range],
    enabled: kind === "customers",
    queryFn: () => getCustomerSalesReport(range),
  });

  const exportCurrent = () => {
    if (kind === "sales")
      downloadCsv(
        "reporte-ventas.csv",
        ["fecha", "pedido", "cliente", "estado", "pago", "venta", "costo", "utilidad", "margen"],
        (sales.data ?? []).map((row) => [
          row.created_at,
          row.order_number,
          row.customer_name,
          row.order_status,
          row.payment_status,
          row.sales,
          row.cost,
          row.profit,
          row.margin,
        ]),
      );
    if (kind === "products")
      downloadCsv(
        "reporte-productos.csv",
        ["sku", "producto", "unidades", "venta", "costo", "utilidad", "margen"],
        (products.data ?? []).map((row) => [
          row.sku,
          row.product_name,
          row.units,
          row.revenue,
          row.cost,
          row.profit,
          row.margin,
        ]),
      );
    if (kind === "categories")
      downloadCsv(
        "reporte-categorias.csv",
        ["categoria", "unidades", "venta", "costo", "utilidad", "margen"],
        (categories.data ?? []).map((row) => [
          row.category_name,
          row.units,
          row.revenue,
          row.cost,
          row.profit,
          row.margin,
        ]),
      );
    if (kind === "customers")
      downloadCsv(
        "reporte-clientes.csv",
        ["correo", "cliente", "pedidos", "total", "ticket_promedio", "ultima_compra"],
        (customers.data ?? []).map((row) => [
          row.customer_email,
          row.customer_name,
          row.orders_count,
          row.total_spent,
          row.avg_ticket,
          row.last_order_at,
        ]),
      );
  };

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Reporte</Label>
          <Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Ventas</SelectItem>
              <SelectItem value="products">Productos</SelectItem>
              <SelectItem value="categories">Categorías</SelectItem>
              <SelectItem value="customers">Clientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Desde</Label>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </div>
        <Button onClick={exportCurrent}>
          <Download className="size-4" /> CSV
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimir / PDF
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto">
        {kind === "sales" ? <SalesTable rows={sales.data ?? []} /> : null}
        {kind === "products" ? <ProductReportTable rows={products.data ?? []} /> : null}
        {kind === "categories" ? <CategoryReportTable rows={categories.data ?? []} /> : null}
        {kind === "customers" ? <CustomerReportTable rows={customers.data ?? []} /> : null}
      </div>
    </section>
  );
}

function SalesTable({ rows }: { rows: Awaited<ReturnType<typeof getSalesReport>> }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pedido</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Venta</TableHead>
          <TableHead>Costo</TableHead>
          <TableHead>Utilidad</TableHead>
          <TableHead>Margen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.order_number}>
            <TableCell>{row.order_number}</TableCell>
            <TableCell>{row.customer_name}</TableCell>
            <TableCell>{formatMoney(row.sales)}</TableCell>
            <TableCell>{formatMoney(row.cost)}</TableCell>
            <TableCell>{formatMoney(row.profit)}</TableCell>
            <TableCell>{row.margin}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function ProductReportTable({ rows }: { rows: ProductSalesReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Unidades</TableHead>
          <TableHead>Venta</TableHead>
          <TableHead>Costo</TableHead>
          <TableHead>Utilidad</TableHead>
          <TableHead>Margen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.product_id}-${row.product_name}`}>
            <TableCell>
              {row.product_name}
              <p className="text-xs text-muted-foreground">{row.sku}</p>
            </TableCell>
            <TableCell>{row.units}</TableCell>
            <TableCell>{formatMoney(row.revenue)}</TableCell>
            <TableCell>{formatMoney(row.cost)}</TableCell>
            <TableCell>{formatMoney(row.profit)}</TableCell>
            <TableCell>{row.margin}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function CategoryReportTable({ rows }: { rows: CategorySalesReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Categoría</TableHead>
          <TableHead>Unidades</TableHead>
          <TableHead>Venta</TableHead>
          <TableHead>Costo</TableHead>
          <TableHead>Utilidad</TableHead>
          <TableHead>Margen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.category_id}-${row.category_name}`}>
            <TableCell>{row.category_name}</TableCell>
            <TableCell>{row.units}</TableCell>
            <TableCell>{formatMoney(row.revenue)}</TableCell>
            <TableCell>{formatMoney(row.cost)}</TableCell>
            <TableCell>{formatMoney(row.profit)}</TableCell>
            <TableCell>{row.margin}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
function CustomerReportTable({ rows }: { rows: CustomerSalesReportRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Pedidos</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Ticket</TableHead>
          <TableHead>Última compra</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.customer_id}-${row.customer_email}`}>
            <TableCell>
              {row.customer_name}
              <p className="text-xs text-muted-foreground">{row.customer_email}</p>
            </TableCell>
            <TableCell>{row.orders_count}</TableCell>
            <TableCell>{formatMoney(row.total_spent)}</TableCell>
            <TableCell>{formatMoney(row.avg_ticket)}</TableCell>
            <TableCell>{formatDateTime(row.last_order_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const emptyShippingMethod = (): ShippingMethod => ({
  code: "",
  name: "",
  type: "delivery",
  enabled: true,
  customer_cost: 0,
  company_cost: 0,
  free_from: 0,
  estimated_days: "",
});

export function SettingsPanel() {
  const settings = useStoreSettings();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    store_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    instagram: "",
    facebook: "",
    shipping_message: "",
    currency: "COP",
    bank_details: "",
    default_shipping_method: "standard",
    payment_methods: ["bank_transfer", "cash_on_delivery"] as string[],
  });
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  useEffect(() => {
    if (!settings.data) return;
    setForm({
      store_name: settings.data.store_name,
      email: settings.data.email ?? "",
      phone: settings.data.phone ?? "",
      whatsapp: settings.data.whatsapp ?? "",
      address: settings.data.address ?? "",
      instagram: settings.data.instagram ?? "",
      facebook: settings.data.facebook ?? "",
      shipping_message: settings.data.shipping_message ?? "",
      currency: settings.data.currency,
      bank_details: settings.data.bank_details ?? "",
      default_shipping_method: settings.data.default_shipping_method,
      payment_methods: settings.data.payment_methods,
    });
    setMethods(parseShippingMethods(settings.data.shipping_methods));
  }, [settings.data]);
  const save = useMutation({
    mutationFn: () =>
      updateStoreSettings({ ...form, shipping_methods: methods as unknown as Json }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Configuración guardada");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
  const setMethod = (index: number, patch: Partial<ShippingMethod>) =>
    setMethods((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  const togglePayment = (value: string) =>
    setForm({
      ...form,
      payment_methods: form.payment_methods.includes(value)
        ? form.payment_methods.filter((method) => method !== value)
        : [...form.payment_methods, value],
    });
  return (
    <section className="mt-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="space-y-8"
      >
        <div className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <Label>Nombre de la tienda</Label>
            <Input
              value={form.store_name}
              onChange={(event) => setForm({ ...form, store_name: event.target.value })}
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <Input
              value={form.currency}
              maxLength={3}
              onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <Label>Correo</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
            />
          </div>
          <div>
            <Label>Dirección</Label>
            <Input
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
            />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input
              value={form.instagram}
              onChange={(event) => setForm({ ...form, instagram: event.target.value })}
            />
          </div>
          <div>
            <Label>Facebook</Label>
            <Input
              value={form.facebook}
              onChange={(event) => setForm({ ...form, facebook: event.target.value })}
            />
          </div>
          <div>
            <Label>Método de envío predeterminado</Label>
            <Select
              value={form.default_shipping_method}
              onValueChange={(value) => setForm({ ...form, default_shipping_method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method.code} value={method.code}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Métodos de pago</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.payment_methods.includes("bank_transfer")}
                  onChange={() => togglePayment("bank_transfer")}
                />{" "}
                Transferencia
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.payment_methods.includes("cash_on_delivery")}
                  onChange={() => togglePayment("cash_on_delivery")}
                />{" "}
                Contraentrega
              </label>
            </div>
          </fieldset>
          <div className="sm:col-span-2">
            <Label>Mensaje de envíos</Label>
            <Textarea
              value={form.shipping_message}
              onChange={(event) => setForm({ ...form, shipping_message: event.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Datos bancarios</Label>
            <Textarea
              value={form.bank_details}
              onChange={(event) => setForm({ ...form, bank_details: event.target.value })}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Métodos de entrega</h2>
              <p className="text-sm text-muted-foreground">
                El servidor vuelve a calcular el costo al crear el pedido.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMethods([...methods, emptyShippingMethod()])}
            >
              Agregar método
            </Button>
          </div>
          <div className="mt-4 space-y-4">
            {methods.map((method, index) => (
              <div
                key={`${method.code}-${index}`}
                className="grid gap-3 rounded-xl border p-4 md:grid-cols-4"
              >
                <div>
                  <Label>Código</Label>
                  <Input
                    required
                    value={method.code}
                    onChange={(event) =>
                      setMethod(index, {
                        code: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Nombre</Label>
                  <Input
                    required
                    value={method.name}
                    onChange={(event) => setMethod(index, { name: event.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={method.type}
                    onValueChange={(value) =>
                      setMethod(index, { type: value as ShippingMethod["type"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delivery">Domicilio</SelectItem>
                      <SelectItem value="pickup">Recogida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={(event) => setMethod(index, { enabled: event.target.checked })}
                  />{" "}
                  Activo
                </label>
                <div>
                  <Label>Cobro al cliente</Label>
                  <Input
                    type="number"
                    min="0"
                    value={method.customer_cost}
                    onChange={(event) =>
                      setMethod(index, { customer_cost: Number(event.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Costo empresa</Label>
                  <Input
                    type="number"
                    min="0"
                    value={method.company_cost}
                    onChange={(event) =>
                      setMethod(index, { company_cost: Number(event.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Gratis desde</Label>
                  <Input
                    type="number"
                    min="0"
                    value={method.free_from}
                    onChange={(event) =>
                      setMethod(index, { free_from: Number(event.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Tiempo estimado</Label>
                  <Input
                    value={method.estimated_days}
                    onChange={(event) => setMethod(index, { estimated_days: event.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={save.isPending}>
          <Save className="size-4" /> Guardar configuración
        </Button>
      </form>
    </section>
  );
}

export function AuditPanel() {
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: listAuditLogs });
  return (
    <section className="mt-6">
      <h2 className="font-display text-2xl">Auditoría</h2>
      <div className="mt-5 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(audit.data ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDateTime(row.created_at)}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>
                  {row.entity} · {row.entity_id?.slice(0, 8)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.user_id?.slice(0, 8) ?? "sistema"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
