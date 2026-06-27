"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarRange,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { documentStatusLabel } from "@/lib/invoice-status-actions";
import {
  type ProductBusinessSummary,
} from "@/lib/product-business-summary";
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

interface MetricCard {
  label: string;
  value: string;
  hint: string;
  tone: string;
}

export function HomeBusinessSummary({ data }: HomeBusinessSummaryProps) {
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
  const metrics = businessMetricCards(summary);

  function updatePeriod(patch: Partial<ProductPeriodSelection>) {
    setPeriod((current) => ({ ...current, ...patch }));
  }

  return (
    <section className="mb-6 space-y-4" aria-labelledby="business-summary-title">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="business-summary-title" className="text-lg font-bold text-slate-900">
            Resumen del negocio
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Datos calculados desde la información guardada en este navegador. No
            sustituyen una revisión contable o fiscal.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Periodo: {periodSummary.label}
          </p>
        </div>
        <PeriodSelector
          period={period}
          years={years}
          onChange={updatePeriod}
        />
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label} className={`min-w-0 p-4 ${metric.tone}`}>
            <p className="text-sm font-semibold text-slate-600">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950">
              {metric.value}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {metric.hint}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <RecentDocumentsCard data={data} summary={summary} />
        <RecentExpensesCard data={data} summary={summary} />
        <PendingInvoicesCard data={data} summary={summary} />
      </div>
    </section>
  );
}

function businessMetricCards(summary: ProductBusinessSummary): MetricCard[] {
  return [
    {
      label: "Facturado",
      value: formatMoney(summary.totalBilledIssued),
      hint: `${summary.issuedInvoicesCount} factura(s) emitida(s), sin presupuestos ni borradores.`,
      tone: "border-blue-100 bg-blue-50/60",
    },
    {
      label: "Cobrado",
      value: formatMoney(summary.totalCollectedLocal),
      hint: `${summary.collectedInvoicesCount} factura(s) marcada(s) como cobrada(s) en local.`,
      tone: "border-emerald-100 bg-emerald-50/60",
    },
    {
      label: "Pendiente",
      value: formatMoney(summary.totalPendingCollection),
      hint: `${summary.pendingInvoicesCount} factura(s) emitida(s) pendiente(s) de cobro.`,
      tone: "border-amber-100 bg-amber-50/60",
    },
    {
      label: "Gastos",
      value: formatMoney(summary.totalExpenses),
      hint: "Compras y gastos registrados en el navegador.",
      tone: "border-rose-100 bg-rose-50/60",
    },
    {
      label: "Balance estimado",
      value: formatMoney(summary.balanceEstimated),
      hint: "Facturado emitido menos gastos registrados.",
      tone: "border-slate-100 bg-slate-50",
    },
    {
      label: "IVA estimado",
      value: `${formatMoney(summary.salesIvaEstimated)} / ${formatMoney(
        summary.expenseIvaEstimated,
      )}`,
      hint: "Repercutido estimado / soportado estimado.",
      tone: "border-violet-100 bg-violet-50/60",
    },
  ];
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
    <Card className="min-w-0 p-3 lg:max-w-3xl">
      <div className="flex items-center gap-2 pb-3 text-sm font-bold text-slate-900">
        <CalendarRange className="h-4 w-4 text-blue-600" aria-hidden />
        Resumen por periodo
      </div>
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Periodo">
          <Select
            value={period.kind}
            onChange={(event) =>
              onChange({ kind: event.target.value as ProductPeriodKind })
            }
            aria-label="Periodo del resumen"
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
              onChange={(event) => onChange({ year: Number(event.target.value) })}
              aria-label="Año del resumen"
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
              onChange={(event) =>
                onChange({ month: Number(event.target.value) })
              }
              aria-label="Mes del resumen"
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
              onChange={(event) =>
                onChange({
                  quarter: Number(event.target.value) as ProductPeriodSelection["quarter"],
                })
              }
              aria-label="Trimestre del resumen"
            >
              {PRODUCT_QUARTERS.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {formatProductPeriodLabel({ ...period, kind: "quarter", quarter })}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Card>
  );
}

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
              amount={safeDisplayAmount(documentAmounts(document, vatExempt).total)}
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
              amount={safeDisplayAmount(expenseTotals(expense, vatExempt).total)}
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
              amount={safeDisplayAmount(documentAmounts(document, vatExempt).total)}
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

function ExpenseRow({
  expense,
  amount,
}: {
  expense: Expense;
  amount: number;
}) {
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
  return <p className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-500">{text}</p>;
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
