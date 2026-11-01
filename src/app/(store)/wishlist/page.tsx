import type { Metadata } from "next";
import { Suspense } from "react";
import { WishlistView } from "@/components/store/wishlist-view";
import { getPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Pieces you have saved from the SHS Collective collection.",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">Saved for later</p>
        <h1 className="display-lg mt-3 text-cream">Wishlist</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          A private list stored on this device. Saving a piece does not reserve it — ask on WhatsApp
          if you would like to confirm availability.
        </p>
      </header>

      <div className="pt-10">
        <Suspense fallback={<WishlistSkeleton />}>
          <WishlistContent />
        </Suspense>
      </div>
    </div>
  );
}

async function WishlistContent() {
  const settings = await getPublicSettings();
  return <WishlistView whatsappNumber={settings.whatsappNumber} domain={settings.domain} />;
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index}>
          <div className="skeleton aspect-[4/5] w-full" />
          <div className="skeleton mt-4 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
