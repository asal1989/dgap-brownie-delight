import { CONTACT } from "../config.js";
import { h, icon, toast } from "../utils.js";
import { whatsappReady, whatsappUrl } from "../whatsapp.js";
import { openDialog } from "./dialog.js";

/** Open WhatsApp with `message`, or explain (and offer a copy) when no number is configured. */
export function sendToWhatsApp(message) {
  const url = whatsappUrl(message);
  if (url) return window.open(url, "_blank", "noopener");
  const ta = h("textarea", { readonly: true, rows: 10, class: "copybox", "aria-label": "Order message" });
  ta.value = message;
  const dlg = openDialog({
    title: "WhatsApp isn't connected yet",
    body: [
      h("p", {}, "The business WhatsApp number hasn't been set up on this site yet. You can copy your order request below and send it to us directly."),
      ta,
      CONTACT.phone ? h("p", {}, `Call us: ${CONTACT.phone}`) : null,
    ],
    actions: [
      h("button", { class: "btn btn-primary", type: "button", onclick: async () => {
        try { await navigator.clipboard.writeText(message); toast("Order message copied"); }
        catch { ta.select(); toast("Select and copy the message"); }
      } }, "Copy message"),
    ],
  });
  return dlg;
}

/**
 * <WhatsAppOrderButton>. `getMessage` is called on click so it always reflects current state.
 * `validate` (optional) returns an error string to block sending.
 */
export function WhatsAppOrderButton({ label = "Order on WhatsApp", getMessage, validate, variant = "wa", full = false, onSent }) {
  const btn = h("button", { type: "button", class: `btn btn-${variant}${full ? " btn-block" : ""}`, onclick: () => {
    const err = validate?.();
    if (err) return toast(err);
    sendToWhatsApp(getMessage());
    onSent?.();
  } }, icon("chat", 18), label);
  if (!whatsappReady()) btn.title = "WhatsApp number not configured yet";
  return btn;
}
