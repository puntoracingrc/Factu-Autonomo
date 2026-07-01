"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { documentStatusLabel } from "@/lib/invoice-status-actions";
import { type ProductBusinessSummary } from "@/lib/product-business-summary";
import {
  PRODUCT_MONTH_NAMES,
  PRODUCT_QUARTERS,
  availableProductPeriodYears,
  buildProductPeriodSummary,
  formatProductPeriodLabel,
  getDefaultProductPeriod,
  type ProductPeriodKind,
  type ProductPeriodSelection,
} from "@/lib/product-period-summary";
import { documentAmounts, isVatExempt } from "@/lib/vat-regime";
import { expenseTotals } from "@/lib/expenses";
import type { AppData, Document, Expense } from "@/lib/types";

interface HomeBusinessSummaryProps {
  data: AppData;
}

interface FlowMetric {
  label: string;
  amount: number;
  hint: string;
  color: string;
  textColor: string;
  segments?: FlowSegment[];
}

interface FlowSegment {
  label: string;
  amount: number;
  color: string;
}

export function HomeBusinessSummary({ data }: HomeBusinessSummaryProps) {
  const [expanded, setExpanded] = useState(true);
  const [period, setPeriod] = useState<ProductPeriodSelection>(() =>
    getDefaultProductPeriod(),
  );
  const years = useMemo(
    () => availableProductPeriodYears(data.documents, data.expenses),
    [data.documents, data.expenses],
  );
  const periodSummary = useMemo(
    () => buildProductPeriodSummary(data, period),
    [data, period],
  );
  const summary = periodSummary.business;

  function updatePeriod(patch: Partial<ProductPeriodSelection>) {
    setPeriod((current) => ({ ...current, ...patch }));
  }

  return (
    <section
      className="mb-6 space-y-4"
      aria-labelledby="business-summary-title"
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Eye className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2
                id="business-summary-title"
                className="text-lg font-bold text-slate-900"
              >
                Resumen del negocio
              </h2>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            aria-controls="business-summary-details"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
            {expanded ? "Ocultar resumen" : "Mostrar resumen"}
          </Button>
        </div>
        {expanded && (
          <PeriodSelector
            period={period}
            years={years}
            onChange={updatePeriod}
          />
        )}
      </div>

      {expanded && (
        <div id="business-summary-details" className="space-y-3">
          <BusinessFlowChart summary={summary} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <RecentDocumentsCard data={data} summary={summary} />
            <RecentExpensesCard data={data} summary={summary} />
            <PendingInvoicesCard data={data} summary={summary} />
          </div>
        </div>
      )}
    </section>
  );
}

