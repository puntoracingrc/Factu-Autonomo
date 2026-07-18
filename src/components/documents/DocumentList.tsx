"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Eye, FileWarning, Pencil, Search, Send } from "lucide-react";
import { IconActionButton, IconActionLink } from "@/components/ui/IconAction";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { DeleteDocumentButton } from "@/components/documents/DeleteDocumentButton";
import { ConvertQuoteToInvoiceButton } from "@/components/documents/ConvertQuoteToInvoiceButton";
import { DocumentLinkManagerButton } from "@/components/documents/DocumentLinkManagerButton";
import { DocumentRelationshipFlow } from "@/components/documents/DocumentRelationshipFlow";
import { selectDocumentRelationshipPresentationItems } from "@/components/documents/document-relationship-presentation";
import { InvoiceRelationshipWorkspace } from "@/components/documents/InvoiceRelationshipWorkspace";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { SendMethodChooserModal } from "@/components/documents/SendMethodChooserModal";
import { DuplicateDocumentButton } from "@/components/documents/DuplicateDocumentButton";
import { MarkAsAcceptedButton } from "@/components/documents/MarkAsAcceptedButton";
import { MarkAsPaidButton } from "@/components/documents/MarkAsPaidButton";
import { GenerateReceiptButton } from "@/components/documents/GenerateReceiptButton";
import { PaymentReminderButton } from "@/components/documents/PaymentReminderButton";
import { Card } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { DOCUMENT_EMPTY_ACTION_LABELS } from "@/lib/document-list-copy";
import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import { getDocumentIntegrityBlockedFeedback } from "@/lib/document-integrity/feedback";
import {
  isDocumentUsableForFinancialCalculations,
  isUsableLegacyImportedDocument,
} from "@/lib/document-integrity/legacy-import-attestation";
import {
  inspectAppIssuedDocumentRecovery,
  inspectAppIssuedDocumentRecoveryCollection,
} from "@/lib/document-integrity/app-issued-recovery";
import { hasAppIssuedRecoveryProtectionClaim } from "@/lib/document-integrity/app-issued-recovery-protection";
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
  sortInvoicesByPeriodAndNumberDesc,
} from "@/lib/documents";
import { openDocumentPdfPreview } from "@/lib/pdf";
import {
  downloadInvoicePdfPeriodArchive,
  downloadInvoicePdfSelectionArchive,
  invoicePdfExportPackagePeriodLabel,
  invoicePdfExportPeriodFromQuarter,
  InvoicePdfPeriodExportError,
  type InvoicePdfDocumentSelection,
  type InvoicePdfExportPeriod,
} from "@/lib/billing/export-invoice-pdf-archive";
import { buildInvoiceCustomerEmail } from "@/lib/billing/invoice-customer-email";
import { selectCanonicalFiscalDocumentsForExport } from "@/lib/billing/fiscal-export-documents";
import {
  resolveInvoiceCustomerExportContext,
  type InvoiceCustomerExportContext,
} from "@/lib/billing/invoice-customer-export";
import { buildInvoicePeriodAdvisorEmail } from "@/lib/billing/invoice-period-advisor-email";
import { validateAdvisorContact } from "@/lib/advisor-contact";
import {
  DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS,
  normalizeAppPreferences,
} from "@/lib/app-preferences";
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
import { formatTimelineMonthLabel, timelineMonthKey } from "@/lib/timeline";
import { canRectifyInvoice, isRectificativa } from "@/lib/rectificativas";
import {
  PRODUCT_MONTH_NAMES,
  PRODUCT_QUARTERS,
  availableProductPeriodYears,
  filterDocumentsByProductPeriod,
  formatProductPeriodLabel,
  getDefaultProductPeriod,
  productPeriodMonthRange,
  type ProductPeriodKind,
  type ProductPeriodSelection,
} from "@/lib/product-period-summary";
import {
  RECTIFICATION_ACTION_COPY,
  documentStatusColor,
  documentStatusHint,
  documentStatusLabel,
} from "@/lib/invoice-status-actions";
import {
  canShareFileNatively,
  hasClientEmail,
  hasClientPhone,
  NativeDocumentShareUnavailableError,
  openExternalUrl,
  reserveExternalShareWindow,
  shareFileNatively,
} from "@/lib/share";
import { getCustomerDisplayName } from "@/lib/customers";
import { hasPublicVerifactuAccreditation } from "@/lib/verifactu/attestation";
import type {
  Document,
  DocumentEmailSendPreference,
  DocumentType,
} from "@/lib/types";

