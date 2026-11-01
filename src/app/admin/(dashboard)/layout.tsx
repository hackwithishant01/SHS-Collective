import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Wordmark } from "@/components/site/logo";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | SHS Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-svh bg-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/30 lg:flex">
        <div className="border-b border-line px-6 py-6">
          <Wordmark />
          <p className="mt-3 text-[0.58rem] font-semibold tracking-[0.24em] text-gold uppercase">
            Owner dashboard
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <AdminNav />
        </div>
        <div className="border-t border-line p-4">
          <p className="truncate text-xs text-cream">{admin.name}</p>
          <p className="mt-0.5 truncate text-[0.68rem] text-muted">{admin.email}</p>
          <p className="mt-1 text-[0.58rem] tracking-[0.16em] text-gold uppercase">{admin.role}</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 text-[0.65rem] tracking-[0.12em] text-muted uppercase transition-colors hover:text-gold"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              View store
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-[0.65rem] tracking-[0.12em] text-muted uppercase transition-colors hover:text-danger"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-ink/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Wordmark />
            <div className="flex items-center gap-3">
              <Link
                href="/"
                target="_blank"
                className="text-[0.6rem] tracking-[0.14em] text-muted uppercase hover:text-gold"
              >
                Store
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-[0.6rem] tracking-[0.14em] text-muted uppercase hover:text-danger"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <div className="px-2 pb-1">
            <AdminNav compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
