"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readConfirmation } from "@/lib/confirmation";
import { formatDateTime, formatINR } from "@/lib/format";
import { useMounted } from "@/lib/hooks/use-mounted";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function ConfirmationView({ whatsappNumber }: { whatsappNumber: string }) {
  const mounted = useMounted();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id") ?? "";
  const confirmation = useMemo(
    () => (mounted && orderId ? readConfirmation(orderId) : null),
    [mounted, orderId],
  );

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  if (!confirmation) {
    let helpUrl: string;
    try {
      helpUrl = buildWhatsAppUrl(
        whatsappNumber,
        "Hello SHS Collective, I just placed an order enquiry and need the details again.",
      );
    } catch {
      helpUrl = "";
    }

    return (
      <div className="border border-dashed border-line bg-surface/30 px-6 py-14 text-center">
        <p className="font-serif text-3xl text-cream">Confirmation not found in this browser</p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
          Order confirmations are stored only in the browser tab where the enquiry was placed, for
          privacy. If you completed an enquiry, send the reference shown to the owner on WhatsApp.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {helpUrl ? (
            <Button asChild>
              <a href={helpUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden="true" />
                Ask on WhatsApp
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/shop">Back to the collection</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { order, items, details } = confirmation;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
      <div className="space-y-8">
        <div className="border border-gold/25 bg-gold/5 p-6">
          <Badge tone="gold">Pending confirmation</Badge>
          <h2 className="mt-4 font-serif text-3xl text-cream">Your enquiry is recorded</h2>
          <p className="mt-3 text-sm leading-relaxed text-sand">
            Nothing has been charged and no stock is guaranteed yet. To complete the process, send the
            pre-filled message on WhatsApp. The owner will confirm availability, shipping and payment
            with you directly.
          </p>
          <dl className="mt-5 grid gap-4 border-t border-gold/20 pt-5 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">Reference</dt>
              <dd className="mt-1 font-mono text-xs text-gold">{order.reference}</dd>
            </div>
            <div>
              <dt className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">Placed</dt>
              <dd className="mt-1 text-xs text-sand">{formatDateTime(confirmation.savedAt)}</dd>
            </div>
            <div>
              <dt className="text-[0.58rem] tracking-[0.16em] text-muted uppercase">Status</dt>
              <dd className="mt-1 text-xs text-sand">Awaiting owner confirmation</dd>
            </div>
          </dl>
          <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
            <a href={order.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" />
              Send order on WhatsApp
            </a>
          </Button>
          <p className="mt-3 text-[0.66rem] leading-relaxed text-muted">
            Keep this tab open or note the reference. The confirmation is not emailed, and the website
            cannot take payment.
          </p>
        </div>

        <div>
          <h2 className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
            Items in this enquiry
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-4 py-4">
                <div>
                  <Link href={`/product/${item.slug}`} className="text-sm text-cream hover:text-gold">
                    {item.title}
                  </Link>
                  {item.variantLabel ? (
                    <p className="mt-1 text-[0.68rem] text-muted">{item.variantLabel}</p>
                  ) : null}
                  <p className="mt-1 text-[0.68rem] text-muted">
                    {item.quantity} × {formatINR(item.pricePaise)}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-sand">{formatINR(item.pricePaise * item.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-sand">{formatINR(order.subtotalPaise)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Shipping</dt>
              <dd className="text-sand">
                {order.shippingPending
                  ? "To be confirmed"
                  : order.shippingPaise === 0
                    ? "Free"
                    : formatINR(order.shippingPaise)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-2">
              <dt className="font-semibold text-cream">
                {order.shippingPending ? "Estimated total" : "Total"}
              </dt>
              <dd className="font-semibold text-cream">{formatINR(order.totalPaise)}</dd>
            </div>
          </dl>
          {order.shippingPending ? (
            <p className="mt-2 text-[0.66rem] leading-relaxed text-gold/90">
              Shipping was not configured when this enquiry was placed, so the total excludes shipping.
            </p>
          ) : null}
          {order.reservationExpiresAt ? (
            <p className="mt-2 text-[0.66rem] leading-relaxed text-muted">
              Stock is held until {formatDateTime(order.reservationExpiresAt)}. If it is not confirmed
              by then, the reservation is released automatically.
            </p>
          ) : null}
        </div>
      </div>

      <aside className="self-start border border-line bg-surface/40 p-6">
        <h2 className="font-sans text-[0.68rem] font-semibold tracking-[0.18em] text-cream uppercase">
          Your details
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Name</dt>
            <dd className="mt-0.5 text-sand">{details.customerName}</dd>
          </div>
          <div>
            <dt className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Phone</dt>
            <dd className="mt-0.5 text-sand">{details.phone}</dd>
          </div>
          <div>
            <dt className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Fulfilment</dt>
            <dd className="mt-0.5 text-sand">
              {details.fulfilmentMethod === "pickup" ? "Local pickup" : "Delivery"}
            </dd>
          </div>
          {details.fulfilmentMethod === "shipping" ? (
            <div>
              <dt className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Address</dt>
              <dd className="mt-0.5 leading-relaxed text-sand">
                {[
                  details.addressLine1,
                  details.addressLine2,
                  details.landmark ? `Landmark: ${details.landmark}` : null,
                  [details.city, details.state].filter(Boolean).join(", "),
                  details.pincode,
                ]
                  .filter(Boolean)
                  .map((line) => (
                    <span key={String(line)} className="block">
                      {line}
                    </span>
                  ))}
              </dd>
            </div>
          ) : null}
          {details.notes ? (
            <div>
              <dt className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Note</dt>
              <dd className="mt-0.5 text-sand">{details.notes}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex items-start gap-2.5 border-t border-line pt-5 text-[0.68rem] leading-relaxed text-muted">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
          <p>
            If the WhatsApp message did not open, use the button on the left. Your order stays pending
            until the owner replies.
          </p>
        </div>

        <Button asChild variant="outline" className="mt-5 w-full">
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  );
}
