"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Link2, Search, Unlink, X } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  documentDetailPath,
  documentShortNumber,
  findInvoiceLinkedToReceipt,
  findQuoteLinkedToInvoice,
  linkableDocuments,
} from "@/lib/document-links";
import { filterDocumentsByQuery } from "@/lib/documents";
import { showFactuToast } from "@/lib/factu/occasional";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { findReceiptForInvoice } from "@/lib/receipts";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import type { Document } from "@/lib/types";

interface DocumentLinkManagerButtonProps {
  doc: Document;
}

export function DocumentLinkManagerButton({
  doc,
}: DocumentLinkManagerButtonProps) {
  const { data, updateDocumentLink } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const [open, setOpen] = useState(false);
  const [quoteId, setQuoteId] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [invoiceForQuoteId, setInvoiceForQuoteId] = useState("");
  const [invoiceForReceiptId, setInvoiceForReceiptId] = useState("");

  const linkedQuote =
    doc.type === "factura" ? findQuoteLinkedToInvoice(data.documents, doc) : undefined;
  const linkedReceipt =
    doc.type === "factura"
      ? findReceiptForInvoice(data.documents, doc.id, doc.receiptDocumentId)
      : undefined;
  const linkedInvoiceFromQuote =
    doc.type === "presupuesto"
      ? findInvoiceCreatedFromQuote(data.documents, doc.id)
      : undefined;
  const linkedInvoiceFromReceipt =
    doc.type === "recibo" ? findInvoiceLinkedToReceipt(data.documents, doc) : undefined;

  function openModal() {
    setQuoteId(linkedQuote?.id ?? "");
    setReceiptId(linkedReceipt?.id ?? "");
    setInvoiceForQuoteId(linkedInvoiceFromQuote?.id ?? "");
    setInvoiceForReceiptId(linkedInvoiceFromReceipt?.id ?? "");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  function confirmQuoteForInvoice(nextQuoteId: string | null) {
    if (doc.type !== "factura") return;
    updateDocumentLink({
      relation: "quote_invoice",
      invoiceId: doc.id,
      quoteId: nextQuoteId,
    });
    setQuoteId(nextQuoteId ?? "");
    showFactuToast(nextQuoteId ? "Presupuesto vinculado." : "Presupuesto desvinculado.");
  }

  function confirmInvoiceForQuote(nextInvoiceId: string | null) {
    if (doc.type !== "presupuesto") return;
    const invoiceId = nextInvoiceId ?? linkedInvoiceFromQuote?.id;
    if (!invoiceId) return;
    updateDocumentLink({
      relation: "quote_invoice",
      invoiceId,
      quoteId: nextInvoiceId ? doc.id : null,
    });
    setInvoiceForQuoteId(nextInvoiceId ?? "");
    showFactuToast(nextInvoiceId ? "Factura vinculada." : "Factura desvinculada.");
  }

  function confirmReceiptForInvoice(nextReceiptId: string | null) {
    if (doc.type !== "factura") return;
    updateDocumentLink({
      relation: "invoice_receipt",
      invoiceId: doc.id,
      receiptId: nextReceiptId,
    });
    setReceiptId(nextReceiptId ?? "");
    showFactuToast(nextReceiptId ? "Recibo vinculado." : "Recibo desvinculado.");
  }

  function confirmInvoiceForReceipt(nextInvoiceId: string | null) {
    if (doc.type !== "recibo") return;
    const invoiceId = nextInvoiceId ?? linkedInvoiceFromReceipt?.id;
    if (!invoiceId) return;
    updateDocumentLink({
      relation: "invoice_receipt",
      invoiceId,
      receiptId: nextInvoiceId ? doc.id : null,
    });
    setInvoiceForReceiptId(nextInvoiceId ?? "");
    showFactuToast(nextInvoiceId ? "Factura vinculada." : "Factura desvinculada.");
  }

  const title = `Vínculos de ${documentShortNumber(doc)}`;

  return (
    <>
      <IconActionButton
        label="Vincular"
        tooltip="Ver o enlazar documentos relacionados"
        onClick={openModal}
        className="bg-sky-50 text-sky-700 hover:bg-sky-100"
      >
        <Link2 className="h-5 w-5" />
      </IconActionButton>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-bold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  Organiza documentos relacionados. Esto no cambia el PDF
                  emitido, la numeración, el QR ni los importes.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Cerrar vínculos"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {doc.type === "factura" ? (
                <>
                  <DocumentLinkSection
                    title="Presupuesto relacionado"
                    hint="Útil cuando la factura viene de un presupuesto, aunque la hayas terminado editando."
                    documents={linkableDocuments(data.documents, "presupuesto")}
                    selectedId={quoteId}
                    onSelectedIdChange={setQuoteId}
                    vatExempt={vatExempt}
                    onSave={() => confirmQuoteForInvoice(quoteId || null)}
                    onClear={() => confirmQuoteForInvoice(null)}
                  />
                  <DocumentLinkSection
                    title="Recibo relacionado"
                    hint="Útil para localizar el justificante de cobro asociado a esta factura."
                    documents={linkableDocuments(data.documents, "recibo")}
                    selectedId={receiptId}
                    onSelectedIdChange={setReceiptId}
                    vatExempt={vatExempt}
                    onSave={() => confirmReceiptForInvoice(receiptId || null)}
                    onClear={() => confirmReceiptForInvoice(null)}
                  />
                </>
              ) : null}

              {doc.type === "presupuesto" ? (
                <DocumentLinkSection
                  title="Factura relacionada"
                  hint="Selecciona la factura que salió de este presupuesto."
                  documents={linkableDocuments(data.documents, "factura")}
                  selectedId={invoiceForQuoteId}
                  onSelectedIdChange={setInvoiceForQuoteId}
                  vatExempt={vatExempt}
                  onSave={() => confirmInvoiceForQuote(invoiceForQuoteId || null)}
                  onClear={() => confirmInvoiceForQuote(null)}
                />
              ) : null}

              {doc.type === "recibo" ? (
                <DocumentLinkSection
                  title="Factura relacionada"
                  hint="Selecciona la factura cuyo pago justifica este recibo."
                  documents={linkableDocuments(data.documents, "factura")}
                  selectedId={invoiceForReceiptId}
                  onSelectedIdChange={setInvoiceForReceiptId}
                  vatExempt={vatExempt}
                  onSave={() => confirmInvoiceForReceipt(invoiceForReceiptId || null)}
                  onClear={() => confirmInvoiceForReceipt(null)}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DocumentLinkSection({
  title,
  hint,
  documents,
  selectedId,
  onSelectedIdChange,
  vatExempt,
  onSave,
  onClear,
}: {
  title: string;
  hint: string;
  documents: Document[];
  selectedId: string;
  onSelectedIdChange: (id: string) => void;
  vatExempt: boolean;
  onSave: () => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const selectedDocument = documents.find((document) => document.id === selectedId);
  const results = useMemo(() => {
    const source = query.trim()
      ? filterDocumentsByQuery(documents, query, { vatExempt })
      : documents;
    return source.slice(0, 8);
  }, [documents, query, vatExempt]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{hint}</p>
      </div>

      {selectedDocument ? (
        <Link
          href={documentDetailPath(selectedDocument)}
          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-sky-100 bg-white px-3 text-sm font-bold text-sky-700 hover:bg-sky-50"
        >
          <Link2 className="h-4 w-4" />
          {documentShortNumber(selectedDocument)} · {selectedDocument.client.name}
        </Link>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Sin documento vinculado.
        </p>
      )}

      <div className="mt-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-700">
            Buscar documento
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Número, cliente o importe..."
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pl-10 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </label>
      </div>

      <div className="mt-3 grid gap-2">
        {results.length === 0 ? (
          <p className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">
            No hay resultados.
          </p>
        ) : (
          results.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => onSelectedIdChange(document.id)}
              aria-pressed={selectedId === document.id}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition ${
                selectedId === document.id
                  ? "border-blue-300 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {documentShortNumber(document)} · {document.client.name}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatShortDate(document.date)} ·{" "}
                  {formatMoney(documentAmounts(document, vatExempt).total)}
                </span>
              </span>
              {selectedId === document.id ? (
                <Check className="h-5 w-5 shrink-0 text-blue-700" />
              ) : null}
            </button>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!selectedId}
        >
          <Link2 className="h-4 w-4" />
          Vincular
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <Unlink className="h-4 w-4" />
          Quitar vínculo
        </button>
      </div>
    </section>
  );
}
