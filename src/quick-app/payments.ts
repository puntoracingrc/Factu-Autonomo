import type { QuickCardPayment } from "@/lib/quick-invoicing/payments-model";
import { stripeCheckoutUrl } from "@/lib/quick-invoicing/payments-model";
import { escapeHtml as escape } from "./html";

export function quickCardPaymentPanel(payment: QuickCardPayment | undefined, busy: boolean, qr?: string, withoutInvoice = false) {
  const disabled = busy ? "disabled" : "";
  const status = payment?.status;
  const text = status === "paid" ? payment?.testMode ? "Pago de prueba confirmado. No acredita un cobro real." : "Cobro confirmado por Stripe" : status === "review" ? "Cobro en revisión. Comprueba Stripe antes de volver a cobrar."
    : status === "expired" ? "El enlace ha caducado. Puedes renovarlo para este mismo cobro."
      : status === "open" ? "Pendiente de pago" : status === "creating" ? "Enlace pendiente de confirmar. Pulsa Preparar para recuperarlo." : "";
  const url = stripeCheckoutUrl(payment?.url);
  return `<section class="card-payment" aria-label="Cobro con tarjeta"><h2>Cobrar con tarjeta</h2>
    ${payment?.testMode ? '<p class="payment-test">Modo de prueba · No se cobra dinero real</p>' : ""}
    <p role="status">${busy ? "Comprobando con Stripe…" : escape(text || "Comparte un enlace o muestra el QR al cliente.")}</p>
    ${url && status === "open" ? `<div class="payment-qr">${qr ? `<img src="${escape(qr)}" width="256" height="256" alt="QR para pagar este cobro">` : ""}</div>
      <label>Enlace de pago<input id="card-payment-url" readonly value="${escape(url)}" aria-label="Enlace de pago"></label>
      <p class="hint">Válido hasta ${escape(new Date(payment!.expiresAt!).toLocaleString("es-ES"))}. El cliente puede pagar sin registrarse.</p>
      <div class="payment-actions"><button class="primary" data-action="payment-share" ${disabled}>Compartir enlace ↗</button><button class="secondary" data-action="payment-copy" ${disabled}>Copiar enlace</button></div>` : ""}
    ${!payment || status === "expired" || status === "creating" ? `<button class="primary" data-action="payment-create" ${disabled}>${busy ? "Preparando…" : status === "expired" ? "Renovar enlace y QR" : "Preparar enlace y QR"}</button>` : ""}
    <button class="secondary" data-action="payment-check" ${disabled}>Comprobar cobro</button>
    ${status !== "paid" && status !== "review" ? `<p class="hint">${withoutInvoice ? "El cobro se confirmará cuando Stripe reciba el pago. La factura puede prepararse después." : "Puedes enviar la factura y cobrarla más tarde. Se marcará como cobrada cuando Stripe confirme el pago."}</p>` : ""}
  </section>`;
}
