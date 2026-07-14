"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Images, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  parseCensusCertificateText,
  readCensusDocumentText,
  reconcileCensusIdentity,
  type CensusCertificateCandidate,
} from "@/lib/fiscal-profile";
import type {
  Evidence,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";

type ProfilePatch = Partial<TaxpayerProfile>;

interface ProposedField {
  field: keyof TaxpayerProfile;
  questionId: string;
  label: string;
  displayValue: string;
  value: TaxpayerProfile[keyof TaxpayerProfile];
}

function proposalsFromCandidate(
  candidate: CensusCertificateCandidate,
): ProposedField[] {
  const proposals: ProposedField[] = [];
  const invoicingSubject =
    candidate.taxpayerType === "SELF_EMPLOYED_IRPF"
      ? "NATURAL_PERSON"
      : candidate.taxpayerType === "COMPANY_IS"
        ? "COMPANY"
        : null;
  if (invoicingSubject) {
    proposals.push({
      field: "invoicingSubject",
      questionId: "A_INVOICING_SUBJECT",
      label: "Quién factura",
      value: invoicingSubject,
      displayValue: invoicingSubject === "COMPANY" ? "Sociedad" : "Persona física",
    });
  }

  const territory = {
    ES_COMMON: "ES_COMMON",
    ES_CANARY_IGIC: "ES_CANARY",
    ES_NAVARRA: "ES_NAVARRA",
    ES_BASQUE_COUNTRY: "UNCERTAIN",
    ES_CEUTA_MELILLA: "UNCERTAIN",
    UNKNOWN: undefined,
  }[candidate.jurisdiction];
  if (territory) {
    proposals.push({
      field: "territory",
      questionId: "B_TERRITORY",
      label: "Territorio fiscal",
      value: territory as TaxpayerProfile["territory"],
      displayValue:
        territory === "UNCERTAIN"
          ? "Debe concretarse manualmente"
          : candidate.jurisdiction,
    });
  }

  const incomeTaxRegime = {
    DIRECT_ESTIMATION_NORMAL: "DIRECT_NORMAL",
    DIRECT_ESTIMATION_SIMPLIFIED: "DIRECT_SIMPLIFIED",
    UNKNOWN: undefined,
  }[candidate.directTaxRegime];
  if (incomeTaxRegime) {
    proposals.push({
      field: "incomeTaxRegime",
      questionId: "D_INCOME_TAX_REGIME",
      label: "Régimen de IRPF",
      value: incomeTaxRegime as TaxpayerProfile["incomeTaxRegime"],
      displayValue:
        incomeTaxRegime === "DIRECT_NORMAL"
          ? "Estimación directa normal"
          : "Estimación directa simplificada",
    });
  }

  if (candidate.vatRegime !== "UNKNOWN") {
    const vatRegimes =
      candidate.vatRegime === "EXEMPT" ? ["EXEMPT"] : ["GENERAL"];
    proposals.push({
      field: "vatRegimes",
      questionId: "E_VAT_REGIMES",
      label: "Tratamiento de IVA",
      value: vatRegimes as TaxpayerProfile["vatRegimes"],
      displayValue:
        candidate.vatRegime === "EXEMPT"
          ? "Actividad exenta"
          : candidate.vatRegime === "PRORATA"
            ? "Régimen general con prorrata: revisar"
            : "Régimen general",
    });
  }
  return proposals;
}

export function DiagnosticDocumentReview({
  businessNif,
  currentProfile,
  onConfirm,
}: {
  businessNif: string;
  currentProfile: TaxpayerProfile;
  onConfirm: (
    patch: ProfilePatch,
    evidence: Evidence[],
    completedQuestionIds: string[],
  ) => void;
}) {
  const [candidate, setCandidate] = useState<CensusCertificateCandidate | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const proposals = useMemo(
    () => (candidate ? proposalsFromCandidate(candidate) : []),
    [candidate],
  );
  const identity = candidate
    ? reconcileCensusIdentity(businessNif, candidate.detectedNif)
    : null;

  async function selectFile(file: File | null) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setCandidate(null);
    setConfirmed(false);
    try {
      const text = await readCensusDocumentText(file);
      const parsed = parseCensusCertificateText(text);
      setCandidate(parsed);
      setSelected(proposalsFromCandidate(parsed).map((proposal) => proposal.field));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer el PDF.");
    } finally {
      setParsing(false);
    }
  }

  function confirmSelection() {
    if (!candidate || !identity?.canConfirm || !confirmed) return;
    const chosen = proposals.filter((proposal) => selected.includes(proposal.field));
    const patch = Object.fromEntries(
      chosen.map((proposal) => [proposal.field, proposal.value]),
    ) as ProfilePatch;
    if (candidate.documentKind === "AEAT_CENSUS_CERTIFICATE") {
      patch.censusReviewed = "YES";
    }
    const documentId = `census-${Date.now()}`;
    const evidence: Evidence[] = chosen.map((proposal) => ({
      evidenceId: `${documentId}:${proposal.field}`,
      documentId,
      type: candidate.documentKind === "MODEL_036" ? "MODEL_036" : "CURRENT_CENSUS",
      field: proposal.field,
      sourceLocation: "Texto nativo del PDF; ubicación exacta pendiente de revisión manual",
      value: Array.isArray(proposal.value)
        ? proposal.value.map((item) => String(item))
        : typeof proposal.value === "string" ||
            typeof proposal.value === "number" ||
            typeof proposal.value === "boolean" ||
            proposal.value === null
          ? proposal.value
          : null,
      confidence: 0.78,
      ...(candidate.documentDate ? { date: candidate.documentDate } : {}),
      extractionMethod: "PDF_NATIVE_TEXT",
      userConfirmed: true,
      sourcePriority: 30,
    }));
    if (candidate.documentKind === "AEAT_CENSUS_CERTIFICATE") {
      evidence.push({
        evidenceId: `${documentId}:censusReviewed`,
        documentId,
        type: "CURRENT_CENSUS",
        field: "censusReviewed",
        sourceLocation: "Documento reconocido y vigencia confirmada por la persona",
        value: "YES",
        confidence: 0.85,
        ...(candidate.documentDate ? { date: candidate.documentDate } : {}),
        extractionMethod: "PDF_NATIVE_TEXT",
        userConfirmed: true,
        sourcePriority: 30,
      });
    }
    onConfirm(
      patch,
      evidence,
      [
        ...chosen.map((proposal) => proposal.questionId),
        ...(candidate.documentKind === "AEAT_CENSUS_CERTIFICATE"
          ? ["N_CENSUS_REVIEWED"]
          : []),
      ],
    );
    setCandidate(null);
    setSelected([]);
    setConfirmed(false);
  }

  return (
    <section aria-labelledby="documentos-apoyo" className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" aria-hidden="true" />
        <div>
          <h2 id="documentos-apoyo" className="font-bold text-slate-950 dark:text-white">
            Añadir información desde Hacienda (opcional)
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Elige la opción que te resulte más fácil: un PDF censal o capturas de las pantallas de tus datos censales. Se procesa en este dispositivo, no se guarda el PDF ni las capturas y nada se aplica sin tu confirmación.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 font-semibold text-blue-700 focus-within:ring-2 focus-within:ring-blue-500 dark:bg-slate-900">
          {parsing ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileUp className="h-5 w-5" aria-hidden="true" />}
          {parsing ? "Leyendo PDF…" : "Opción 1 · Seleccionar PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={parsing}
            onChange={(event) => void selectFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <a
          href="#capturas-aeat"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-white px-4 font-semibold text-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:bg-slate-900 dark:text-emerald-300"
        >
          <Images className="h-5 w-5" aria-hidden="true" />
          Opción 2 · Usar capturas de Hacienda
        </a>
      </div>

      {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}

      {candidate && identity && (
        <div className="mt-5 space-y-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
          <div className={`flex gap-2 text-sm font-semibold ${identity.canConfirm ? "text-emerald-700" : "text-red-700"}`}>
            {identity.canConfirm ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />}
            <span>{identity.message}</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Documento detectado: <strong>{candidate.documentKind}</strong>. Revisa cada dato propuesto.
          </p>
          {candidate.warnings.map((warning) => (
            <p key={warning} className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>
          ))}
          <div className="space-y-2">
            {proposals.map((proposal) => {
              const currentValue = currentProfile[proposal.field];
              const hasCurrentValue = Array.isArray(currentValue)
                ? currentValue.length > 0
                : currentValue !== "UNKNOWN" &&
                  currentValue !== "UNCERTAIN" &&
                  currentValue !== null;
              const conflicts =
                hasCurrentValue &&
                JSON.stringify(currentValue) !== JSON.stringify(proposal.value);
              return (
              <label key={proposal.field} className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 ${conflicts ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-slate-200 dark:border-slate-700"}`}>
                <input
                  type="checkbox"
                  checked={selected.includes(proposal.field)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...new Set([...current, proposal.field])]
                        : current.filter((field) => field !== proposal.field),
                    )
                  }
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  <strong>{proposal.label}:</strong> {proposal.displayValue}
                  {conflicts && <span className="mt-1 block font-semibold text-amber-800 dark:text-amber-200">No coincide con la respuesta actual; al confirmar la sustituirá.</span>}
                </span>
              </label>
              );
            })}
          </div>
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-blue-600"
            />
            He contrastado el documento, su vigencia y los datos seleccionados.
          </label>
          <Button
            type="button"
            disabled={!identity.canConfirm || !confirmed || selected.length === 0}
            onClick={confirmSelection}
          >
            Confirmar datos seleccionados
          </Button>
        </div>
      )}
    </section>
  );
}
