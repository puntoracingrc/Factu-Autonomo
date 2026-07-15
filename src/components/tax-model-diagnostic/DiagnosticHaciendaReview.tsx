"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Files,
  FileText,
  Images,
  Info,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  MAX_AEAT_SCREENSHOTS,
  MAX_CENSUS_DOCUMENT_BYTES,
  readCensusDocumentPages,
  recognizeAndClassifyAeatScreenshotFiles,
  validateAeatScreenshotFile,
  type AeatCensusScreenshotKind,
  type AeatScreenshotOcrProgress,
} from "@/lib/fiscal-profile";
import type {
  Evidence,
  ExtractionMethod,
  TaxpayerProfile,
} from "@/lib/tax-model-diagnostic/contracts";
import {
  extractFiscalDocumentText,
  type FiscalDocumentExtractionResult,
} from "@/lib/tax-model-diagnostic/extractors";
import { DIAGNOSTIC_QUESTIONS } from "@/lib/tax-model-diagnostic/questions";

type ProfilePatch = Partial<TaxpayerProfile>;

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
  page?: number;
  documentId: string;
  detail?: string;
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

function fileKey(file: File): string {
  return [file.name, file.size, file.lastModified, file.type].join(":");
}

function mergeFiles(current: File[], incoming: File[]): File[] {
  const merged = new Map(current.map((file) => [fileKey(file), file]));
  for (const file of incoming) merged.set(fileKey(file), file);
  return [...merged.values()];
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

function documentTypeLabel(result: FiscalDocumentExtractionResult): string {
  const type = result.envelope.detectedDocumentType;
  if (!type) return "Documento no reconocido";
  if (type.startsWith("MODEL_")) {
    const code = type.slice("MODEL_".length);
    return code === "037" ? "Modelo 037 histórico" : `Modelo ${code}`;
  }
  const labels: Record<string, string> = {
    CURRENT_CENSUS_CERTIFICATE: "Certificado de situación censal",
    AEAT_ECONOMIC_ACTIVITIES_VIEW: "Mis actividades económicas",
    AEAT_TAX_STATUS_VIEW: "Mi situación tributaria",
    AEAT_OBLIGATIONS_VIEW: "Mis obligaciones tributarias",
    TGSS_CURRENT_STATUS_REPORT: "Informe de situación actual en RETA",
    TGSS_EMPLOYMENT_HISTORY: "Informe de vida laboral",
    TGSS_SELF_EMPLOYED_ACTIVITIES: "Informe de actividades de trabajo autónomo",
    ROI_CERTIFICATE: "Certificado de operador intracomunitario",
    LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE:
      "Certificado de exoneración del arrendador",
  };
  return labels[type] ?? "Documento reconocido";
}

function evidenceType(
  result: FiscalDocumentExtractionResult,
): Evidence["type"] {
  const type = result.envelope.detectedDocumentType;
  if (type === "CURRENT_CENSUS_CERTIFICATE") return "CURRENT_CENSUS";
  if (type === "MODEL_036") return "MODEL_036";
  if (type?.startsWith("MODEL_")) return "PREVIOUS_RETURN";
  if (type?.startsWith("AEAT_")) return "AEAT_CENSUS_SCREENSHOT";
  return "OTHER";
}

function displayProposalValue(
  field: keyof TaxpayerProfile,
  value: TaxpayerProfile[keyof TaxpayerProfile],
): string {
  if (field === "activityKinds" && Array.isArray(value)) {
    return activityKindLabels(value as TaxpayerProfile["activityKinds"]);
  }
  if (field === "vatRegimes" && Array.isArray(value)) {
    return vatLabels(value as TaxpayerProfile["vatRegimes"]);
  }
  if (field === "censusObligations" && Array.isArray(value)) {
    return value.length > 0
      ? value.map((code) => `Modelo ${code}`).join(", ")
      : "Ninguna obligación periódica en alta";
  }
  if (value === "YES") return "Sí";
  if (value === "NO") return "No";
  if (value === "NATURAL_PERSON") return "Persona física";
  if (value === "COMPANY") return "Sociedad";
  if (value === "ES_COMMON") return "Territorio común AEAT";
  if (value === "ES_CANARY") return "Canarias";
  if (value === "ES_NAVARRA") return "Navarra";
  if (value === "DIRECT_NORMAL") return "Estimación directa normal";
  if (value === "DIRECT_SIMPLIFIED") return "Estimación directa simplificada";
  if (value === "OBJECTIVE_ESTIMATION") return "Estimación objetiva (módulos)";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.split("-").reverse().join("/");
  }
  return String(value);
}

