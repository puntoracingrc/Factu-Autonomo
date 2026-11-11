import type { QuickCardPayment } from "@/lib/quick-invoicing/payments-model";
import { stripeCheckoutUrl } from "@/lib/quick-invoicing/payments-model";
import { escapeHtml as escape } from "./html";

export function quickCardPaymentPanel(payment: QuickCardPayment | undefined, busy: boolean, qr?: string, withoutInvoice = false, nfcEnabled = false, nfcIntent?: string) {
  const disabled = busy ? "disabled" : "";
  const status = payment?.status;
  const text = status === "paid" ? payment?.testMode ? "Pago de prueba confirmado. No acredita un cobro real." : "Cobro confirmado por Stripe" : status === "review" ? "Cobro en revisión. Comprueba Stripe antes de volver a cobrar."
    : status === "expired" ? "El método anterior se ha cerrado. Puedes preparar este mismo cobro."
      : status === "open" ? payment?.channel === "terminal" ? "NFC pendiente de pago" : "Pendiente de pago" : status === "creating" ? "Cobro pendiente de preparar. Recupera este mismo cobro." : "";
  const url = stripeCheckoutUrl(payment?.url);
  return `<section class="card-payment" aria-label="Cobro con tarjeta"><h2>Cobrar con tarjeta</h2>
    ${payment?.testMode ? '<p class="payment-test">Modo de prueba · No se cobra dinero real</p>' : ""}
    <p role="status">${busy ? "Comprobando con Stripe…" : escape(text || "Comparte un enlace o muestra el QR al cliente.")}</p>
    ${url && status === "open" ? `<div class="payment-qr">${qr ? `<img src="${escape(qr)}" width="256" height="256" alt="QR para pagar este cobro">` : ""}</div>
      <label>Enlace de pago<input id="card-payment-url" readonly value="${escape(url)}" aria-label="Enlace de pago"></label>
      <p class="hint">Válido hasta ${escape(new Date(payment!.expiresAt!).toLocaleString("es-ES"))}. El cliente puede pagar sin registrarse.</p>
      <div class="payment-actions"><button class="primary" data-action="payment-share" ${disabled}>Compartir enlace ↗</button><button class="secondary" data-action="payment-copy" ${disabled}>Copiar enlace</button></div>` : ""}
    ${!payment || status === "expired" || status === "creating" ? `<button class="primary" data-action="payment-create" ${disabled}>${busy ? "Preparando…" : status === "expired" ? "Renovar enlace y QR" : "Preparar enlace y QR"}</button>` : ""}
    ${status !== "paid" && status !== "review" && nfcEnabled ? `<div class="payment-actions">
      ${nfcIntent ? `<a class="primary" href="${escape(nfcIntent)}">Abrir lector NFC</a>` : `<button class="primary" data-action="payment-nfc" ${disabled}>${payment?.channel === "terminal" ? "Abrir cobro NFC" : "Cobrar por NFC"}</button>`}
      ${payment?.channel === "terminal" ? `<button class="secondary" data-action="payment-link" ${disabled}>Cambiar a enlace y QR</button>` : ""}</div>
      <p class="hint">Requiere Fast NFC instalado en tu Android. Al cambiar a NFC se cierra el enlace anterior para evitar cobrar dos veces.</p>
      <a class="secondary" href="/rapido/nfc.html" target="_blank" rel="noopener">Instalar Fast NFC</a>` : ""}
    <button class="secondary" data-action="payment-check" ${disabled}>Comprobar cobro</button>
    ${status !== "paid" && status !== "review" ? `<p class="hint">${withoutInvoice ? "El cobro se confirmará cuando Stripe reciba el pago. La factura puede prepararse después." : "Puedes enviar la factura y cobrarla más tarde. Se marcará como cobrada cuando Stripe confirme el pago."}</p>` : ""}
  </section>`;
}