const SEARCH_PLACEHOLDERS: Record<DocumentType, string> = {
  factura: "Número, cliente, NIF, dirección o importe...",
  presupuesto: "Número, cliente, NIF, dirección o importe...",
  recibo: "Número, cliente, NIF, dirección o importe...",
};

const SEARCH_HINTS: Record<DocumentType, string> = {
  factura:
    "Ordenadas por año y mes; dentro de cada mes, por el último número de mayor a menor",
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
  | "rectified"
  | "blocked";

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
    { value: "blocked", label: "Bloqueadas" },
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

type ConcreteEmailMethod = Exclude<DocumentEmailSendPreference, "ask">;
type InvoiceExportEmailTarget = "advisor" | "customer";
type InvoiceExportBusy = "download" | InvoiceExportEmailTarget;

interface InvoiceExportScope {
  description: string;
  selection: InvoicePdfDocumentSelection | null;
}

export function DocumentList({ type, basePath }: DocumentListProps) {
  const { data, getDocumentsByType, repairDocumentCustomer, updateProfile } =
    useAppStore();
  const { billingEnabled, isPro, limits } = useBilling();
  const vatExempt = isVatExempt(data.profile);
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<ProductPeriodSelection>(() => ({
    ...getDefaultProductPeriod(),
    kind: "all",
  }));
  const [statusFilter, setStatusFilter] = useState<DocumentStatusFilter>("all");
  const [invoicePdfExportBusy, setInvoicePdfExportBusy] =
    useState<InvoiceExportBusy | null>(null);
  const [invoicePdfExportFeedback, setInvoicePdfExportFeedback] = useState<{
    kind: "success" | "error";
    message: string;
    action?: "advisor" | "customer";
  } | null>(null);
  const [invoiceEmailTarget, setInvoiceEmailTarget] =
    useState<InvoiceExportEmailTarget | null>(null);
  const [rememberInvoiceEmailMethod, setRememberInvoiceEmailMethod] =
    useState(true);
  const [visibleCount, setVisibleCount] = useState(DOCUMENT_LIST_BATCH_SIZE);
  const [previewingDocumentId, setPreviewingDocumentId] = useState<
    string | null
  >(null);
  const [expandedRelationshipDocumentId, setExpandedRelationshipDocumentId] =
    useState<string | null>(null);
  const [expenseAllocationsByDocumentId, setExpenseAllocationsByDocumentId] =
    useState<Record<string, ExpenseCostAllocationsByExpenseId>>({});

  const allDocuments = getDocumentsByType(type);
  const appPreferences = normalizeAppPreferences(data.profile.appPreferences);
  const years = useMemo(
    () => availableProductPeriodYears(allDocuments, []),
    [allDocuments],
  );
  const fiscalBlockedDocumentIds = useMemo(
    () =>
      new Set(
        selectCanonicalFiscalDocumentsForExport(
          data.documents,
          data.profile,
          () => true,
        ).blockedDocuments.map((document) => document.id),
      ),
    [data.documents, data.profile],
  );

  useEffect(() => {
    if (type !== "factura") return;
    const requestedStatus = new URLSearchParams(window.location.search).get(
      "estado",
    );
    if (requestedStatus === "bloqueadas") setStatusFilter("blocked");
  }, [type]);

  const documents = useMemo(() => {
    const periodDocuments = filterDocumentsByProductPeriod(
      allDocuments,
      period,
    );
    const statusDocuments = periodDocuments.filter((document) =>
      matchesDocumentStatusFilter(
        document,
        statusFilter,
        data.documents,
        fiscalBlockedDocumentIds,
      ),
    );
    const sorted =
      type === "factura"
        ? sortInvoicesByPeriodAndNumberDesc(
            statusDocuments,
            data.profile.numbering,
          )
        : sortDocumentsByNumberDesc(statusDocuments);
    return filterDocumentsByQuery(sorted, search, { vatExempt });
  }, [
    allDocuments,
    data.documents,
    data.profile.numbering,
    fiscalBlockedDocumentIds,
    period,
    search,
    statusFilter,
    type,
    vatExempt,
  ]);

  const invoicePdfExportPeriod = useMemo<InvoicePdfExportPeriod | null>(() => {
    if (type !== "factura") return null;
    if (period.kind === "quarter") {
      return invoicePdfExportPeriodFromQuarter(period.year, period.quarter);
    }
    if (period.kind === "month") {
      return {
        year: period.year,
        startMonth: period.month,
        endMonth: period.month,
      };
    }
    if (period.kind === "months") {
      const { startMonth, endMonth } = productPeriodMonthRange(period);
      return { year: period.year, startMonth, endMonth };
    }
    return null;
  }, [period, type]);

  const invoiceCustomerExportContext =
    useMemo<InvoiceCustomerExportContext | null>(() => {
      if (type !== "factura") return null;
      return resolveInvoiceCustomerExportContext({
        query: search,
        filteredDocuments: documents,
        customers: data.customers,
      });
    }, [data.customers, documents, search, type]);

  const invoiceExportScope = useMemo<InvoiceExportScope | null>(() => {
    if (invoiceCustomerExportContext) {
      const periodLabel =
        period.kind === "all" ? null : formatProductPeriodLabel(period);
      const statusLabel =
        statusFilter === "all"
          ? null
          : DOCUMENT_STATUS_OPTIONS.factura.find(
              (option) => option.value === statusFilter,
            )?.label;
      const filtersLabel = [periodLabel, statusLabel]
        .filter(Boolean)
        .join(" · ");
      const description = filtersLabel
        ? `${invoiceCustomerExportContext.customerName} · ${filtersLabel}`
        : `todo el historial de ${invoiceCustomerExportContext.customerName}`;
      const fileLabel = filtersLabel
        ? `${invoiceCustomerExportContext.customerName} · ${filtersLabel}`
        : invoiceCustomerExportContext.customerName;
      return {
        description,
        selection: {
          documentIds: invoiceCustomerExportContext.documentIds,
          fileLabel,
          summaryLabel: filtersLabel
            ? `Cliente ${invoiceCustomerExportContext.customerName} · ${filtersLabel}`
            : `Cliente ${invoiceCustomerExportContext.customerName} · Todo el historial`,
        },
      };
    }

    if (search.trim()) return null;
    if (!invoicePdfExportPeriod) return null;
    return {
      description: invoicePdfExportPackagePeriodLabel(invoicePdfExportPeriod),
      selection: null,
    };
  }, [
    invoiceCustomerExportContext,
    invoicePdfExportPeriod,
    period,
    search,
    statusFilter,
  ]);

  const workExpenseSummaries = useMemo(() => {
    return summarizeWorkDocumentExpensesById(data.expenses);
  }, [data.expenses]);
  const appIssuedRecoveryCollection = useMemo(
    () => inspectAppIssuedDocumentRecoveryCollection(data.documents),
    [data.documents],
  );

  useEffect(() => {
    if (type !== "factura") return;
    const nextAllocations: Record<string, ExpenseCostAllocationsByExpenseId> =
      {};
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
    setPeriod((current) => {
      const next = { ...current, ...patch };
      if (next.kind !== "months") return next;
      const { startMonth, endMonth } = productPeriodMonthRange(next);
      return { ...next, month: startMonth, endMonth };
    });
    setInvoicePdfExportFeedback(null);
  }

  function saveInvoiceEmailMethod(method: ConcreteEmailMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentEmailMethod: method,
      }),
    });
  }

  function unavailableExportScopeMessage(): string {
    if (search.trim()) {
      return "Afina la búsqueda hasta que corresponda a un único cliente, o selecciona Trimestre o Meses.";
    }
    return "Selecciona Trimestre o Meses para exportar un máximo de tres meses, o busca un único cliente.";
  }

  function handleEmailExportClick(target: InvoiceExportEmailTarget) {
    if (!invoiceExportScope) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message: unavailableExportScopeMessage(),
      });
      return;
    }

    if (
      target === "advisor" &&
      !validateAdvisorContact(data.profile.advisorContact).value
    ) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Completa primero el nombre, email y teléfono de tu gestor en Ajustes.",
        action: "advisor",
      });
      return;
    }

    if (
      target === "customer" &&
      (!invoiceCustomerExportContext || !invoiceCustomerExportContext.email)
    ) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Añade un email válido a la ficha del cliente antes de preparar el envío.",
        action: "customer",
      });
      return;
    }

    if (appPreferences.documentEmailMethod === "ask") {
      setRememberInvoiceEmailMethod(true);
      setInvoiceEmailTarget(target);
      return;
    }

    void handleExportInvoicePdfs(target, appPreferences.documentEmailMethod);
  }

  async function chooseInvoiceEmailMethod(method: ConcreteEmailMethod) {
    const target = invoiceEmailTarget;
    if (!target) return;
    if (rememberInvoiceEmailMethod) saveInvoiceEmailMethod(method);
    setInvoiceEmailTarget(null);
    await handleExportInvoicePdfs(target, method);
  }

  async function handleExportInvoicePdfs(
    emailTarget?: InvoiceExportEmailTarget,
    emailMethod?: ConcreteEmailMethod,
  ) {
    if (!invoiceExportScope) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message: unavailableExportScopeMessage(),
      });
      return;
    }

    if (
      emailTarget === "advisor" &&
      !validateAdvisorContact(data.profile.advisorContact).value
    ) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Completa primero el nombre, email y teléfono de tu gestor en Ajustes.",
        action: "advisor",
      });
      return;
    }

    if (
      emailTarget === "customer" &&
      (!invoiceCustomerExportContext || !invoiceCustomerExportContext.email)
    ) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Añade un email válido a la ficha del cliente antes de preparar el envío.",
        action: "customer",
      });
      return;
    }

    if (
      emailTarget &&
      emailMethod === "native" &&
      !canShareFileNatively("Facturas.zip", "application/zip")
    ) {
      setRememberInvoiceEmailMethod(true);
      setInvoiceEmailTarget(emailTarget);
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Compartir del dispositivo no admite este ZIP aquí. Elige Gmail o Correo del dispositivo.",
      });
      return;
    }

    const useExternalEmailClient =
      emailTarget && (emailMethod === "gmail" || emailMethod === "mailto");
    const reservedEmailWindow = useExternalEmailClient
      ? reserveExternalShareWindow()
      : null;
    setInvoicePdfExportFeedback(null);
    setInvoicePdfExportBusy(emailTarget ?? "download");
    try {
      const result = invoiceExportScope.selection
        ? await downloadInvoicePdfSelectionArchive(
            data.documents,
            data.profile,
            invoiceExportScope.selection,
          )
        : await downloadInvoicePdfPeriodArchive(
            data.documents,
            data.profile,
            invoicePdfExportPeriod!,
          );
      if (emailTarget && emailMethod) {
        const email =
          emailTarget === "advisor"
            ? buildInvoicePeriodAdvisorEmail(
                data.profile,
                invoiceExportScope.description,
                result.fileName,
                result.summaryFileName,
                result.invoiceCount,
              )
            : buildInvoiceCustomerEmail(
                data.profile,
                invoiceCustomerExportContext!.customer,
                invoiceCustomerExportContext!.email,
                invoiceExportScope.description,
                result.fileName,
                result.summaryFileName,
                result.invoiceCount,
              );
        if (!email) {
          throw new Error("email_contact_unavailable");
        }

        if (emailMethod === "native") {
          await shareFileNatively({
            blob: result.blob,
            fileName: result.fileName,
            title: email.subject,
            text: email.body,
          });
        } else {
          const emailUrl =
            emailMethod === "gmail" ? email.gmailComposeUrl : email.mailtoUrl;
          const opened = openExternalUrl(emailUrl, reservedEmailWindow);
          if (!opened) window.location.assign(emailUrl);
        }
      }
      setInvoicePdfExportFeedback({
        kind: "success",
        message:
          emailTarget && emailMethod
            ? emailMethod === "native"
              ? `Descargado ${result.fileName} y abierto Compartir con el ZIP incluido.`
              : `Descargado ${result.fileName} y abierto ${emailMethod === "gmail" ? "Gmail" : "el correo del dispositivo"} para ${emailTarget === "advisor" ? "tu gestor" : "tu cliente"}. Adjunta el ZIP antes de enviarlo.`
            : `Descargado ${result.folderName}: ${result.invoiceCount} factura${result.invoiceCount === 1 ? "" : "s"} en PDF y su resumen.`,
      });
    } catch (error) {
      if (reservedEmailWindow && !reservedEmailWindow.closed) {
        reservedEmailWindow.close();
      }
      const nativeShareUnavailable =
        error instanceof NativeDocumentShareUnavailableError;
      if (nativeShareUnavailable) {
        setRememberInvoiceEmailMethod(true);
        if (emailTarget) setInvoiceEmailTarget(emailTarget);
      }
      const message = nativeShareUnavailable
        ? "El ZIP se ha descargado, pero Compartir no pudo abrirse. Elige Gmail o Correo del dispositivo."
        : error instanceof InvoicePdfPeriodExportError
          ? error.documentReferences.length > 0
            ? `${error.message} Documentos: ${error.documentReferences.join(", ")}.`
            : error.message
          : "No se pudo preparar el paquete de facturas. No se ha descargado un archivo incompleto.";
      setInvoicePdfExportFeedback({ kind: "error", message });
    } finally {
      setInvoicePdfExportBusy(null);
    }
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
    period.endMonth,
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]">
            <Field label={`Buscar ${label}`} hint={SEARCH_HINTS[type]}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setInvoicePdfExportFeedback(null);
                  }}
                  placeholder={SEARCH_PLACEHOLDERS[type]}
                  className="pl-10"
                />
              </div>
            </Field>

            <Field label="Periodo">
              <div className="grid gap-2 sm:grid-cols-2">
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
                  <option value="months">Meses</option>
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

                {period.kind === "months" && (
                  <Select
                    value={period.month}
                    aria-label="Mes inicial del listado"
                    onChange={(event) => {
                      const month = Number(event.target.value);
                      updatePeriod({ month });
                    }}
                  >
                    {PRODUCT_MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        Desde {name}
                      </option>
                    ))}
                  </Select>
                )}

                {period.kind === "months" && (
                  <Select
                    value={period.endMonth ?? period.month}
                    aria-label="Mes final del listado"
                    onChange={(event) =>
                      updatePeriod({ endMonth: Number(event.target.value) })
                    }
                  >
                    {PRODUCT_MONTH_NAMES.slice(
                      period.month - 1,
                      Math.min(12, period.month + 2),
                    ).map((name, index) => {
                      const month = period.month + index;
                      return (
                        <option key={name} value={month}>
                          Hasta {name}
                        </option>
                      );
                    })}
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
                onChange={(event) => {
                  setStatusFilter(event.target.value as DocumentStatusFilter);
                  setInvoicePdfExportFeedback(null);
                }}
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

          {type === "factura" && limits.quarterlyExport ? (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleExportInvoicePdfs()}
                  disabled={
                    Boolean(invoicePdfExportBusy) || !invoiceExportScope
                  }
                  title={
                    invoiceExportScope
                      ? invoiceCustomerExportContext
                        ? `Descargar las ${invoiceCustomerExportContext.documentIds.length} facturas emitidas filtradas de ${invoiceCustomerExportContext.customerName}`
                        : "Descargar las facturas del periodo en una carpeta ZIP"
                      : "Selecciona Trimestre o Meses, o busca un único cliente"
                  }
                  className="min-h-10 px-4 text-sm"
                >
                  <Download className="h-4 w-4" />
                  {invoicePdfExportBusy === "download"
                    ? "Preparando…"
                    : "Exportar facturas PDF"}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleEmailExportClick("advisor")}
                  disabled={
                    Boolean(invoicePdfExportBusy) || !invoiceExportScope
                  }
                  title={
                    invoiceExportScope
                      ? "Descargar el ZIP y elegir cómo enviarlo a tu gestor"
                      : "Selecciona Trimestre o Meses, o busca un único cliente"
                  }
                  className="min-h-10 px-4 text-sm"
                >
                  <Send className="h-4 w-4" />
                  {invoicePdfExportBusy === "advisor"
                    ? "Preparando correo…"
                    : "Exportar y enviar al gestor"}
                </Button>
                {invoiceCustomerExportContext ? (
                  <Button
                    type="button"
                    onClick={() => handleEmailExportClick("customer")}
                    disabled={
                      Boolean(invoicePdfExportBusy) ||
                      !invoiceExportScope ||
                      !invoiceCustomerExportContext.email
                    }
                    title={
                      invoiceCustomerExportContext.email
                        ? `Descargar el ZIP y elegir cómo enviarlo a ${invoiceCustomerExportContext.customerName}`
                        : "Añade un email válido a la ficha de este cliente"
                    }
                    className="min-h-10 px-4 text-sm"
                  >
                    <Send className="h-4 w-4" />
                    {invoicePdfExportBusy === "customer"
                      ? "Preparando correo…"
                      : "Exportar y enviar al cliente"}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 sm:max-w-md sm:text-right">
                {invoiceCustomerExportContext
                  ? invoiceCustomerExportContext.documentIds.length === 1
                    ? `Cliente identificado: el paquete incluye su factura emitida filtrada, aunque el listado muestre ${visibleDocuments.length} resultado ahora.`
                    : `Cliente identificado: el paquete incluye sus ${invoiceCustomerExportContext.documentIds.length} facturas emitidas filtradas, aunque el listado solo muestre ${visibleDocuments.length} resultados ahora.`
                  : "Selecciona un mes, hasta tres meses consecutivos o un trimestre. También puedes buscar un único cliente para exportar todos sus resultados filtrados."}
              </p>
            </div>
          ) : null}

          <SendMethodChooserModal
            open={invoiceEmailTarget !== null}
            title={
              invoiceEmailTarget === "customer"
                ? "Enviar facturas al cliente"
                : "Enviar facturas al gestor"
            }
            description={
              invoiceEmailTarget === "customer"
                ? `${invoiceExportScope?.description || "Selección"} · ${invoiceCustomerExportContext?.email || "Sin email"}`
                : `${invoiceExportScope?.description || formatProductPeriodLabel(period)} · ${data.profile.advisorContact?.advisorName?.trim() || "Gestor"}`
            }
            options={DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS}
            rememberMethod={rememberInvoiceEmailMethod}
            onRememberMethodChange={setRememberInvoiceEmailMethod}
            onChoose={(method) => void chooseInvoiceEmailMethod(method)}
            onClose={() => {
              if (!invoicePdfExportBusy) setInvoiceEmailTarget(null);
            }}
            busy={
              invoiceEmailTarget !== null &&
              invoicePdfExportBusy === invoiceEmailTarget
            }
            testId="invoice-email-method-modal"
          />

          {type === "factura" && invoicePdfExportFeedback ? (
            <p
              role={
                invoicePdfExportFeedback.kind === "error" ? "alert" : "status"
              }
              className={`text-sm font-semibold ${
                invoicePdfExportFeedback.kind === "error"
                  ? "text-red-700"
                  : "text-emerald-700"
              }`}
            >
              {invoicePdfExportFeedback.message}
              {invoicePdfExportFeedback.action === "advisor" ? (
                <Link
                  href="/configuracion#ajustes-gestor"
                  className="ml-2 underline underline-offset-2"
                >
                  Completar datos del gestor
                </Link>
              ) : invoicePdfExportFeedback.action === "customer" &&
                invoiceCustomerExportContext ? (
                <Link
                  href={`/clientes?cliente=${encodeURIComponent(invoiceCustomerExportContext.customer.id)}`}
                  className="ml-2 underline underline-offset-2"
                >
                  Abrir ficha del cliente
                </Link>
              ) : null}
            </p>
          ) : null}
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
            const dividerLabel =
              !previousDocument ||
              timelineMonthKey(previousDocument.date) !==
                timelineMonthKey(doc.date)
                ? formatTimelineMonthLabel(doc.date)
                : null;
            const recoveryCollectionValid =
              !hasAppIssuedRecoveryProtectionClaim(doc) ||
              appIssuedRecoveryCollection.validDocumentIds.has(doc.id);
            const amounts = recoveryCollectionValid
              ? documentAmounts(doc, vatExempt)
              : { subtotal: 0, iva: 0, total: 0 };
            const total = amounts.total;
            const canonicalDocumentChain = getDocumentChainItems(
              doc,
              data.documents,
              data.expenses,
              expenseAllocationsByDocumentId[doc.id] ?? {},
            );
            const relationshipItems =
              selectDocumentRelationshipPresentationItems(
                canonicalDocumentChain,
                doc,
              );
            const workExpenseSummary =
              type === "factura"
                ? summarizeAllocatedWorkExpenses({
                    expenses: data.expenses,
                    workDocumentIds: canonicalDocumentChain
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
            const legacyImportAttested = isUsableLegacyImportedDocument(doc);
            const legacyImportedAccepted =
              legacyImportAttested &&
              isDocumentUsableForFinancialCalculations(doc);
            const recoveryInspection = hasAppIssuedRecoveryProtectionClaim(doc)
              ? inspectAppIssuedDocumentRecovery(doc)
              : null;
            const appIssuedRecovered = Boolean(
              recoveryInspection?.ok &&
              recoveryInspection.active &&
              recoveryCollectionValid &&
              isDocumentUsableForFinancialCalculations(doc),
            );
            const integrityBlocked =
              fiscalBlockedDocumentIds.has(doc.id) ||
              (!appIssuedRecovered &&
                (doc.snapshotIntegrity?.status === "blocked" ||
                  hasAppIssuedRecoveryProtectionClaim(doc)));
            const integrityFeedback = getDocumentIntegrityBlockedFeedback(
              doc.snapshotIntegrity?.issues,
            );
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
                {dividerLabel && <TimelineMonthDivider label={dividerLabel} />}
                <Card
                  className={`grid gap-4 ${
                    rect ? "!border-orange-300 ring-1 ring-orange-100" : ""
                  } ${
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
                          (isCollectedDocument(doc) || isAcceptedQuote(doc)) &&
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
                      {legacyImportedAccepted && (
                        <span
                          className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800"
                          title="Documento histórico importado y aceptado para cálculos"
                        >
                          Histórico importado
                        </span>
                      )}
                      {appIssuedRecovered && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
                          Documento de Factu · recuperado y revisado
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
                      !(type === "factura" && isCollectedDocument(doc)) && (
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
                  {relationshipItems.length > 0 && (
                    <div className="min-w-0 xl:row-span-2">
                      <DocumentRelationshipFlow
                        items={relationshipItems}
                        vatExempt={vatExempt}
                        compact
                        onExpensesClick={
                          type === "factura"
                            ? () => setExpandedRelationshipDocumentId(doc.id)
                            : undefined
                        }
                        removableRoles={type === "factura" ? ["gastos"] : []}
                        onRemoveItem={
                          type === "factura"
                            ? (item) => {
                                if (item.role === "gastos") {
                                  setExpandedRelationshipDocumentId(doc.id);
                                  return;
                                }
                              }
                            : undefined
                        }
                      />
                    </div>
                  )}
                  {appIssuedRecovered ? (
                    <div className="md:col-start-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-950">
                      <p className="font-semibold">
                        Importes recuperados para cuentas
                      </p>
                      <p className="mt-1">
                        El documento permanece congelado. Conserva el PDF
                        original: Factu no ha fabricado el sello de emisión y
                        mantiene bloqueadas la edición, reemisión, envío y
                        nuevas acciones fiscales. Impuestos y exportaciones
                        siguen aplicando sus validaciones habituales.
                      </p>
                    </div>
                  ) : integrityBlocked ? (
                    <div
                      role="alert"
                      className="md:col-start-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
                    >
                      <p>{integrityFeedback.title}</p>
                      <p className="mt-1 font-medium">
                        {integrityFeedback.reason}{" "}
                        {integrityFeedback.consequence}
                      </p>
                      <p className="mt-1 font-medium">
                        {integrityFeedback.recovery}
                      </p>
                      {type === "factura" && (
                        <div className="mt-2 flex justify-start">
                          <GenerateReceiptButton doc={doc} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="action-scroll -mx-1 flex items-center gap-2 self-start overflow-x-auto px-1 pb-0.5 sm:pb-0 md:col-start-1">
                      {!legacyImportAttested && type === "presupuesto" && (
                        <MarkAsAcceptedButton doc={doc} />
                      )}
                      {!legacyImportAttested && type === "presupuesto" && (
                        <ConvertQuoteToInvoiceButton doc={doc} />
                      )}
                      {type === "presupuesto" && (
                        <DuplicateDocumentButton
                          doc={doc}
                          basePath={basePath}
                        />
                      )}
                      {(type === "factura" || type === "recibo") && (
                        <MarkAsPaidButton doc={doc} />
                      )}
                      {!legacyImportAttested && type === "factura" && (
                        <GenerateReceiptButton doc={doc} />
                      )}
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
                          label={
                            legacyImportAttested ? "Ver copia PDF" : "Ver PDF"
                          }
                          tooltip={
                            legacyImportAttested
                              ? "Abrir una reconstrucción desde los datos importados; conserva el original"
                              : "Ver PDF"
                          }
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
                  expandedRelationshipDocumentId === doc.id ? (
                    <div className="min-w-0 xl:col-span-2">
                      <InvoiceRelationshipWorkspace
                        doc={doc}
                        quoteLinkEditable={
                          editable &&
                          !canonicalDocumentChain.some(
                            (item) => item.role === "presupuesto",
                          )
                        }
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
  fiscalBlockedDocumentIds: ReadonlySet<string>,
): boolean {
  if (filter === "all") return true;
  if (filter === "blocked") return fiscalBlockedDocumentIds.has(document.id);
  if (filter === "draft") {
    return document.type === "presupuesto"
      ? document.status === "borrador"
      : deriveDocumentLifecycle(document) === "draft";
  }
  if (filter === "accepted") return isAcceptedQuote(document);
  if (filter === "expired")
    return isQuoteExpired(document) || document.status === "vencido";
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
