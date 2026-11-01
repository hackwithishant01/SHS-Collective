"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveSettingsAction } from "@/app/admin/(dashboard)/actions";
import { emptyActionState } from "@/lib/action-state";
import { AdminCard } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, paiseToRupeeInput } from "@/lib/format";
import type { AdminSettings, FaqItem } from "@/lib/types";

export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const [state, action] = useActionState(saveSettingsAction, emptyActionState);
  const router = useRouter();
  const lastMessage = useRef<string | null>(null);

  useEffect(() => {
    if (!state.message || state.message === lastMessage.current) return;
    lastMessage.current = state.message;
    if (state.ok) {
      toast.success(state.message);
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6">
      <AdminCard
        title="Store and contact"
        description="These values are public. Use only details the business has confirmed."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="WhatsApp number"
            htmlFor="whatsappNumber"
            hint="International format, including country code. Order buttons open a chat with this number."
            error={state.errors?.whatsappNumber}
          >
            <Input
              id="whatsappNumber"
              name="whatsappNumber"
              type="tel"
              defaultValue={settings.whatsappNumber}
              placeholder="+919711366699"
              required
            />
          </Field>
          <Field
            label="Support email"
            htmlFor="supportEmail"
            hint="Leave blank until a monitored support inbox exists."
            error={state.errors?.supportEmail}
          >
            <Input
              id="supportEmail"
              name="supportEmail"
              type="email"
              defaultValue={settings.supportEmail}
              placeholder="hello@example.com"
            />
          </Field>
          <Field
            label="Instagram URL"
            htmlFor="instagramUrl"
            hint="Full https:// link, or blank to hide the link."
            error={state.errors?.instagramUrl}
          >
            <Input
              id="instagramUrl"
              name="instagramUrl"
              type="url"
              defaultValue={settings.instagramUrl}
              placeholder="https://www.instagram.com/…"
            />
          </Field>
          <Field
            label="Canonical domain"
            htmlFor="domain"
            hint="Final HTTPS domain. Used for canonical URLs, sitemap and structured data."
            error={state.errors?.domain}
          >
            <Input
              id="domain"
              name="domain"
              type="url"
              defaultValue={settings.domain}
              placeholder="https://shscollective.com"
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard
        title="Homepage hero"
        description="Editorial copy for the storefront hero. The image is uploaded separately below."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Eyebrow" htmlFor="heroEyebrow" hint="Small line above the headline.">
            <Input
              id="heroEyebrow"
              name="heroEyebrow"
              defaultValue={settings.heroEyebrow}
              maxLength={80}
            />
          </Field>
          <Field label="Headline" htmlFor="heroHeadline">
            <Input
              id="heroHeadline"
              name="heroHeadline"
              defaultValue={settings.heroHeadline}
              maxLength={120}
            />
          </Field>
        </div>
        <div className="mt-5">
          <Field label="Sub-headline" htmlFor="heroSubhead">
            <Textarea
              id="heroSubhead"
              name="heroSubhead"
              rows={2}
              maxLength={300}
              defaultValue={settings.heroSubhead}
            />
          </Field>
        </div>
      </AdminCard>

      <AdminCard
        title="Fulfilment and stock"
        description="Do not invent shipping charges or pickup details. Leaving shipping blank shows orders as “shipping to be confirmed”."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Flat shipping charge (₹)"
            htmlFor="shippingCharge"
            hint="Blank = not decided. The order total then excludes shipping."
            error={state.errors?.shippingCharge}
          >
            <Input
              id="shippingCharge"
              name="shippingCharge"
              inputMode="decimal"
              defaultValue={paiseToRupeeInput(settings.shippingFlatPaise)}
              placeholder="e.g. 99"
            />
          </Field>
          <Field
            label="Free shipping above (₹)"
            htmlFor="freeShippingThreshold"
            hint="Optional. Ignored when no flat charge is set."
            error={state.errors?.freeShippingThreshold}
          >
            <Input
              id="freeShippingThreshold"
              name="freeShippingThreshold"
              inputMode="decimal"
              defaultValue={paiseToRupeeInput(settings.freeShippingThresholdPaise)}
              placeholder="e.g. 2999"
            />
          </Field>
          <Field
            label="Stock policy"
            htmlFor="stockPolicy"
            hint="Enquiry: stock is deducted when you confirm an order. Reserve: stock is held when the order is placed."
          >
            <Select id="stockPolicy" name="stockPolicy" defaultValue={settings.stockPolicy}>
              <option value="enquiry">Deduct on confirmation</option>
              <option value="reserve">Reserve when ordered</option>
            </Select>
          </Field>
          <Field
            label="Reservation window (minutes)"
            htmlFor="reservationMinutes"
            hint="Used only when reservations are enabled."
            error={state.errors?.reservationMinutes}
          >
            <Input
              id="reservationMinutes"
              name="reservationMinutes"
              type="number"
              min={5}
              max={1440}
              defaultValue={settings.reservationMinutes}
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <CheckboxField
            name="pickupEnabled"
            defaultChecked={settings.pickupEnabled}
            label="Offer local pickup"
            hint="Only enable when the pickup location and arrangements are confirmed. Pickup orders never carry a shipping charge."
          />
          <div className="mt-4">
            <Field
              label="Pickup instructions"
              htmlFor="pickupInstructions"
              hint="Shown at checkout and on the confirmation page. Include the real area and timing only once confirmed."
              error={state.errors?.pickupInstructions}
            >
              <Textarea
                id="pickupInstructions"
                name="pickupInstructions"
                rows={3}
                maxLength={3000}
                defaultValue={settings.pickupInstructions}
                placeholder="e.g. Pickup is arranged on WhatsApp after your order is confirmed."
              />
            </Field>
          </div>
        </div>
      </AdminCard>

      <AdminCard
        title="Policies"
        description="Publish owner-approved text only. Each policy needs at least 40 characters before approval can be recorded."
      >
        <div className="space-y-5">
          <Field label="Shipping policy" htmlFor="shippingPolicy" error={state.errors?.shippingPolicy}>
            <Textarea
              id="shippingPolicy"
              name="shippingPolicy"
              rows={4}
              maxLength={30000}
              defaultValue={settings.shippingPolicy}
            />
          </Field>
          <Field label="Returns policy" htmlFor="returnsPolicy" error={state.errors?.returnsPolicy}>
            <Textarea
              id="returnsPolicy"
              name="returnsPolicy"
              rows={4}
              maxLength={30000}
              defaultValue={settings.returnsPolicy}
            />
          </Field>
          <Field label="Privacy policy" htmlFor="privacyPolicy" error={state.errors?.privacyPolicy}>
            <Textarea
              id="privacyPolicy"
              name="privacyPolicy"
              rows={4}
              maxLength={30000}
              defaultValue={settings.privacyPolicy}
            />
          </Field>
          <Field
            label="Terms and conditions"
            htmlFor="termsPolicy"
            error={state.errors?.termsPolicy}
          >
            <Textarea
              id="termsPolicy"
              name="termsPolicy"
              rows={4}
              maxLength={30000}
              defaultValue={settings.termsPolicy}
            />
          </Field>
          <CheckboxField
            name="policiesApproved"
            defaultChecked={settings.policiesApproved}
            label="These policies are approved by the owner"
            hint="Only tick this once the owner has reviewed the exact text. Until then, policy pages state that approval is pending."
          />
        </div>
      </AdminCard>

      <AdminCard
        title="About and FAQ"
        description="Honest, owner-written copy only. Do not add testimonials, statistics or claims that cannot be verified."
      >
        <Field label="About text" htmlFor="aboutText" error={state.errors?.aboutText}>
          <Textarea
            id="aboutText"
            name="aboutText"
            rows={5}
            maxLength={10000}
            defaultValue={settings.aboutText}
          />
        </Field>
        <div className="mt-6 border-t border-line pt-5">
          <FaqEditor initial={settings.faq} />
        </div>
      </AdminCard>

      <AdminCard
        id="launch"
        title="Launch approval"
        description="Recording approval does not deploy the site. It records that the owner has reviewed the launch checklist."
      >
        <div className="space-y-4">
          <CheckboxField
            name="launchApproved"
            defaultChecked={settings.launchApproved}
            label="I have reviewed the launch checklist and approve launch"
            hint="Only the owner can record this. Clear it if anything material changes."
          />
          <label className="block border border-gold/25 bg-gold/5 px-4 py-3 text-sm leading-relaxed text-sand">
            <span className="block text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
              Reminder
            </span>
            <span className="mt-1 block">
              The store must still be deployed deliberately, with production database, storage,
              domain and catalogue verified.
            </span>
          </label>
        </div>
      </AdminCard>

      {state.message && !state.ok ? (
        <p role="alert" className="border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-ink/95 py-4 backdrop-blur">
        <p className="text-xs text-muted">Last updated {formatDateTime(settings.updatedAt)}</p>
        <SubmitButton variant="primary">Save settings</SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-[0.66rem] leading-relaxed text-muted">{hint}</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm text-sand">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 shrink-0 accent-[var(--color-gold)]"
      />
      <span>
        <span className="block text-cream">{label}</span>
        {hint ? <span className="mt-1 block text-[0.66rem] leading-relaxed text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function FaqEditor({ initial }: { initial: FaqItem[] }) {
  const [items, setItems] = useState<FaqItem[]>(initial);

  function update(index: number, field: keyof FaqItem, value: string) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="faq" value={JSON.stringify(items)} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-cream uppercase">
            Frequently asked questions
          </p>
          <p className="mt-1 text-[0.66rem] text-muted">
            Max 20. Answer only what the business has confirmed.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 20}
          onClick={() => setItems((current) => [...current, { question: "", answer: "" }])}
        >
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-6 text-center text-xs text-muted">
          No FAQ entries. The FAQ section stays hidden on the storefront.
        </p>
      ) : (
        <ol className="space-y-4">
          {items.map((item, index) => (
            <li key={index} className="border border-line bg-ink/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[0.6rem] font-semibold tracking-[0.14em] text-gold uppercase">
                  Entry {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-0 text-danger hover:text-danger"
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden="true" />
                  Remove
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                <Input
                  value={item.question}
                  onChange={(event) => update(index, "question", event.target.value)}
                  placeholder="Question"
                  maxLength={200}
                  aria-label={`FAQ ${index + 1} question`}
                />
                <Textarea
                  value={item.answer}
                  onChange={(event) => update(index, "answer", event.target.value)}
                  placeholder="Answer"
                  rows={2}
                  maxLength={2000}
                  aria-label={`FAQ ${index + 1} answer`}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
