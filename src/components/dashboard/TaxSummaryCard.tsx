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
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;

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
        label="IVA deducible (gastos)"
        value={taxes.expenseIva}
        max={max}
        barClassName="bg-emerald-500"
      />
    </>
  );
}

function IrpfSplitChart({ taxes }: { taxes: TaxSummary }) {
  if (taxes.grossProfit <= 0) return null;

  const irpfShare = (taxes.irpfEstimate / taxes.grossProfit) * 100;
  const netShare = Math.max(0, 100 - irpfShare);

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
          style={{ width: `${netShare}%` }}
          title="Beneficio neto"
        />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          IRPF {taxes.irpfPercent}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          Beneficio neto
        </span>
      </div>
    </div>
  );
}

function ProfitBridge({ taxes }: { taxes: TaxSummary }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Puente entre impuestos
        </p>
        <p className="mt-0.5 text-sm font-semibold text-slate-800">
          Beneficio antes de impuestos
        </p>
        <p className="text-xs text-slate-500">
          {taxes.vatExempt
            ? "Ingresos − gastos"
            : "Ingresos (base) − gastos (base)"}
        </p>
      </div>
      <p className="text-lg font-bold tabular-nums text-slate-900">
        {formatMoney(taxes.grossProfit)}
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
          label="Gastos (sin IVA deducible)"
          value={formatMoney(taxes.expenseBase)}
          valueClassName="text-emerald-700"
        />
      </TaxSection>

      <ProfitBridge taxes={taxes} />

      <TaxSection
        title="IRPF estimado"
        subtitle={`Retención orientativa del ${taxes.irpfPercent}% sobre el beneficio.`}
        icon={Percent}
        tone="orange"
        chart={<IrpfSplitChart taxes={taxes} />}
      >
        <TaxRow
          label={`IRPF estimado (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          hint="Sobre el beneficio positivo"
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Beneficio neto aproximado"
          value={formatMoney(taxes.estimatedNetProfit)}
          hint="Después del IRPF estimado"
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
        subtitle="Lo que has repercutido en ventas frente a lo deducible en gastos."
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
          label="IVA deducible (gastos)"
          value={formatMoney(taxes.expenseIva)}
          hint={`Base: ${formatMoney(taxes.expenseBase)}`}
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
        subtitle={`Cuota orientativa del ${taxes.irpfPercent}% y beneficio que te quedaría.`}
        icon={Landmark}
        tone="orange"
        chart={<IrpfSplitChart taxes={taxes} />}
      >
        <TaxRow
          label={`IRPF estimado (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          hint="Sobre el beneficio positivo"
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Beneficio neto aproximado"
          value={formatMoney(taxes.estimatedNetProfit)}
          hint="Después de IVA neto e IRPF estimado"
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
  const hasData = taxes.salesBase !== 0 || taxes.expenseBase !== 0;
  const defaultSubtitle = taxes.vatExempt
    ? "Perfil exento de IVA: no repercutes ni deduces IVA. Solo se estima el beneficio y el IRPF."
    : "Según facturas y recibos emitidos y gastos registrados. Cálculo orientativo — consulta con tu gestor.";

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

      {!hasData ? (
        <p className="text-sm text-slate-500">
          No hay movimientos en este periodo todavía.
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
              Configuración
            </Link>
            .
          </>
        ) : (
          <Link
            href="/configuracion"
            className="font-semibold text-blue-600 underline"
          >
            Configuración
          </Link>
        )}
      </p>
    </Card>
  );
}
