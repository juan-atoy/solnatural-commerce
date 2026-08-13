import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/store/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar o crear cuenta | SolNatural´s" },
      { name: "description", content: "Accede a tu cuenta SolNatural´s para seguir tus pedidos." },
      { property: "og:title", content: "Ingresar | SolNatural´s" },
      { property: "og:description", content: "Accede a tu cuenta SolNatural´s." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    if (user) void navigate({ to: "/mi-cuenta", replace: true });
  }, [user, navigate]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bienvenido de vuelta");
      void navigate({ to: "/mi-cuenta" });
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName },
          emailRedirectTo: `${window.location.origin}/mi-cuenta`,
        },
      });
      if (error) throw error;
      toast.success("Cuenta creada. Revisa tu correo si se requiere confirmación.");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("No pudimos conectar con Google.");
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/mi-cuenta" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl tracking-tight">Tu cuenta SolNatural´s</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Guarda tu carrito, sigue tus pedidos y recibe novedades.
        </p>

        <Tabs defaultValue="signin" className="mt-8">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">
              Ingresar
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              Crear cuenta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Ingresar
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div>
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email2">Correo</Label>
                <Input
                  id="email2"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="password2">Contraseña</Label>
                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Crear cuenta
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> o <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" onClick={google} disabled={busy}>
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Al continuar aceptas nuestras políticas.{" "}
          <Link to="/catalogo" className="underline">
            Volver al catálogo
          </Link>
        </p>
      </div>
    </StoreLayout>
  );
}
