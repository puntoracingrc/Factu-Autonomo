import type { BillingProfile } from "../../billing/billing-profile";
import { formatBillingProfileSummary } from "../../billing/billing-profile";
import { APP_BRAND_NAME } from "../../brand";
import { VERIFACTU_SOFTWARE } from "../../verifactu/constants";
import { getAppBaseUrl } from "../config";

export interface PaymentReceiptEmailInput {
  customerEmail: string;
  customerProfile?: BillingProfile | null;
  description: string;
  amountLabel: string;
  paidAtLabel: string;
  invoiceUrl?: string | null;
  isRenewal?: boolean;
}

export interface PaymentReceiptEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildPaymentReceiptEmail(
  input: PaymentReceiptEmailInput,
): PaymentReceiptEmailContent {
  const appUrl = getAppBaseUrl();
  const issuer = VERIFACTU_SOFTWARE;
  const customerSummary = input.customerProfile
    ? formatBillingProfileSummary(input.customerProfile)
    : input.customerEmail;

  const subject = input.isRenewal
    ? `Recibo de renovación — ${input.description}`
    : `Recibo de pago — ${input.description}`;

  const invoiceBlock = input.invoiceUrl
    ? `\n\nDescargar factura/recibo de Stripe:\n${input.invoiceUrl}`
    : "";

const text = `Hola,

Confirmamos tu pago en ${APP_BRAND_NAME}.

Concepto: ${input.description}
Importe: ${input.amountLabel}
Fecha: ${input.paidAtLabel}

Datos de facturación:
${customerSummary}

Emisor del servicio:
${issuer.developerName}
${issuer.developerNif}
${issuer.developerAddress}
${issuer.developerCity}, ${issuer.developerCountry}
${invoiceBlock}

Este correo es un comprobante de pago. Si necesitas factura completa en PDF y aún no la tienes, responde a este email o gestiona tu suscripción desde la app.

Accede a la app: ${appUrl}

Gracias,
${issuer.developerName}`;

  const invoiceHtml = input.invoiceUrl
    ? `<p><a href="${input.invoiceUrl}">Descargar factura en Stripe</a></p>`
    : "";

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:560px">
      <h1 style="font-size:20px;margin:0 0 12px">Pago confirmado</h1>
      <p>Gracias por tu pago en <strong>${APP_BRAND_NAME}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b">Concepto</td><td style="padding:6px 0"><strong>${input.description}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Importe</td><td style="padding:6px 0"><strong>${input.amountLabel}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Fecha</td><td style="padding:6px 0">${input.paidAtLabel}</td></tr>
      </table>
      <p style="margin:0 0 8px"><strong>Facturado a</strong><br>${customerSummary}</p>
      <p style="margin:0 0 16px"><strong>Emisor</strong><br>
        ${issuer.developerName}<br>
        ${issuer.developerNif}<br>
        ${issuer.developerAddress}<br>
        ${issuer.developerCity}, ${issuer.developerCountry}
      </p>
      ${invoiceHtml}
      <p style="color:#64748b;font-size:14px">Comprobante automático. Para cambiar tus datos de facturación, usa el portal de suscripción en Cuenta.</p>
      <p><a href="${appUrl}">Abrir ${APP_BRAND_NAME}</a></p>
    </div>
  `.trim();

  return { subject, html, text };
}
