"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Eye, FileWarning, Pencil, Search } from "lucide-react";
import { IconActionLink } from "@/components/ui/IconAction";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "@/lib/document-list-copy";
import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import {
  filterDocumentsByQuery,
  isDocumentEditable,
  isDraftInvoiceNumber,
  sortDocumentsByNewest,
} from "@/lib/documents";
import { isCollectedDocument, isPendingInvoicePayment } from "@/lib/income";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { isAcceptedQuote } from "@/lib/quotes";
import { isQuoteExpired } from "@/lib/quote-validity";
import { findReceiptForInvoice } from "@/lib/receipts";
import {
  formatTimelineMonthLabel,
  timelineMonthKey,
} from "@/lib/timeline";
import { canRectifyInvoice, isRectificativa } from "@/lib/rectificativas";
import {
  PRODUCT_MONTH_NAMES,
  PRODUCT_QUARTERS,
  availableProductPeriodYears,
  filterDocumentsByProductPeriod,
  formatProductPeriodLabel,
  getDefaultProductPeriod,
  type ProductPeriodKind,
  type ProductPeriodSelection,
} from "@/lib/product-period-summary";
import {
  RECTIFICATION_ACTION_COPY,
  documentStatusColor,
  documentStatusHint,
  documentStatusLabel,
} from "@/lib/invoice-status-actions";
import type { Document, DocumentType } from "@/lib/types";

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

const DOCUMENT_LIST_BATCH_SIZE = 30;
const PAGINATED_DOCUMENT_TYPES: DocumentType[] = [
  "factura",
  "presupuesto",
  "recibo",
];

type DocumentStatusFilter =
  | "all"
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "converted"
  | "issued"
  | "collected"
  | "pending"
  | "rectified";

const DOCUMENT_STATUS_OPTIONS: Record<
  DocumentType,
  Array<{ value: DocumentStatusFilter; label: string }>
