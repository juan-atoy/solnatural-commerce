import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyCart } from "@/components/store/StateBlocks";
import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { createOrder } from "@/services/supabase/orders";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/types/store";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar compra | SolNatural´s" },
      { name: "description", content: "Completa tus datos de envío y confirma tu pedido natural." },
      { property: "og:title", content: "Finalizar compra | SolNatural´s" },
      { property: "og:description", content: "Checkout seguro con validación de inventario." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user } = useAuth();
  const { lines, detailed, subtotal, shipping, total, clear, loading } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: user?.email ?? "",
    customer_phone: "",
    shipping_address: "",
    shipping_city: "",
    shipping_region: "",
    notes: "",
  });
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: event.target.value })),
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const order = await createOrder({
        items: lines,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        shipping_address: form.shipping_address,
        shipping_city: form.shipping_city,
        shipping_region: form.shipping_region || null,
        payment_method: method,
        notes: form.notes || null,
      });
      await clear();
      toast.success(`Pedido ${order.order_number} confirmado`);
      void navigate({
        to: "/pedido-confirmado",
        search: { number: order.order_number, total: order.total },
      });
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loading && detailed.length === 0) {
    return (
      <StoreLayout>
        <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <EmptyCart />
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="space-y-5">
          <h1 className="font-display text-4xl tracking-tight">Finalizar compra</h1>
          {!user ? (
            <p className="text-sm text-muted-foreground">
              Compras como invitado.{" "}
              <Link to="/auth" className="text-primary underline">
                Inicia sesión
              </Link>{" "}
              para guardar tu historial de pedidos.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" required {...field("customer_name")} />
            </div>
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" required {...field("customer_email")} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" required {...field("customer_phone")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="address">Dirección de envío</Label>
              <Input id="address" required {...field("shipping_address")} />
            </div>
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input id="city" required {...field("shipping_city")} />
            </div>
            <div>
              <Label htmlFor="region">Departamento / región</Label>
              <Input id="region" {...field("shipping_region")} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="method">Método de pago</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notas para el envío (opcional)</Label>
              <Textarea id="notes" rows={3} {...field("notes")} />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmar pedido
          </Button>
          <p className="text-xs text-muted-foreground">
            El inventario y los precios se validan en el servidor al confirmar; nunca se cobra más de
            lo disponible.
          </p>
        </form>

        <aside className="surface-panel h-fit p-5">
          <p className="eyebrow">Tu pedido</p>
          <ul className="mt-4 space-y-3 text-sm">
            {detailed.map((line) => (
              <li key={line.product_id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {line.quantity} × {line.product.name}
                </span>
                <span>{formatMoney(line.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Envío</dt>
              <dd>{shipping === 0 ? "Gratis" : formatMoney(shipping)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 font-display text-lg">
              <dt>Total</dt>
              <dd>{formatMoney(total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </StoreLayout>
  );
}
