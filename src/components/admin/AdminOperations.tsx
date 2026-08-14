import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import {
  adjustStock,
  adminListCategories,
  adminListOrders,
  adminListProducts,
  createProduct,
  duplicateProduct,
  getSalesReport,
  setOrderStatus,
  setPaymentStatus,
  setProductStatus,
  updateProduct,
  upsertCategory,
} from "@/services/supabase/admin";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABEL,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABEL,
  type AdminProduct,
  type Order,
} from "@/types/store";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminOperations() {
  return (
    <Tabs defaultValue="products" className="mt-12">
      <TabsList className="h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="products">Productos</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
        <TabsTrigger value="reports">Reportes</TabsTrigger>
      </TabsList>
      <TabsContent value="products">
        <ProductsPanel />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesPanel />
      </TabsContent>
      <TabsContent value="orders">
        <OrdersPanel />
      </TabsContent>
      <TabsContent value="reports">
        <ReportsPanel />
      </TabsContent>
    </Tabs>
  );
}

function ProductsPanel() {
  const client = useQueryClient();
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminListProducts({}),
  });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: adminListCategories });
  const [draft, setDraft] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "0",
    category: "none",
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "products"] });
  const run = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await refresh();
      toast.success("Producto actualizado");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  async function create(event: React.FormEvent) {
    event.preventDefault();
    await run.mutateAsync(() =>
      createProduct({
        sku: draft.sku.trim(),
        name: draft.name.trim(),
        slug: slugify(draft.name),
        short_description: null,
        description: null,
        category_id: draft.category === "none" ? null : draft.category,
        brand: null,
        price: Number(draft.price),
        cost_price: Number(draft.cost),
        sale_price: null,
        stock: Number(draft.stock),
        min_stock: 5,
        unit: "unidad",
        ingredients: null,
        benefits: null,
        usage_mode: null,
        warnings: null,
        image_url: null,
        status: Number(draft.stock) > 0 ? "active" : "out_of_stock",
        is_featured: false,
      }),
    );
    setDraft({ name: "", sku: "", price: "", cost: "", stock: "0", category: "none" });
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={create} className="surface-panel grid gap-3 p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <Label>Producto nuevo</Label>
          <Input
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div>
          <Label>SKU</Label>
          <Input
            required
            value={draft.sku}
            onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
          />
        </div>
        <div>
          <Label>Precio</Label>
          <Input
            required
            min="0"
            type="number"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
        </div>
        <div>
          <Label>Costo</Label>
          <Input
            required
            min="0"
            type="number"
            value={draft.cost}
            onChange={(e) => setDraft({ ...draft, cost: e.target.value })}
          />
        </div>
        <div>
          <Label>Stock</Label>
          <Input
            required
            min="0"
            type="number"
            value={draft.stock}
            onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
          />
        </div>
        <div className="md:col-span-5">
          <Select
            value={draft.category}
            onValueChange={(category) => setDraft({ ...draft, category })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {(categories.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={run.isPending}>
          <Plus className="size-4" /> Crear
        </Button>
      </form>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(products.data ?? []).map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                busy={run.isPending}
                run={(operation) => run.mutate(operation)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  busy,
  run,
}: {
  product: AdminProduct;
  busy: boolean;
  run: (operation: () => Promise<unknown>) => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [cost, setCost] = useState(String(product.cost_price));
  const [stock, setStock] = useState(String(product.stock));
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.sku} · utilidad {formatMoney(Number(price) - Number(cost))}
        </p>
      </TableCell>
      <TableCell>
        <Input
          className="w-28"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() =>
            Number(price) !== product.price &&
            run(() => updateProduct(product.id, { price: Number(price) }))
          }
        />
      </TableCell>
      <TableCell>
        <Input
          className="w-28"
          type="number"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          onBlur={() =>
            Number(cost) !== product.cost_price &&
            run(() => updateProduct(product.id, { cost_price: Number(cost) }))
          }
        />
      </TableCell>
      <TableCell>
        <Input
          className="w-20"
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={() =>
            Number(stock) !== product.stock &&
            run(() => adjustStock(product.id, Number(stock), "Ajuste desde panel"))
          }
        />
      </TableCell>
      <TableCell>
        <Select
          value={product.status}
          onValueChange={(status) =>
            run(() => setProductStatus(product.id, status as AdminProduct["status"]))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {PRODUCT_STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => run(() => duplicateProduct(product))}
          aria-label="Duplicar"
        >
          <Copy className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function CategoriesPanel() {
  const client = useQueryClient();
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: adminListCategories });
  const [name, setName] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      upsertCategory({
        name,
        slug: slugify(name),
        description: null,
        image_url: null,
        is_active: true,
        sort_order: (categories.data?.length ?? 0) + 1,
        parent_id: null,
      }),
    onSuccess: async () => {
      setName("");
      await client.invalidateQueries({ queryKey: ["admin", "categories"] });
      toast.success("Categoría creada");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
  return (
    <div className="mt-6">
      <form
        className="flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
        />
        <Button disabled={mutation.isPending}>
          <Plus className="size-4" /> Crear
        </Button>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(categories.data ?? []).map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              /{item.slug} · {item.is_active ? "Activa" : "Inactiva"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersPanel() {
  const client = useQueryClient();
  const orders = useQuery({
    queryKey: ["admin", "orders", "operations"],
    queryFn: () => adminListOrders({}),
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", "orders"] });
      toast.success("Pedido actualizado");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
  return (
    <div className="mt-6 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Venta / utilidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Pago</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(orders.data ?? []).map((order) => (
            <OrderRow
              key={order.id}
              order={order as Order}
              run={(operation) => mutation.mutate(operation)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderRow({
  order,
  run,
}: {
  order: Order;
  run: (operation: () => Promise<unknown>) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{order.order_number}</TableCell>
      <TableCell>
        {order.customer_name}
        <p className="text-xs text-muted-foreground">{order.customer_email}</p>
      </TableCell>
      <TableCell>
        {formatMoney(order.total)}
        <p className="text-xs text-muted-foreground">
          Costo {formatMoney(order.total_cost)} · utilidad {formatMoney(order.gross_profit)}
        </p>
      </TableCell>
      <TableCell>
        <Select
          value={order.order_status}
          onValueChange={(status) =>
            run(() => setOrderStatus(order.id, status as Order["order_status"]))
          }
        >
          <SelectTrigger className="w-40">
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
      </TableCell>
      <TableCell>
        <Select
          value={order.payment_status}
          onValueChange={(status) =>
            run(() => setPaymentStatus(order.id, status as Order["payment_status"]))
          }
        >
          <SelectTrigger className="w-36">
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
      </TableCell>
    </TableRow>
  );
}

function ReportsPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const report = useQuery({
    queryKey: ["admin", "report", from, to],
    queryFn: () =>
      getSalesReport({ from: from ? `${from}T00:00:00` : null, to: to ? `${to}T23:59:59` : null }),
  });
  function exportCsv() {
    const header = "fecha,pedido,cliente,estado,pago,venta,costo,utilidad,margen";
    const rows = (report.data ?? []).map((row) =>
      [
        row.created_at,
        row.order_number,
        row.customer_name,
        row.order_status,
        row.payment_status,
        row.sales,
        row.cost,
        row.profit,
        row.margin,
      ]
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    );
    const url = URL.createObjectURL(
      new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-ventas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={exportCsv} disabled={!report.data?.length}>
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto">
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
            {(report.data ?? []).map((row) => (
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
      </div>
    </div>
  );
}
