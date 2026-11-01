import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "SHS Collective — Curated new & pre-owned clothing",
    template: "%s | SHS Collective",
  },
  description:
    "A tightly curated edit of new and pre-owned clothing, chosen for cut, condition and character. Enquire on WhatsApp.",
  applicationName: "SHS Collective",
  icons: { icon: "/brand/shs-collective.png" },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: "SHS Collective",
    title: "SHS Collective — Curated new & pre-owned clothing",
    description:
      "A tightly curated edit of new and pre-owned clothing, chosen for cut, condition and character.",
  },
  robots: { index: true, follow: true },
};

export const instant = false;

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="min-h-svh bg-ink font-sans text-cream antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:tracking-[0.16em] focus:text-ink focus:uppercase"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
