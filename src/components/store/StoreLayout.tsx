import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { fetchCategories } from "@/services/supabase/catalog";
import { useQuery } from "@tanstack/react-query";

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src="/logo.png"
        alt="SolNatural's"
        className="h-12 w-auto"
      />
    </Link>
  );
}
function CartButton() {
  const { count } = useCart();
  return (
    <Button asChild variant="ghost" size="sm" className="relative">
      <Link to="/carrito" aria-label="Ver carrito">
        <ShoppingBag className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
            {count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

function AccountMenu() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/auth">Ingresar</Link>
      </Button>
    );
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <User className="size-5" />
          <span className="hidden sm:inline">Mi cuenta</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/mi-cuenta">
            <User className="size-4" /> Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/mis-pedidos">
            <Package className="size-4" /> Mis pedidos
          </Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <LayoutDashboard className="size-4" /> Panel administrativo
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CategoryLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  return (
    <>
      {(data ?? []).map((category) => (
        <Link
          key={category.id}
          to="/categoria/$slug"
          params={{ slug: category.slug }}
          onClick={onNavigate}
          className="text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {category.name}
        </Link>
      ))}
    </>
  );
}

export function StoreLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const { data: settings } = useStoreSettings();

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    void navigate({ to: "/catalogo", search: { q: term || undefined, page: 1 } });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-primary py-2 text-center text-xs text-primary-foreground">
        {settings?.shipping_message ?? "Envíos a todo el país · Productos 100% naturales"}
      </div>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-6">
              <SheetTitle className="font-display text-xl">Navegar</SheetTitle>
              <nav className="mt-6 flex flex-col gap-4">
                <Link to="/catalogo" onClick={() => setOpen(false)} className="text-sm font-medium">
                  Todo el catálogo
                </Link>
                <CategoryLinks onNavigate={() => setOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          <Brand />

          <nav className="ml-6 hidden items-center gap-5 lg:flex">
            <Link
              to="/catalogo"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Catálogo
            </Link>
            <CategoryLinks />
          </nav>

          <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Buscar productos"
                className="pl-9"
                aria-label="Buscar productos"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <CartButton />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="mt-20 border-t bg-cream">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Brand />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Productos naturales seleccionados con criterio: fórmulas limpias, ingredientes
              trazables y resultados reales para tu bienestar diario.
            </p>
          </div>
          <div>
            <p className="eyebrow">Tienda</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/catalogo" className="hover:text-primary">
                Catálogo
              </Link>
              <Link to="/carrito" className="hover:text-primary">
                Carrito
              </Link>
              <Link to="/mis-pedidos" className="hover:text-primary">
                Mis pedidos
              </Link>
            </div>
          </div>
          <div>
            <p className="eyebrow">Contacto</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <span>{settings?.email}</span>
              <span>{settings?.phone}</span>
              <span>{settings?.address}</span>
            </div>
          </div>
        </div>
        <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} SolNatural´s · Precios en {settings?.currency ?? "COP"}
        </div>
      </footer>
    </div>
  );
}
