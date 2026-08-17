import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyError } from "@/lib/errors";
import {
  deleteProductImage,
  listProductImages,
  reorderProductImages,
  setPrimaryProductImage,
  uploadProductImage,
} from "@/services/supabase/admin";
import type { AdminProduct } from "@/types/store";

export function ProductImageManager({ product }: { product: AdminProduct }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [primary, setPrimary] = useState(false);
  const queryKey = ["admin", "product-images", product.id];
  const images = useQuery({
    queryKey,
    enabled: open,
    queryFn: () => listProductImages(product.id),
  });
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["admin", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
      ]);
      toast.success("Galería actualizada");
    },
    onError: (error) => toast.error(friendlyError(error)),
  });

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    await mutation.mutateAsync(() =>
      uploadProductImage(product.id, file, { alt, isPrimary: primary }),
    );
    setFile(null);
    setAlt("");
    setPrimary(false);
  }

  function move(index: number, direction: -1 | 1) {
    const rows = [...(images.data ?? [])];
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target]!, rows[index]!];
    mutation.mutate(() => reorderProductImages(rows.map((item) => item.id)));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Gestionar imágenes de ${product.name}`}>
          <ImagePlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imágenes de {product.name}</DialogTitle>
          <DialogDescription>
            JPG, PNG, WebP o AVIF, máximo 5 MB. La imagen principal aparece en el catálogo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={upload} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`product-image-${product.id}`}>Archivo</Label>
            <Input
              id={`product-image-${product.id}`}
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label htmlFor={`product-alt-${product.id}`}>Texto alternativo</Label>
            <Input
              id={`product-alt-${product.id}`}
              required
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              placeholder={`Presentación de ${product.name}`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={primary}
              onChange={(event) => setPrimary(event.target.checked)}
            />
            Usar como imagen principal
          </label>
          <Button type="submit" disabled={!file || mutation.isPending}>
            <ImagePlus className="size-4" /> Subir imagen
          </Button>
        </form>

        <div className="grid gap-3 sm:grid-cols-2">
          {(images.data ?? []).map((image, index) => (
            <article key={image.id} className="overflow-hidden rounded-xl border">
              <img
                src={image.url}
                alt={image.alt ?? product.name}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center gap-1 p-3">
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {image.alt || "Sin descripción"}
                </p>
                <Button
                  variant={image.is_primary ? "secondary" : "ghost"}
                  size="sm"
                  disabled={image.is_primary || mutation.isPending}
                  onClick={() =>
                    mutation.mutate(() => setPrimaryProductImage(product.id, image.id))
                  }
                  aria-label="Marcar como principal"
                >
                  <Star className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === 0 || mutation.isPending}
                  onClick={() => move(index, -1)}
                  aria-label="Mover antes"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === (images.data?.length ?? 0) - 1 || mutation.isPending}
                  onClick={() => move(index, 1)}
                  aria-label="Mover después"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(() => deleteProductImage(image))}
                  aria-label="Eliminar imagen"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
