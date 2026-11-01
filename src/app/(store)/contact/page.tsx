import type { Metadata } from "next";
import { Suspense } from "react";
import { AtSign, Mail, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/store/contact-form";
import { getPublicSettings } from "@/lib/data/settings";
import { formatPhone, whatsappDigits } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact and enquiries",
  description:
    "Contact SHS Collective on WhatsApp about sizing, condition, availability, shipping or an existing order enquiry.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactSkeleton />}>
      <ContactContent />
    </Suspense>
  );
}

async function ContactContent() {
  const settings = await getPublicSettings();
  const digits = whatsappDigits(settings.whatsappNumber);

  let enquiryUrl: string | null = null;
  try {
    enquiryUrl = buildWhatsAppUrl(
      settings.whatsappNumber,
      "Hello SHS Collective, I have a question about a piece in the collection.",
    );
  } catch {
    enquiryUrl = null;
  }

  return (
    <div>
      <header className="border-b border-line">
        <div className="container-page py-14 lg:py-20">
          <p className="eyebrow">Contact</p>
          <h1 className="display-lg mt-4 text-cream">Talk to the owner</h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
            Every enquiry is answered directly on WhatsApp. Ask about sizing, measurements, condition,
            shipping or an order you have already placed.
          </p>
        </div>
      </header>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-20">
        <div>
          <h2 className="font-sans text-[0.65rem] font-semibold tracking-[0.2em] text-muted uppercase">
            Direct details
          </h2>

          <ul className="mt-6 space-y-5">
            {digits ? (
              <li>
                <a
                  href={enquiryUrl ?? `https://wa.me/${digits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center border border-line text-gold transition-colors group-hover:border-gold">
                    <MessageCircle className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                      WhatsApp
                    </span>
                    <span className="mt-1 block text-sm text-cream group-hover:text-gold">
                      {formatPhone(settings.whatsappNumber)}
                    </span>
                    <span className="mt-1 block text-[0.68rem] text-muted">
                      Fastest route for availability and order questions.
                    </span>
                  </span>
                </a>
              </li>
            ) : null}

            {settings.supportEmail ? (
              <li>
                <a href={`mailto:${settings.supportEmail}`} className="group flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center border border-line text-gold transition-colors group-hover:border-gold">
                    <Mail className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                      Email
                    </span>
                    <span className="mt-1 block text-sm text-cream group-hover:text-gold">
                      {settings.supportEmail}
                    </span>
                  </span>
                </a>
              </li>
            ) : null}

            {settings.instagramUrl ? (
              <li>
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center border border-line text-gold transition-colors group-hover:border-gold">
                    <AtSign className="size-4" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                      Instagram
                    </span>
                    <span className="mt-1 block text-sm text-cream group-hover:text-gold">
                      Latest arrivals and updates
                    </span>
                  </span>
                </a>
              </li>
            ) : null}

            {settings.pickupEnabled ? (
              <li className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center border border-line text-gold">
                  <MapPin className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                    Local pickup
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-sand">
                    {settings.pickupInstructions ||
                      "Pickup details are shared on WhatsApp after your order is confirmed."}
                  </span>
                </span>
              </li>
            ) : null}
          </ul>

          <p className="mt-8 border-t border-line pt-6 text-[0.68rem] leading-relaxed text-muted">
            There is no support phone line or contact form inbox. The website does not collect
            messages; the form opens WhatsApp so the conversation stays in one place.
          </p>
        </div>

        <div className="border border-line bg-surface/40 p-6 sm:p-8">
          <h2 className="font-serif text-3xl text-cream">Prepare a WhatsApp message</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Write your question here, then send it from your own WhatsApp account.
          </p>
          <div className="mt-6">
            <ContactForm whatsappNumber={settings.whatsappNumber} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactSkeleton() {
  return (
    <div className="container-page py-16">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-5 h-16 w-80" />
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <div className="skeleton h-64" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
