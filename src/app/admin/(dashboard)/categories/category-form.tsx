"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  deleteCategoryAction,
  saveCategoryAction,
} from "@/app/admin/(dashboard)/actions";
import { emptyActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/types";

export function CategoryForm({ category }: { category?: Category }) {
  const [state, action] = useActionState(saveCategoryAction, emptyActionState);
  const lastMessage = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.message || state.message === lastMessage.current) return;
    lastMessage.current = state.message;
    if (state.ok) {
      toast.success(state.message);
      if (!category) formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state, category]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-start">
        <div className="space-y-2">
          <Label htmlFor={`category-name-${category?.id ?? "new"}`}>Name</Label>
          <Input
            id={`category-name-${category?.id ?? "new"}`}
            name="name"
            defaultValue={category?.name ?? ""}
            placeholder="e.g. Outerwear"
            required
            maxLength={80}
          />
          {state.errors?.name ? <p className="text-xs text-danger">{state.errors.name}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`category-slug-${category?.id ?? "new"}`}>Slug</Label>
          <Input
            id={`category-slug-${category?.id ?? "new"}`}
            name="slug"
            defaultValue={category?.slug ?? ""}
            placeholder="outerwear"
            maxLength={80}
          />
          {state.errors?.slug ? <p className="text-xs text-danger">{state.errors.slug}</p> : null}
        </div>
        <div className="w-24 space-y-2">
          <Label htmlFor={`category-sort-${category?.id ?? "new"}`}>Order</Label>
          <Input
            id={`category-sort-${category?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={category?.sortOrder ?? 0}
          />
          {state.errors?.sortOrder ? (
            <p className="text-xs text-danger">{state.errors.sortOrder}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`category-description-${category?.id ?? "new"}`}>
          Description (optional)
        </Label>
        <Textarea
          id={`category-description-${category?.id ?? "new"}`}
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={category?.description ?? ""}
          placeholder="A short line used on the category page."
        />
        {state.errors?.description ? (
          <p className="text-xs text-danger">{state.errors.description}</p>
        ) : null}
      </div>

      {state.message && !state.ok ? (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant={category ? "outline" : "primary"} size="sm">
          {category ? "Save category" : "Create category"}
        </SubmitButton>
        {category ? (
          <Link
            href="/admin/categories"
            className="text-[0.65rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
          >
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export function DeleteCategoryButton({ category }: { category: Category }) {
  const [state, action] = useActionState(deleteCategoryAction, emptyActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete “${category.name}”? This only works if the category has no products.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="categoryId" value={category.id} />
      <Button type="submit" variant="ghost" size="sm" className="px-0 text-danger hover:text-danger">
        Delete
      </Button>
    </form>
  );
}
