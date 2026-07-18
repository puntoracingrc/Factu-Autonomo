"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Lock, Send } from "lucide-react";
import { TaxSummaryCard } from "@/components/dashboard/TaxSummaryCard";
import {
  PeriodOverviewCards,
  type MonthlyBenefitRow,
} from "@/components/dashboard/PeriodOverviewCards";
import { SendMethodChooserModal } from "@/components/documents/SendMethodChooserModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { downloadAnnualSummaryPdf } from "@/lib/billing/export-annual-pdf";
import { buildInvoicePeriodAdvisorEmail } from "@/lib/billing/invoice-period-advisor-email";
import {
  downloadInvoicePdfPeriodArchive,
  INVOICE_PDF_EXPORT_MONTH_NAMES,
  invoicePdfExportPeriodFromQuarter,
  invoicePdfExportPeriodLabel,
  InvoicePdfPeriodExportError,
  isDateInInvoicePdfExportPeriod,
  type InvoicePdfExportPeriod,
} from "@/lib/billing/export-invoice-pdf-archive";
import {
  buildQuarterlyExportCsv,
  downloadQuarterlyCsv,
} from "@/lib/billing/export-quarterly";
import {
  ALL_QUARTERS,
  availableSummaryYears,
  filterExpensesByQuarter,
  filterExpensesByYear,
  getCurrentQuarter,
  isDateInQuarter,
  isDateInYear,
  quarterLabel,
  type Quarter,
} from "@/lib/periods";
import {
  calculateTaxSummary,
  selectTaxableFiscalDocumentsForPeriod,
} from "@/lib/taxes";
import { validateAdvisorContact } from "@/lib/advisor-contact";
import {
  DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS,
  normalizeAppPreferences,
} from "@/lib/app-preferences";
import { isPendingInvoicePayment } from "@/lib/income";
import {
  canShareFileNatively,
  NativeDocumentShareUnavailableError,
  openExternalUrl,
  reserveExternalShareWindow,
  shareFileNatively,
} from "@/lib/share";
import type { AppData, DocumentEmailSendPreference } from "@/lib/types";
import {
  documentAmounts,
  isVatExempt,
  totalExpensesAmount,
} from "@/lib/vat-regime";

type FiscalPeriodMode = "quarter" | "months" | "year" | "all";
type ConcreteEmailMethod = Exclude<DocumentEmailSendPreference, "ask">;
type InvoicePdfExportBusy = "download" | "advisor";

interface InvoicePdfExportFeedback {
  kind: "success" | "error";
  message: string;
  action?: "advisor";
}

interface FiscalSummaryPanelProps {
  data: AppData;
}

function monthKeyFromDate(date: string): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  return match ? `${match[1]}-${match[2]}` : null;
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string): string {
  const [year, rawMonth] = key.split("-");
  const monthIndex = Number(rawMonth) - 1;
  const monthName =
    INVOICE_PDF_EXPORT_MONTH_NAMES[monthIndex]?.toLowerCase() ?? rawMonth;
  return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;
}

function selectedMonthKeys(
  mode: FiscalPeriodMode,
  year: number,
  quarter: Quarter,
  startMonth: number,
  endMonth: number,
  movementKeys: string[],
): string[] {
  if (mode === "quarter") {
    const firstMonth = (quarter - 1) * 3 + 1;
    return [firstMonth, firstMonth + 1, firstMonth + 2].map((month) =>
      monthKey(year, month),
    );
  }

  if (mode === "months") {
    return Array.from(
      { length: endMonth - startMonth + 1 },
      (_, index) => monthKey(year, startMonth + index),
    );
  }

  if (mode === "year") {
    return Array.from({ length: 12 }, (_, index) => monthKey(year, index + 1));
  }

  return movementKeys;
}

