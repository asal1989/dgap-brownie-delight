"use client";

import { useState } from "react";
import { newKey } from "@/lib/client-id";
import { adminNoteAction, cancelOrderAction, markCodPaidAction, refundAction, updateStatusAction } from "@/actions/admin/orders";
import { ActionForm } from "@/components/ui/auth-form";
import { FULFILLMENT_LABEL } from "@/lib/order-state";
import type { FulfillmentStatus } from "@/generated/prisma/enums";

const small = "btn btn-primary btn-sm";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm">Print summary</button>;
}

export function OrderActions({
  orderId, nextSteps, canUpdate, canCancel, canRefund, codUnpaid, refundable, refundableLabel, adminNote, isCod, needsRefundNow,
}: {
  orderId: string;
  nextSteps: FulfillmentStatus[];
  canUpdate: boolean;
  canCancel: boolean;
  canRefund: boolean;
  codUnpaid: boolean;
  refundable: number;
  refundableLabel: string;
  adminNote: string;
  isCod: boolean;
  needsRefundNow: boolean;
}) {
  // One idempotency key per mounted refund form: a double-click can never create two refunds.
  const [refundKey] = useState(() => newKey());

  return (
    <div className="no-print space-y-8">
      {canUpdate && (
        <section aria-labelledby="act-status" className="border border-line bg-white p-6">
          <h2 id="act-status" className="mb-4 font-serif text-[1.6rem]">Update status</h2>
          {nextSteps.length === 0 ? (
            <p className="text-sm text-muted">No further status changes are available for this order right now.</p>
          ) : (
            <ActionForm action={updateStatusAction} submitLabel="Update status" pendingLabel="Saving…" submitClass={small} hidden={{ orderId }}>
              <label className="field"><span className="label">Move to</span>
                <select name="to" className="select" required defaultValue={nextSteps[0]} data-testid="status-select">
                  {nextSteps.map((s) => <option key={s} value={s}>{FULFILLMENT_LABEL[s]}</option>)}
                </select>
              </label>
              <label className="field"><span className="label">Note <span className="font-normal text-muted">(optional, shown to the customer)</span></span><input name="note" className="input" maxLength={500} /></label>
              {isCod && nextSteps.includes("DELIVERED") && (
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="cashCollected" className="accent-forest" /> Cash was collected on delivery</label>
              )}
            </ActionForm>
          )}
          {codUnpaid && (
            <div className="mt-5 border-t border-line pt-5">
              <ActionForm action={markCodPaidAction} submitLabel="Mark cash as collected" submitClass="btn btn-outline btn-sm" hidden={{ orderId }}><p className="text-sm text-muted">Cash-on-delivery order: record the payment once cash has been collected.</p></ActionForm>
            </div>
          )}
        </section>
      )}

      {canUpdate && (
        <section aria-labelledby="act-note" className="border border-line bg-white p-6">
          <h2 id="act-note" className="mb-4 font-serif text-[1.6rem]">Internal note</h2>
          <ActionForm action={adminNoteAction} submitLabel="Save note" submitClass={small} hidden={{ orderId }}>
            <label className="field"><span className="sr-only">Internal note</span><textarea name="note" className="textarea" rows={3} defaultValue={adminNote} maxLength={1000} placeholder="Visible to staff only" /></label>
          </ActionForm>
        </section>
      )}

      {canRefund && refundable > 0 && (
        <section aria-labelledby="act-refund" className={`border bg-white p-6 ${needsRefundNow ? "border-danger" : "border-line"}`}>
          <h2 id="act-refund" className="mb-2 font-serif text-[1.6rem]">Refund</h2>
          {needsRefundNow && <p className="mb-3 text-sm font-semibold text-danger">This order was cancelled after payment. A refund has NOT been issued yet.</p>}
          <p className="mb-4 text-sm text-muted">Refundable balance: <strong>{refundableLabel}</strong>. Refunds go through the payment provider and are never automatic.</p>
          <ActionForm action={refundAction} submitLabel="Issue refund" pendingLabel="Processing…" submitClass="btn btn-danger btn-sm" hidden={{ orderId, idempotencyKey: refundKey }}>
            <label className="field"><span className="label">Amount (₹)</span><input name="amount" className="input" inputMode="decimal" required placeholder={`up to ${refundableLabel.replace("₹", "")}`} data-testid="refund-amount" /></label>
            <label className="field"><span className="label">Reason</span><input name="reason" className="input" required maxLength={500} data-testid="refund-reason" /></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-1 accent-danger" required data-testid="refund-confirm" /> I confirm this refund should be issued. This cannot be undone.</label>
          </ActionForm>
        </section>
      )}

      {canCancel && (
        <section aria-labelledby="act-cancel" className="border border-line bg-white p-6">
          <h2 id="act-cancel" className="mb-4 font-serif text-[1.6rem]">Cancel order</h2>
          <p className="mb-4 text-sm text-muted">Cancelling returns the stock. It does <strong>not</strong> refund money: if the customer paid, issue the refund separately.</p>
          <ActionForm action={cancelOrderAction} submitLabel="Cancel this order" submitClass="btn btn-danger btn-sm" hidden={{ orderId }}>
            <label className="field"><span className="label">Reason (shown to the customer)</span><input name="reason" className="input" required maxLength={500} data-testid="cancel-reason" /></label>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-1 accent-danger" required data-testid="cancel-confirm" /> I confirm I want to cancel this order.</label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
