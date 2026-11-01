import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/site/logo";
import { getAdminSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-svh flex-col bg-ink">
      <header className="border-b border-line">
        <div className="container-page flex h-20 items-center justify-between">
          <Wordmark />
          <Link
            href="/"
            className="text-[0.62rem] font-medium tracking-[0.18em] text-muted uppercase transition-colors hover:text-gold"
          >
            Back to store
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <div className="border border-line bg-surface/50 p-7 sm:p-9">
            <p className="eyebrow">Owner access</p>
            <h1 className="mt-3 font-serif text-4xl text-cream">Sign in</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Manage products, stock, orders and store settings.
            </p>
            <div className="mt-7">
              <LoginForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
