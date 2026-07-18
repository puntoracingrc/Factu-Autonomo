"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Landmark, Receipt } from "lucide-react";
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

function TaxSection({
  title,
  subtitle,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Receipt;
  tone: "violet" | "orange" | "slate";
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
      <div className="rounded-xl border border-white/60 bg-white/70 px-3">
        {children}
      </div>
    </section>
  );
}

function UnsupportedMixedVatNotice({ taxes }: { taxes: TaxSummary }) {
  if (taxes.unsupportedMixedVatExpenses === 0) return null;

  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-950"
    >
      <p className="text-sm font-bold">Evidencia fiscal de gasto incompleta</p>
      <p className="mt-1 text-sm leading-relaxed">
        {taxes.unsupportedMixedVatExpenses === 1
          ? "Hay 1 gasto cuya base, IVA, recargo, total o desglose no permiten conciliar la evidencia registrada."
          : `Hay ${taxes.unsupportedMixedVatExpenses} gastos cuya base, IVA, recargo, total o desglose no permiten conciliar la evidencia registrada.`} {" "}
        El IVA deducible y la posición de IVA no deben considerarse completos.
        La exportación permanece bloqueada hasta revisar esos gastos.
      </p>
      <Link
        href="/gastos"
        className="mt-2 inline-flex text-sm font-semibold text-red-800 underline"
      >
        Revisar gastos
      </Link>
    </div>
  );
}

function VatExemptSummary({ taxes }: { taxes: TaxSummary }) {
  return (
    <div className="space-y-4">
      <TaxSection
        title="Detalle de cuentas"
        subtitle="Sin IVA: aquí solo miramos ingresos, gastos y la reserva de IRPF."
        icon={Receipt}
        tone="slate"
      >
        <TaxRow
          label="Has facturado"
          value={formatMoney(taxes.salesBase)}
          valueClassName="text-violet-800"
        />
        <TaxRow
          label="Gastos que cuentan para IRPF"
          value={formatMoney(taxes.expenseBase)}
          valueClassName="text-emerald-700"
        />
        <TaxRow
          label="Beneficio antes de IRPF"
          value={formatMoney(taxes.estimatedIrpfBase)}
          valueClassName="text-slate-800"
        />
        <TaxRow
          label={`Guarda para IRPF (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Te queda aprox. después de guardar IRPF"
          value={formatMoney(taxes.profitAfterIrpfReserve)}
          valueClassName="text-blue-800"
          emphasize
        />
      </TaxSection>
    </div>
  );
}

function VatSummary({ taxes }: { taxes: TaxSummary }) {
  const netLabel =
    taxes.ivaToPay > 0 ? "IVA a pagar" : "IVA a compensar";
  const netValue =
    taxes.ivaToPay > 0
      ? formatMoney(taxes.ivaToPay)
      : formatMoney(taxes.ivaCredit);
  const netClass =
    taxes.ivaToPay > 0 ? "text-amber-700" : "text-sky-700";

  return (
    <div className="space-y-4">
      <TaxSection
        title={taxes.ivaToPay > 0 ? "IVA: toca pagar" : "IVA: queda a compensar"}
        subtitle="El IVA que has cobrado menos el IVA que puedes descontar."
        icon={Receipt}
        tone="violet"
      >
        <TaxRow
          label="IVA cobrado en tus facturas"
          value={formatMoney(taxes.salesIva)}
          valueClassName="text-violet-800"
        />
        <TaxRow
          label="IVA que puedes descontar"
          value={formatMoney(taxes.expenseIva)}
          valueClassName="text-emerald-700"
        />
        <TaxRow
          label={netLabel}
          value={netValue}
          valueClassName={netClass}
          emphasize
        />
      </TaxSection>

      <TaxSection
        title="IRPF: dinero a guardar"
        subtitle={`Aparta aproximadamente el ${taxes.irpfPercent}% de tu base para no llevarte sustos.`}
        icon={Landmark}
        tone="orange"
      >
        <TaxRow
          label="Base sobre la que se calcula"
          value={formatMoney(taxes.estimatedIrpfBase)}
          valueClassName="text-slate-800"
        />
        <TaxRow
          label={`Guarda para IRPF (${taxes.irpfPercent}%)`}
          value={formatMoney(taxes.irpfEstimate)}
          valueClassName="text-orange-700"
        />
        <TaxRow
          label="Te queda aprox. después de guardar IRPF"
          value={formatMoney(taxes.profitAfterIrpfReserve)}
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
            href="/facturas?estado=bloqueadas"
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
