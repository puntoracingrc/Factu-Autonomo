"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
      <p className={`shrink-0 text-sm font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function TaxSummaryRows({ taxes }: { taxes: TaxSummary }) {
  if (taxes.vatExempt) {
    return (
      <>
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
        <TaxRow
          label="Beneficio antes de impuestos"
          value={formatMoney(taxes.grossProfit)}
          hint="Ingresos − gastos"
        />
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
        />
      </>
    );
  }

  return (
    <>
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
        label={taxes.ivaToPay > 0 ? "IVA neto a pagar" : "IVA a compensar"}
        value={
          taxes.ivaToPay > 0
            ? formatMoney(taxes.ivaToPay)
            : formatMoney(taxes.ivaCredit)
        }
        hint={
          taxes.netIva !== 0
            ? `Diferencia: ${formatMoney(taxes.netIva)}`
            : "Sin diferencia de IVA"
        }
        valueClassName={taxes.ivaToPay > 0 ? "text-amber-700" : "text-sky-700"}
      />
      <TaxRow
        label="Beneficio antes de impuestos"
        value={formatMoney(taxes.grossProfit)}
        hint="Ingresos (base) − gastos (base)"
      />
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
      />
    </>
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
    <Card className="mb-6 border-violet-200 bg-violet-50/40">
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
      ) : (
        <div className="rounded-xl border border-violet-100 bg-white px-4">
          <TaxSummaryRows taxes={taxes} />
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
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
