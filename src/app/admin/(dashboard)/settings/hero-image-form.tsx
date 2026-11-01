"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import {
  removeHeroImageAction,
  uploadHeroImageAction,
} from "@/app/admin/(dashboard)/actions";
import { emptyActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function HeroImageForm({ imageUrl }: { imageUrl: string | null }) {
  const [uploadState, uploadAction] = useActionState(uploadHeroImageAction, emptyActionState);
  const [removeState, removeAction] = useActionState(removeHeroImageAction, emptyActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (!uploadState.message || uploadState.message === lastMessage.current) return;
    lastMessage.current = uploadState.message;
    if (uploadState.ok) {
      formRef.current?.reset();
      toast.success(uploadState.message);
    } else {
      toast.error(uploadState.message);
    }
  }, [uploadState]);

  const lastRemove = useRef<string | null>(null);
  useEffect(() => {
    if (!removeState.message || removeState.message === lastRemove.current) return;
    lastRemove.current = removeState.message;
    if (removeState.ok) toast.success(removeState.message);
    else toast.error(removeState.message);
  }, [removeState]);

  return (
    <div className="space-y-5">
      <div className="relative aspect-[16/9] overflow-hidden border border-line bg-ink">
        {imageUrl ? (
          <Image src={imageUrl} alt="Current homepage hero" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-xs tracking-[0.14em] text-muted uppercase">
            No hero image
          </span>
        )}
      </div>

      <form ref={formRef} action={uploadAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="hero-file">Upload replacement</Label>
          <input
            id="hero-file"
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-xs text-muted file:mr-3 file:border file:border-line file:bg-surface file:px-3 file:py-2 file:text-[0.65rem] file:font-semibold file:tracking-[0.12em] file:text-sand file:uppercase hover:file:border-gold hover:file:text-gold"
          />
        </div>
        <p className="text-[0.66rem] leading-relaxed text-muted">
          JPEG, PNG, WebP or AVIF up to 12 MB. The image is re-encoded to WebP and the old file is
          deleted after a successful upload.
        </p>
        <SubmitButton variant="outline" size="sm" pendingLabel="Uploading…">
          <ImagePlus aria-hidden="true" />
          Upload hero image
        </SubmitButton>
        {uploadState.message && !uploadState.ok ? (
          <p role="alert" className="text-xs text-danger">
            {uploadState.message}
          </p>
        ) : null}
      </form>

      {imageUrl ? (
        <form
          action={removeAction}
          onSubmit={(event) => {
            if (!window.confirm("Remove the homepage hero image?")) event.preventDefault();
          }}
        >
          <Button type="submit" variant="ghost" size="sm" className="px-0 text-danger hover:text-danger">
            Remove hero image
          </Button>
        </form>
      ) : null}
    </div>
  );
}
