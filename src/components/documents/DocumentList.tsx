"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileWarning, Pencil, Search } from "lucide-react";
import { IconActionButton, IconActionLink } from "@/components/ui/IconAction";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentLinkManagerButton } from "@/components/documents/DocumentLinkManagerButton";
import { DocumentRelationshipFlow } from "@/components/documents/DocumentRelationshipFlow";
import { InvoiceRelationshipWorkspace } from "@/components/documents/InvoiceRelationshipWorkspace";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { DuplicateDocumentButton } from "@/components/documents/DuplicateDocumentButton";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { GenerateReceiptButton } from "@/components/documents/GenerateReceiptButton";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "@/lib/document-list-copy";
import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import {
  documentHasLinkedCustomerNameMismatch,
  documentWithCurrentCustomerContact,
  findLinkedCustomerForDocument,
} from "@/lib/document-client-contact";
import {
  filterDocumentsByQuery,
  isDocumentEditable,
  isDraftInvoiceNumber,
  sortDocumentsByNumberDesc,
} from "@/lib/documents";
import { openDocumentPdfPreview } from "@/lib/pdf";
import { summarizeWorkDocumentExpensesById } from "@/lib/expenses";
import { isCollectedDocument, isPendingInvoicePayment } from "@/lib/income";
import {
  calculateInvoiceListProfitability,
  summarizeAllocatedWorkExpenses,
} from "@/lib/document-list-profitability";
import { getDocumentChainItems } from "@/lib/document-links";
import {
  getExpenseCostAllocationsForWork,
  type ExpenseCostAllocationsByExpenseId,
} from "@/lib/rentabilidad-real/expense-linking";
import { findInvoiceCreatedFromQuote } from "@/lib/quote-to-invoice";
import { isAcceptedQuote } from "@/lib/quotes";
import { isQuoteExpired } from "@/lib/quote-validity";
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
import { hasClientEmail, hasClientPhone } from "@/lib/share";
import { getCustomerDisplayName } from "@/lib/customers";
import { hasPublicVerifactuAccreditation } from "@/lib/verifactu/attestation";
import type { Document, DocumentType } from "@/lib/types";

const SEARCH_PLACEHOLDERS: Record<DocumentType, string> = {
  factura: "Número, cliente, NIF, dirección o importe...",
  presupuesto: "Número, cliente, NIF, dirección o importe...",
  recibo: "Número, cliente, NIF, dirección o importe...",
};

