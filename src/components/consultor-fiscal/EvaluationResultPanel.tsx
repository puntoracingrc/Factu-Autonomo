import {
  CircleCheck,
  CircleHelp,
  CircleX,
  ExternalLink,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCents } from "@/lib/expense-deductibility";
import type {
  AiFallbackTaxProposal,
  EvaluationResult,
  RiskLevel,
  TaxOutcome,
} from "@/lib/tax-engine";

const CONFIDENCE_LABELS = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
} as const;

const CLASSIFICATION_LABELS = {
  MEALS_AND_HOSPITALITY: "Restauración o manutención",
  VEHICLE_RUNNING_COSTS: "Gasto corriente de vehículo",
  UNCLASSIFIED: "Sin categoría concluyente",
} as const;

const STATUS_LABELS: Record<EvaluationResult["status"], string> = {
  RESOLVED: "Análisis completado",
  NEEDS_INPUT: "Falta información",
  NEEDS_REVIEW: "Necesita revisión",
  NO_MATCH: "Sin regla compatible",
  UNSUPPORTED: "Caso no implementado",
};

const ELIGIBILITY_LABELS: Record<TaxOutcome["eligibility"], string> = {
  FULL: "Deducción completa propuesta",
  PARTIAL: "Deducción parcial propuesta",
  POTENTIALLY_DEDUCTIBLE: "Puede ser deducible; importe pendiente",
  NONE: "Sin deducción propuesta",
  NEEDS_REVIEW: "Pendiente de revisión",
  NOT_APPLICABLE: "No aplicable",
};

const RISK_PRESENTATION: Record<
  RiskLevel,
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  GREEN: {
    label: "VERDE · Riesgo bajo según la regla",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CircleCheck,
  },
  YELLOW: {
    label: "AMARILLO · Requiere documentación y revisión",
    className: "border-amber-200 bg-amber-50 text-amber-950",
    icon: TriangleAlert,
  },
  RED: {
    label: "ROJO · No se propone como deducible",
    className: "border-red-200 bg-red-50 text-red-900",
    icon: CircleX,
  },
  UNDETERMINED: {
    label: "SIN DETERMINAR · Aún no hay conclusión",
    className: "border-slate-200 bg-slate-50 text-slate-800",
    icon: CircleHelp,
  },
};

