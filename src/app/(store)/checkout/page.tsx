import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/store/checkout-form";
import { getPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Review your details and place a WhatsApp order enquiry with SHS Collective.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">Order enquiry</p>
        <h1 className="display-lg mt-3 text-cream">Checkout</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          This creates an order enquiry and opens a pre-filled WhatsApp message. It is not a payment
          and the order stays pending until the owner confirms availability with you directly.
        </p>
      </header>

      <div className="pt-10">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </div>
  );
}

async function CheckoutContent() {
  const settings = await getPublicSettings();
  return (
    <CheckoutForm
      settings={{
        pickupEnabled: settings.pickupEnabled,
        pickupInstructions: settings.pickupInstructions,
        shippingFlatPaise: settings.shippingFlatPaise,
        freeShippingThresholdPaise: settings.freeShippingThresholdPaise,
        stockPolicy: settings.stockPolicy,
        reservationMinutes: settings.reservationMinutes,
      }}
    />
  );
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
