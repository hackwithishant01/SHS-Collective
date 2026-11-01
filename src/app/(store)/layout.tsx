import { Suspense } from "react";
import { SiteFooter, SiteFooterFallback } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Suspense fallback={<SiteFooterFallback />}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
