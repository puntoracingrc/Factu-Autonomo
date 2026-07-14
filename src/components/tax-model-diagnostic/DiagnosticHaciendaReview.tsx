"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Files,
  FileText,
  Images,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  MAX_AEAT_SCREENSHOTS,
  MAX_CENSUS_DOCUMENT_BYTES,
  parseAeatCensusScreenshotText,
  parseAeatTaxFormText,
  parseCensusCertificateText,
  parseSupportingDocumentText,
  readCensusDocumentText,
  recognizeAndClassifyAeatScreenshotFiles,
  validateAeatScreenshotFile,
  type AeatCensusScreenshotCandidate,
  type AeatCensusScreenshotKind,
  type AeatScreenshotOcrProgress,
  type CensusCertificateCandidate,
  type SupportingDocumentCandidate,
} from "@/lib/fiscal-profile";
import {
  mapCensusObligationsToQuestions,
  mapSubmittedTaxFormToQuestions,
  mapSupportingDocumentToQuestions,
} from "@/lib/tax-model-diagnostic/aeat-document-questions";
import type {
  Evidence,
  ExtractionMethod,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";

type ProfilePatch = Partial<TaxpayerProfile>;
type CandidatesByKind = Partial<
  Record<AeatCensusScreenshotKind, AeatCensusScreenshotCandidate>
>;

interface UnifiedProposal {
  field: keyof TaxpayerProfile;
  questionId: string;
  label: string;
  displayValue: string;
  value: TaxpayerProfile[keyof TaxpayerProfile];
  evidenceType: Evidence["type"];
  extractionMethod: ExtractionMethod;
  sourceLocation: string;
  confidence: number;
  date?: string;
}

interface FileAnalysis {
  fileName: string;
  label: string;
  status: "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED";
  warnings: string[];
}

const SCREENSHOT_KINDS: readonly AeatCensusScreenshotKind[] = [
  "ACTIVITIES",
  "TAX_STATUS",
  "OBLIGATIONS",
];

function isPdf(file: File): boolean {
  return (
    file.type.toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function screenshotKindLabel(kind: AeatCensusScreenshotKind): string {
  return {
    ACTIVITIES: "Mis actividades económicas",
    TAX_STATUS: "Mi situación tributaria",
    OBLIGATIONS: "Mis obligaciones",
  }[kind];
}

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

function screenshotProposals(
  candidates: CandidatesByKind,
  confidences: Partial<Record<AeatCensusScreenshotKind, number>>,
  currentProfile: TaxpayerProfile,
): UnifiedProposal[] {
  const proposals: UnifiedProposal[] = [];
  const source = (kind: AeatCensusScreenshotKind) => ({
    evidenceType: "AEAT_CENSUS_SCREENSHOT" as const,
    extractionMethod: "OCR_LOCAL" as const,
    sourceLocation: `AEAT · ${screenshotKindLabel(kind)}`,
    confidence: Math.max(0.5, Math.min(0.9, confidences[kind] ?? 0.7)),
  });
  const activities = candidates.ACTIVITIES;
  if (activities && activities.status !== "BLOCKED") {
    if (activities.activityKinds.length > 0) {
      proposals.push({
        field: "activityKinds",
        questionId: "C_ACTIVITY_KINDS",
        label: "Tipos de actividad en alta",
        displayValue: activityKindLabels(activities.activityKinds),
        value: activities.activityKinds,
        ...source("ACTIVITIES"),
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
        ...source("ACTIVITIES"),
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
        ...source("TAX_STATUS"),
      });
    }
    if (taxStatus.vatRegimes.length > 0) {
      proposals.push({
        field: "vatRegimes",
        questionId: "E_VAT_REGIMES",
        label: "Regímenes de IVA marcados",
        displayValue: vatLabels(taxStatus.vatRegimes),
        value: taxStatus.vatRegimes,
        ...source("TAX_STATUS"),
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
        ...source("OBLIGATIONS"),
      });
    }
    if (obligations.isComplete) {
      proposals.push({
        field: "censusReviewed",
        questionId: "N_CENSUS_REVIEWED",
        label: "Relación de obligaciones revisada",
        displayValue: "Sí",
        value: "YES",
        ...source("OBLIGATIONS"),
      });
    }
    proposals.push(
      ...mapCensusObligationsToQuestions(obligations.activeTaxModels).map(
        (answer) => ({ ...answer, ...source("OBLIGATIONS") }),
      ),
    );
  }
  return proposals;
}

function pdfProposals(
  candidate: CensusCertificateCandidate,
  fileName: string,
): UnifiedProposal[] {
  const proposals: UnifiedProposal[] = [];
  const source = {
    evidenceType:
      candidate.documentKind === "MODEL_036"
        ? ("MODEL_036" as const)
        : candidate.documentKind === "AEAT_CENSUS_CERTIFICATE"
          ? ("CURRENT_CENSUS" as const)
          : ("OTHER" as const),
    extractionMethod: "PDF_NATIVE_TEXT" as const,
    sourceLocation: `${fileName} · texto nativo del PDF`,
    confidence: 0.78,
    ...(candidate.documentDate ? { date: candidate.documentDate } : {}),
  };
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
      displayValue:
        invoicingSubject === "COMPANY" ? "Sociedad" : "Persona física",
      ...source,
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
      ...source,
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
      ...source,
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
      ...source,
    });
  }
  if (candidate.documentKind === "AEAT_CENSUS_CERTIFICATE") {
    proposals.push({
      field: "censusReviewed",
      questionId: "N_CENSUS_REVIEWED",
      label: "Situación censal revisada",
      displayValue: "Sí",
      value: "YES",
      ...source,
    });
  }
  return proposals;
}

