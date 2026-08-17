import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
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
  const { notifications, unread, markRead, markAllRead } = useNotifications();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const addresses = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [address, setAddress] = useState({
    label: "Casa",
    recipient_name: "",
    phone: "",
    address_line: "",
    city: "",
    region: "",
    country: "Colombia",
    is_default: false,
  });

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

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      if (address.is_default) {
        const { error } = await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("addresses").insert({
        ...address,
        label: address.label || null,
        region: address.region || null,
        user_id: user.id,
      });
      if (error) throw error;
      setAddress({
        label: "Casa",
        recipient_name: "",
        phone: "",
        address_line: "",
        city: "",
        region: "",
        country: "Colombia",
        is_default: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Dirección guardada");
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSaving(false);
    }
  }

  async function removeAddress(id: string) {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) toast.error(friendlyError(error));
    else {
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Dirección eliminada");
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
                  {isAdmin && item.entity_type === "order" && item.entity_id ? (
                    <Button asChild variant="link" size="sm" className="mt-2 h-auto px-0">
                      <Link
                        to="/pedido-admin/$id"
                        params={{ id: item.entity_id }}
                        onClick={() => void markRead(item.id)}
                      >
                        Ver detalle del pedido
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">Mis direcciones</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <form onSubmit={saveAddress} className="surface-panel grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="address-label">Nombre</Label>
                <Input
                  id="address-label"
                  value={address.label}
                  onChange={(event) => setAddress({ ...address, label: event.target.value })}
                  placeholder="Casa u oficina"
                />
              </div>
              <div>
                <Label htmlFor="recipient">Destinatario</Label>
                <Input
                  id="recipient"
                  required
                  value={address.recipient_name}
                  onChange={(event) =>
                    setAddress({ ...address, recipient_name: event.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="address-phone">Teléfono</Label>
                <Input
                  id="address-phone"
                  required
                  value={address.phone}
                  onChange={(event) => setAddress({ ...address, phone: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address-city">Ciudad</Label>
                <Input
                  id="address-city"
                  required
                  value={address.city}
                  onChange={(event) => setAddress({ ...address, city: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address-line">Dirección</Label>
                <Input
                  id="address-line"
                  required
                  value={address.address_line}
                  onChange={(event) => setAddress({ ...address, address_line: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address-region">Departamento</Label>
                <Input
                  id="address-region"
                  value={address.region}
                  onChange={(event) => setAddress({ ...address, region: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="address-country">País</Label>
                <Input
                  id="address-country"
                  required
                  value={address.country}
                  onChange={(event) => setAddress({ ...address, country: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={address.is_default}
                  onChange={(event) => setAddress({ ...address, is_default: event.target.checked })}
                />{" "}
                Usar como dirección principal
              </label>
              <Button type="submit" disabled={saving} className="sm:col-span-2">
                Guardar dirección
              </Button>
            </form>
            <div className="space-y-3">
              {addresses.isLoading ? (
                <RowsSkeleton rows={2} />
              ) : (addresses.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes direcciones guardadas.</p>
              ) : (
                (addresses.data ?? []).map((item) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border p-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.label || "Dirección"}{" "}
                        {item.is_default ? (
                          <span className="text-xs text-primary">· Principal</span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.recipient_name} · {item.phone}
                        <br />
                        {item.address_line}
                        <br />
                        {item.city}
                        {item.region ? `, ${item.region}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar dirección"
                      onClick={() => void removeAddress(item.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </StoreLayout>
  );
}
