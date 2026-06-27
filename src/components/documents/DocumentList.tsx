"use client";

import { useMemo, useState } from "react";
import { Eye, FileWarning, Pencil, Search } from "lucide-react";
import { IconActionLink } from "@/components/ui/IconAction";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsRejectedButton } from "@/components/documents/MarkAsRejectedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "@/lib/document-list-copy";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import { filterDocumentsByQuery, isDocumentEditable, sortDocumentsByNewest } from "@/lib/documents";
import { isCollectedDocument } from "@/lib/income";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { isAcceptedQuote } from "@/lib/quotes";
import { findReceiptForInvoice } from "@/lib/receipts";
import { canRectifyInvoice, isRectificativa } from "@/lib/rectificativas";
import {
  RECTIFICATION_ACTION_COPY,
  documentStatusColor,
  documentStatusHint,
  documentStatusLabel,
} from "@/lib/invoice-status-actions";
import type { DocumentType } from "@/lib/types";

const SEARCH_PLACEHOLDERS: Record<DocumentType, string> = {
  factura: "Número, cliente, NIF, dirección o importe...",
  presupuesto: "Número, cliente, NIF, dirección o importe...",
  recibo: "Número, cliente, NIF, dirección o importe...",
};

const SEARCH_HINTS: Record<DocumentType, string> = {
  factura: "Ordenadas de más nueva a más antigua",
  presupuesto: "Ordenados de más nuevo a más antiguo",
  recibo: "Ordenados de más nuevo a más antiguo",
};

const SEARCH_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

interface DocumentListProps {
  type: DocumentType;
  basePath: string;
}

export function DocumentList({
  type,
  basePath,
}: DocumentListProps) {
  const { data, getDocumentsByType } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const [search, setSearch] = useState("");

  const documents = useMemo(() => {
    const sorted = sortDocumentsByNewest(getDocumentsByType(type));
    return filterDocumentsByQuery(sorted, search, { vatExempt });
  }, [getDocumentsByType, type, search, vatExempt]);

  const totalCount = getDocumentsByType(type).length;
  const label = SEARCH_LABELS[type];

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <Card className="p-4">
          <Field
            label={`Buscar ${label}`}
            hint={SEARCH_HINTS[type]}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={SEARCH_PLACEHOLDERS[type]}
                className="pl-10"
              />
            </div>
            <span className="mt-2 block text-xs text-slate-400">
              {documents.length} de {totalCount} resultados
            </span>
          </Field>
        </Card>
      )}

      {totalCount === 0 ? (
        <FactuEmptyState
          variant={type}
          action={
            <ButtonLink href={`${basePath}/nuevo`}>
              {DOCUMENT_EMPTY_ACTION_LABELS[type]}
            </ButtonLink>
          }
        />
      ) : documents.length === 0 ? (
        <Card className="text-center text-slate-500">
          No hay {label}s que coincidan con «{search}».
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const total = documentAmounts(doc, vatExempt).total;
            const rect = isRectificativa(doc);
            const rectifiable = type === "factura" && canRectifyInvoice(doc);
            const editable = isDocumentEditable(doc);
            const statusHint = documentStatusHint(doc, type);
            const linkedReceipt =
              type === "factura"
                ? findReceiptForInvoice(
                    data.documents,
                    doc.id,
                    doc.receiptDocumentId,
                  )
                : undefined;
            const linkedInvoice =
              type === "presupuesto"
                ? findInvoiceCreatedFromQuote(data.documents, doc.id)
                : undefined;
            const missingShareContact = !doc.client.email && !doc.client.phone;

            return (
              <Card key={doc.id} className="flex flex-col gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{doc.number}</span>
                    {rect && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
                        Rectificativa
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isCollectedDocument(doc) || isAcceptedQuote(doc)
                          ? "bg-green-100 text-green-700"
                          : documentStatusColor(doc)
                      }`}
                    >
                      {documentStatusLabel(doc, type)}
                    </span>
                    {doc.verifactu && type === "factura" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        Veri*Factu
                      </span>
                    )}
                    {linkedInvoice && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        Convertido a factura
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-slate-700">{doc.client.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatShortDate(doc.date)} · {formatMoney(total)}
                  </p>
                  {statusHint && (
                    <p className="mt-1 text-xs text-slate-500">{statusHint}</p>
                  )}
                  {doc.rectification && (
                    <p className="text-xs text-orange-700">
                      Rectifica: {doc.rectification.originalNumber}
                    </p>
                  )}
                  {doc.rectifiedById && (
                    <p className="text-xs text-slate-400">
                      Tiene factura rectificativa asociada
                    </p>
                  )}
                  {linkedReceipt && (
                    <p className="text-xs text-green-700">
                      Recibo creado: {linkedReceipt.number}
                    </p>
                  )}
                  {type === "factura" && doc.sourceQuoteNumber && (
                    <p className="text-xs text-blue-700">
                      Creada desde presupuesto: {doc.sourceQuoteNumber}
                    </p>
                  )}
                  {linkedInvoice && (
                    <p className="text-xs text-blue-700">
                      Factura creada: {linkedInvoice.number}
                    </p>
                  )}
                  {missingShareContact && (
                    <p className="text-xs text-slate-500">
                      Sin email ni teléfono para enviar desde aquí.
                    </p>
                  )}
                </div>
                <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
                  {type === "presupuesto" && <MarkAsAcceptedButton doc={doc} />}
                  {type === "presupuesto" && <MarkAsRejectedButton doc={doc} />}
                  {type === "presupuesto" && (
                    <ConvertQuoteToInvoiceButton doc={doc} />
                  )}
                  {(type === "factura" || type === "recibo") && (
                    <MarkAsPaidButton doc={doc} />
                  )}
                  {type === "factura" && (
                    <PaymentReminderButton doc={doc} profile={data.profile} />
                  )}
                  <DocumentPdfShareActions doc={doc} profile={data.profile} />
                  {rectifiable && (
                    <IconActionLink
                      href={`${basePath}/${doc.id}/rectificar`}
                      label={RECTIFICATION_ACTION_COPY.label}
                      tooltip={RECTIFICATION_ACTION_COPY.tooltip}
                      className="bg-orange-50 text-orange-700 hover:bg-orange-100"
                    >
                      <FileWarning className="h-5 w-5" />
                    </IconActionLink>
                  )}
                  {editable ? (
                    <IconActionLink
                      href={`${basePath}/${doc.id}`}
                      label="Editar"
                      tooltip="Editar"
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <Pencil className="h-5 w-5" />
                    </IconActionLink>
                  ) : (
                    <IconActionLink
                      href={`${basePath}/${doc.id}`}
                      label="Ver"
                      tooltip="Ver detalle"
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <Eye className="h-5 w-5" />
                    </IconActionLink>
                  )}
                  <DeleteDocumentButton doc={doc} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
