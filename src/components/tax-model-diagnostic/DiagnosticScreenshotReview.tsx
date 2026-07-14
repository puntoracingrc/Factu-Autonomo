"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Images,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  MAX_AEAT_SCREENSHOTS,
  parseAeatCensusScreenshotText,
  recognizeAeatScreenshotFiles,
  validateAeatScreenshotFile,
  type AeatCensusScreenshotCandidate,
  type AeatCensusScreenshotKind,
  type AeatScreenshotOcrProgress,
} from "@/lib/fiscal-profile";
import type {
  Evidence,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";

type ProfilePatch = Partial<TaxpayerProfile>;
type FilesByKind = Record<AeatCensusScreenshotKind, File[]>;
type CandidatesByKind = Partial<
  Record<AeatCensusScreenshotKind, AeatCensusScreenshotCandidate>
>;

interface ScreenshotProposal {
  field: keyof TaxpayerProfile;
  questionId: string;
  label: string;
  displayValue: string;
  value: TaxpayerProfile[keyof TaxpayerProfile];
  sourceKind: AeatCensusScreenshotKind;
}

const EMPTY_FILES: FilesByKind = {
  ACTIVITIES: [],
  TAX_STATUS: [],
  OBLIGATIONS: [],
};

const SLOTS: readonly {
  kind: AeatCensusScreenshotKind;
  title: string;
  detail: string;
}[] = [
  {
    kind: "ACTIVITIES",
    title: "1. Mis actividades económicas",
    detail:
      "Puedes usar la relación completa o el detalle de una actividad si se ven Epígrafe, Estado y fechas.",
  },
  {
    kind: "TAX_STATUS",
    title: "2. Mi situación tributaria",
    detail: "Puedes añadir varias capturas al desplazarte por IRPF e IVA.",
  },
  {
    kind: "OBLIGATIONS",
    title: "3. Mis obligaciones",
    detail:
      "Incluye las filas hasta el final; basta con que la descripción, periodicidad y estado sean legibles.",
  },
] as const;

function activityKindLabels(values: TaxpayerProfile["activityKinds"]): string {
  const labels = {
    PROFESSIONAL: "Profesional",
    BUSINESS: "Empresarial",
    AGRICULTURE: "Agrícola",
    LIVESTOCK: "Ganadera",
    FORESTRY: "Forestal",
    OTHER: "Artística u otra",
  } as const;
  return values.map((value) => labels[value]).join(", ");
}

function vatLabels(values: TaxpayerProfile["vatRegimes"]): string {
  const labels = {
    GENERAL: "Régimen general",
    SIMPLIFIED: "Régimen simplificado",
    EQUIVALENCE_SURCHARGE: "Recargo de equivalencia",
    AGRICULTURE_LIVESTOCK_FISHING: "Agricultura, ganadería y pesca",
    CASH_ACCOUNTING: "Criterio de caja",
    EXEMPT: "Actividad exenta",
    NOT_SUBJECT: "Actividad no sujeta",
    OTHER_SPECIAL: "Otro régimen especial",
  } as const;
  return values.map((value) => labels[value]).join(", ");
}

function proposalsFromCandidates(
  candidates: CandidatesByKind,
  currentProfile: TaxpayerProfile,
): ScreenshotProposal[] {
  const proposals: ScreenshotProposal[] = [];
  const activities = candidates.ACTIVITIES;
  if (activities && activities.status !== "BLOCKED") {
    if (activities.activityKinds.length > 0) {
      proposals.push({
        field: "activityKinds",
        questionId: "C_ACTIVITY_KINDS",
        label: "Tipos de actividad en alta",
        displayValue: activityKindLabels(activities.activityKinds),
        value: activities.activityKinds,
        sourceKind: "ACTIVITIES",
      });
    }
    const activeDates = [
      ...new Set(
        activities.activities
          .filter((row) => row.state === "ACTIVE")
          .map((row) => row.startDate)
          .filter((date): date is string => Boolean(date)),
      ),
    ];
    if (activeDates.length === 1) {
      proposals.push({
        field: "activityStartDate",
        questionId: "B_START_DATE",
        label: "Fecha de inicio de la actividad en alta",
        displayValue: activeDates[0].split("-").reverse().join("/"),
        value: activeDates[0],
        sourceKind: "ACTIVITIES",
      });
    }
  }

  const taxStatus = candidates.TAX_STATUS;
  if (taxStatus && taxStatus.status !== "BLOCKED") {
    if (taxStatus.incomeTaxRegime !== "UNKNOWN") {
      const label = {
        DIRECT_NORMAL: "Estimación directa normal",
        DIRECT_SIMPLIFIED: "Estimación directa simplificada",
        OBJECTIVE_ESTIMATION: "Estimación objetiva (módulos)",
        ENTITY_ATTRIBUTION: "Atribución de rentas",
        NOT_APPLICABLE: "No aplicable",
        UNKNOWN: "Sin determinar",
      }[taxStatus.incomeTaxRegime];
      proposals.push({
        field: "incomeTaxRegime",
        questionId: "D_INCOME_TAX_REGIME",
        label: "Régimen de IRPF",
        displayValue: label,
        value: taxStatus.incomeTaxRegime,
        sourceKind: "TAX_STATUS",
      });
    }
    if (taxStatus.vatRegimes.length > 0) {
      proposals.push({
        field: "vatRegimes",
        questionId: "E_VAT_REGIMES",
        label: "Regímenes de IVA marcados",
        displayValue: vatLabels(taxStatus.vatRegimes),
        value: taxStatus.vatRegimes,
        sourceKind: "TAX_STATUS",
      });
    }
  }

  const obligations = candidates.OBLIGATIONS;
  if (obligations && obligations.status !== "BLOCKED") {
    const hasExplicitList =
      obligations.activeTaxModels.length > 0 || obligations.isComplete;
    if (hasExplicitList) {
      const models = obligations.isComplete
        ? obligations.activeTaxModels
        : ([
            ...new Set([
              ...currentProfile.censusObligations,
              ...obligations.activeTaxModels,
            ]),
          ].sort() as TaxpayerProfile["censusObligations"]);
      proposals.push({
        field: "censusObligations",
        questionId: "N_CENSUS_OBLIGATIONS",
        label: obligations.isComplete
          ? "Obligaciones periódicas en alta"
          : "Obligaciones leídas en la captura parcial",
        displayValue:
          models.length > 0
            ? models.map((model) => `Modelo ${model}`).join(", ")
            : "Ninguna obligación periódica en alta",
        value: models,
        sourceKind: "OBLIGATIONS",
      });
    }
    if (obligations.isComplete) {
      proposals.push({
        field: "censusReviewed",
        questionId: "N_CENSUS_REVIEWED",
        label: "Relación de obligaciones revisada",
        displayValue: "Sí",
        value: "YES",
        sourceKind: "OBLIGATIONS",
      });
    }
  }
  return proposals;
}

function sourceLabel(kind: AeatCensusScreenshotKind): string {
  return {
    ACTIVITIES: "AEAT · Mis actividades económicas",
    TAX_STATUS: "AEAT · Mi situación tributaria",
    OBLIGATIONS: "AEAT · Mis obligaciones",
  }[kind];
}

function statusLabel(candidate: AeatCensusScreenshotCandidate): string {
  if (candidate.status === "BLOCKED") return "No reconocida";
  if (candidate.isComplete) return "Lectura completa";
  if (candidate.status === "RESOLVED") return "Datos aprovechables";
  return "Lectura parcial";
}

export function DiagnosticScreenshotReview({
  currentProfile,
  onConfirm,
}: {
  currentProfile: TaxpayerProfile;
  onConfirm: (
    patch: ProfilePatch,
    evidence: Evidence[],
    completedQuestionIds: string[],
  ) => void;
}) {
  const [files, setFiles] = useState<FilesByKind>(EMPTY_FILES);
  const [candidates, setCandidates] = useState<CandidatesByKind>({});
  const [confidences, setConfidences] = useState<
    Partial<Record<AeatCensusScreenshotKind, number>>
  >({});
  const [selected, setSelected] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<AeatScreenshotOcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [draggingKind, setDraggingKind] =
    useState<AeatCensusScreenshotKind | null>(null);
  const dragDepth = useRef<Record<AeatCensusScreenshotKind, number>>({
    ACTIVITIES: 0,
    TAX_STATUS: 0,
    OBLIGATIONS: 0,
  });
  const proposals = useMemo(
    () => proposalsFromCandidates(candidates, currentProfile),
    [candidates, currentProfile],
  );
  const totalFiles = Object.values(files).reduce(
    (total, values) => total + values.length,
    0,
  );

  function selectFiles(kind: AeatCensusScreenshotKind, list: FileList | null) {
    if (!list) return;
    const nextFiles = Array.from(list);
    try {
      if (nextFiles.length > 3) {
        throw new Error("Añade como máximo 3 capturas por apartado.");
      }
      nextFiles.forEach(validateAeatScreenshotFile);
      const otherCount = Object.entries(files).reduce(
        (total, [entryKind, values]) =>
          entryKind === kind ? total : total + values.length,
        0,
      );
      if (otherCount + nextFiles.length > MAX_AEAT_SCREENSHOTS) {
        throw new Error(
          `Puedes leer hasta ${MAX_AEAT_SCREENSHOTS} capturas a la vez.`,
        );
      }
      setFiles((current) => ({ ...current, [kind]: nextFiles }));
      setCandidates({});
      setConfidences({});
      setSelected([]);
      setConfirmed(false);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pueden usar esas capturas.",
      );
    }
  }

  function handleDragEnter(
    kind: AeatCensusScreenshotKind,
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    if (reading) return;
    dragDepth.current[kind] += 1;
    setDraggingKind(kind);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!reading) event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(
    kind: AeatCensusScreenshotKind,
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current[kind] = Math.max(0, dragDepth.current[kind] - 1);
    if (dragDepth.current[kind] === 0) {
      setDraggingKind((current) => (current === kind ? null : current));
    }
  }

  function handleDrop(
    kind: AeatCensusScreenshotKind,
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current[kind] = 0;
    setDraggingKind(null);
    if (reading || event.dataTransfer.files.length === 0) return;
    selectFiles(kind, event.dataTransfer.files);
  }

  async function readScreenshots() {
    const inputs = SLOTS.flatMap(({ kind }) =>
      files[kind].map((file) => ({ kind, file })),
    );
    if (inputs.length === 0) return;
    setReading(true);
    setError(null);
    setCandidates({});
    setSelected([]);
    setConfirmed(false);
    try {
      const results = await recognizeAeatScreenshotFiles(inputs, setProgress);
      const nextCandidates: CandidatesByKind = {};
      const nextConfidences: Partial<Record<AeatCensusScreenshotKind, number>> = {};
      for (const { kind } of SLOTS) {
        const matches = results.filter((result) => result.kind === kind);
        if (matches.length === 0) continue;
        nextCandidates[kind] = parseAeatCensusScreenshotText(
          matches.map((result) => result.text).join("\n"),
          kind,
        );
        nextConfidences[kind] =
          matches.reduce((total, result) => total + result.confidence, 0) /
          matches.length;
      }
      setCandidates(nextCandidates);
      setConfidences(nextConfidences);
      setSelected(
        proposalsFromCandidates(nextCandidates, currentProfile).map(
          (proposal) => proposal.field,
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se han podido leer las capturas.",
      );
    } finally {
      setReading(false);
      setProgress(null);
    }
  }

  function confirmSelection() {
    if (!confirmed) return;
    const chosen = proposals.filter((proposal) =>
      selected.includes(proposal.field),
    );
    if (chosen.length === 0) return;
    const patch = Object.fromEntries(
      chosen.map((proposal) => [proposal.field, proposal.value]),
    ) as ProfilePatch;
    const documentId = `aeat-screenshots-${Date.now()}`;
    const evidence: Evidence[] = chosen.map((proposal) => ({
      evidenceId: `${documentId}:${proposal.field}`,
      documentId,
      type: "AEAT_CENSUS_SCREENSHOT",
      field: proposal.field,
      sourceLocation: sourceLabel(proposal.sourceKind),
      value: Array.isArray(proposal.value)
        ? proposal.value.map((value) => String(value))
        : typeof proposal.value === "string" ||
            typeof proposal.value === "number" ||
            typeof proposal.value === "boolean" ||
            proposal.value === null
          ? proposal.value
          : null,
      confidence: Math.max(
        0.5,
        Math.min(0.9, confidences[proposal.sourceKind] ?? 0.7),
      ),
      extractionMethod: "OCR_LOCAL",
      userConfirmed: true,
      sourcePriority: 30,
    }));
    onConfirm(
      patch,
      evidence,
      chosen.map((proposal) => proposal.questionId),
    );
    setFiles(EMPTY_FILES);
    setCandidates({});
    setConfidences({});
    setSelected([]);
    setConfirmed(false);
  }

  return (
    <section
      aria-labelledby="capturas-aeat"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/20"
    >
      <div className="flex items-start gap-3">
        <Images
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300"
          aria-hidden="true"
        />
        <div>
          <h2 id="capturas-aeat" className="font-bold text-slate-950 dark:text-white">
            Opción 2 · Capturas de Hacienda
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Si Hacienda no te deja descargar un documento, puedes fotografiar o capturar las pantallas. Puedes usar solo un apartado: cualquier dato claro será aprovechable y lo que falte quedará sin rellenar.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-200">
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          El texto se reconoce en este dispositivo. Las imágenes no se envían ni se guardan, y ningún dato se aplica hasta que tú lo confirmas.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-slate-900">
        <h3 className="font-bold text-slate-950 dark:text-white">
          Cómo encontrar esta información en Hacienda
        </h3>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <li><strong>1.</strong> Entra en la sede de la Agencia Tributaria y abre <strong>Área personal</strong>.</li>
          <li><strong>2.</strong> Pulsa <strong>Mis datos censales</strong>.</li>
          <li><strong>3.</strong> Abre los apartados <strong>Mis actividades económicas</strong>, <strong>Mi situación tributaria</strong> y <strong>Mis obligaciones</strong>.</li>
          <li><strong>4.</strong> Haz una o varias capturas incluyendo el título, las casillas o la tabla completa, y añádelas abajo en su apartado.</li>
        </ol>
        <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          La pantalla «Mi área personal» solo sirve para llegar: no hace falta subirla.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {SLOTS.map((slot) => (
          <div
            key={slot.kind}
            role="group"
            aria-labelledby={`aeat-drop-${slot.kind.toLowerCase()}`}
            data-drop-zone={slot.kind}
            onDragEnter={(event) => handleDragEnter(slot.kind, event)}
            onDragOver={handleDragOver}
            onDragLeave={(event) => handleDragLeave(slot.kind, event)}
            onDrop={(event) => handleDrop(slot.kind, event)}
            className={`rounded-2xl border bg-white p-4 transition duration-150 dark:bg-slate-900 ${
              draggingKind === slot.kind
                ? "border-emerald-500 bg-emerald-50 ring-4 ring-emerald-200 dark:border-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-900"
                : "border-slate-200 dark:border-slate-700"
            }`}
          >
            <h3
              id={`aeat-drop-${slot.kind.toLowerCase()}`}
              className="font-bold text-slate-950 dark:text-white"
            >
              {slot.title}
            </h3>
            <p className="mt-1 min-h-10 text-sm text-slate-600 dark:text-slate-300">
              {slot.detail}
            </p>
            <p
              aria-live="polite"
              className={`mt-3 rounded-xl border-2 border-dashed px-3 py-4 text-center text-sm font-semibold ${
                draggingKind === slot.kind
                  ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                  : "border-emerald-200 bg-emerald-50/50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
              }`}
            >
              {draggingKind === slot.kind
                ? "Suelta las capturas aquí"
                : "Arrastra aquí las capturas desde tu ordenador"}
            </p>
            <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-emerald-200 px-3 text-sm font-bold text-emerald-700 focus-within:ring-2 focus-within:ring-emerald-500 dark:text-emerald-300">
              <Upload className="h-4 w-4" aria-hidden="true" />
              O elige las capturas
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                className="sr-only"
                disabled={reading}
                onChange={(event) => {
                  selectFiles(slot.kind, event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {files[slot.kind].length > 0 && (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {files[slot.kind].length} captura{files[slot.kind].length === 1 ? "" : "s"} preparada{files[slot.kind].length === 1 ? "" : "s"}
              </p>
            )}
            {candidates[slot.kind] && (
              <div className="mt-3 space-y-2 text-sm">
                <p
                  className={`flex items-center gap-2 font-bold ${
                    candidates[slot.kind]?.status === "BLOCKED"
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {candidates[slot.kind]?.status === "BLOCKED" ? (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {statusLabel(candidates[slot.kind] as AeatCensusScreenshotCandidate)}
                </p>
                {candidates[slot.kind]?.warnings.map((warning) => (
                  <p key={warning} className="text-amber-800 dark:text-amber-300">
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="secondary"
          disabled={reading || totalFiles === 0}
          onClick={() => void readScreenshots()}
        >
          {reading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Images className="h-5 w-5" aria-hidden="true" />
          )}
          {reading ? "Leyendo capturas…" : "Leer capturas en este dispositivo"}
        </Button>
        {reading && progress && (
          <p role="status" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {progress.status} · {progress.fileIndex + 1}/{progress.fileCount} · {Math.round(progress.progress * 100)}%
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {proposals.length > 0 && (
        <div className="mt-5 space-y-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">
              Datos leídos para que los confirmes
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Puedes desmarcar cualquier dato. Una captura parcial no impide usar los campos que sí se ven con claridad.
            </p>
          </div>
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
                <label
                  key={proposal.field}
                  className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 ${
                    conflicts
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
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
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    <strong>{proposal.label}:</strong> {proposal.displayValue}
                    {conflicts && (
                      <span className="mt-1 block font-semibold text-amber-800 dark:text-amber-200">
                        Es distinto de la respuesta actual; al confirmar la sustituirá.
                      </span>
                    )}
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
              className="mt-1 h-4 w-4 accent-emerald-600"
            />
            Confirmo que las capturas contienen mis datos y que los campos seleccionados son correctos.
          </label>
          <Button
            type="button"
            disabled={!confirmed || selected.length === 0}
            onClick={confirmSelection}
          >
            Confirmar datos seleccionados
          </Button>
        </div>
      )}
    </section>
  );
}