function taxFormProposals(
  candidate: ReturnType<typeof parseAeatTaxFormText>,
  fileName: string,
  extractionMethod: ExtractionMethod,
): UnifiedProposal[] {
  const source = {
    evidenceType: "PREVIOUS_RETURN" as const,
    extractionMethod,
    sourceLocation: `${fileName} · Modelo ${candidate.modelCode}${candidate.taxYear ? ` · ${candidate.taxYear}` : ""}${candidate.period ? ` · ${candidate.period}` : ""}`,
    confidence: candidate.status === "RESOLVED" ? 0.86 : 0.7,
  };
  return mapSubmittedTaxFormToQuestions(candidate).map((answer) => ({
    ...answer,
    ...source,
  }));
}

function supportingDocumentLabel(
  candidate: SupportingDocumentCandidate,
): string {
  return {
    RETA_CURRENT_STATUS_REPORT: "Informe de situación actual del trabajador",
    WORK_LIFE_REPORT: "Informe de vida laboral",
    SELF_EMPLOYED_ACTIVITY_REPORT:
      "Informe de actividades de trabajo autónomo",
    INTRACOMMUNITY_OPERATOR_CERTIFICATE:
      "Certificado de operador intracomunitario",
    LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE:
      "Certificado de exoneración de retención del arrendador",
    UNKNOWN: "Documento no reconocido",
  }[candidate.documentType];
}

function supportingDocumentProposals(
  candidate: SupportingDocumentCandidate,
  fileName: string,
  extractionMethod: ExtractionMethod,
): UnifiedProposal[] {
  const source = {
    evidenceType: "OTHER" as const,
    extractionMethod,
    sourceLocation: `${fileName} · ${supportingDocumentLabel(candidate)}`,
    confidence: candidate.status === "RESOLVED" ? 0.86 : 0.7,
  };
  return mapSupportingDocumentToQuestions(candidate).map((answer) => ({
    ...answer,
    ...source,
  }));
}

function consolidateProposals(raw: UnifiedProposal[]): {
  proposals: UnifiedProposal[];
  conflicts: string[];
} {
  const grouped = new Map<keyof TaxpayerProfile, UnifiedProposal[]>();
  for (const proposal of raw) {
    grouped.set(proposal.field, [
      ...(grouped.get(proposal.field) ?? []),
      proposal,
    ]);
  }
  const proposals: UnifiedProposal[] = [];
  const conflicts: string[] = [];
  for (const values of grouped.values()) {
    const distinct = new Map(
      values.map((proposal) => [JSON.stringify(proposal.value), proposal]),
    );
    if (distinct.size > 1) {
      conflicts.push(values[0].label);
      continue;
    }
    proposals.push(
      [...distinct.values()].sort((a, b) => b.confidence - a.confidence)[0],
    );
  }
  return { proposals, conflicts };
}

function documentLabel(candidate: CensusCertificateCandidate): string {
  return {
    AEAT_CENSUS_CERTIFICATE: "Certificado de situación censal",
    MODEL_036: "Modelo 036",
    MODEL_037: "Modelo 037 histórico",
    UNKNOWN: "PDF no reconocido",
  }[candidate.documentKind];
}

