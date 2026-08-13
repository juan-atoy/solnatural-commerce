import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StoreLayout } from "@/components/store/StoreLayout";
import { RowsSkeleton } from "@/components/store/StateBlocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin, useProfile } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { friendlyError } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/mi-cuenta")({
  head: () => ({
    meta: [
      { title: "Mi cuenta | SolNatural´s" },
      { name: "description", content: "Administra tus datos personales y notificaciones." },
      { property: "og:title", content: "Mi cuenta | SolNatural´s" },
      { property: "og:description", content: "Tus datos y notificaciones en SolNatural´s." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const { notifications, unread, markAllRead } = useNotifications();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setForm({
        first_name: profile.data.first_name ?? "",
        last_name: profile.data.last_name ?? "",
        phone: profile.data.phone ?? "",
      });
    }
  }, [profile.data]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({ id: user.id, ...form });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Datos actualizados");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <StoreLayout>
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2">
        <section>
          <h1 className="font-display text-3xl tracking-tight">Mi cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

          <form onSubmit={save} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="first">Nombre</Label>
              <Input
                id="first"
                value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="last">Apellido</Label>
              <Input
                id="last"
                value={form.last_name}
                onChange={(event) => setForm({ ...form, last_name: event.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <Button type="submit" disabled={saving}>
              Guardar cambios
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/mis-pedidos">Mis pedidos</Link>
            </Button>
            {isAdmin ? (
              <Button asChild>
                <Link to="/admin">Panel administrativo</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">Notificaciones</h2>
            {unread > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => void markAllRead()}>
                Marcar todas como leídas
              </Button>
            ) : null}
          </div>
          <div className="mt-4 space-y-2">
            {profile.isLoading ? (
              <RowsSkeleton rows={3} />
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no tienes notificaciones.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 ${item.is_read ? "" : "bg-secondary/60"}`}
                >
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}
