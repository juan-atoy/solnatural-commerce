import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductImageManager } from "@/components/admin/ProductImageManager";
import {
  AdminReportsPanel,
  AuditPanel,
  CustomersPanel,
  InventoryPanel,
  NotificationsPanel,
  SettingsPanel,
} from "@/components/admin/AdminExtendedPanels";

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
  type Category,
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
    <Tabs defaultValue="dashboard" className="mt-12" id="administracion">
      <TabsList
        className="h-auto w-full flex-wrap justify-start gap-1"
        aria-label="Menú administrativo"
      >
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="orders">Pedidos</TabsTrigger>
        <TabsTrigger value="products">Productos</TabsTrigger>
        <TabsTrigger value="categories">Categorías</TabsTrigger>
        <TabsTrigger value="inventory">Inventario</TabsTrigger>
        <TabsTrigger value="customers">Clientes</TabsTrigger>
        <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
        <TabsTrigger value="reports">Reportes</TabsTrigger>
        <TabsTrigger value="settings">Configuración</TabsTrigger>
        <TabsTrigger value="audit">Auditoría</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard">
        <div className="surface-panel mt-6 p-6">
          <h2 className="font-display text-2xl">Resumen administrativo</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Los indicadores, la tendencia, el inventario bajo y los pedidos recientes están en la
            parte superior de esta página.
          </p>
          <Button className="mt-4" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Ir al dashboard
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="products">
        <ProductsPanel />
      </TabsContent>
      <TabsContent value="categories">
        <CategoriesPanel />
      </TabsContent>
      <TabsContent value="orders">
        <OrdersPanel />
      </TabsContent>
      <TabsContent value="inventory">
        <InventoryPanel />
      </TabsContent>
      <TabsContent value="customers">
        <CustomersPanel />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationsPanel />
      </TabsContent>
      <TabsContent value="reports">
        <AdminReportsPanel />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="audit">
        <AuditPanel />
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
        <ProductImageManager product={product} />
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
  const emptyForm = {
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
    sort_order: (categories.data?.length ?? 0) + 1,
    parent_id: "",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: (categories.data?.length ?? 0) + 1 });
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      is_active: category.is_active,
      sort_order: category.sort_order,
      parent_id: category.parent_id ?? "",
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      upsertCategory({
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
        parent_id: form.parent_id || null,
      }, editingId ?? undefined),
    onSuccess: async () => {
      const wasEditing = Boolean(editingId);
      await client.invalidateQueries({ queryKey: ["admin", "categories"] });
      resetForm();
      toast.success(wasEditing ? "Categoría actualizada" : "Categoría creada");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });
  return (
    <div className="mt-6">
      <form
        className="surface-panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="category-name">Nombre</Label>
          <Input
            id="category-name"
            required
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value, slug: slugify(e.target.value) })
            }
            placeholder="Nombre de la categoría"
          />
        </div>
        <div>
          <Label htmlFor="category-slug">Slug</Label>
          <Input
            id="category-slug"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
            placeholder="nombre-categoria"
          />
        </div>
        <div>
          <Label htmlFor="category-order">Orden</Label>
          <Input
            id="category-order"
            type="number"
            min={0}
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="category-description">Descripción</Label>
          <Input
            id="category-description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descripción opcional"
          />
        </div>
        <div>
          <Label htmlFor="category-parent">Categoría padre</Label>
          <Select
            value={form.parent_id || "none"}
            onValueChange={(value) =>
              setForm({ ...form, parent_id: value === "none" ? "" : value })
            }
          >
            <SelectTrigger id="category-parent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría padre</SelectItem>
              {(categories.data ?? [])
                .filter((category) => category.id !== editingId)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="category-image">URL de imagen</Label>
          <Input
            id="category-image"
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label htmlFor="category-status">Estado</Label>
          <Select
            value={form.is_active ? "active" : "inactive"}
            onValueChange={(value) => setForm({ ...form, is_active: value === "active" })}
          >
            <SelectTrigger id="category-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="inactive">Inactiva</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <Button disabled={mutation.isPending}>
            {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editingId ? "Guardar cambios" : "Crear categoría"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="size-4" /> Cancelar edición
            </Button>
          ) : null}
        </div>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(categories.data ?? []).map((item) => (
          <div key={item.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  /{item.slug} · {item.is_active ? "Activa" : "Inactiva"} · orden {item.sort_order}
                </p>
                {item.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startEditing(item)}
              >
                <Pencil className="size-4" /> Editar
              </Button>
            </div>
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
      <TableCell className="font-medium">
        <Button asChild variant="link" className="h-auto px-0">
          <Link to="/pedido-admin/$id" params={{ id: order.id }}>
            {order.order_number}
          </Link>
        </Button>
      </TableCell>
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
