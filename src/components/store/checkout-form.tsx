"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type Path } from "react-hook-form";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMounted } from "@/lib/hooks/use-mounted";
import { saveConfirmation } from "@/lib/confirmation";
import { formatINR } from "@/lib/format";
import {
  checkoutDetailsSchema,
  type CheckoutDetailsInput,
} from "@/lib/schemas";
import { calculateShipping } from "@/lib/settings";
import { cartSubtotal, useCartStore } from "@/lib/stores/cart";
import type { OrderCreationResult, PublicSettings } from "@/lib/types";
import { cn } from "@/lib/cn";

interface ApiError {
  error?: string;
  issues?: Array<{ path: string; message: string }>;
}

export function CheckoutForm({
  settings,
}: {
  settings: Pick<
    PublicSettings,
    | "pickupEnabled"
    | "pickupInstructions"
    | "shippingFlatPaise"
    | "freeShippingThresholdPaise"
    | "stockPolicy"
    | "reservationMinutes"
  >;
}) {
  const mounted = useMounted();
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<{ signature: string; key: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutDetailsInput>({
    resolver: zodResolver(checkoutDetailsSchema),
    defaultValues: {
      fulfilmentMethod: "shipping",
      customerName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
      landmark: "",
      notes: "",
    },
  });

  const fulfilmentMethod = useWatch({ control, name: "fulfilmentMethod" });
  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const shipping = calculateShipping(settings, subtotal, fulfilmentMethod ?? "shipping");
  const itemSignature = items
    .map((item) => `${item.variantId}:${item.quantity}`)
    .sort()
    .join("|");

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    if (items.length === 0) {
      setFormError("Your bag is empty.");
      return;
    }

    // A retry with the same cart reuses the key (safe duplicate detection).
    // A changed cart starts a fresh checkout attempt.
    const idempotencyKey =
      pendingKey?.signature === itemSignature ? pendingKey.key : createIdempotencyKey();
    if (pendingKey?.signature !== itemSignature) {
      setPendingKey({ signature: itemSignature, key: idempotencyKey });
    }

    const payload = {
      ...values,
      items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      idempotencyKey,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => null)) as
        | (OrderCreationResult & ApiError)
        | ApiError
        | null;

      if (!response.ok || !data || !("orderId" in data)) {
        const message =
          (data as ApiError | null)?.error ??
          "The order enquiry could not be created. Please check your details and try again.";
        setFormError(message);
        const issues = (data as ApiError | null)?.issues ?? [];
        for (const issue of issues) {
          if (issue.path && issue.path !== "items") {
            setError(issue.path as Path<CheckoutDetailsInput>, {
              type: "server",
              message: issue.message,
            });
          }
        }
        toast.error(message);
        return;
      }

      saveConfirmation({
        order: data,
        items: [...items],
        details: values,
        savedAt: new Date().toISOString(),
      });
      clear();
      router.push(`/order/confirmation?id=${data.orderId}`);
    } catch {
      setFormError(
        "We could not reach the server. Check your connection and try again — nothing has been charged.",
      );
    }
  });

  if (!mounted) {
    return <CheckoutSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-line bg-surface/30 px-6 py-16 text-center">
        <p className="font-serif text-3xl text-cream">Your bag is empty</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Add a piece before checking out. Nothing can be ordered from an empty bag.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse the collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <div className="space-y-10">
        {formError ? (
          <p role="alert" className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
            {formError}
          </p>
        ) : null}

        <section aria-labelledby="contact-heading" className="space-y-5">
          <div>
            <h2 id="contact-heading" className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
              1 · Contact
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              So the owner can confirm your order on WhatsApp. No account is created and no payment is
              taken here.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="customerName" error={errors.customerName?.message}>
              <Input id="customerName" autoComplete="name" {...register("customerName")} />
            </Field>
            <Field
              label="Phone (WhatsApp)"
              htmlFor="phone"
              error={errors.phone?.message}
              hint="Indian mobile number. Used only to confirm this order."
            >
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="98765 43210"
                {...register("phone")}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby="fulfilment-heading" className="space-y-5 border-t border-line pt-8">
          <div>
            <h2 id="fulfilment-heading" className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
              2 · Fulfilment
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Shipping charges and pickup arrangements are confirmed directly with you before payment.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={cn(
                "cursor-pointer border px-4 py-3.5 transition-colors",
                fulfilmentMethod === "shipping"
                  ? "border-gold bg-gold/5"
                  : "border-line hover:border-muted",
              )}
            >
              <span className="flex items-center gap-2.5 text-sm text-cream">
                <input
                  type="radio"
                  value="shipping"
                  {...register("fulfilmentMethod")}
                  className="size-3.5 accent-[var(--color-gold)]"
                />
                Delivery
              </span>
              <span className="mt-1.5 block pl-6 text-[0.68rem] leading-relaxed text-muted">
                {settings.shippingFlatPaise !== null
                  ? `Flat ${formatINR(settings.shippingFlatPaise)}${
                      settings.freeShippingThresholdPaise
                        ? `, free above ${formatINR(settings.freeShippingThresholdPaise)}`
                        : ""
                    }.`
                  : "Shipping charge to be confirmed on WhatsApp."}
              </span>
            </label>

            <label
              className={cn(
                "cursor-pointer border px-4 py-3.5 transition-colors",
                !settings.pickupEnabled && "cursor-not-allowed opacity-60",
                fulfilmentMethod === "pickup"
                  ? "border-gold bg-gold/5"
                  : "border-line hover:border-muted",
              )}
            >
              <span className="flex items-center gap-2.5 text-sm text-cream">
                <input
                  type="radio"
                  value="pickup"
                  disabled={!settings.pickupEnabled}
                  {...register("fulfilmentMethod")}
                  className="size-3.5 accent-[var(--color-gold)]"
                />
                Local pickup
              </span>
              <span className="mt-1.5 block pl-6 text-[0.68rem] leading-relaxed text-muted">
                {settings.pickupEnabled
                  ? settings.pickupInstructions || "Pickup is arranged on WhatsApp after confirmation."
                  : "Not currently offered."}
              </span>
            </label>
          </div>

          {fulfilmentMethod === "shipping" ? (
            <div className="grid gap-4">
              <Field label="Address line 1" htmlFor="addressLine1" error={errors.addressLine1?.message}>
                <Input
                  id="addressLine1"
                  autoComplete="address-line1"
                  {...register("addressLine1")}
                />
              </Field>
              <Field label="Address line 2 (optional)" htmlFor="addressLine2" error={errors.addressLine2?.message}>
                <Input
                  id="addressLine2"
                  autoComplete="address-line2"
                  {...register("addressLine2")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="City" htmlFor="city" error={errors.city?.message}>
                  <Input id="city" autoComplete="address-level2" {...register("city")} />
                </Field>
                <Field label="State" htmlFor="state" error={errors.state?.message}>
                  <Input id="state" autoComplete="address-level1" {...register("state")} />
                </Field>
                <Field label="Pincode" htmlFor="pincode" error={errors.pincode?.message}>
                  <Input
                    id="pincode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    {...register("pincode")}
                  />
                </Field>
              </div>
              <Field label="Landmark (optional)" htmlFor="landmark" error={errors.landmark?.message}>
                <Input id="landmark" {...register("landmark")} />
              </Field>
            </div>
          ) : (
            <p className="border border-line bg-surface/40 px-4 py-3 text-[0.68rem] leading-relaxed text-sand">
              {settings.pickupInstructions ||
                "The owner will share pickup details on WhatsApp after confirming your order."}
            </p>
          )}
        </section>

        <section aria-labelledby="notes-heading" className="space-y-3 border-t border-line pt-8">
          <h2 id="notes-heading" className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
            3 · Anything else? (optional)
          </h2>
          <Field label="Order note" htmlFor="notes" error={errors.notes?.message}>
            <Textarea
              id="notes"
              rows={3}
              maxLength={1000}
              placeholder="Sizing questions, preferred delivery timing, gift note…"
              {...register("notes")}
            />
          </Field>
        </section>
      </div>

      <aside className="self-start border border-line bg-surface/40 p-6 lg:sticky lg:top-28">
        <h2 className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
          Order summary
        </h2>

        <ul className="mt-5 divide-y divide-line">
          {items.map((item) => (
            <li key={item.variantId} className="flex gap-3 py-3 first:pt-0">
              <div className="relative size-14 shrink-0 overflow-hidden border border-line bg-surface">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-cream">{item.title}</p>
                {item.variantLabel ? (
                  <p className="mt-0.5 text-[0.62rem] text-muted">{item.variantLabel}</p>
                ) : null}
                <p className="mt-0.5 text-[0.62rem] text-muted">Qty {item.quantity}</p>
              </div>
              <p className="shrink-0 text-xs text-sand">{formatINR(item.pricePaise * item.quantity)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-sand">{formatINR(subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Shipping</dt>
            <dd className="text-right text-sand">
              {shipping.shippingPending ? (
                <span className="text-gold">To be confirmed</span>
              ) : shipping.shippingPaise === 0 ? (
                "Free"
              ) : (
                formatINR(shipping.shippingPaise)
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2">
            <dt className="font-semibold text-cream">
              {shipping.shippingPending ? "Estimated total" : "Total"}
            </dt>
            <dd className="font-semibold text-cream">{formatINR(shipping.totalPaise)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-[0.66rem] leading-relaxed text-muted">
          {settings.stockPolicy === "reserve"
            ? `Submitting holds your items for ${settings.reservationMinutes} minutes while the owner confirms. You can cancel with the owner on WhatsApp.`
            : "Stock is not reserved by submitting this form. The owner confirms availability on WhatsApp; until then the order is pending confirmation."}
        </p>

        <Button type="submit" size="lg" className="mt-5 w-full" disabled={isSubmitting}>
          <MessageCircle aria-hidden="true" />
          {isSubmitting ? "Creating enquiry…" : "Place order enquiry"}
        </Button>

        <p className="mt-3 text-center text-[0.62rem] leading-relaxed text-muted">
          You will be taken to a confirmation page with a WhatsApp button. No payment is collected by
          this website.
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-[0.66rem] leading-relaxed text-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function createIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "00000000-0000-4000-8000-000000000000";
}

function CheckoutSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
      <div className="skeleton h-72 w-full" />
    </div>
  );
}
