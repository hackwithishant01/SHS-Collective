import Link from "next/link";
import { AtSign, Mail, MessageCircle } from "lucide-react";
import { Wordmark } from "@/components/site/logo";
import { getPublicSettings } from "@/lib/data/settings";
import { formatPhone, whatsappDigits } from "@/lib/format";
import { DEFAULT_INSTAGRAM_URL, DEFAULT_WHATSAPP_NUMBER } from "@/lib/settings";

const shopLinks = [
  { href: "/shop", label: "All pieces" },
  { href: "/shop?sort=newest", label: "New in" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/cart", label: "Shopping bag" },
];

const helpLinks = [
  { href: "/contact", label: "Contact & enquiries" },
  { href: "/policies/shipping", label: "Shipping" },
  { href: "/policies/returns", label: "Returns" },
  { href: "/policies/privacy", label: "Privacy" },
  { href: "/policies/terms", label: "Terms" },
];

export function SiteFooterFallback() {
  return <FooterFrame whatsapp={DEFAULT_WHATSAPP_NUMBER} instagram={DEFAULT_INSTAGRAM_URL} email="" />;
}

export async function SiteFooter() {
  let whatsapp = DEFAULT_WHATSAPP_NUMBER;
  let instagram = DEFAULT_INSTAGRAM_URL;
  let email = "";

  try {
    const settings = await getPublicSettings();
    whatsapp = settings.whatsappNumber;
    instagram = settings.instagramUrl;
    email = settings.supportEmail;
  } catch {
    // The footer must not take the whole page down if settings are unavailable.
  }

  return <FooterFrame whatsapp={whatsapp} instagram={instagram} email={email} />;
}

function FooterFrame({
  whatsapp,
  instagram,
  email,
}: {
  whatsapp: string;
  instagram: string;
  email: string;
}) {
  const digits = whatsappDigits(whatsapp);
  const waHref = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent("Hello SHS Collective, I have a question.")}`
    : null;

  return (
    <footer className="mt-24 border-t border-line bg-surface/40">
      <div className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Wordmark className="h-20 w-20" />
            <p className="mt-6 text-sm leading-relaxed text-muted">
              A tightly curated edit of new and pre-owned clothing. Every piece is checked and
              described honestly before it is listed.
            </p>
            <p className="mt-4 text-[0.68rem] leading-relaxed tracking-[0.08em] text-muted/80">
              Orders are enquiries until confirmed directly on WhatsApp. No online payment is
              collected by this website.
            </p>
          </div>

          <FooterColumn title="Shop" links={shopLinks} />
          <FooterColumn title="Help" links={helpLinks} />

          <div>
            <h2 className="text-[0.65rem] font-semibold tracking-[0.2em] text-cream uppercase">
              Connect
            </h2>
            <ul className="mt-5 space-y-3 text-sm text-muted">
              {waHref ? (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-gold"
                  >
                    <MessageCircle className="size-4 text-gold/80" aria-hidden="true" />
                    WhatsApp {formatPhone(whatsapp)}
                  </a>
                </li>
              ) : null}
              {instagram ? (
                <li>
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-gold"
                  >
                    <AtSign className="size-4 text-gold/80" aria-hidden="true" />
                    Instagram
                  </a>
                </li>
              ) : null}
              {email ? (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex items-center gap-2.5 transition-colors hover:text-gold"
                  >
                    <Mail className="size-4 text-gold/80" aria-hidden="true" />
                    {email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 text-[0.65rem] tracking-[0.1em] text-muted/80 uppercase sm:flex-row sm:items-center sm:justify-between">
          <p>© SHS Collective. All rights reserved.</p>
          <p>Made in India · Prices in INR</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h2 className="text-[0.65rem] font-semibold tracking-[0.2em] text-cream uppercase">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm text-muted">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="transition-colors hover:text-gold">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