function BusinessFlowChart({ summary }: { summary: ProductBusinessSummary }) {
  const metrics = businessFlowMetrics(summary);
  const maxAmount = Math.max(...metrics.map((metric) => metric.amount), 1);

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle icon={BarChart3} title="Flujo del periodo" />
        <p className="text-xs font-semibold text-slate-500">
          Vista estimada, no fiscal
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0">
            <div className="mb-1 flex min-w-0 items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold ${metric.textColor}`}>
                  {metric.label}
                </p>
                <p className="truncate text-xs text-slate-500">{metric.hint}</p>
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums text-slate-950">
                {formatMoney(metric.amount)}
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              {metric.segments ? (
                <div
                  className="flex h-full overflow-hidden rounded-full"
                  style={{ width: `${barWidth(metric.amount, maxAmount)}%` }}
                >
                  {metric.segments
                    .filter((segment) => segment.amount > 0)
                    .map((segment) => (
                      <div
                        key={segment.label}
                        className={`h-full ${segment.color}`}
                        title={`${segment.label}: ${formatMoney(segment.amount)}`}
                        aria-label={`${segment.label}: ${formatMoney(segment.amount)}`}
                        style={{
                          width: `${Math.max(
                            8,
                            (segment.amount / Math.max(metric.amount, 1)) * 100,
                          )}%`,
                        }}
                      />
                    ))}
                </div>
              ) : (
                <div
                  className={`h-full rounded-full ${metric.color}`}
                  style={{ width: `${barWidth(metric.amount, maxAmount)}%` }}
                />
              )}
            </div>
            {metric.segments ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {metric.segments.map((segment) => (
                  <span
                    key={segment.label}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500"
                  >
                    <span className={`h-2 w-2 rounded-full ${segment.color}`} />
                    {segment.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">
            Lo que queda después de gastos
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
            {formatMoney(summary.balanceEstimated)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Facturas emitidas menos compras y gastos registrados.
          </p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3">
          <p className="text-xs font-semibold text-violet-700">
            IVA para orientarte
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
            {formatMoney(summary.salesIvaEstimated)} /{" "}
            {formatMoney(summary.expenseIvaEstimated)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Primero el IVA de ventas. Después el IVA de gastos.
          </p>
        </div>
      </div>
    </Card>
  );
}

function businessFlowMetrics(summary: ProductBusinessSummary): FlowMetric[] {
  const issuedInvoicesLabel =
    summary.issuedInvoicesCount === 1
      ? "1 factura emitida."
      : `${summary.issuedInvoicesCount} facturas emitidas.`;
  const collectedInvoicesLabel =
    summary.collectedInvoicesCount === 1
      ? "1 factura marcada como cobrada."
      : `${summary.collectedInvoicesCount} facturas marcadas como cobradas.`;
  const pendingInvoicesLabel =
    summary.pendingInvoicesCount === 1
      ? "1 factura pendiente de registrar cobro."
      : `${summary.pendingInvoicesCount} facturas pendientes de registrar cobro.`;

  return [
    {
      label: "Facturado",
      amount: summary.totalBilledIssued,
      hint: issuedInvoicesLabel,
      color: "bg-blue-600",
      textColor: "text-blue-700",
    },
    {
      label: "Cobrado",
      amount: summary.totalCollectedLocal,
      hint: collectedInvoicesLabel,
      color: "bg-emerald-600",
      textColor: "text-emerald-700",
    },
    {
      label: "Pendiente",
      amount: summary.totalPendingCollection,
      hint: pendingInvoicesLabel,
      color: "bg-amber-500",
      textColor: "text-amber-700",
    },
    {
      label: "Gastos",
      amount: summary.totalExpenses,
      hint: "Compras y gastos registrados.",
      color: "bg-rose-500",
      textColor: "text-rose-700",
      segments: [
        {
          label: "Gastos fijos",
          amount: summary.totalFixedExpenses,
          color: "bg-violet-500",
        },
        {
          label: "Compras",
          amount: summary.totalPurchaseExpenses,
          color: "bg-rose-500",
        },
        {
          label: "Tickets",
          amount: summary.totalTicketExpenses,
          color: "bg-orange-500",
        },
        {
          label: "Sin ticket ni factura",
          amount: summary.totalUnbackedExpenses,
          color: "bg-slate-400",
        },
      ],
    },
  ];
}

function barWidth(amount: number, maxAmount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(6, Math.round((amount / maxAmount) * 100));
}

function PeriodSelector({
  period,
  years,
  onChange,
}: {
  period: ProductPeriodSelection;
  years: number[];
  onChange: (patch: Partial<ProductPeriodSelection>) => void;
}) {
  return (
    <div className="mt-4 grid min-w-0 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-900 lg:pb-1">
        <CalendarRange className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
        <span className="truncate">{formatProductPeriodLabel(period)}</span>
      </div>

      <label className="min-w-0 space-y-1">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Periodo
        </span>
        <Select
          value={period.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as ProductPeriodKind })
          }
          aria-label="Periodo del resumen"
          className={compactPeriodSelectClass}
        >
          <option value="all">Todos</option>
          <option value="month">Mes</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Año</option>
        </Select>
      </label>

      {period.kind !== "all" && (
        <label className="min-w-0 space-y-1">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Año
          </span>
          <Select
            value={period.year}
            onChange={(event) => onChange({ year: Number(event.target.value) })}
            aria-label="Año del resumen"
            className={compactPeriodSelectClass}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </label>
      )}

      {period.kind === "month" && (
        <label className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Mes
          </span>
          <Select
            value={period.month}
            onChange={(event) =>
              onChange({ month: Number(event.target.value) })
            }
            aria-label="Mes del resumen"
            className={compactPeriodSelectClass}
          >
            {PRODUCT_MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
        </label>
      )}

      {period.kind === "quarter" && (
        <label className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Trimestre
          </span>
          <Select
            value={period.quarter}
            onChange={(event) =>
              onChange({
                quarter: Number(
                  event.target.value,
                ) as ProductPeriodSelection["quarter"],
              })
            }
            aria-label="Trimestre del resumen"
            className={compactPeriodSelectClass}
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
        </label>
      )}
    </div>
  );
}

const compactPeriodSelectClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200";

function RecentDocumentsCard({
  data,
  summary,
}: {
  data: AppData;
  summary: ProductBusinessSummary;
}) {
  const vatExempt = isVatExempt(data.profile);

  return (
    <Card className="min-w-0 p-4">
      <SectionTitle icon={FileText} title="Últimos documentos" />
      <div className="mt-3 space-y-2">
        {summary.recentDocuments.length === 0 ? (
          <EmptyLine text="Aún no hay documentos." />
        ) : (
          summary.recentDocuments.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              amount={safeDisplayAmount(
                documentAmounts(document, vatExempt).total,
              )}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function RecentExpensesCard({
  data,
  summary,
}: {
  data: AppData;
  summary: ProductBusinessSummary;
}) {
  const vatExempt = isVatExempt(data.profile);

  return (
    <Card className="min-w-0 p-4">
      <SectionTitle icon={ShoppingCart} title="Últimos gastos" />
      <div className="mt-3 space-y-2">
        {summary.recentExpenses.length === 0 ? (
          <EmptyLine text="Aún no hay gastos." />
        ) : (
          summary.recentExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              amount={safeDisplayAmount(
                expenseTotals(expense, vatExempt).total,
              )}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function PendingInvoicesCard({
  data,
  summary,
}: {
  data: AppData;
  summary: ProductBusinessSummary;
}) {
  const vatExempt = isVatExempt(data.profile);

  return (
    <Card className="min-w-0 p-4">
      <SectionTitle icon={AlertCircle} title="Pendientes de cobro" />
      <div className="mt-3 space-y-2">
        {summary.pendingInvoices.length === 0 ? (
          <EmptyLine text="No tienes facturas pendientes ahora." />
        ) : (
          summary.pendingInvoices.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              amount={safeDisplayAmount(
                documentAmounts(document, vatExempt).total,
              )}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof FileText;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="font-bold text-slate-900">{title}</h3>
    </div>
  );
}

function DocumentRow({
  document,
  amount,
}: {
  document: Document;
  amount: number;
}) {
  return (
    <Link
      href={documentHref(document)}
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {document.number}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {document.client.name || "Sin cliente"} ·{" "}
          {documentStatusLabel(document, document.type)} ·{" "}
          {formatShortDate(document.date)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
        {formatMoney(amount)}
      </span>
    </Link>
  );
}

function ExpenseRow({ expense, amount }: { expense: Expense; amount: number }) {
  return (
    <Link
      href={`/gastos/nuevo?editar=${encodeURIComponent(expense.id)}`}
      className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-900">
          {expense.description}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {expense.supplierName || "Sin proveedor"} · {expense.category} ·{" "}
          {formatShortDate(expense.date)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800">
        {formatMoney(amount)}
      </span>
    </Link>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
      {text}
    </p>
  );
}

function documentHref(document: Document): string {
  if (document.type === "factura") return `/facturas/${document.id}`;
  if (document.type === "presupuesto") return `/presupuestos/${document.id}`;
  return `/recibos/${document.id}`;
}

function safeDisplayAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value;
}
