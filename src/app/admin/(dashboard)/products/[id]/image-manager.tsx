"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  deleteImageAction,
  updateImageAction,
  uploadProductImageAction,
} from "@/app/admin/(dashboard)/actions";
import { emptyActionState, type ActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductImageDto } from "@/lib/types";

export function ImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageDto[];
}) {
  const [state, action] = useActionState(uploadProductImageAction, emptyActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      if (state.ok) {
        formRef.current?.reset();
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <form ref={formRef} action={action} className="border border-dashed border-line bg-ink/40 p-5">
        <input type="hidden" name="productId" value={productId} />
        <p className="font-sans text-[0.68rem] font-semibold tracking-[0.16em] text-cream uppercase">
          Upload image
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          JPEG, PNG, WebP or AVIF, up to 12 MB. Images are re-encoded to WebP; metadata is stripped.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="image-file">Image file</Label>
            <input
              id="image-file"
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="block w-full text-xs text-muted file:mr-3 file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-[0.65rem] file:font-semibold file:tracking-[0.12em] file:text-sand file:uppercase hover:file:border-gold hover:file:text-gold"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image-alt">Alt text</Label>
            <Input id="image-alt" name="altText" placeholder="Describe the image" maxLength={160} />
          </div>
          <SubmitButton pendingLabel="Uploading…">
            <ImagePlus aria-hidden="true" />
            Upload
          </SubmitButton>
        </div>
        {state.message && !state.ok ? (
          <p role="alert" className="mt-3 text-xs text-danger">
            {state.message}
          </p>
        ) : null}
      </form>

      {images.length === 0 ? (
        <p className="border border-line px-4 py-8 text-center text-sm text-muted">
          No images yet. A published product needs at least one image.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li key={image.id} className="border border-line bg-ink/40">
              <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                <Image
                  src={image.url}
                  alt={image.altText || `Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                />
                <span className="absolute top-2 left-2 bg-ink/80 px-2 py-0.5 text-[0.55rem] tracking-[0.12em] text-sand uppercase">
                  {index === 0 ? "Cover" : `Position ${index + 1}`}
                </span>
              </div>
              <ImageEditForm image={image} productId={productId} />
              <div className="border-t border-line px-4 py-3">
                <DeleteImageButton imageId={image.id} productId={productId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImageEditForm({ image, productId }: { image: ProductImageDto; productId: string }) {
  const [state, action] = useActionState(updateImageAction, emptyActionState);
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (state.message && state.message !== lastMessage.current) {
      lastMessage.current = state.message;
      if (state.ok) toast.success(state.message);
      else toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={action} className="space-y-3 p-4">
      <input type="hidden" name="imageId" value={image.id} />
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1.5">
        <Label htmlFor={`alt-${image.id}`}>Alt text</Label>
        <Input
          id={`alt-${image.id}`}
          name="altText"
          defaultValue={image.altText}
          maxLength={160}
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="w-24 space-y-1.5">
          <Label htmlFor={`sort-${image.id}`}>Order</Label>
          <Input
            id={`sort-${image.id}`}
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={image.sortOrder}
          />
        </div>
        <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
          Save
        </SubmitButton>
      </div>
      {state.message && !state.ok ? (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function DeleteImageButton({ imageId, productId }: { imageId: string; productId: string }) {
  return (
    <form
      action={deleteImageAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete this image permanently? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="imageId" value={imageId} />
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="ghost" size="sm" className="px-0 text-danger hover:text-danger">
        <Trash2 aria-hidden="true" />
        Delete image
      </Button>
    </form>
  );
}
