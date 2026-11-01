"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/app/admin/(dashboard)/actions";
import { emptyActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/admin/submit-button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

export function OrderStatusForm({
  orderId,
  currentStatus,
  allowed,
}: {
  orderId: string;
  currentStatus: OrderStatus;
  allowed: OrderStatus[];
}) {
  const [state, action] = useActionState(updateOrderStatusAction, emptyActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  if (allowed.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        This order is {ORDER_STATUS_LABELS[currentStatus].toLowerCase()} and has no further status
        changes.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="space-y-2">
        <Label htmlFor="status">Move to</Label>
        <Select id="status" name="status" defaultValue={allowed[0]}>
          {allowed.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea
          id="note"
          name="note"
          rows={2}
          maxLength={500}
          placeholder="e.g. Confirmed on WhatsApp, payment received."
        />
      </div>
      <SubmitButton pendingLabel="Updating…">Update status</SubmitButton>
      {state.message && !state.ok ? (
        <p role="alert" className="text-xs text-danger">
          {state.message}
        </p>
      ) : null}
      {currentStatus === "pending_confirmation" ? (
        <p className="border border-gold/20 bg-gold/5 px-3 py-2 text-[0.68rem] leading-relaxed text-gold/90">
          Confirming this order deducts stock for every line. If stock is insufficient, adjust
          inventory first. Cancelling a confirmed order restores the stock.
        </p>
      ) : null}
    </form>
  );
}