export function DiagnosticHaciendaReview({
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
  const [files, setFiles] = useState<File[]>([]);
  const [analyses, setAnalyses] = useState<FileAnalysis[]>([]);
  const [proposals, setProposals] = useState<UnifiedProposal[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<AeatScreenshotOcrProgress | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  function resetResults() {
    setAnalyses([]);
    setProposals([]);
    setConflicts([]);
    setSelected([]);
    setConfirmed(false);
    setError(null);
  }

  function validateFiles(nextFiles: File[]) {
    if (nextFiles.length > MAX_AEAT_SCREENSHOTS) {
      throw new Error(
        `Puedes analizar hasta ${MAX_AEAT_SCREENSHOTS} archivos a la vez.`,
      );
    }
    for (const file of nextFiles) {
      if (isPdf(file)) {
        if (file.size > MAX_CENSUS_DOCUMENT_BYTES) {
          throw new Error(`El PDF «${file.name}» supera el límite de 4 MB.`);
        }
      } else {
        validateAeatScreenshotFile(file);
      }
    }
  }

  function selectFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const nextFiles = Array.from(list);
    try {
      validateFiles(nextFiles);
      setFiles(nextFiles);
      resetResults();
      void analyzeFiles(nextFiles);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pueden usar esos archivos.",
      );
    }
  }

  async function analyzeFiles(nextFiles: File[]) {
    setReading(true);
    setError(null);
    setProgress(null);
    const nextAnalyses: FileAnalysis[] = [];
    const rawProposals: UnifiedProposal[] = [];
    try {
      for (const file of nextFiles.filter(isPdf)) {
        try {
          const text = await readCensusDocumentText(file);
          const census = parseCensusCertificateText(text);
          if (census.documentKind !== "UNKNOWN") {
            nextAnalyses.push({
              fileName: file.name,
              label: documentLabel(census),
              status: "RESOLVED",
              warnings: census.warnings,
            });
            rawProposals.push(...pdfProposals(census, file.name));
            continue;
          }
          const taxForm = parseAeatTaxFormText(text);
          if (taxForm.status !== "BLOCKED") {
            nextAnalyses.push({
              fileName: file.name,
              label: `Modelo ${taxForm.modelCode}${taxForm.taxYear ? ` · ${taxForm.taxYear}` : ""}${taxForm.period ? ` · ${taxForm.period}` : ""}`,
              status: taxForm.status,
              warnings: taxForm.warnings,
            });
            rawProposals.push(
              ...taxFormProposals(taxForm, file.name, "PDF_NATIVE_TEXT"),
            );
            continue;
          }
          const supporting = parseSupportingDocumentText(text);
          if (supporting.status !== "BLOCKED") {
            nextAnalyses.push({
              fileName: file.name,
              label: supportingDocumentLabel(supporting),
              status: supporting.status,
              warnings: supporting.warnings,
            });
            rawProposals.push(
              ...supportingDocumentProposals(
                supporting,
                file.name,
                "PDF_NATIVE_TEXT",
              ),
            );
          } else {
            nextAnalyses.push({
              fileName: file.name,
              label: "PDF no reconocido",
              status: "BLOCKED",
              warnings: supporting.warnings,
            });
          }
        } catch (caught) {
          nextAnalyses.push({
            fileName: file.name,
            label: "PDF no legible",
            status: "BLOCKED",
            warnings: [
              caught instanceof Error
                ? caught.message
                : "No se ha podido leer este PDF.",
            ],
          });
        }
      }

      const imageFiles = nextFiles.filter((file) => !isPdf(file));
      if (imageFiles.length > 0) {
        const results = await recognizeAndClassifyAeatScreenshotFiles(
          imageFiles,
          setProgress,
        );
        const candidates: CandidatesByKind = {};
        const confidences: Partial<Record<AeatCensusScreenshotKind, number>> =
          {};
        for (const kind of SCREENSHOT_KINDS) {
          const matches = results.filter((result) => result.kind === kind);
          if (matches.length === 0) continue;
          const candidate = parseAeatCensusScreenshotText(
            matches.map((result) => result.text).join("\n"),
            kind,
          );
          candidates[kind] = candidate;
          confidences[kind] =
            matches.reduce((total, result) => total + result.confidence, 0) /
            matches.length;
          for (const match of matches) {
            nextAnalyses.push({
              fileName: match.fileName,
              label: screenshotKindLabel(kind),
              status: candidate.status,
              warnings: candidate.warnings,
            });
          }
        }
        for (const result of results.filter(
          (item) => item.kind === "UNKNOWN",
        )) {
          const taxForm = parseAeatTaxFormText(result.text);
          if (taxForm.status !== "BLOCKED") {
            nextAnalyses.push({
              fileName: result.fileName,
              label: `Modelo ${taxForm.modelCode}${taxForm.taxYear ? ` · ${taxForm.taxYear}` : ""}${taxForm.period ? ` · ${taxForm.period}` : ""}`,
              status: taxForm.status,
              warnings: taxForm.warnings,
            });
            rawProposals.push(
              ...taxFormProposals(taxForm, result.fileName, "OCR_LOCAL"),
            );
            continue;
          }
          const supporting = parseSupportingDocumentText(result.text);
          nextAnalyses.push(
            supporting.status === "BLOCKED"
              ? {
                  fileName: result.fileName,
                  label: "Captura no reconocida",
                  status: "BLOCKED",
                  warnings: supporting.warnings,
                }
              : {
                  fileName: result.fileName,
                  label: supportingDocumentLabel(supporting),
                  status: supporting.status,
                  warnings: supporting.warnings,
                },
          );
          rawProposals.push(
            ...supportingDocumentProposals(
              supporting,
              result.fileName,
              "OCR_LOCAL",
            ),
          );
        }
        rawProposals.push(
          ...screenshotProposals(candidates, confidences, currentProfile),
        );
      }

      const consolidated = consolidateProposals(rawProposals);
      setAnalyses(nextAnalyses);
      setProposals(consolidated.proposals);
      setConflicts(consolidated.conflicts);
      setSelected(consolidated.proposals.map((proposal) => proposal.field));
    } catch (caught) {
      setAnalyses(nextAnalyses);
      setError(
        caught instanceof Error
          ? caught.message
          : "No se han podido analizar los archivos.",
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
    const documentId = `aeat-files-${Date.now()}`;
    const evidence: Evidence[] = chosen.map((proposal) => ({
      evidenceId: `${documentId}:${proposal.field}`,
      documentId,
      type: proposal.evidenceType,
      field: proposal.field,
      sourceLocation: proposal.sourceLocation,
      value: Array.isArray(proposal.value)
        ? proposal.value.map((value) => String(value))
        : typeof proposal.value === "string" ||
            typeof proposal.value === "number" ||
            typeof proposal.value === "boolean" ||
            proposal.value === null
          ? proposal.value
          : null,
      confidence: proposal.confidence,
      ...(proposal.date ? { date: proposal.date } : {}),
      extractionMethod: proposal.extractionMethod,
      userConfirmed: true,
      sourcePriority: 30,
    }));
    onConfirm(
      patch,
      evidence,
      chosen.map((proposal) => proposal.questionId),
    );
    setFiles([]);
    resetResults();
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (reading) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!reading) event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    if (!reading) selectFiles(event.dataTransfer.files);
  }

  return (
    <section
      aria-labelledby="documentos-apoyo"
      className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 dark:border-blue-900 dark:bg-blue-950/20"
    >
      <div className="flex items-start gap-3">
        <Files
          className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300"
          aria-hidden="true"
        />
        <div>
          <h2
            id="documentos-apoyo"
            className="font-bold text-slate-950 dark:text-white"
          >
            Sube lo que tengas de Hacienda (opcional)
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Puedes mezclar PDF y capturas sin ordenarlos. Los clasificaremos y
            analizaremos en este dispositivo; nada se aplicará hasta que tú lo
            confirmes.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-200">
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Los archivos no se envían ni se guardan. El lector usa un catálogo
          cerrado de modelos fiscales, documentos censales, certificados e
          informes de Seguridad Social; un archivo desconocido no contesta
          ninguna pregunta.
        </p>
      </div>

      <details className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900 dark:bg-slate-900">
        <summary className="cursor-pointer font-bold text-slate-950 dark:text-white">
          Cómo encontrar la información en Hacienda
        </summary>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <li>
            <strong>1.</strong> Entra en la sede de la Agencia Tributaria y abre{" "}
            <strong>Área personal</strong>.
          </li>
          <li>
            <strong>2.</strong> Pulsa <strong>Mis datos censales</strong>.
          </li>
          <li>
            <strong>3.</strong> Puedes descargar un documento disponible o
            capturar <strong>Mis actividades económicas</strong>,{" "}
            <strong>Mi situación tributaria</strong> y{" "}
            <strong>Mis obligaciones</strong>.
          </li>
          <li>
            <strong>4.</strong> Arrastra aquí todo lo que tengas; no necesitas
            identificar cada archivo.
          </li>
        </ol>
      </details>

      <div
        role="group"
        aria-label="Archivos de Hacienda"
        data-drop-zone="AEAT_FILES"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mt-4 rounded-2xl border-2 border-dashed bg-white p-6 text-center transition dark:bg-slate-900 ${
          dragging
            ? "border-blue-600 bg-blue-100 ring-4 ring-blue-200 dark:bg-blue-950/50 dark:ring-blue-900"
            : "border-blue-300 dark:border-blue-800"
        }`}
      >
        <Upload className="mx-auto h-7 w-7 text-blue-600" aria-hidden="true" />
        <p
          className="mt-2 font-bold text-slate-950 dark:text-white"
          aria-live="polite"
        >
          {dragging
            ? "Suelta aquí todos los archivos"
            : "Arrastra aquí todos tus PDF y capturas"}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          PDF, PNG, JPG o WebP · hasta {MAX_AEAT_SCREENSHOTS} archivos
        </p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-blue-200 px-4 text-sm font-bold text-blue-700 focus-within:ring-2 focus-within:ring-blue-500 dark:text-blue-300">
          <Files className="h-4 w-4" aria-hidden="true" />
          O elige los archivos
          <input
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp"
            className="sr-only"
            disabled={reading}
            onChange={(event) => {
              selectFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
          <p className="font-bold text-slate-950 dark:text-white">
            {files.length} archivo{files.length === 1 ? "" : "s"} añadido
            {files.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {files.map((file) => (
              <li
                key={`${file.name}:${file.size}`}
                className="flex items-center gap-2"
              >
                {isPdf(file) ? (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Images className="h-4 w-4" aria-hidden="true" />
                )}
                {file.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {reading && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300"
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {progress
            ? `${progress.status} · ${progress.fileIndex + 1}/${progress.fileCount} · ${Math.round(progress.progress * 100)}%`
            : "Analizando los archivos en este dispositivo…"}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {analyses.length > 0 && (
        <div className="mt-5 rounded-2xl bg-white p-4 dark:bg-slate-900">
          <h3 className="font-bold text-slate-950 dark:text-white">
            Archivos identificados
          </h3>
          <div className="mt-3 space-y-3">
            {analyses.map((analysis) => (
              <div
                key={analysis.fileName}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <p
                  className={`flex items-center gap-2 text-sm font-bold ${
                    analysis.status === "BLOCKED"
                      ? "text-red-700 dark:text-red-300"
                      : analysis.status === "REVIEW_REQUIRED"
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {analysis.status === "BLOCKED" ? (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {analysis.fileName}: {analysis.label}
                </p>
                {analysis.warnings.map((warning) => (
                  <p
                    key={warning}
                    className="mt-1 text-sm text-amber-800 dark:text-amber-300"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {conflicts.length > 0 && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
        >
          Hay valores distintos entre los archivos para: {conflicts.join(", ")}.
          No se aplicarán automáticamente; respóndelos manualmente en el
          cuestionario.
        </p>
      )}

      {proposals.length > 0 && (
        <div className="mt-5 space-y-4 rounded-2xl bg-white p-4 dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white">
              Datos leídos para que los confirmes
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Puedes desmarcar cualquier dato antes de incorporarlo a tu
              configuración.
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
              const conflictsWithCurrent =
                hasCurrentValue &&
                JSON.stringify(currentValue) !== JSON.stringify(proposal.value);
              return (
                <label
                  key={proposal.field}
                  className={`flex min-h-12 items-start gap-3 rounded-xl border p-3 ${
                    conflictsWithCurrent
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
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    <strong>{proposal.label}:</strong> {proposal.displayValue}
                    {conflictsWithCurrent && (
                      <span className="mt-1 block font-semibold text-amber-800 dark:text-amber-200">
                        Es distinto de la respuesta actual; al confirmar la
                        sustituirá.
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
              className="mt-1 h-4 w-4 accent-blue-600"
            />
            Confirmo que los archivos contienen los datos que quiero utilizar y
            que los campos seleccionados son correctos.
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
