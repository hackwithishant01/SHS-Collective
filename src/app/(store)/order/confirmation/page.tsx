import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationView } from "@/components/store/confirmation-view";
import { getPublicSettings } from "@/lib/data/settings";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Order enquiry",
  description: "Your SHS Collective order enquiry details.",
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return (
    <div className="container-page py-12 lg:py-16">
      <header className="border-b border-line pb-8">
        <p className="eyebrow">Order enquiry</p>
        <h1 className="display-lg mt-3 text-cream">Confirmation</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          This page is the record of your enquiry in this browser. Send the WhatsApp message to
          complete the process — the order is not confirmed until the owner replies.
        </p>
      </header>
      <div className="pt-10">
        <Suspense fallback={<ConfirmationSkeleton />}>
          <ConfirmationContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ConfirmationContent() {
  const settings = await getPublicSettings().catch(() => null);
  return <ConfirmationView whatsappNumber={settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER} />;
}

function ConfirmationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-64" />
      <div className="skeleton h-32 w-full" />
      <div className="skeleton h-48 w-full" />
    </div>
  );
}
