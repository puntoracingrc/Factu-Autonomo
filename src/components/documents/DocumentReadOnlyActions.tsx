"use client";

import Link from "next/link";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentLinkBadges } from "@/components/documents/DocumentLinkBadges";
import { DocumentLinkManagerButton } from "@/components/documents/DocumentLinkManagerButton";
import { GenerateReceiptButton } from "@/components/documents/GenerateReceiptButton";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { useAppStore } from "@/context/AppStore";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
import { getDocumentIntegrityBlockedFeedback } from "@/lib/document-integrity/feedback";
import {
  inspectAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecoveryCollection,
} from "@/lib/document-integrity/app-issued-recovery";
import { hasAppIssuedRecoveryProtectionClaim } from "@/lib/document-integrity/app-issued-recovery-protection";
import {
  isDocumentUsableForFinancialCalculations,
  isUsableLegacyImportedDocument,
} from "@/lib/document-integrity/legacy-import-attestation";
import { canShowPaymentReminder } from "@/lib/payment-reminder-client";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { hasClientEmail, hasClientPhone } from "@/lib/share";
import type { BusinessProfile, Document, DocumentType } from "@/lib/types";

const TYPE_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

interface DocumentReadOnlyActionsProps {
  doc: Document;
  profile: BusinessProfile;
  listHref: string;
}

export function DocumentReadOnlyActions({
  doc,
  profile,
  listHref,
}: DocumentReadOnlyActionsProps) {
  const { data } = useAppStore();
  const contactDoc = documentWithCurrentCustomerContact(doc, data.customers);
  const missingContact =
    !hasClientEmail(contactDoc) && !hasClientPhone(contactDoc);
  const typeLabel = TYPE_LABELS[doc.type];
  const linkedInvoice =
    doc.type === "presupuesto"
      ? findInvoiceCreatedFromQuote(data.documents, doc.id)
      : undefined;
  const recoveryInspection = hasAppIssuedRecoveryProtectionClaim(doc)
    ? inspectAppIssuedDocumentRecovery(doc)
    : null;
  const recoveryCollection = inspectAppIssuedDocumentRecoveryCollection(
    data.documents,
  );
  const appIssuedRecovered = Boolean(
    recoveryInspection?.ok &&
    recoveryInspection.active &&
    recoveryCollection.validDocumentIds.has(doc.id) &&
    isDocumentUsableForFinancialCalculations(doc),
  );
  const integrityBlocked =
    !appIssuedRecovered &&
    (doc.snapshotIntegrity?.status === "blocked" ||
      hasAppIssuedRecoveryProtectionClaim(doc));
  const integrityFeedback = getDocumentIntegrityBlockedFeedback(
    doc.snapshotIntegrity?.issues,
  );
  const legacyImportAttested = isUsableLegacyImportedDocument(doc);
  const legacyImportedAccepted =
    legacyImportAttested && isDocumentUsableForFinancialCalculations(doc);

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm font-semibold text-slate-800">
        Acciones de {typeLabel}
      </p>
      <DocumentLinkBadges document={doc} documents={data.documents} />
      {legacyImportedAccepted && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="block font-bold">
            Histórico importado
          </span>
          <span className="mt-1 block">
            Está congelado y puede usarse en impuestos y rentabilidad. No tiene
            un sello moderno ni un registro Veri*Factu de Factu. Cualquier PDF
            generado aquí es una reconstrucción: conserva el archivo original.
          </span>
        </div>
      )}
      {appIssuedRecovered && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
          <span className="block font-bold">
            Documento de Factu · recuperado y revisado
          </span>
          <span className="mt-1 block">
            Sus importes vuelven a estar disponibles para cuentas y
            rentabilidad. Impuestos y exportaciones conservan sus validaciones
            fiscales anteriores. Permanece congelado y las acciones de emisión
            siguen bloqueadas porque la recuperación no fabrica el sello
            original. Conserva el PDF aportado.
          </span>
        </div>
      )}
      {integrityBlocked && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
        >
          <span className="block">{integrityFeedback.title}</span>
          <span className="mt-1 block font-medium">
            {integrityFeedback.reason} {integrityFeedback.consequence}
          </span>
          <span className="mt-1 block font-medium">
            {integrityFeedback.recovery}
          </span>
          {doc.type === "factura" && (
            <div className="mt-2 flex justify-start">
              <GenerateReceiptButton doc={doc} />
            </div>
          )}
        </div>
      )}
      {linkedInvoice && (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Este presupuesto ya tiene factura creada:{" "}
          <Link
            href={`/facturas/${linkedInvoice.id}`}
            className="font-semibold underline"
          >
            {linkedInvoice.number}
          </Link>
          .
        </p>
      )}
      {!integrityBlocked && !appIssuedRecovered && (
        <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
          {!legacyImportAttested && doc.type === "presupuesto" && (
            <MarkAsAcceptedButton doc={doc} />
          )}
          {!legacyImportAttested && doc.type === "presupuesto" && (
            <ConvertQuoteToInvoiceButton doc={doc} />
          )}
          {(doc.type === "factura" || doc.type === "recibo") && (
            <MarkAsPaidButton doc={doc} />
          )}
          {doc.type === "factura" && canShowPaymentReminder(contactDoc) && (
            <PaymentReminderButton
              doc={contactDoc}
              profile={profile}
              variant="button"
            />
          )}
          <DocumentLinkManagerButton doc={doc} />
          <DocumentPdfShareActions doc={doc} profile={profile} />
        </div>
      )}

      {!integrityBlocked && !appIssuedRecovered && missingContact && (
        <p className="text-sm text-slate-500">
          Para enviar por email o WhatsApp, añade el contacto del cliente en{" "}
          <Link
            href="/clientes"
            className="font-semibold text-blue-600 underline"
          >
            Clientes
          </Link>{" "}
          o edítalo en el documento antes de emitirlo.
        </p>
      )}

      <Link
        href={listHref}
        className="inline-block text-sm font-semibold text-blue-600 underline"
      >
        Volver al listado
      </Link>
    </div>
  );
}