const SEARCH_HINTS: Record<DocumentType, string> = {
  factura: "Ordenadas por número, más recientes primero",
  presupuesto: "Ordenados por número, más recientes primero",
  recibo: "Ordenados por número, más recientes primero",
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
    { value: "pending", label: "Pendiente de cobro" },
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
  const { data, getDocumentsByType, repairDocumentCustomer } = useAppStore();
  const { billingEnabled, isPro } = useBilling();
  const vatExempt = isVatExempt(data.profile);
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<ProductPeriodSelection>(() => ({
    ...getDefaultProductPeriod(),
    kind: "all",
  }));
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(DOCUMENT_LIST_BATCH_SIZE);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<string | null>(
    null,
  );
  const [expandedRelationshipDocumentId, setExpandedRelationshipDocumentId] =
    useState<string | null>(null);
  const [expenseAllocationsByDocumentId, setExpenseAllocationsByDocumentId] =
    useState<Record<string, ExpenseCostAllocationsByExpenseId>>({});

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
    const sorted = sortDocumentsByNumberDesc(statusDocuments);
    return filterDocumentsByQuery(sorted, search, { vatExempt });
  }, [allDocuments, data.documents, period, search, statusFilter, vatExempt]);

  const workExpenseSummaries = useMemo(() => {
    return summarizeWorkDocumentExpensesById(data.expenses);
  }, [data.expenses]);

  useEffect(() => {
    if (type !== "factura") return;
    const nextAllocations: Record<
      string,
      ExpenseCostAllocationsByExpenseId
    > = {};
    for (const document of data.documents) {
      if (document.type !== "factura") continue;
      nextAllocations[document.id] = getExpenseCostAllocationsForWork(
        document.id,
      );
    }
    setExpenseAllocationsByDocumentId(nextAllocations);
  }, [data.documents, type]);

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

  async function handlePdfPreview(doc: Document) {
    setPreviewingDocumentId(doc.id);
    try {
      await openDocumentPdfPreview(doc, data.profile, pdfOptions);
    } catch {
      alert(
        "No se pudo abrir el PDF. Permite ventanas emergentes o descárgalo.",
      );
    } finally {
      setPreviewingDocumentId(null);
    }
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label={`Buscar ${label}`} hint={SEARCH_HINTS[type]}>
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
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
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
                  <option value="month">Mes</option>
                  <option value="quarter">Trimestre</option>
                  <option value="year">Año</option>
                </Select>

                {period.kind !== "all" && (
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
                )}

                {period.kind === "month" && (
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
                )}

                {period.kind === "quarter" && (
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
                )}
              </div>
            </Field>

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
            const amounts = documentAmounts(doc, vatExempt);
            const total = amounts.total;
            const documentChain = getDocumentChainItems(
              doc,
              data.documents,
              data.expenses,
              expenseAllocationsByDocumentId[doc.id] ?? {},
            );
            const workExpenseSummary =
              type === "factura"
                ? summarizeAllocatedWorkExpenses({
                    expenses: data.expenses,
                    workDocumentIds: documentChain
                      .map((item) => item.document?.id)
                      .filter((id): id is string => Boolean(id)),
                    allocations: expenseAllocationsByDocumentId[doc.id] ?? {},
                  })
                : type === "presupuesto"
                ? workExpenseSummaries.get(doc.id)
                : undefined;
            const workMargin =
              workExpenseSummary && workExpenseSummary.count > 0
                ? amounts.subtotal - workExpenseSummary.cost
                : undefined;
            const invoiceProfitability =
              type === "factura" && doc.status !== "borrador"
                ? calculateInvoiceListProfitability({
                    salesBase: amounts.subtotal,
                    salesIva: amounts.iva,
                    linkedExpenseCost: workExpenseSummary?.cost,
                    linkedDeductibleExpenseBase:
                      workExpenseSummary?.deductibleBase,
                    linkedDeductibleExpenseIva:
                      workExpenseSummary?.deductibleIva,
                    irpfPercent: data.profile.irpfPercent,
                    vatExempt,
                  })
                : null;
            const rect = isRectificativa(doc);
            const rectifiable = type === "factura" && canRectifyInvoice(doc);
            const editable = isDocumentEditable(doc);
            const integrityBlocked = doc.snapshotIntegrity?.status === "blocked";
            const statusHint = documentStatusHint(doc, type);
            const linkedInvoice =
              type === "presupuesto"
                ? findInvoiceCreatedFromQuote(data.documents, doc.id)
                : undefined;
            const contactDoc = documentWithCurrentCustomerContact(
              doc,
              data.customers,
            );
            const linkedCustomer = findLinkedCustomerForDocument(
              doc,
              data.customers,
            );
            const clientHref = linkedCustomer
              ? `/clientes?cliente=${encodeURIComponent(linkedCustomer.id)}`
              : null;
            const hasLinkedCustomerNameMismatch =
              documentHasLinkedCustomerNameMismatch(doc, data.customers);
            const linkedCustomerName = linkedCustomer
              ? getCustomerDisplayName(linkedCustomer)
              : "";
            const customerRepairRequiresAudit = !editable;
            const missingShareContact =
              !hasClientEmail(contactDoc) && !hasClientPhone(contactDoc);
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
                <Card
                  className={`grid gap-4 ${
                    type === "factura"
                      ? "xl:grid-cols-[minmax(18rem,0.8fr)_minmax(30rem,1.2fr)]"
                      : "md:grid-cols-[minmax(0,1fr)_minmax(15rem,auto)]"
                  }`}
                >
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
                            (isCollectedDocument(doc) ||
                              isAcceptedQuote(doc)) &&
                            !doc.rectifiedById
                              ? "bg-green-100 text-green-700"
                              : documentStatusColor(doc)
                          }`}
                        >
                          {documentStatusLabel(doc, type)}
                        </span>
                        {type === "factura" &&
                          hasPublicVerifactuAccreditation(doc) && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            Veri*Factu
                          </span>
                        )}
                        {integrityBlocked && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                            Integridad bloqueada
                          </span>
                        )}
                        {linkedInvoice && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Convertido a factura
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {clientHref ? (
                          <Link
                            href={clientHref}
                            className="inline-flex max-w-full rounded-md text-slate-700 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                          >
                            <span className="truncate">{doc.client.name}</span>
                          </Link>
                        ) : (
                          <p className="text-slate-700">{doc.client.name}</p>
                        )}
                        {hasLinkedCustomerNameMismatch && (
                          <>
                            <span
                              className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800"
                              title="La factura conserva un nombre distinto al de la ficha actual. Revisa si la unificación fue correcta."
                            >
                              Revisar cliente
                            </span>
                            {linkedCustomer && !customerRepairRequiresAudit && (
                              <button
                                type="button"
                                onClick={() => {
                                  const ok = window.confirm(
                                    `¿Cambiar el titular congelado de ${doc.number} a ${linkedCustomerName}? No cambia importe, fecha, número ni líneas.`,
                                  );
                                  if (!ok) return;
                                  repairDocumentCustomer(
                                    doc.id,
                                    linkedCustomer.id,
                                  );
                                }}
                                className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-bold text-amber-800 transition-colors hover:bg-amber-50"
                              >
                                Usar ficha actual
                              </button>
                            )}
                            {linkedCustomer && customerRepairRequiresAudit && (
                              <span
                                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                                title="El destinatario histórico no se puede reescribir sin un historial auditable. Usa el flujo de rectificación cuando corresponda."
                              >
                                Protegido tras emisión
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatShortDate(doc.date)} · {formatMoney(total)}
                      </p>
                      {type !== "factura" &&
                        workExpenseSummary &&
                        workMargin !== undefined && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">
                              Costes vinculados:{" "}
                              {formatMoney(workExpenseSummary.cost)}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 ${
                                workMargin >= 0
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              Margen estimado: {formatMoney(workMargin)}
                            </span>
                          </div>
                        )}
                      {invoiceProfitability && (
                        <div className="mt-2 grid gap-2 text-xs font-bold sm:max-w-xl sm:grid-cols-2">
                          <span
                            className={`rounded-xl px-3 py-2 ${
                              invoiceProfitability.profitAfterIrpfReserve >= 0
                                ? "bg-emerald-50 text-emerald-800"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            Beneficio tras IRPF:{" "}
                            {formatMoney(
                              invoiceProfitability.profitAfterIrpfReserve,
                            )}
                          </span>
                          <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                            Reserva impuestos:{" "}
                            {formatMoney(invoiceProfitability.taxReserve)}
                          </span>
                        </div>
                      )}
                      {statusHint &&
                        !(type === "factura" && doc.status === "pagado") && (
                          <p className="mt-1 text-xs text-slate-500">
                            {statusHint}
                          </p>
                        )}
                      {doc.rectification && (
                        <p className="text-xs text-orange-700">
                          Rectifica: {doc.rectification.originalNumber}
                        </p>
                      )}
                      {doc.rectifiedById && (
                        <p className="text-xs text-slate-400">
                          La original queda sin efecto en los cálculos mientras
                          exista la rectificativa.
                        </p>
                      )}
                      {missingShareContact && type !== "factura" && (
                        <p className="text-xs text-slate-500">
                          Sin email ni teléfono para enviar desde aquí.
                        </p>
                      )}
                    </div>
                    {documentChain.length > 1 && (
                      <div className="min-w-0 xl:row-span-2">
                        <DocumentRelationshipFlow
                        items={documentChain}
                        vatExempt={vatExempt}
                          compact
                        />
                      </div>
                    )}
                  {integrityBlocked ? (
                    <div
                      role="alert"
                      className="md:col-start-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    >
                      Acciones bloqueadas. Conserva los datos y revisa una copia de
                      seguridad antes de cobrar, compartir, rectificar o regenerar
                      este documento.
                    </div>
                  ) : (
                    <div className="action-scroll -mx-1 flex items-center gap-2 self-start overflow-x-auto px-1 pb-0.5 sm:pb-0 md:col-start-1">
                    {type === "presupuesto" && (
                      <MarkAsAcceptedButton doc={doc} />
                    )}
                    {type === "presupuesto" && (
                      <ConvertQuoteToInvoiceButton doc={doc} />
                    )}
                    {type === "presupuesto" && (
                      <DuplicateDocumentButton doc={doc} basePath={basePath} />
                    )}
                    {(type === "factura" || type === "recibo") && (
                      <MarkAsPaidButton doc={doc} />
                    )}
                    {type === "factura" && <GenerateReceiptButton doc={doc} />}
                    {type === "factura" && (
                      <PaymentReminderButton
                        doc={contactDoc}
                        profile={data.profile}
                      />
                    )}
                    <DocumentLinkManagerButton
                      doc={doc}
                      expanded={expandedRelationshipDocumentId === doc.id}
                      onToggle={
                        type === "factura"
                          ? () =>
                              setExpandedRelationshipDocumentId((current) =>
                                current === doc.id ? null : doc.id,
                              )
                          : undefined
                      }
                    />
                    <DocumentPdfShareActions
                      doc={doc}
                      profile={data.profile}
                      showPreview={editable}
                    />
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
                      <IconActionButton
                        label="Ver PDF"
                        tooltip="Ver PDF"
                        onClick={() => void handlePdfPreview(doc)}
                        disabled={previewingDocumentId === doc.id}
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200"
                      >
                        <Eye className="h-5 w-5" />
                      </IconActionButton>
                    )}
                    <DeleteDocumentButton doc={doc} />
                    </div>
                  )}
                  {type === "factura" &&
                    expandedRelationshipDocumentId === doc.id &&
                    !integrityBlocked ? (
                      <div className="min-w-0 xl:col-span-2">
                        <InvoiceRelationshipWorkspace
                          doc={doc}
                          onClose={() => setExpandedRelationshipDocumentId(null)}
                          onExpenseAllocationsChange={(allocations) =>
                            setExpenseAllocationsByDocumentId((current) => ({
                              ...current,
                              [doc.id]: allocations,
                            }))
                          }
                        />
                      </div>
                    ) : null}
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
  if (filter === "draft") {
    return document.type === "presupuesto"
      ? document.status === "borrador"
      : deriveDocumentLifecycle(document) === "draft";
  }
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
      document.status === "enviado" &&
      !isAcceptedQuote(document) &&
      !isQuoteExpired(document) &&
      !findInvoiceCreatedFromQuote(allDocuments, document.id)
    );
  }
  if (filter === "issued") {
    return deriveDocumentLifecycle(document) === "issued";
  }
  return true;
}
