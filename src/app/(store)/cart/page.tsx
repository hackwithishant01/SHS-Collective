import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/store/cart-view";
import { getPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Shopping bag",
  description: "Review the pieces in your bag before continuing to checkout.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">Your selection</p>
        <h1 className="display-lg mt-3 text-cream">Shopping bag</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Your bag is saved on this device. Stock and prices are checked again when you submit the
          order enquiry — nothing is charged here.
        </p>
      </header>

      <div className="pt-10">
        <Suspense fallback={<CartSkeleton />}>
          <CartContent />
        </Suspense>
      </div>
    </div>
  );
}

async function CartContent() {
  const settings = await getPublicSettings();
  return <CartView settings={settings} />;
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-line pb-5">
            <div className="skeleton size-28" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-1/4" />
              <div className="skeleton h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  );
}