function TaxOutcomeCard({ outcome }: { outcome: TaxOutcome }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">{outcome.taxType}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700">
          {ELIGIBILITY_LABELS[outcome.eligibility]}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950">
        {outcome.amountStatus === "NOT_CALCULATED"
          ? "Importe no calculado"
          : outcome.eligibility === "NEEDS_REVIEW"
          ? "Importe no determinado"
          : formatCents(outcome.deductibleAmountCents)}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        {outcome.amountStatus === "NOT_CALCULATED"
          ? "La regla permite una orientación cualitativa; añade importes solo para calcular cuánto"
          : outcome.eligibility === "NEEDS_REVIEW"
          ? "Porcentaje pendiente de revisión"
          : `Porcentaje teórico: ${outcome.theoreticalPercentage} %`}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        {outcome.explanation}
      </p>
      {outcome.appliedLimit ? (
        <dl className="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Límite</dt>
            <dd className="font-bold text-slate-900">
              {formatCents(outcome.appliedLimit.limitAmountCents)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Disponible antes del gasto</dt>
            <dd className="font-bold text-slate-900">
              {formatCents(
                outcome.appliedLimit.remainingBeforeExpenseCents ??
                  outcome.appliedLimit.limitAmountCents,
              )}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Consumido previamente</dt>
            <dd className="font-bold text-slate-900">
              {formatCents(outcome.appliedLimit.consumedAmountCents ?? 0)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Exceso no deducible</dt>
            <dd className="font-bold text-slate-900">
              {formatCents(outcome.appliedLimit.excessAmountCents)}
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}

function AiTaxProposalCard({
  proposal,
}: {
  proposal: AiFallbackTaxProposal;
}) {
  const hasAmount =
    proposal.proposedPercentage !== null &&
    proposal.proposedDeductibleAmountCents !== null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-slate-900">{proposal.taxType}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-800">
          Revisión humana obligatoria
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-slate-950">
        {hasAmount
          ? `${formatCents(proposal.proposedDeductibleAmountCents!)} · propuesta no aplicable`
          : "Importe no determinado"}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-600">
        {hasAmount
          ? `Porcentaje propuesto: ${proposal.proposedPercentage} % · pendiente de revisión`
          : "Porcentaje pendiente de fuentes y revisión"}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        {proposal.explanation}
      </p>
    </div>
  );
}

export function EvaluationResultPanel({
  result,
}: {
  result: EvaluationResult;
}) {
  const risk = RISK_PRESENTATION[result.risk];
  const RiskIcon = risk.icon;
  const aiProposal =
    result.evaluationOrigin === "AI_FALLBACK" &&
    result.aiFallback?.status === "PROPOSED"
      ? result.aiFallback
      : null;
  const aiRejected =
    result.aiFallback?.status === "REJECTED" ||
    result.aiFallback?.status === "FAILED";

  return (
    <section aria-labelledby="resultado-fiscal" aria-live="polite" className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
              {STATUS_LABELS[result.status]}
            </p>
            <h2 id="resultado-fiscal" className="mt-1 text-2xl font-bold text-slate-950">
              Resultado orientativo
            </h2>
          </div>
          {result.matchedRuleVersion ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              Regla v{result.matchedRuleVersion}
            </span>
          ) : null}
        </div>

        {aiProposal ? (
          <div
            className="mt-4 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-violet-950"
            role="status"
          >
            <p className="inline-flex items-center gap-2 font-extrabold">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Propuesta de IA pendiente de revisión
            </p>
            {aiProposal.proposalSummary ? (
              <p className="mt-2 text-sm leading-6">
                {aiProposal.proposalSummary}
              </p>
            ) : null}
            <p className="mt-2 text-xs font-bold uppercase tracking-wide">
              Confianza: {aiProposal.confidenceBand
                ? CONFIDENCE_LABELS[aiProposal.confidenceBand]
                : "Sin determinar"}
              {aiProposal.classification
                ? ` · Clasificación: ${CLASSIFICATION_LABELS[aiProposal.classification]}`
                : ""}
            </p>
          </div>
        ) : null}

        {aiRejected ? (
          <div
            className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
            role="alert"
          >
            <p className="font-bold">
              No se pudo validar una propuesta de IA
            </p>
            <p className="mt-1 text-sm">
              Se conserva únicamente el resultado del motor local y no se
              muestran importes sugeridos por el proveedor.
            </p>
          </div>
        ) : null}

        <div
          className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${risk.className}`}
          role="status"
        >
          <RiskIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-extrabold">{risk.label}</p>
            <p className="mt-1 text-sm">
              Estado: {STATUS_LABELS[result.status]}. La señal incluye texto e
              icono y no depende únicamente del color.
            </p>
          </div>
        </div>

        {result.missingInformation.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <h3 className="font-bold">Información pendiente</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {result.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {result.directTax || result.indirectTax ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.directTax ? <TaxOutcomeCard outcome={result.directTax} /> : null}
          {result.indirectTax ? (
            <TaxOutcomeCard outcome={result.indirectTax} />
          ) : null}
        </div>
      ) : null}

      {aiProposal?.taxProposals?.length ? (
        <div
          className="grid gap-4 lg:grid-cols-2"
          aria-label="Propuestas fiscales de IA pendientes de revisión"
        >
          {aiProposal.taxProposals.map((proposal) => (
            <AiTaxProposalCard key={proposal.taxType} proposal={proposal} />
          ))}
        </div>
      ) : null}

      {result.evidenceRequired.length > 0 ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">
            Documentación necesaria
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {result.evidenceRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.practicalAdvice.length > 0 ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Consejos prácticos</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            {result.practicalAdvice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <h2 className="font-bold">Advertencias</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.officialSources.length > 0 ? (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Fuentes oficiales</h2>
          <ul className="mt-3 space-y-3">
            {result.officialSources.map((source) => (
              <li key={source.id} className="rounded-xl border border-slate-200 p-3">
                <a
                  href={source.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-blue-700 underline decoration-blue-200 underline-offset-4 hover:text-blue-900"
                >
                  {source.title} · {source.legalReference}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {source.verificationStatus === "VERIFIED"
                    ? "Fuente verificada"
                    : "Metadatos pendientes de reverificación"}
                </p>
                <p className="mt-1 text-sm text-slate-600">{source.notes}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {result.calculationTrace.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer font-bold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            Ver traza de cálculo auditable
          </summary>
          <ol className="mt-4 space-y-3">
            {result.calculationTrace.map((step, index) => (
              <li key={`${step.code}-${index}`} className="border-l-2 border-blue-200 pl-3">
                <p className="font-bold text-slate-900">{step.label}</p>
                <p className="text-sm text-slate-600">{step.detail}</p>
                {step.amountCents !== undefined ? (
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Importe: {formatCents(step.amountCents)}
                    {step.percentage !== undefined
                      ? ` · ${step.percentage} %`
                      : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/25">
        <h2 className="font-bold text-slate-950">Antes de contabilizar</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Debes revisar y confirmar expresamente el resultado. Esta fase no crea
          asientos ni modifica tus gastos registrados.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 min-h-12 rounded-2xl bg-slate-300 px-5 font-semibold text-slate-600 disabled:cursor-not-allowed"
        >
          Aplicar propuesta (próximamente)
        </button>
      </Card>
    </section>
  );
}
