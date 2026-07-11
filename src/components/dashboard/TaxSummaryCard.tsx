"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Landmark, Percent, Receipt } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/calculations";
import type { TaxSummary } from "@/lib/taxes";

interface TaxSummaryCardProps {
  taxes: TaxSummary;
  title?: string;
  subtitle?: string;
  footerNote?: string;
  headerExtra?: ReactNode;
  highlights?: ReactNode;
}

function TaxRow({
  label,
  value,
  hint,
  valueClassName = "text-slate-900",
  emphasize = false,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 py-2.5 ${
        emphasize ? "border-t border-slate-100 pt-3" : ""
      }`}
    >
      <div>
        <p
          className={`font-medium text-slate-700 ${
            emphasize ? "text-sm font-semibold" : "text-sm"
          }`}
        >
          {label}
        </p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <p
        className={`shrink-0 font-bold ${emphasize ? "text-base" : "text-sm"} ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricBar({
  label,
  value,
  max,
  barClassName,
}: {
  label: string;
  value: number;
  max: number;
  barClassName: string;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const drawableValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  const width =
    safeMax > 0 ? Math.min(100, (drawableValue / safeMax) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">
          {formatMoney(value)}
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full transition-all ${barClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function TaxSection({
  title,
  subtitle,
  icon: Icon,
  tone,
  chart,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Receipt;
  tone: "violet" | "orange" | "slate";
  chart?: ReactNode;
  children: ReactNode;
}) {
  const tones = {
    violet: {
      shell: "border-violet-200 bg-violet-50",
      icon: "bg-violet-100 text-violet-700",
      title: "text-violet-950",
    },
    orange: {
      shell: "border-orange-200 bg-orange-50",
      icon: "bg-orange-100 text-orange-700",
      title: "text-orange-950",
    },
    slate: {
      shell: "border-slate-200 bg-slate-50",
      icon: "bg-slate-200 text-slate-700",
      title: "text-slate-900",
    },
  };
  const style = tones[tone];

  return (
    <section className={`rounded-2xl border p-4 ${style.shell}`}>
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${style.title}`}>{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {chart && <div className="mb-3 space-y-2.5">{chart}</div>}
      <div className="rounded-xl border border-white/60 bg-white/70 px-3">
        {children}
      </div>
    </section>
  );
}

function VatFlowChart({ taxes }: { taxes: TaxSummary }) {
  const max = Math.max(taxes.salesIva, taxes.expenseIva, 0.01);

  return (
    <>
      <MetricBar
        label="IVA repercutido (ventas)"
        value={taxes.salesIva}
        max={max}
        barClassName="bg-violet-500"
      />
      <MetricBar
        label="IVA deducible neto (gastos y abonos)"
        value={taxes.expenseIva}
        max={max}
        barClassName="bg-emerald-500"
      />
    </>
  );
}

function IrpfSplitChart({ taxes }: { taxes: TaxSummary }) {
  if (taxes.estimatedIrpfBase <= 0) return null;

  const irpfShare = (taxes.irpfEstimate / taxes.estimatedIrpfBase) * 100;
  const afterIrpfShare = Math.max(0, 100 - irpfShare);

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-white/80">
        <div
          className="bg-orange-500"
          style={{ width: `${irpfShare}%` }}
          title={`IRPF ${taxes.irpfPercent}%`}
        />
        <div
          className="bg-blue-500"
          style={{ width: `${afterIrpfShare}%` }}
          title="Parte de la base no reservada"
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          IRPF {taxes.irpfPercent}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Parte de la base no reservada
        </span>
      </div>
    </div>
  );
}

function ProfitBridge({ taxes }: { taxes: TaxSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          Beneficio económico antes de reservar IRPF
        </p>
        <p className="text-xs text-slate-500">
          {taxes.vatExempt
            ? "Ingresos − coste económico neto de gastos y abonos"
            : "Ingresos (base) − coste económico neto de gastos y abonos"}
        </p>
      </div>
      <p className="text-lg font-bold tabular-nums text-slate-900">
        {formatMoney(taxes.grossProfit)}
      </p>
    </div>
  );
}

function NonDeductibleExpensesNotice({
  taxes,
}: {
  taxes: TaxSummary;
}) {
  if (taxes.nonDeductibleExpenseCount === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"
    >
      <p className="text-sm font-bold">
        {taxes.nonDeductibleExpenseCount}{" "}
        {taxes.nonDeductibleExpenseCount === 1
          ? "movimiento no deducible"
          : "movimientos no deducibles"}
      </p>
      <p className="mt-1 text-sm leading-relaxed">
        Su saldo económico neto de {formatMoney(taxes.nonDeductibleExpenseTotal)}
        {" "}sigue en Gastos, balance y rentabilidad. Un gasto reduce el beneficio
        económico y un abono revierte coste; ambos aportan 0 a la base e IVA
        deducibles y no alteran la estimación fiscal de IRPF.
      </p>
    </div>
  );
}

function UnsupportedMixedVatNotice({ taxes }: { taxes: TaxSummary }) {
  if (taxes.unsupportedMixedVatExpenses === 0) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-950"
    >
      <p className="text-sm font-bold">Desglose de IVA mixto incompleto</p>
      <p className="mt-1 text-sm leading-relaxed">
        {taxes.unsupportedMixedVatExpenses === 1
          ? "Hay 1 gasto con varios tipos de IVA cuyas líneas no permiten conciliar la base registrada."
          : `Hay ${taxes.unsupportedMixedVatExpenses} gastos con varios tipos de IVA cuyas líneas no permiten conciliar la base registrada.`} {" "}
        El IVA deducible y la posición de IVA no deben considerarse completos.
        La exportación permanece bloqueada hasta revisar esos gastos.
      </p>
      <Link
        href="/gastos"
        className="mt-2 inline-flex text-sm font-semibold text-red-800 underline"
      >
        Revisar gastos con IVA mixto
      </Link>
    </div>
  );
}

function HeaderVatCalculationNotice({ taxes }: { taxes: TaxSummary }) {
  if (taxes.vatExempt || taxes.headerVatExpenseCount === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sky-950"
    >
      <p className="text-sm font-bold">
        Cabecera o contrato de importe íntegro
      </p>
      <p className="mt-1 text-sm leading-relaxed">
        {taxes.headerVatExpenseCount} {" "}
        {taxes.headerVatExpenseCount === 1
          ? "movimiento no usa"
          : "movimientos no usan"}
        {" "}un desglose conciliado para el cálculo: conservan la cabecera o el
        contrato de importe íntegro no desgravable. La cifra está incluida, pero
        revisa las líneas si alguna factura contiene varios tipos de IVA.
      </p>
    </div>
  );
}

function VatExemptSummary({ taxes }: { taxes: TaxSummary }) {
  return (
    <div className="space-y-4">
      <TaxSection
        title="Actividad (sin IVA)"
        subtitle="Perfil exento: no repercutes ni deduces IVA en estos cálculos."
        icon={Receipt}
        tone="slate"
      >
        <TaxRow
          label="Ingresos (sin IVA)"
          value={formatMoney(taxes.salesBase)}
          hint="Facturas y recibos emitidos"
          valueClassName="text-violet-800"
        />
        <TaxRow
          label="Base neta deducible (gastos y abonos)"
          value={formatMoney(taxes.expenseBase)}
          valueClassName="text-emerald-700"
        />
      </TaxSection>

      <ProfitBridge taxes={taxes} />

      <TaxSection
        title="IRPF estimado"
        subtitle={`Reserva orientativa del ${taxes.irpfPercent}% sobre la base fiscal estimada.`}
        icon={Percent}
        tone="orange"
        chart={<IrpfSplitChart taxes={taxes} />}
      >
        <TaxRow
          label="Base estimada para IRPF"
          value={formatMoney(taxes.estimatedIrpfBase)}
          hint="Ingresos − base neta deducible de gastos y abonos"
          valueClassName="text-slate-800"
        />
        <TaxRow
          label={`IRPF estimado (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          hint="Sobre la base estimada positiva"
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Resultado económico tras reservar IRPF"
          value={formatMoney(taxes.profitAfterIrpfReserve)}
          hint="Beneficio económico − reserva estimada"
          valueClassName="text-blue-800"
          emphasize
        />
      </TaxSection>
    </div>
  );
}

function VatSummary({ taxes }: { taxes: TaxSummary }) {
  const netLabel =
    taxes.ivaToPay > 0 ? "IVA neto a pagar" : "IVA a compensar";
  const netValue =
    taxes.ivaToPay > 0
      ? formatMoney(taxes.ivaToPay)
      : formatMoney(taxes.ivaCredit);
  const netClass =
    taxes.ivaToPay > 0 ? "text-amber-700" : "text-sky-700";

  return (
    <div className="space-y-4">
      <TaxSection
        title="IVA"
        subtitle="Lo repercutido en ventas frente al IVA deducible neto de gastos y abonos."
        icon={Receipt}
        tone="violet"
        chart={<VatFlowChart taxes={taxes} />}
      >
        <TaxRow
          label="IVA repercutido (ventas)"
          value={formatMoney(taxes.salesIva)}
          hint={`Base: ${formatMoney(taxes.salesBase)}`}
          valueClassName="text-violet-800"
        />
        <TaxRow
          label="IVA deducible neto (gastos y abonos)"
          value={formatMoney(taxes.expenseIva)}
          hint={`Base neta deducible: ${formatMoney(taxes.expenseBase)}`}
          valueClassName="text-emerald-700"
        />
        <TaxRow
          label={netLabel}
          value={netValue}
          hint={
            taxes.netIva !== 0
              ? `Diferencia: ${formatMoney(taxes.netIva)}`
              : "Sin diferencia de IVA"
          }
          valueClassName={netClass}
          emphasize
        />
      </TaxSection>

      <ProfitBridge taxes={taxes} />

      <TaxSection
        title="IRPF estimado"
        subtitle={`Reserva orientativa del ${taxes.irpfPercent}% sobre la base fiscal estimada.`}
        icon={Landmark}
        tone="orange"
        chart={<IrpfSplitChart taxes={taxes} />}
      >
        <TaxRow
          label="Base estimada para IRPF"
          value={formatMoney(taxes.estimatedIrpfBase)}
          hint="Ventas − base neta deducible de gastos y abonos"
          valueClassName="text-slate-800"
        />
        <TaxRow
          label={`IRPF estimado (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          hint="Sobre la base estimada positiva"
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Resultado económico tras reservar IRPF"
          value={formatMoney(taxes.profitAfterIrpfReserve)}
          hint="Beneficio económico − reserva; el IVA va aparte"
          valueClassName="text-blue-800"
          emphasize
        />
      </TaxSection>
    </div>
  );
}

export function TaxSummaryCard({
  taxes,
  title = "Impuestos estimados (acumulado)",
  subtitle,
  footerNote,
  headerExtra,
  highlights,
}: TaxSummaryCardProps) {
  const hasSummaryData =
    taxes.salesBase !== 0 ||
    taxes.expenseBase !== 0 ||
    taxes.lineVatExpenseCount > 0 ||
    taxes.headerVatExpenseCount > 0 ||
    taxes.nonDeductibleExpenseCount > 0 ||
    taxes.unsupportedMixedVatExpenses > 0;
  const hasIntegrityBlocks = taxes.integrityBlockedDocuments > 0;
  const hasUnsupportedRectifications =
    taxes.unsupportedRectificationDocuments > 0;
  const hasUnsupportedMixedVat = taxes.unsupportedMixedVatExpenses > 0;
  const hasIncompleteSummary =
    hasIntegrityBlocks ||
    hasUnsupportedRectifications ||
    hasUnsupportedMixedVat;
  const defaultSubtitle = taxes.vatExempt
    ? "Perfil exento de IVA: no repercutes ni deduces IVA. Solo se estima el beneficio y el IRPF."
    : "Según facturas y recibos emitidos y gastos o abonos registrados. Cálculo orientativo — consulta con tu gestor.";

  return (
    <Card className="mb-6 border-slate-200 bg-white">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {subtitle ?? defaultSubtitle}
          </p>
        </div>
        {headerExtra}
      </div>

      {highlights}

      {hasIntegrityBlocks && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-950"
        >
          <p className="text-sm font-bold">Resumen fiscal incompleto</p>
          <p className="mt-1 text-sm leading-relaxed">
            Se han excluido {taxes.integrityBlockedDocuments}{" "}
            {taxes.integrityBlockedDocuments === 1
              ? "documento fiscal bloqueado"
              : "documentos fiscales bloqueados"}{" "}
            por integridad. Sus importes no están incluidos en estos cálculos.
          </p>
          <Link
            href="/facturas"
            className="mt-2 inline-flex text-sm font-semibold text-red-800 underline"
          >
            Revisar documentos bloqueados
          </Link>
        </div>
      )}

      {hasUnsupportedRectifications && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
        >
          <p className="text-sm font-bold">Rectificación interperiodo pendiente</p>
          <p className="mt-1 text-sm leading-relaxed">
            Se han excluido {taxes.unsupportedRectificationDocuments}{" "}
            {taxes.unsupportedRectificationDocuments === 1
              ? "corrección interperiodo"
              : "correcciones interperiodo"}{" "}
            porque todavía no existe una diferencia fiscal auditable para ese
            periodo. La exportación permanece bloqueada.
          </p>
        </div>
      )}

      <UnsupportedMixedVatNotice taxes={taxes} />

      <HeaderVatCalculationNotice taxes={taxes} />

      <NonDeductibleExpensesNotice taxes={taxes} />

      {!hasSummaryData ? (
        <p className="text-sm text-slate-500">
          {hasIncompleteSummary
            ? "No hay movimientos fiscales verificables incluidos en este periodo."
            : "No hay movimientos en este periodo todavía."}
        </p>
      ) : taxes.vatExempt ? (
        <VatExemptSummary taxes={taxes} />
      ) : (
        <VatSummary taxes={taxes} />
      )}

      <p className="mt-4 text-xs text-slate-500">
        {footerNote ?? "Ajustes fiscales en"}{" "}
        {footerNote ? (
          <>
            Consulta detalles en{" "}
            <Link
              href="/configuracion"
              className="font-semibold text-blue-600 underline"
            >
              Ajustes
            </Link>
            .
          </>
        ) : (
          <Link
            href="/configuracion"
            className="font-semibold text-blue-600 underline"
          >
            Ajustes
          </Link>
        )}
      </p>
    </Card>
  );
}
