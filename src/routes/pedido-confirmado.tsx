import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/pedido-confirmado")({
  validateSearch: (search: Record<string, unknown>) => ({
    number: typeof search["number"] === "string" ? search["number"] : "",
    total: Number(search["total"]) || 0,
  }),
  head: () => ({
    meta: [
      { title: "Pedido confirmado | SolNatural´s" },
      { name: "description", content: "Tu pedido fue registrado correctamente en SolNatural´s." },
      { property: "og:title", content: "Pedido confirmado | SolNatural´s" },
      { property: "og:description", content: "Gracias por tu compra natural." },
    ],
  }),
  component: OrderConfirmed,
});

function OrderConfirmed() {
  const { number, total } = Route.useSearch();

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center sm:px-6">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-6 font-display text-4xl tracking-tight">¡Gracias por tu compra!</h1>
        <p className="mt-3 text-muted-foreground">
          Tu pedido {number ? <strong>{number}</strong> : null} fue registrado y ya estamos
          preparándolo. Te avisaremos por correo cuando cambie de estado.
        </p>
        {total ? <p className="mt-4 font-display text-2xl">{formatMoney(total)}</p> : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/mis-pedidos">Ver mis pedidos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/catalogo">Seguir comprando</Link>
          </Button>
        </div>
      </div>
    </StoreLayout>
  );
}
