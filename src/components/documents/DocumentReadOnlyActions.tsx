"use client";

import Link from "next/link";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentLinkBadges } from "@/components/documents/DocumentLinkBadges";
import { DocumentLinkManagerButton } from "@/components/documents/DocumentLinkManagerButton";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { useAppStore } from "@/context/AppStore";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
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
  const integrityBlocked = doc.snapshotIntegrity?.status === "blocked";

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm font-semibold text-slate-800">
        Acciones de {typeLabel}
      </p>
      <DocumentLinkBadges document={doc} documents={data.documents} />
      {integrityBlocked && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
        >
          Acciones bloqueadas. Conserva los datos y revisa una copia de
          seguridad antes de cobrar, compartir o modificar este documento.
        </p>
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
      {!integrityBlocked && (
      <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
        {doc.type === "presupuesto" && <MarkAsAcceptedButton doc={doc} />}
        {doc.type === "presupuesto" && (
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

      {!integrityBlocked && missingContact && (
        <p className="text-sm text-slate-500">
          Para enviar por email o WhatsApp, añade el contacto del cliente en{" "}
          <Link href="/clientes" className="font-semibold text-blue-600 underline">
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
