"use client";

import Link from "next/link";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { canShowPaymentReminder } from "@/lib/payment-reminder-client";
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
  const missingContact = !doc.client.email && !doc.client.phone;
  const typeLabel = TYPE_LABELS[doc.type];

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm font-semibold text-slate-800">
        Acciones de {typeLabel}
      </p>
      <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
        {doc.type === "presupuesto" && <MarkAsAcceptedButton doc={doc} />}
        {doc.type === "presupuesto" && (
          <ConvertQuoteToInvoiceButton doc={doc} />
        )}
        {(doc.type === "factura" || doc.type === "recibo") && (
          <MarkAsPaidButton doc={doc} />
        )}
        {doc.type === "factura" && canShowPaymentReminder(doc) && (
          <PaymentReminderButton
            doc={doc}
            profile={profile}
            variant="button"
          />
        )}
        <DocumentPdfShareActions doc={doc} profile={profile} />
      </div>

      {missingContact && (
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