> = {
  factura: [
    { value: "all", label: "Todos los estados" },
    { value: "draft", label: "Borrador" },
    { value: "issued", label: "Emitida" },
    { value: "collected", label: "Cobrada" },
    { value: "pending", label: "Pendiente" },
    { value: "rectified", label: "Rectificada" },
  ],
  presupuesto: [
    { value: "all", label: "Todos los estados" },
    { value: "draft", label: "Borrador" },
    { value: "sent", label: "Enviado" },
    { value: "accepted", label: "Aceptado" },
    { value: "expired", label: "Caducado" },
    { value: "converted", label: "Convertido" },
  ],
  recibo: [
    { value: "all", label: "Todos los estados" },
    { value: "draft", label: "Borrador" },
    { value: "issued", label: "Emitido" },
    { value: "collected", label: "Cobrado" },
  ],
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
  const [period, setPeriod] = useState<ProductPeriodSelection>(() => ({
    ...getDefaultProductPeriod(),
    kind: "all",
  }));
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(DOCUMENT_LIST_BATCH_SIZE);

  const allDocuments = getDocumentsByType(type);
  const years = useMemo(
    () => availableProductPeriodYears(allDocuments, []),
    [allDocuments],
  );

  const documents = useMemo(() => {
    const periodDocuments = filterDocumentsByProductPeriod(allDocuments, period);
    const statusDocuments = periodDocuments.filter((document) =>
      matchesDocumentStatusFilter(document, statusFilter, data.documents),
    );
    const sorted = sortDocumentsByNewest(statusDocuments);
    return filterDocumentsByQuery(sorted, search, { vatExempt });
  }, [allDocuments, data.documents, period, search, statusFilter, vatExempt]);

  const totalCount = allDocuments.length;
  const label = SEARCH_LABELS[type];
  const paginateList = PAGINATED_DOCUMENT_TYPES.includes(type);
  const visibleDocuments = paginateList
    ? documents.slice(0, visibleCount)
    : documents;
  const hiddenCount = Math.max(documents.length - visibleDocuments.length, 0);

  function updatePeriod(patch: Partial<ProductPeriodSelection>) {
    setPeriod((current) => ({ ...current, ...patch }));
  }

  useEffect(() => {
    setVisibleCount(DOCUMENT_LIST_BATCH_SIZE);
  }, [
    period.kind,
    period.month,
    period.quarter,
    period.year,
    search,
    statusFilter,
    type,
  ]);

  return (
    <div className="space-y-4">
      {totalCount > 0 && (
        <Card className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
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
            </Field>

            <Field label="Periodo">
              <Select
                value={period.kind}
                aria-label="Periodo del listado"
                onChange={(event) =>
                  updatePeriod({
                    kind: event.target.value as ProductPeriodKind,
                  })
                }
              >
                <option value="all">Todos</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="year">Este año</option>
              </Select>
            </Field>

            {period.kind !== "all" && (
              <Field label="Año">
                <Select
                  value={period.year}
                  aria-label="Año del listado"
                  onChange={(event) =>
                    updatePeriod({ year: Number(event.target.value) })
                  }
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {period.kind === "month" && (
              <Field label="Mes">
                <Select
                  value={period.month}
                  aria-label="Mes del listado"
                  onChange={(event) =>
                    updatePeriod({ month: Number(event.target.value) })
                  }
                >
                  {PRODUCT_MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {period.kind === "quarter" && (
              <Field label="Trimestre">
                <Select
                  value={period.quarter}
                  aria-label="Trimestre del listado"
                  onChange={(event) =>
                    updatePeriod({
                      quarter: Number(
                        event.target.value,
                      ) as ProductPeriodSelection["quarter"],
                    })
                  }
                >
                  {PRODUCT_QUARTERS.map((quarter) => (
                    <option key={quarter} value={quarter}>
                      {formatProductPeriodLabel({
                        ...period,
                        kind: "quarter",
                        quarter,
                      })}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Estado">
              <Select
                value={statusFilter}
                aria-label="Estado del listado"
                onChange={(event) =>
                  setStatusFilter(event.target.value as DocumentStatusFilter)
                }
              >
                {DOCUMENT_STATUS_OPTIONS[type].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <p className="text-xs font-semibold text-slate-400">
            Periodo: {formatProductPeriodLabel(period)} · {documents.length} de{" "}
            {totalCount} resultados
            {paginateList && documents.length > 0
              ? ` · Mostrando ${visibleDocuments.length}`
              : ""}
          </p>
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
          No hay {label}s con los filtros actuales.
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleDocuments.map((doc, index) => {
            const previousDocument =
              index > 0 ? visibleDocuments[index - 1] : null;
            const showTimelineDivider =
              !previousDocument ||
              timelineMonthKey(previousDocument.date) !==
                timelineMonthKey(doc.date);
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
            const displayNumber = isDraftInvoiceNumber(doc)
              ? "Borrador de factura"
              : doc.number;

            return (
              <Fragment key={doc.id}>
                {showTimelineDivider && (
                  <TimelineMonthDivider
                    label={formatTimelineMonthLabel(doc.date)}
                  />
                )}
                <Card className="flex flex-col gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {displayNumber}
                      </span>
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
                    {type === "presupuesto" && (
                      <MarkAsAcceptedButton doc={doc} />
                    )}
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
              </Fragment>
            );
          })}
          {paginateList && hiddenCount > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((current) =>
                    Math.min(
                      current + DOCUMENT_LIST_BATCH_SIZE,
                      documents.length,
                    ),
                  )
                }
                className="min-h-12 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Cargar {Math.min(DOCUMENT_LIST_BATCH_SIZE, hiddenCount)} más
              </button>
              <p className="mt-2 text-center text-xs font-medium text-slate-400">
                Mostrando {visibleDocuments.length} de {documents.length}{" "}
                {label}s
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function matchesDocumentStatusFilter(
  document: Document,
  filter: DocumentStatusFilter,
  allDocuments: Document[],
): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return deriveDocumentLifecycle(document) === "draft";
  if (filter === "accepted") return isAcceptedQuote(document);
  if (filter === "expired") return isQuoteExpired(document) || document.status === "vencido";
  if (filter === "converted") {
    return Boolean(findInvoiceCreatedFromQuote(allDocuments, document.id));
  }
  if (filter === "collected") return isCollectedDocument(document);
  if (filter === "pending") return isPendingInvoicePayment(document);
  if (filter === "rectified") {
    return (
      document.status === "rectificada" ||
      Boolean(document.rectifiedById) ||
      isRectificativa(document)
    );
  }
  if (filter === "sent") {
    return (
      document.type === "presupuesto" &&
      deriveDocumentLifecycle(document) === "issued" &&
      !isAcceptedQuote(document) &&
      document.status !== "rechazado" &&
      !isQuoteExpired(document) &&
      !findInvoiceCreatedFromQuote(allDocuments, document.id)
    );
  }
  if (filter === "issued") {
    return deriveDocumentLifecycle(document) === "issued";
  }
  return true;
}
