"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch, type Path } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveProductAction } from "@/app/admin/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  productDefaults,
  productFormSchema,
  type ProductFormInput,
} from "@/lib/schemas";
import { slugify } from "@/lib/slug";
import type { Category } from "@/lib/types";

export function ProductForm({
  initialValues,
  categories,
  productId,
}: {
  initialValues?: ProductFormInput;
  categories: Category[];
  productId?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialValues ?? productDefaults(),
  });

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });
  const status = useWatch({ control, name: "status" });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await saveProductAction(values);
    if (!result.ok) {
      setFormError(result.message);
      if (result.errors) {
        for (const [key, message] of Object.entries(result.errors)) {
          setError(key as Path<ProductFormInput>, { type: "server", message });
        }
      }
      toast.error(result.message ?? "Could not save the product.");
      return;
    }

    toast.success(result.message ?? "Product saved.");
    if (!productId && result.id) {
      router.push(`/admin/products/${result.id}`);
    } else {
      router.refresh();
    }
  });

  return (
    <form onSubmit={submit} className="space-y-8" noValidate>
      {formError ? (
        <p role="alert" className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <Section title="Product details">
            <Field label="Title" error={errors.title?.message} htmlFor="title">
              <Input
                id="title"
                {...register("title", {
                  onBlur: (event) => {
                    if (!getValues("slug").trim()) {
                      setValue("slug", slugify(event.target.value), { shouldValidate: true });
                    }
                  },
                })}
                placeholder="e.g. Wool-blend overcoat"
              />
            </Field>

            <Field
              label="URL slug"
              error={errors.slug?.message}
              htmlFor="slug"
              hint="Leave blank to generate one from the title."
            >
              <Input id="slug" {...register("slug")} placeholder="wool-blend-overcoat" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" error={errors.categoryId?.message} htmlFor="categoryId">
                <Select id="categoryId" {...register("categoryId")}>
                  <option value="">Uncategorised</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Condition" error={errors.condition?.message} htmlFor="condition">
                <Select id="condition" {...register("condition")}>
                  <option value="pre_owned">Pre-owned</option>
                  <option value="new">New</option>
                </Select>
              </Field>
            </div>

            <Field label="Description" error={errors.description?.message} htmlFor="description">
              <Textarea
                id="description"
                rows={8}
                {...register("description")}
                placeholder="Describe the piece honestly: fabric, fit, condition, any flaws."
              />
            </Field>

            <Field
              label="Measurements"
              error={errors.measurements?.message}
              htmlFor="measurements"
              hint="Shown on the product page. Use real measurements only."
            >
              <Textarea
                id="measurements"
                rows={3}
                {...register("measurements")}
                placeholder="Chest, length, sleeve, waist…"
              />
            </Field>
          </Section>

          <Section title="Variants and stock">
            <p className="text-xs leading-relaxed text-muted">
              One row per real size/colour combination. Stock changes saved here are recorded in the
              inventory ledger. Publishing needs at least one active variant with stock.
            </p>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-line bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-gold uppercase">
                      Variant {index + 1}
                    </p>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex items-center gap-1 text-[0.62rem] tracking-[0.1em] text-muted uppercase transition-colors hover:text-danger"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <input type="hidden" {...register(`variants.${index}.id`)} />
                  <input type="hidden" {...register(`variants.${index}.sortOrder`, { valueAsNumber: true })} />

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Size" error={errors.variants?.[index]?.size?.message}>
                      <Input {...register(`variants.${index}.size`)} placeholder="M / 32 / one size" />
                    </Field>
                    <Field label="Colour" error={errors.variants?.[index]?.color?.message}>
                      <Input {...register(`variants.${index}.color`)} placeholder="Black" />
                    </Field>
                    <Field label="Colour hex" error={errors.variants?.[index]?.colorHex?.message}>
                      <Input {...register(`variants.${index}.colorHex`)} placeholder="#111111" />
                    </Field>
                    <Field label="Stock" error={errors.variants?.[index]?.stockQuantity?.message}>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        {...register(`variants.${index}.stockQuantity`, { valueAsNumber: true })}
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <Field label="Variant SKU" error={errors.variants?.[index]?.sku?.message} className="max-w-xs">
                      <Input {...register(`variants.${index}.sku`)} placeholder="Optional" />
                    </Field>
                    <label className="flex items-center gap-2 pb-2.5 text-xs text-sand">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--color-gold)]"
                        {...register(`variants.${index}.isActive`)}
                      />
                      Active / purchasable
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  size: "",
                  color: "",
                  colorHex: "",
                  sku: "",
                  stockQuantity: 0,
                  isActive: true,
                  sortOrder: fields.length,
                })
              }
            >
              <Plus aria-hidden="true" />
              Add variant
            </Button>
            {errors.variants?.root?.message ? (
              <p className="text-xs text-danger">{errors.variants.root.message}</p>
            ) : null}
            {errors.variants?.message ? (
              <p className="text-xs text-danger">{errors.variants.message}</p>
            ) : null}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Pricing">
            <Field label="Price (INR)" error={errors.price?.message} htmlFor="price">
              <Input id="price" {...register("price")} placeholder="1299" inputMode="decimal" />
            </Field>
            <Field
              label="Compare-at price (INR)"
              error={errors.compareAtPrice?.message}
              htmlFor="compareAtPrice"
              hint="Optional. Only use if the piece was genuinely offered at that price."
            >
              <Input
                id="compareAtPrice"
                {...register("compareAtPrice")}
                placeholder="Optional"
                inputMode="decimal"
              />
            </Field>
            <Field label="Product SKU" error={errors.sku?.message} htmlFor="sku">
              <Input id="sku" {...register("sku")} placeholder="Optional" />
            </Field>
          </Section>

          <Section title="Visibility">
            <Field label="Status" error={errors.status?.message} htmlFor="status">
              <Select id="status" {...register("status")}>
                <option value="draft">Draft — not visible</option>
                <option value="published">Published — live</option>
                <option value="archived">Archived — hidden, kept for records</option>
              </Select>
            </Field>

            <label className="flex items-start gap-2.5 text-xs leading-relaxed text-sand">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-gold)]"
                {...register("featured")}
              />
              Feature on the homepage
            </label>

            {status === "published" ? (
              <p className="border border-gold/20 bg-gold/5 px-3 py-2 text-[0.68rem] leading-relaxed text-gold/90">
                Publishing requires at least one uploaded image and an active variant with stock. If
                either is missing, the save is blocked.
              </p>
            ) : null}
          </Section>

          <Section title="Search metadata">
            <Field
              label="SEO title"
              error={errors.seoTitle?.message}
              htmlFor="seoTitle"
              hint="Optional. Up to 70 characters."
            >
              <Input id="seoTitle" {...register("seoTitle")} />
            </Field>
            <Field
              label="SEO description"
              error={errors.seoDescription?.message}
              htmlFor="seoDescription"
              hint="Optional. Up to 180 characters."
            >
              <Textarea id="seoDescription" rows={3} {...register("seoDescription")} />
            </Field>
          </Section>

          <div className="sticky bottom-4 border border-line bg-surface p-4">
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : productId ? "Save changes" : "Create product"}
            </Button>
            <Link
              href="/admin/products"
              className="mt-3 block text-center text-[0.65rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
            >
              Back to products
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-surface/40 p-5">
      <h2 className="border-b border-line pb-3 font-sans text-[0.68rem] font-semibold tracking-[0.16em] text-cream uppercase">
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-[0.65rem] leading-relaxed text-muted">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[0.68rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