export function FiscalSummaryPanel({ data }: FiscalSummaryPanelProps) {
  const { updateProfile } = useAppStore();
  const { billingEnabled, limits } = useBilling();
  const current = getCurrentQuarter();
  const currentMonth = new Date().getMonth() + 1;
  const [mode, setMode] = useState<FiscalPeriodMode>("quarter");
  const [year, setYear] = useState(current.year);
  const [quarter, setQuarter] = useState<Quarter>(current.quarter);
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [invoicePdfExportBusy, setInvoicePdfExportBusy] =
    useState<InvoicePdfExportBusy | null>(null);
  const [invoicePdfExportFeedback, setInvoicePdfExportFeedback] =
    useState<InvoicePdfExportFeedback | null>(null);
  const [advisorEmailMethodOpen, setAdvisorEmailMethodOpen] = useState(false);
  const [rememberAdvisorEmailMethod, setRememberAdvisorEmailMethod] =
    useState(true);
  const locked = billingEnabled && !limits.quarterlySummary;
  const appPreferences = normalizeAppPreferences(data.profile.appPreferences);

  const monthPeriod: InvoicePdfExportPeriod = {
    year,
    startMonth,
    endMonth,
  };
  const invoicePdfExportPeriod =
    mode === "quarter"
      ? invoicePdfExportPeriodFromQuarter(year, quarter)
      : mode === "months"
        ? monthPeriod
        : null;

  const vatExempt = isVatExempt(data.profile);
  const years = useMemo(
    () => availableSummaryYears(data.documents, data.expenses),
    [data.documents, data.expenses],
  );

  const periodExpenses = useMemo(() => {
    if (mode === "all") return data.expenses;
    if (mode === "year") return filterExpensesByYear(data.expenses, year);
    if (mode === "months") {
      return data.expenses.filter((expense) =>
        isDateInInvoicePdfExportPeriod(expense.date, {
          year,
          startMonth,
          endMonth,
        }),
      );
    }
    return filterExpensesByQuarter(data.expenses, year, quarter);
  }, [data.expenses, mode, year, quarter, startMonth, endMonth]);

  const isDocumentDateInPeriod =
    mode === "all"
      ? () => true
      : mode === "year"
        ? (date: string) => isDateInYear(date, year)
        : mode === "months"
          ? (date: string) =>
              isDateInInvoicePdfExportPeriod(date, monthPeriod)
          : (date: string) => isDateInQuarter(date, year, quarter);

  const fiscalDocuments = selectTaxableFiscalDocumentsForPeriod(
    data.documents,
    {
      profile: data.profile,
      isDocumentDateInPeriod,
    },
  ).documents;

  const taxes = calculateTaxSummary(data.documents, periodExpenses, {
    irpfPercent: data.profile.irpfPercent,
    vatExempt,
    profile: data.profile,
    isDocumentDateInPeriod,
  });
  const exportBlocked =
    taxes.integrityBlockedDocuments > 0 ||
    taxes.unsupportedRectificationDocuments > 0 ||
    taxes.unsupportedMixedVatExpenses > 0;
  const exportBlockedTitle = exportBlocked
    ? "Revisa los bloqueos indicados en el resumen antes de exportar"
    : undefined;

  // El resumen fiscal sigue el devengo canónico de las ventas emitidas.
  // Cobrar o no una factura es tesorería y no debe excluirla de esta cifra.
  const periodInvoiced = taxes.salesBase + taxes.salesIva;
  const periodSpent = totalExpensesAmount(periodExpenses, vatExempt);
  const monthlyBenefitRows = useMemo<MonthlyBenefitRow[]>(() => {
    const salesByMonth = new Map<string, number>();
    const expensesByMonth = new Map<string, number>();
    const pendingNumbersByMonth = new Map<string, string[]>();
    const pendingTotalByMonth = new Map<string, number>();
    const movementKeys = new Set<string>();

    for (const document of fiscalDocuments) {
      const key = monthKeyFromDate(document.date);
      if (!key) continue;
      movementKeys.add(key);
      const total = documentAmounts(document, vatExempt).total;
      salesByMonth.set(key, (salesByMonth.get(key) ?? 0) + total);

      if (isPendingInvoicePayment(document)) {
        pendingNumbersByMonth.set(key, [
          ...(pendingNumbersByMonth.get(key) ?? []),
          document.number,
        ]);
        pendingTotalByMonth.set(
          key,
          (pendingTotalByMonth.get(key) ?? 0) + total,
        );
      }
    }

    for (const expense of periodExpenses) {
      const key = monthKeyFromDate(expense.date);
      if (!key) continue;
      movementKeys.add(key);
      expensesByMonth.set(
        key,
        (expensesByMonth.get(key) ?? 0) +
          totalExpensesAmount([expense], vatExempt),
      );
    }

    return selectedMonthKeys(
      mode,
      year,
      quarter,
      startMonth,
      endMonth,
      Array.from(movementKeys).sort(),
    ).map((key) => {
      const invoiced = salesByMonth.get(key) ?? 0;
      const spent = expensesByMonth.get(key) ?? 0;
      const pendingTotal = pendingTotalByMonth.get(key) ?? 0;
      const benefit = invoiced - spent;
      return {
        key,
        label: monthLabelFromKey(key),
        invoiced,
        spent,
        benefit,
        pendingInvoiceNumbers: pendingNumbersByMonth.get(key) ?? [],
        pendingTotal,
        realBenefitToday: benefit - pendingTotal,
      };
    });
  }, [
    fiscalDocuments,
    mode,
    periodExpenses,
    quarter,
    startMonth,
    endMonth,
    vatExempt,
    year,
  ]);

  const title =
    mode === "all"
      ? "Todo el historial"
      : mode === "year"
        ? `Año ${year}`
        : mode === "months"
          ? invoicePdfExportPeriodLabel(monthPeriod)
          : quarterLabel(year, quarter);

  const subtitle =
    mode === "all"
      ? "Facturas, recibos y gastos registrados desde el inicio."
      : mode === "year"
        ? `Movimientos con fecha en ${year}.`
        : mode === "months"
          ? startMonth === endMonth
            ? `Facturas, recibos y gastos con fecha en ${INVOICE_PDF_EXPORT_MONTH_NAMES[startMonth - 1].toLowerCase()} de ${year}.`
            : `Facturas, recibos y gastos con fecha entre ${INVOICE_PDF_EXPORT_MONTH_NAMES[startMonth - 1].toLowerCase()} y ${INVOICE_PDF_EXPORT_MONTH_NAMES[endMonth - 1].toLowerCase()} de ${year}.`
          : `Facturas, recibos y gastos con fecha en ${quarterLabel(year, quarter).toLowerCase()}.`;

  function handleExportCsv() {
    const csv = buildQuarterlyExportCsv(
      data.documents,
      data.expenses,
      data.profile,
      year,
      quarter,
      data.suppliers,
    );
    downloadQuarterlyCsv(csv, year, quarter);
  }

  function handleExportAnnualPdf() {
    downloadAnnualSummaryPdf(
      data.documents,
      data.expenses,
      data.profile,
      year,
    );
  }

  function saveAdvisorEmailMethod(method: ConcreteEmailMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentEmailMethod: method,
      }),
    });
  }

  function handleAdvisorEmailExportClick() {
    if (!invoicePdfExportPeriod) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Selecciona Trimestre o Meses para exportar un máximo de tres meses.",
      });
      return;
    }

    if (!validateAdvisorContact(data.profile.advisorContact).value) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Completa primero el nombre, email y teléfono de tu gestor en Ajustes.",
        action: "advisor",
      });
      return;
    }

    if (appPreferences.documentEmailMethod === "ask") {
      setRememberAdvisorEmailMethod(true);
      setAdvisorEmailMethodOpen(true);
      return;
    }

    void handleExportInvoicePdfs(appPreferences.documentEmailMethod);
  }

  async function chooseAdvisorEmailMethod(method: ConcreteEmailMethod) {
    if (rememberAdvisorEmailMethod) saveAdvisorEmailMethod(method);
    setAdvisorEmailMethodOpen(false);
    await handleExportInvoicePdfs(method);
  }

  async function handleExportInvoicePdfs(emailMethod?: ConcreteEmailMethod) {
    if (!invoicePdfExportPeriod) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Selecciona Trimestre o Meses para exportar un máximo de tres meses.",
      });
      return;
    }

    if (emailMethod && !validateAdvisorContact(data.profile.advisorContact).value) {
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Completa primero el nombre, email y teléfono de tu gestor en Ajustes.",
        action: "advisor",
      });
      return;
    }

    if (
      emailMethod === "native" &&
      !canShareFileNatively("Facturas.zip", "application/zip")
    ) {
      setRememberAdvisorEmailMethod(true);
      setAdvisorEmailMethodOpen(true);
      setInvoicePdfExportFeedback({
        kind: "error",
        message:
          "Compartir del dispositivo no admite este ZIP aquí. Elige Gmail o Correo del dispositivo.",
      });
      return;
    }

    const useExternalEmailClient =
      emailMethod === "gmail" || emailMethod === "mailto";
    const reservedEmailWindow = useExternalEmailClient
      ? reserveExternalShareWindow()
      : null;
    setInvoicePdfExportFeedback(null);
    setInvoicePdfExportBusy(emailMethod ? "advisor" : "download");
    try {
      const result = await downloadInvoicePdfPeriodArchive(
        data.documents,
        data.profile,
        invoicePdfExportPeriod,
      );
      if (emailMethod) {
        const email = buildInvoicePeriodAdvisorEmail(
          data.profile,
          invoicePdfExportPeriodLabel(invoicePdfExportPeriod),
          result.fileName,
          result.summaryFileName,
          result.invoiceCount,
        );
        if (!email) throw new Error("advisor_contact_unavailable");

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
        message: emailMethod
          ? emailMethod === "native"
            ? `Descargado ${result.fileName} y abierto Compartir con el ZIP incluido.`
            : `Descargado ${result.fileName} y abierto ${emailMethod === "gmail" ? "Gmail" : "el correo del dispositivo"} para tu gestor. Adjunta el ZIP antes de enviarlo.`
          : `Descargado ${result.folderName}: ${result.invoiceCount} factura${result.invoiceCount === 1 ? "" : "s"} en PDF.`,
      });
    } catch (error) {
      if (reservedEmailWindow && !reservedEmailWindow.closed) {
        reservedEmailWindow.close();
      }
      const nativeShareUnavailable =
        error instanceof NativeDocumentShareUnavailableError;
      if (nativeShareUnavailable) {
        setRememberAdvisorEmailMethod(true);
        setAdvisorEmailMethodOpen(true);
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

  if (locked) {
    return (
      <Card className="mb-6 border-violet-200 bg-violet-50/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Resumen fiscal</h2>
            <p className="mt-1 text-sm text-slate-600">
              El detalle por trimestre y la exportación CSV para tu gestor están
              en el plan Pro.
            </p>
            <Link
              href="/precios"
              className="mt-3 inline-block text-sm font-semibold text-blue-600 underline"
            >
              Ver planes Pro desde 5,99 €/mes
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <TaxSummaryCard
      taxes={taxes}
      title={title}
      subtitle={subtitle}
      footerNote="Útil para preparar el IVA trimestral (modelo 303) y pagos fraccionados."
      headerExtra={
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["quarter", "Trimestre"],
                ["months", "Meses"],
                ["year", "Año"],
                ["all", "Todo"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setInvoicePdfExportFeedback(null);
                }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode !== "all" && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                aria-label="Año"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {mode === "quarter" && (
                <select
                  value={quarter}
                  onChange={(e) =>
                    setQuarter(Number(e.target.value) as Quarter)
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                  aria-label="Trimestre"
                >
                  {ALL_QUARTERS.map((q) => (
                    <option key={q} value={q}>
                      T{q}
                    </option>
                  ))}
                </select>
              )}
              {mode === "months" && (
                <>
                  <select
                    value={startMonth}
                    onChange={(event) => {
                      const nextStartMonth = Number(event.target.value);
                      setStartMonth(nextStartMonth);
                      setEndMonth((previousEndMonth) =>
                        Math.min(
                          12,
                          Math.max(
                            nextStartMonth,
                            Math.min(previousEndMonth, nextStartMonth + 2),
                          ),
                        ),
                      );
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                    aria-label="Mes inicial"
                  >
                    {INVOICE_PDF_EXPORT_MONTH_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        Desde {name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={endMonth}
                    onChange={(event) =>
                      setEndMonth(Number(event.target.value))
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800"
                    aria-label="Mes final"
                  >
                    {INVOICE_PDF_EXPORT_MONTH_NAMES.slice(
                      startMonth - 1,
                      Math.min(12, startMonth + 2),
                    ).map((name, index) => {
                      const month = startMonth + index;
                      return (
                        <option key={name} value={month}>
                          Hasta {name}
                        </option>
                      );
                    })}
                  </select>
                </>
              )}
              {mode === "quarter" && limits.quarterlyExport && (
                <Button
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={exportBlocked}
                  title={exportBlockedTitle}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              )}
              {mode === "year" && limits.quarterlyExport && (
                <Button
                  variant="secondary"
                  onClick={handleExportAnnualPdf}
                  disabled={exportBlocked}
                  title={exportBlockedTitle}
                >
                  <Download className="h-4 w-4" />
                  Resumen PDF
                </Button>
              )}
            </div>
          )}
          {limits.quarterlyExport && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => void handleExportInvoicePdfs()}
                disabled={Boolean(invoicePdfExportBusy) || !invoicePdfExportPeriod}
                title={
                  invoicePdfExportPeriod
                    ? "Descargar las facturas del periodo en una carpeta ZIP"
                    : "Selecciona Trimestre o Meses (máximo tres meses)"
                }
              >
                <Download className="h-4 w-4" />
                {invoicePdfExportBusy === "download"
                  ? "Preparando…"
                  : "Facturas PDF"}
              </Button>
              <Button
                onClick={handleAdvisorEmailExportClick}
                disabled={Boolean(invoicePdfExportBusy) || !invoicePdfExportPeriod}
                title={
                  invoicePdfExportPeriod
                    ? "Descargar el ZIP y elegir cómo enviarlo a tu gestor"
                    : "Selecciona Trimestre o Meses (máximo tres meses)"
                }
              >
                <Send className="h-4 w-4" />
                {invoicePdfExportBusy === "advisor"
                  ? "Preparando correo…"
                  : "Enviar al gestor"}
              </Button>
            </div>
          )}
          {!invoicePdfExportPeriod && limits.quarterlyExport ? (
            <p className="max-w-sm text-xs text-slate-500">
              Para descargar facturas, selecciona Trimestre o Meses (máximo
              tres meses).
            </p>
          ) : null}
          {invoicePdfExportFeedback ? (
            <p
              role={
                invoicePdfExportFeedback.kind === "error" ? "alert" : "status"
              }
              className={`max-w-md text-xs font-semibold ${
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
              ) : null}
            </p>
          ) : null}
          <SendMethodChooserModal
            open={advisorEmailMethodOpen}
            title="Enviar facturas al gestor"
            description={`${invoicePdfExportPeriod ? invoicePdfExportPeriodLabel(invoicePdfExportPeriod) : title} · ${
              data.profile.advisorContact?.advisorName?.trim() || "Gestor"
            }`}
            options={DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS}
            rememberMethod={rememberAdvisorEmailMethod}
            onRememberMethodChange={setRememberAdvisorEmailMethod}
            onChoose={(method) => void chooseAdvisorEmailMethod(method)}
            onClose={() => {
              if (!invoicePdfExportBusy) setAdvisorEmailMethodOpen(false);
            }}
            busy={invoicePdfExportBusy === "advisor"}
            testId="tax-summary-advisor-email-method-modal"
          />
        </div>
      }
      highlights={
        <PeriodOverviewCards
          invoicedIncome={periodInvoiced}
          spent={periodSpent}
          grossProfit={taxes.grossProfit}
          estimatedIrpfBase={taxes.estimatedIrpfBase}
          ivaToPay={taxes.ivaToPay}
          ivaCredit={taxes.ivaCredit}
          irpfEstimate={taxes.irpfEstimate}
          profitAfterIrpfReserve={taxes.profitAfterIrpfReserve}
          hasNonDeductibleExpenses={taxes.nonDeductibleExpenseCount > 0}
          monthlyBenefitRows={monthlyBenefitRows}
        />
      }
    />
  );
}