function extractionProposals(
  result: FiscalDocumentExtractionResult,
): UnifiedProposal[] {
  if (result.status !== "RESOLVED") return [];
  return result.questionResolutions.flatMap((resolution) => {
    if (resolution.status === "CONFLICT") return [];
    const question = DIAGNOSTIC_QUESTIONS.find(
      (item) => item.questionId === resolution.questionId,
    );
    if (!question) return [];
    const value = resolution.proposedAnswer;
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return [];
    }
    const supportingFacts = result.facts.filter((fact) =>
      resolution.evidenceIds.includes(fact.factId),
    );
    const primaryFact = supportingFacts[0];
    const profileValue = value as TaxpayerProfile[keyof TaxpayerProfile];
    return [
      {
        field: question.field,
        questionId: question.questionId,
        label: question.label.replace(/^¿|\?$/g, ""),
        displayValue: displayProposalValue(question.field, profileValue),
        value: profileValue,
        evidenceType: evidenceType(result),
        extractionMethod:
          primaryFact?.extractionMethod === "OCR_LOCAL"
            ? "OCR_LOCAL"
            : "PDF_NATIVE_TEXT",
        sourceLocation: [documentTypeLabel(result), primaryFact?.sourceLabel]
          .filter(Boolean)
          .join(" · "),
        confidence:
          primaryFact?.extractionConfidence ??
          result.envelope.overallConfidence,
        ...(primaryFact?.effectiveFrom
          ? { date: primaryFact.effectiveFrom }
          : {}),
        ...(primaryFact?.sourcePage ? { page: primaryFact.sourcePage } : {}),
        documentId: result.envelope.documentId,
        detail: [resolution.explanation, ...resolution.missingInformation].join(
          " ",
        ),
      },
    ];
  });
}

function analysisStatus(
  result: FiscalDocumentExtractionResult,
): FileAnalysis["status"] {
  if (result.status === "BLOCKED") return "BLOCKED";
  if (result.status === "RESOLVED") return "RESOLVED";
  return "REVIEW_REQUIRED";
}

function extractionQuality(result: FiscalDocumentExtractionResult): number {
  const statusScore = {
    BLOCKED: 0,
    UNSUPPORTED_DOCUMENT: 1,
    MANUAL_REVIEW: 2,
    RESOLVED: 3,
  }[result.status];
  return (
    statusScore * 10_000 +
    (result.envelope.detectedDocumentType ? 1_000 : 0) +
    result.facts.length * 100 +
    result.questionResolutions.length * 10 +
    Math.round(result.envelope.overallConfidence * 9)
  );
}

function needsHybridPdfOcr(result: FiscalDocumentExtractionResult): boolean {
  return (
    result.status === "BLOCKED" ||
    result.status === "UNSUPPORTED_DOCUMENT" ||
    result.facts.length === 0
  );
}

function analysisLabel(result: FiscalDocumentExtractionResult): string {
  return [
    documentTypeLabel(result),
    result.envelope.fiscalYear,
    result.envelope.period,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" · ");
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
          throw new Error(`El PDF «${file.name}» supera el límite de 8 MB.`);
        }
      } else {
        validateAeatScreenshotFile(file);
      }
    }
  }

  function selectFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const nextFiles = mergeFiles(files, Array.from(list));
    try {
      validateFiles(nextFiles);
      if (nextFiles.length === files.length) {
        setError(null);
        return;
      }
      setFiles(nextFiles);
      resetResults();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pueden usar esos archivos.",
      );
    }
  }

  function removeFile(target: File) {
    setFiles((current) =>
      current.filter((file) => fileKey(file) !== fileKey(target)),
    );
    resetResults();
  }

  function clearFiles() {
    setFiles([]);
    resetResults();
  }

  async function analyzeFiles(nextFiles: File[]) {
    setReading(true);
    setError(null);
    setProgress(null);
    const nextAnalyses: FileAnalysis[] = [];
    const rawProposals: UnifiedProposal[] = [];
    const runId = Date.now().toString(36);
    let documentIndex = 0;
    const nextDocumentId = () => `fiscal-document-${runId}-${documentIndex++}`;
    try {
      for (const file of nextFiles.filter(isPdf)) {
        try {
          let document = await readCensusDocumentPages(file, setProgress);
          let result = extractFiscalDocumentText({
            documentId: nextDocumentId(),
            text: document.text,
            extractionMethod: document.extractionMethod,
            totalPages: document.totalPages,
            detectedPages: document.pages
              .filter((page) => page.text.length > 0)
              .map((page) => page.page),
            pages: document.pages,
          });
          if (
            document.extractionMethod === "PDF_NATIVE_TEXT" &&
            needsHybridPdfOcr(result)
          ) {
            try {
              const hybridDocument = await readCensusDocumentPages(
                file,
                setProgress,
                { forceLocalOcr: true, mergeNativeText: true },
              );
              const hybridResult = extractFiscalDocumentText({
                documentId: nextDocumentId(),
                text: hybridDocument.text,
                extractionMethod: "OCR_LOCAL",
                totalPages: hybridDocument.totalPages,
                detectedPages: hybridDocument.pages
                  .filter((page) => page.text.length > 0)
                  .map((page) => page.page),
                pages: hybridDocument.pages,
              });
              if (extractionQuality(hybridResult) > extractionQuality(result)) {
                document = hybridDocument;
                result = hybridResult;
              }
            } catch {
              // La lectura nativa sigue siendo el resultado seguro. Un fallo
              // del OCR local no convierte el archivo en un falso positivo.
            }
          }
          nextAnalyses.push({
            fileName: file.name,
            label: analysisLabel(result),
            status: analysisStatus(result),
            warnings: [...result.warnings],
          });
          rawProposals.push(...extractionProposals(result));
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
        for (const kind of SCREENSHOT_KINDS) {
          const matches = results.filter((result) => result.kind === kind);
          if (matches.length === 0) continue;
          const extraction = extractFiscalDocumentText({
            documentId: nextDocumentId(),
            text: matches.map((result) => result.text).join("\n"),
            extractionMethod: "OCR_LOCAL",
            totalPages: matches.length,
            detectedPages: matches.map((_, index) => index + 1),
            pages: matches.map((match, index) => ({
              page: index + 1,
              text: match.text,
            })),
          });
          for (const match of matches) {
            nextAnalyses.push({
              fileName: match.fileName,
              label: analysisLabel(extraction),
              status: analysisStatus(extraction),
              warnings: [...extraction.warnings],
            });
          }
          rawProposals.push(...extractionProposals(extraction));
        }
        for (const result of results.filter(
          (item) => item.kind === "UNKNOWN",
        )) {
          const extraction = extractFiscalDocumentText({
            documentId: nextDocumentId(),
            text: result.text,
            extractionMethod: "OCR_LOCAL",
            totalPages: 1,
            detectedPages: [1],
            pages: [{ page: 1, text: result.text }],
          });
          nextAnalyses.push({
            fileName: result.fileName,
            label: analysisLabel(extraction),
            status: analysisStatus(extraction),
            warnings: [...extraction.warnings],
          });
          rawProposals.push(...extractionProposals(extraction));
        }
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
    const evidence: Evidence[] = chosen.map((proposal) => ({
      evidenceId: `${proposal.documentId}:${proposal.field}`,
      documentId: proposal.documentId,
      type: proposal.evidenceType,
      ...(proposal.page ? { page: proposal.page } : {}),
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
      aria-busy={reading}
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

      <details
        data-info-card="recognized-fiscal-documents"
        className="group mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/70 dark:border-cyan-900 dark:bg-cyan-950/20"
      >
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-bold text-slate-950 marker:content-none dark:text-white">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-200">
            <Info className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            ¿Qué modelos y documentos reconoce el lector?
          </span>
          <span className="text-xs font-semibold text-cyan-700 group-open:hidden dark:text-cyan-300">
            Ver lista
          </span>
          <span className="hidden text-xs font-semibold text-cyan-700 group-open:inline dark:text-cyan-300">
            Ocultar
          </span>
        </summary>
        <div className="border-t border-cyan-200 px-4 py-4 text-sm leading-6 text-slate-700 dark:border-cyan-900 dark:text-slate-200">
          <p>
            <strong>Reconocer</strong> significa identificar con seguridad el
            tipo de documento. Solo se rellenan preguntas cuando su interior
            contiene un dato compatible y suficientemente claro.
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
              <h3 className="font-bold text-slate-950 dark:text-white">
                30 modelos fiscales
              </h3>
              <dl className="mt-2 space-y-2">
                <div>
                  <dt className="font-semibold">Prioridad máxima</dt>
                  <dd>
                    036, 037 histórico, 130, 131, 303, 390, 111, 190, 115, 180,
                    349, 035, 369 y 184.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Segunda prioridad</dt>
                  <dd>100, 200, 202, 347, 309, 123, 193, 216 y 296.</dd>
                </div>
                <div>
                  <dt className="font-semibold">Casos especiales</dt>
                  <dd>308, 341, 720, 721, 714, 840 y 151.</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl bg-white p-4 dark:bg-slate-900">
              <h3 className="font-bold text-slate-950 dark:text-white">
                9 documentos sin número de modelo
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Certificado de situación censal actualizado.</li>
                <li>Mis actividades económicas.</li>
                <li>Mi situación tributaria.</li>
                <li>Mis obligaciones tributarias.</li>
                <li>Informe de situación actual en RETA.</li>
                <li>Vida laboral.</li>
                <li>Informe de actividades de trabajo autónomo.</li>
                <li>Certificado de operador intracomunitario.</li>
                <li>Certificado de exoneración de retención del arrendador.</li>
              </ul>
              <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3 dark:border-cyan-900 dark:bg-cyan-950/30">
                <p className="font-semibold text-slate-950 dark:text-white">
                  Capturas de Hacienda compatibles
                </p>
                <p className="mt-1">
                  Relación de actividades o «Mis actividades económicas»;
                  detalle de una actividad o número de referencia (Modelo 036);
                  «Mi situación tributaria» —aunque necesite varias capturas— y
                  «Mis obligaciones tributarias».
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>

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
            identificar cada archivo. Cuando termines, pulsa{" "}
            <strong>Analizar archivos</strong>.
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-950 dark:text-white">
                {files.length} archivo{files.length === 1 ? "" : "s"} añadido
                {files.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Puedes añadir más. No empezaremos hasta que pulses analizar.
              </p>
            </div>
            <button
              type="button"
              disabled={reading}
              onClick={clearFiles}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar todos
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {files.map((file) => (
              <li
                key={fileKey(file)}
                className="flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                {isPdf(file) ? (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Images className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => removeFile(file)}
                  aria-label={`Quitar ${file.name}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          {!reading && analyses.length === 0 && (
            <Button
              type="button"
              className="mt-4"
              onClick={() => void analyzeFiles(files)}
            >
              Analizar {files.length} archivo{files.length === 1 ? "" : "s"}
            </Button>
          )}
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
                  <span className="sr-only">
                    {analysis.status === "BLOCKED"
                      ? "Bloqueado"
                      : analysis.status === "REVIEW_REQUIRED"
                        ? "Necesita revisión"
                        : "Reconocido"}
                    :{" "}
                  </span>
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
              configuración. Los datos que confirmes se sumarán a los que ya
              tengas; si cambia un mismo campo, te avisaremos antes de
              sustituirlo.
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
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-200">
                    <strong>{proposal.label}:</strong> {proposal.displayValue}
                    {proposal.detail && (
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {proposal.detail}
                      </span>
                    )}
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
              className="mt-1 h-4 w-4 accent-emerald-600"
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
