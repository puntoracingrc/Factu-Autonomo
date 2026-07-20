"use client";

import {
  FileText,
  FileSearch,
  FileUp,
  Files,
  Loader2,
  Mail,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { FiscalNotificationExplicitFieldsReview } from "@/components/fiscal-notifications/FiscalNotificationExplicitFieldsReview";
import {
  FiscalNotificationDocumentDetail,
  FiscalNotificationDocumentLibrary,
} from "@/components/fiscal-notifications/FiscalNotificationDocumentLibrary";
import { FiscalNotificationPartyFactsReview } from "@/components/fiscal-notifications/FiscalNotificationPartyFactsReview";
import { FiscalNotificationReviewSteps } from "@/components/fiscal-notifications/FiscalNotificationReviewSteps";
import { FiscalNotificationVerticalSliceReview } from "@/components/fiscal-notifications/FiscalNotificationVerticalSliceReview";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useAppStore } from "@/context/AppStore";
import {
  analyzeFiscalNotificationLocallyWithEphemeralFacts,
  type FiscalNotificationLocalAnalysisResult,
  type FiscalNotificationLocalReviewReason,
  type FiscalNotificationLocalReviewResult,
} from "@/lib/fiscal-notifications/local-review-flow";
import type {
  AeatEnforcementMoneyFact,
  AeatEnforcementMoneyFactsResult,
} from "@/lib/fiscal-notifications/aeat-enforcement-money-facts";
import type { AeatDeferralGrantFactsResultV1 } from "@/lib/fiscal-notifications/aeat-deferral-grant-facts.v1";
import type {
  AeatOffsetAgreementFactsResultV1,
  AeatOffsetPrintedEffectMeaningV1,
} from "@/lib/fiscal-notifications/aeat-offset-agreement-facts.v1";
import {
  FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1,
  FiscalNotificationBatchFileErrorV1,
  fingerprintFiscalNotificationBatchFileV1,
  readPersistedFiscalNotificationHashesV1,
} from "@/lib/fiscal-notifications/batch-intake.v1";
import { assertFiscalNotificationBatchAnalysisIdentityV2 } from "@/lib/fiscal-notifications/batch-analysis-identity.v2";
import {
  projectExplicitFieldsReviewViewModelV2,
  type ExplicitFieldsReviewViewModelV2,
} from "@/lib/fiscal-notifications/explicit-fields-review-view-model.v2";
import {
  projectPartyFactsReviewViewModelV1,
  type PartyFactsReviewViewModelV1,
} from "@/lib/fiscal-notifications/party-facts-review-view-model.v1";
import {
  FiscalNotificationPdfError,
  type FiscalNotificationPdfErrorCode,
} from "@/lib/fiscal-notifications/pdf-text-layer-parser";
import { projectFiscalNotificationReviewGuidanceV1 } from "@/lib/fiscal-notifications/review-guidance.v1";
import { projectFiscalNotificationDocumentLibraryV1 } from "@/lib/fiscal-notifications/structured-review-document-library.v1";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "@/lib/fiscal-notifications/structured-review-save-command.v1";
import {
  buildFiscalNotificationSupportMailtoHrefV1,
  type FiscalNotificationSupportReportInputV1,
} from "@/lib/fiscal-notifications/support-report.v1";
import { sendFiscalNotificationSupportReportV1 } from "@/lib/fiscal-notifications/support-report-client.v1";
import type { FiscalNotificationVerticalSliceReviewV1 } from "@/lib/fiscal-notifications/vertical-slice-review.v1";

const FAMILY_LABELS = {
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: "Providencia de apremio",
  AEAT_DEFERRAL_GRANT_CANDIDATE: "Concesión de aplazamiento o fraccionamiento",
  AEAT_OFFSET_AGREEMENT_CANDIDATE: "Acuerdo de compensación",
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE:
    "Diligencia de embargo de bienes inmuebles",
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE:
    "Requerimiento formal de presentación",
  AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE: "Requerimiento de documentación",
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE: "Acuerdo de alta en el ROI",
} as const;

const FAMILY_INDICATION_LABELS = {
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: "Indicios de providencia de apremio",
  AEAT_DEFERRAL_GRANT_CANDIDATE:
    "Indicios de concesión de aplazamiento o fraccionamiento",
  AEAT_OFFSET_AGREEMENT_CANDIDATE: "Indicios de acuerdo de compensación",
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE:
    "Indicios de diligencia de embargo de bienes inmuebles",
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE:
    "Indicios de requerimiento formal de presentación",
  AEAT_DOCUMENTATION_REQUIREMENT_CANDIDATE:
    "Indicios de requerimiento de documentación",
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE:
    "Indicios de acuerdo de alta en el ROI",
} as const;

const DUPLICATE_HISTORY_INVALID_MESSAGE =
  "No se pudo cargar el historial de documentos. Recarga la página.";

function recognizedCandidateFrom(result: FiscalNotificationLocalReviewResult) {
  const candidate = result.candidates[0];
  return (result.engineVersion === "1.3.0" ||
    result.engineVersion === "1.4.0" ||
    result.engineVersion === "1.5.0") &&
    result.reason === "SUPPORTED_FAMILY_CANDIDATE" &&
    result.candidates.length === 1 &&
    candidate?.recognitionPolicyVersion === "1.3.0" &&
    candidate.signalStatus === "COMPLETE_REQUIRED_ANCHORS" &&
    candidate.missingRequiredAnchorIds.length === 0 &&
    candidate.conflictingAnchorIds.length === 0
    ? candidate
    : null;
}

const SIGNAL_LABELS = {
  COMPLETE_REQUIRED_ANCHORS: "Anclas estructurales completas",
  INCOMPLETE_REQUIRED_ANCHORS: "Faltan anclas estructurales",
  CONFLICTING_AUTHORITY_OR_TERRITORY: "Organismo o territorio incompatible",
  CONFLICTING_DOCUMENT_SIGNAL: "El archivo parece una guía u otro documento",
} as const;

const MONEY_FACT_LABELS: Readonly<
  Record<AeatEnforcementMoneyFact["kind"], string>
> = {
  OUTSTANDING_PRINCIPAL: "Principal pendiente",
  ORDINARY_ENFORCEMENT_SURCHARGE: "Recargo ordinario",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta",
  DOCUMENT_TOTAL: "Importe total",
};

const REASON_COPY: Readonly<
  Record<
    FiscalNotificationLocalReviewReason,
    { readonly title: string; readonly detail: string }
  >
> = {
  SUPPORTED_FAMILY_CANDIDATE: {
    title: "Documento reconocido",
    detail:
      "La familia documental coincide con una firma estructural cerrada. La autoridad, autenticidad, datos y efectos siguen pendientes de revisión.",
  },
  PARTIAL_SUPPORTED_FAMILY_SIGNAL: {
    title: "Coincidencia parcial",
    detail:
      "Hay indicios de una familia conocida, aunque faltan elementos para proponer una clasificación completa.",
  },
  AMBIGUOUS_SUPPORTED_FAMILIES: {
    title: "Clasificación ambigua",
    detail:
      "Aparecen señales de más de una familia. El sistema no elegirá una automáticamente.",
  },
  CONFLICTING_AUTHORITY_OR_TERRITORY: {
    title: "Organismo o territorio no compatible",
    detail:
      "El documento contiene señales incompatibles con las familias AEAT cubiertas por esta versión.",
  },
  CONFLICTING_DOCUMENT_SIGNAL: {
    title: "Puede no ser una notificación",
    detail:
      "El archivo parece una guía, manual u otro documento y necesita revisión humana.",
  },
  NO_SUPPORTED_FAMILY_SIGNAL: {
    title: "Documento todavía no reconocido",
    detail:
      "Se ha leído localmente, pero no coincide con las familias cubiertas. No se ha inventado una clasificación.",
  },
  NO_EXTRACTABLE_TEXT: {
    title: "No se ha podido leer el escaneo",
    detail:
      "El OCR local no ha recuperado texto suficiente. Prueba con un escaneo más nítido o revisa el documento manualmente.",
  },
  INCONSISTENT_PAGE_STATE: {
    title: "Estructura de páginas incoherente",
    detail:
      "El contenido no supera la validación interna y no se utilizará para clasificar.",
  },
  UNSUPPORTED_TEXT_CONTROLS: {
    title: "Texto no compatible",
    detail:
      "Se detectaron controles de texto no seguros y el análisis se ha detenido.",
  },
  NORMALIZED_TEXT_LIMIT_EXCEEDED: {
    title: "Texto normalizado demasiado grande",
    detail: "El documento supera los límites seguros del analizador local.",
  },
  TEXT_LINE_LIMIT_EXCEEDED: {
    title: "Demasiadas líneas de texto",
    detail: "El documento supera los límites seguros del analizador local.",
  },
  OCR_DISABLED: {
    title: "OCR pendiente",
    detail:
      "El PDF no contiene texto seleccionable. No se ha enviado a ningún proveedor y debes revisarlo manualmente.",
  },
};

const ERROR_COPY: Readonly<Record<FiscalNotificationPdfErrorCode, string>> = {
  UNSUPPORTED_FILE: "Selecciona un archivo PDF válido.",
  FILE_TOO_LARGE: "El PDF supera el límite de 4 MB.",
  INVALID_PDF: "No se ha podido abrir el PDF de forma segura.",
  TOO_MANY_PAGES: "El PDF supera el límite de 80 páginas.",
  TOO_MANY_TEXT_ITEMS: "El PDF contiene demasiados elementos de texto.",
  TEXT_ITEM_TOO_LARGE: "El PDF contiene un bloque de texto demasiado grande.",
  TEXT_TOO_LARGE: "El PDF contiene demasiado texto para este análisis local.",
  TIMEOUT: "El análisis local ha superado el tiempo máximo permitido.",
  ABORTED: "El análisis se ha cancelado.",
  WORKER_UNAVAILABLE:
    "El navegador no puede ejecutar el lector aislado de PDF.",
  INVALID_WORKER_RESPONSE:
    "El lector local devolvió una respuesta no válida y se ha bloqueado.",
  HASH_UNAVAILABLE: "El navegador no puede calcular la huella del documento.",
};

type FiscalNotificationBatchStatus =
  | "PREPARED"
  | "ANALYZING"
  | "READ"
  | "NEEDS_REVIEW"
  | "NOT_RECOGNIZED"
  | "ERROR";

interface FiscalNotificationBatchItem {
  readonly id: string;
  readonly documentId: string;
  readonly byteLength: number;
  readonly displayName: string;
  readonly mimeType: string;
  readonly sha256: string;
  readonly status: FiscalNotificationBatchStatus;
  readonly errorMessage: string | null;
  readonly saved: boolean;
}

interface PendingStructuredReview {
  readonly reviewId: string;
  readonly createdAt: string;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
}

interface FiscalNotificationBatchReview extends PendingStructuredReview {
  readonly persistenceState: ReviewPersistenceState;
  readonly saved: boolean;
}

interface FiscalNotificationBatchReviewSummary {
  readonly title: string;
  readonly pageCount: number;
  readonly primaryAmount: {
    readonly amountCents: number;
    readonly currency: "EUR" | "UNKNOWN";
  } | null;
}

interface FiscalNotificationBatchContext {
  readonly displayName: string;
  readonly position: number;
  readonly total: number;
}

type ReviewPersistenceState =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "no_structured_facts"
  | "invalid_structured_review"
  | "blocked"
  | "indeterminate";

export function FiscalNotificationIntakeView({
  selectedDocumentId,
}: {
  selectedDocumentId?: string;
} = {}) {
  const { authReady, user, emailConfirmed } = useCloudSync();
  const ownerScope =
    authReady && user && emailConfirmed ? `user:${user.id}` : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <PageHeader
        title={
          selectedDocumentId
            ? "Ficha de notificación"
            : "Notificaciones y expedientes"
        }
        subtitle={
          selectedDocumentId
            ? "Datos, importes, fechas y relaciones conservados en tu cuenta."
            : "Escanea, entiende y organiza tus documentos de Hacienda."
        }
      />

      {!authReady ? (
        <Card role="status" aria-live="polite">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            Comprobando la cuenta…
          </div>
        </Card>
      ) : !ownerScope ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <TriangleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
            />
            <div>
              <h2 className="font-bold text-amber-950">
                Cuenta confirmada necesaria
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                El documento solo puede analizarse dentro del ámbito de una
                cuenta identificada. No usamos el NIF ni el nombre del archivo
                para decidir a quién pertenece.
              </p>
              <ButtonLink href="/cuenta" className="mt-4">
                Ir a Cuenta
              </ButtonLink>
            </div>
          </div>
        </Card>
      ) : selectedDocumentId ? (
        <FiscalNotificationDocumentDetail
          key={ownerScope}
          ownerScope={ownerScope}
          documentId={selectedDocumentId}
        />
      ) : (
        <FiscalNotificationReviewWorkspace
          key={ownerScope}
          ownerScope={ownerScope}
        />
      )}
    </div>
  );
}

function FiscalNotificationReviewWorkspace({
  ownerScope,
}: {
  ownerScope: string;
}) {
  const {
    data,
    ready: appStoreReady,
    getCurrentData,
    saveFiscalNotificationStructuredReview,
    repairFiscalNotificationEmptyHistory,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef(new Map<string, File>());
  const reviewsRef = useRef(new Map<string, FiscalNotificationBatchReview>());
  const queueRef = useRef<readonly FiscalNotificationBatchItem[]>([]);
  const activeDocumentIdRef = useRef<string | null>(null);
  const admissionControllerRef = useRef<AbortController | null>(null);
  const admittingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const saveOperationRef = useRef<symbol | null>(null);
  const repairingDuplicateHistoryRef = useRef(false);
  const emptyHistoryAutoRepairAttemptedRef = useRef(false);
  const blockedDuplicateFilesRef = useRef<readonly File[]>([]);
  const dragDepthRef = useRef(0);
  const [queue, setQueue] = useState<readonly FiscalNotificationBatchItem[]>(
    [],
  );
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [admitting, setAdmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] =
    useState<FiscalNotificationLocalReviewResult | null>(null);
  const [verticalSliceReview, setVerticalSliceReview] =
    useState<FiscalNotificationVerticalSliceReviewV1 | null>(null);
  const [textAcquisition, setTextAcquisition] = useState<
    FiscalNotificationLocalAnalysisResult["textAcquisition"] | null
  >(null);
  const [ephemeralMoneyFacts, setEphemeralMoneyFacts] =
    useState<AeatEnforcementMoneyFactsResult | null>(null);
  const [ephemeralDeferralFacts, setEphemeralDeferralFacts] =
    useState<AeatDeferralGrantFactsResultV1 | null>(null);
  const [ephemeralOffsetFacts, setEphemeralOffsetFacts] =
    useState<AeatOffsetAgreementFactsResultV1 | null>(null);
  const [explicitFieldsReview, setExplicitFieldsReview] =
    useState<ExplicitFieldsReviewViewModelV2 | null>(null);
  const [partyFactsReview, setPartyFactsReview] =
    useState<PartyFactsReviewViewModelV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaveFailure, setLastSaveFailure] = useState<{
    safeCode: ReturnType<
      typeof runSaveFiscalNotificationStructuredReviewCommandV1
    >["safeCode"];
    reason?: string;
  } | null>(null);
  const [pendingReview, setPendingReview] =
    useState<PendingStructuredReview | null>(null);
  const [persistenceState, setPersistenceState] =
    useState<ReviewPersistenceState>("idle");
  const [scannerOpen, setScannerOpen] = useState(true);
  const [recentlySavedDocumentId, setRecentlySavedDocumentId] = useState<
    string | null
  >(null);
  const documentLibrary = useMemo(
    () =>
      projectFiscalNotificationDocumentLibraryV1(
        data.fiscalNotificationsWorkspace,
        ownerScope,
      ),
    [data.fiscalNotificationsWorkspace, ownerScope],
  );
  const fiscalNotificationsWorkspaceWasQuarantined = useMemo(
    () =>
      data.workspaceIntegrityQuarantine?.some(
        (entry) => entry.collection === "fiscalNotificationsWorkspace",
      ) === true,
    [data.workspaceIntegrityQuarantine],
  );
  const hasPendingFiscalWorkspaceSync =
    data.meta?.pendingChanges?.some(
      (change) => change.entityType === "fiscal_notifications_workspace",
    ) === true;
  const shouldInitializeEmptyHistory =
    data.fiscalNotificationsWorkspace === undefined &&
    fiscalNotificationsWorkspaceWasQuarantined &&
    !hasPendingFiscalWorkspaceSync;

  const repairEmptyDuplicateHistoryAutomatically = useCallback(() => {
    if (
      !shouldInitializeEmptyHistory ||
      repairingDuplicateHistoryRef.current ||
      emptyHistoryAutoRepairAttemptedRef.current
    ) {
      return null;
    }
    emptyHistoryAutoRepairAttemptedRef.current = true;
    repairingDuplicateHistoryRef.current = true;
    const execution = (() => {
      try {
        return repairFiscalNotificationEmptyHistory({
          expected: getCurrentData(),
          ownerScope,
          confirmedAt: new Date().toISOString(),
        });
      } finally {
        repairingDuplicateHistoryRef.current = false;
      }
    })();
    if (execution.status !== "applied") {
      setError(DUPLICATE_HISTORY_INVALID_MESSAGE);
    }
    return execution;
  }, [
    getCurrentData,
    ownerScope,
    repairFiscalNotificationEmptyHistory,
    shouldInitializeEmptyHistory,
  ]);

  useEffect(() => {
    if (!appStoreReady || !shouldInitializeEmptyHistory) return;
    const execution = repairEmptyDuplicateHistoryAutomatically();
    if (execution?.status === "applied") setError(null);
  }, [
    appStoreReady,
    repairEmptyDuplicateHistoryAutomatically,
    shouldInitializeEmptyHistory,
  ]);

  useEffect(() => {
    const fileInput = fileInputRef.current;
    const files = filesRef.current;
    const reviews = reviewsRef.current;

    return () => {
      saveOperationRef.current = null;
      admittingRef.current = false;
      processingRef.current = false;
      admissionControllerRef.current?.abort();
      admissionControllerRef.current = null;
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
      files.clear();
      reviews.clear();
      queueRef.current = [];
      activeDocumentIdRef.current = null;
      blockedDuplicateFilesRef.current = [];
      if (fileInput) fileInput.value = "";
    };
  }, [ownerScope]);

  if (!appStoreReady) {
    return (
      <Card role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          Cargando los datos de tu cuenta…
        </div>
      </Card>
    );
  }

  function clearReviewDisplay(): void {
    setSaveError(null);
    setResult(null);
    setVerticalSliceReview(null);
    setTextAcquisition(null);
    setEphemeralMoneyFacts(null);
    setEphemeralDeferralFacts(null);
    setEphemeralOffsetFacts(null);
    setExplicitFieldsReview(null);
    setPartyFactsReview(null);
    setPendingReview(null);
    setPersistenceState("idle");
  }

  function replaceQueue(next: readonly FiscalNotificationBatchItem[]): void {
    queueRef.current = next;
    setQueue(next);
  }

  function updateQueueItem(
    id: string,
    patch: Partial<FiscalNotificationBatchItem>,
  ): void {
    replaceQueue(
      queueRef.current.map((item) =>
        item.id === id ? Object.freeze({ ...item, ...patch }) : item,
      ),
    );
  }

  function showReview(documentId: string): void {
    const item = queueRef.current.find(
      (candidate) => candidate.documentId === documentId,
    );
    if (!item) return;
    const review = reviewsRef.current.get(item.id);
    if (!review) return;
    setSaveError(null);
    activeDocumentIdRef.current = documentId;
    setActiveDocumentId(documentId);
    const nextAnalysis = review.analysis;
    setResult(nextAnalysis.technicalReview);
    setVerticalSliceReview(nextAnalysis.ephemeralVerticalSliceReview ?? null);
    setTextAcquisition(nextAnalysis.textAcquisition ?? null);
    setEphemeralMoneyFacts(nextAnalysis.ephemeralEnforcementMoneyFacts);
    setEphemeralDeferralFacts(nextAnalysis.ephemeralDeferralGrantFacts);
    setEphemeralOffsetFacts(nextAnalysis.ephemeralOffsetAgreementFacts);
    setExplicitFieldsReview(
      nextAnalysis.ephemeralEnforcementExplicitFields === null
        ? null
        : projectExplicitFieldsReviewViewModelV2(
            nextAnalysis.ephemeralEnforcementExplicitFields,
          ),
    );
    setPartyFactsReview(
      nextAnalysis.ephemeralEnforcementPartyFacts === null
        ? null
        : projectPartyFactsReviewViewModelV1(
            nextAnalysis.ephemeralEnforcementPartyFacts,
          ),
    );
    setPendingReview(review.saved ? null : review);
    setPersistenceState(review.persistenceState);
  }

  async function addFiles(
    files: readonly File[],
    persistedData: {
      readonly fiscalNotificationsWorkspace?: unknown;
      readonly workspaceIntegrityQuarantine?: readonly {
        readonly collection: string;
      }[];
    } = data,
  ): Promise<void> {
    if (
      files.length === 0 ||
      admittingRef.current ||
      processingRef.current ||
      saveOperationRef.current
    ) {
      return;
    }
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID !== "function") {
      setError("Este navegador no puede crear una cola local segura.");
      return;
    }
    const persistedWorkspaceWasQuarantined =
      persistedData.workspaceIntegrityQuarantine?.some(
        (entry) => entry.collection === "fiscalNotificationsWorkspace",
      ) === true;
    const persisted = readPersistedFiscalNotificationHashesV1(
      persistedData.fiscalNotificationsWorkspace,
      ownerScope,
      {
        allowAbsentWorkspace: !persistedWorkspaceWasQuarantined,
      },
    );
    if (persisted.status === "BLOCKED") {
      if (
        persistedData.fiscalNotificationsWorkspace === undefined &&
        persistedWorkspaceWasQuarantined
      ) {
        blockedDuplicateFilesRef.current = [...files];
        const execution = repairEmptyDuplicateHistoryAutomatically();
        if (execution?.status === "applied") {
          blockedDuplicateFilesRef.current = [];
          setError(null);
          await addFiles(files, execution.data);
          return;
        }
      }
      blockedDuplicateFilesRef.current = [...files];
      setError(DUPLICATE_HISTORY_INVALID_MESSAGE);
      return;
    }
    blockedDuplicateFilesRef.current = [];

    admissionControllerRef.current?.abort();
    const controller = new AbortController();
    admissionControllerRef.current = controller;
    admittingRef.current = true;
    setAdmitting(true);
    setError(null);
    const duplicateHashes = new Set(
      queueRef.current.map((item) => item.sha256),
    );
    const capacityHashes = new Set(queueRef.current.map((item) => item.sha256));
    const persistedHashes = new Set(persisted.sha256);
    const accepted: FiscalNotificationBatchItem[] = [];
    const rejected: string[] = [];
    try {
      for (const file of files) {
        if (capacityHashes.size >= FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1) {
          rejected.push(
            `${safeLocalFileLabel(file.name)}: el lote ya contiene ${FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1} documentos`,
          );
          continue;
        }
        try {
          const fingerprint = await fingerprintFiscalNotificationBatchFileV1(
            file,
            controller.signal,
          );
          if (duplicateHashes.has(fingerprint.sha256)) {
            rejected.push(
              `${fingerprint.displayName}: duplicado dentro del lote`,
            );
            continue;
          }
          if (persistedHashes.has(fingerprint.sha256)) {
            rejected.push(
              `${fingerprint.displayName}: este documento ya está guardado en Factu`,
            );
            continue;
          }
          const uuid = randomUUID.call(globalThis.crypto);
          const id = `notification-file:${uuid}`;
          const documentId = `notification-document:${uuid}`;
          duplicateHashes.add(fingerprint.sha256);
          capacityHashes.add(fingerprint.sha256);
          filesRef.current.set(id, file);
          accepted.push(
            Object.freeze({
              id,
              documentId,
              byteLength: fingerprint.byteLength,
              displayName: fingerprint.displayName,
              mimeType: fingerprint.mimeType,
              sha256: fingerprint.sha256,
              status: "PREPARED" as const,
              errorMessage: null,
              saved: false,
            }),
          );
        } catch (caught) {
          if (controller.signal.aborted) return;
          rejected.push(
            `${safeLocalFileLabel(file.name)}: ${safeBatchFileError(caught)}`,
          );
        }
      }
      if (controller.signal.aborted) return;
      if (accepted.length > 0) {
        replaceQueue([...queueRef.current, ...accepted]);
      }
      if (rejected.length > 0) setError(rejected.join(" · "));
    } finally {
      if (admissionControllerRef.current === controller) {
        admissionControllerRef.current = null;
        admittingRef.current = false;
        setAdmitting(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeItem(id: string): void {
    if (processingRef.current || saveOperationRef.current) return;
    const removed = queueRef.current.find((item) => item.id === id);
    filesRef.current.delete(id);
    reviewsRef.current.delete(id);
    replaceQueue(queueRef.current.filter((item) => item.id !== id));
    if (removed && activeDocumentIdRef.current === removed.documentId) {
      activeDocumentIdRef.current = null;
      setActiveDocumentId(null);
      clearReviewDisplay();
    }
  }

  function clearQueue(): void {
    if (processingRef.current || saveOperationRef.current) return;
    filesRef.current.clear();
    reviewsRef.current.clear();
    replaceQueue([]);
    activeDocumentIdRef.current = null;
    setActiveDocumentId(null);
    clearReviewDisplay();
    setError(null);
  }

  function cancelAnalysis(): void {
    controllerRef.current?.abort();
    setError(
      "Análisis cancelado. Los documentos pendientes siguen en la cola.",
    );
  }

  async function analyzeQueue(requestedIds?: readonly string[]): Promise<void> {
    if (
      processingRef.current ||
      saveOperationRef.current ||
      admittingRef.current
    ) {
      return;
    }
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID !== "function") {
      setError("Este navegador no puede crear una sesión local segura.");
      return;
    }
    const ids =
      requestedIds ??
      queueRef.current
        .filter(
          (item) =>
            (item.status === "PREPARED" || item.status === "ERROR") &&
            filesRef.current.has(item.id),
        )
        .map((item) => item.id);
    if (ids.length === 0) {
      setError("Añade al menos un PDF pendiente para analizar.");
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    processingRef.current = true;
    setProcessing(true);
    setError(null);
    try {
      for (const id of ids) {
        const item = queueRef.current.find((candidate) => candidate.id === id);
        const file = filesRef.current.get(id);
        if (!file || !item) continue;
        const reviewUuid = randomUUID.call(globalThis.crypto);
        updateQueueItem(id, { status: "ANALYZING", errorMessage: null });
        try {
          const nextAnalysis =
            await analyzeFiscalNotificationLocallyWithEphemeralFacts({
              ownerScope,
              fileId: item.id,
              documentId: item.documentId,
              file,
              signal: controller.signal,
            });
          assertFiscalNotificationBatchAnalysisIdentityV2(
            {
              fileId: item.id,
              documentId: item.documentId,
              sourceSha256: item.sha256,
            },
            nextAnalysis.sourceIdentity,
          );
          if (
            controller.signal.aborted ||
            controllerRef.current !== controller
          ) {
            updateQueueItem(id, { status: "PREPARED" });
            break;
          }
          const review = Object.freeze({
            reviewId: `review:${reviewUuid}`,
            createdAt: new Date().toISOString(),
            analysis: nextAnalysis,
            persistenceState: "pending" as const,
            saved: false,
          });
          reviewsRef.current.set(id, review);
          updateQueueItem(id, {
            status: batchStatusForAnalysis(nextAnalysis),
            errorMessage: null,
          });
          if (activeDocumentIdRef.current === null) {
            showReview(item.documentId);
          }
        } catch (caught) {
          if (
            controller.signal.aborted ||
            controllerRef.current !== controller
          ) {
            updateQueueItem(id, { status: "PREPARED", errorMessage: null });
            break;
          }
          updateQueueItem(id, {
            status: "ERROR",
            errorMessage: safeAnalysisError(caught),
          });
        }
      }
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        processingRef.current = false;
        setProcessing(false);
      }
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    if (admitting || processing || saveOperationRef.current) return;
    dragDepthRef.current += 1;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    event.dataTransfer.dropEffect = processing ? "none" : "copy";
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    if (admitting || processing || saveOperationRef.current) return;
    void addFiles(Array.from(event.dataTransfer.files));
  }

  function saveStructuredReview(): void {
    if (!pendingReview || saveOperationRef.current) return;
    const activeId = queueRef.current.find(
      (item) => item.documentId === activeDocumentIdRef.current,
    )?.id;
    if (!activeId) return;
    if (!filesRef.current.has(activeId)) return;

    const operation = Symbol("structured-review-save");
    saveOperationRef.current = operation;
    setError(null);
    setSaveError(null);
    setLastSaveFailure(null);
    updateStoredReview(activeId, "saving", false);
    setPersistenceState("saving");
    try {
      const currentData = getCurrentData();
      const accountWrite = saveFiscalNotificationStructuredReview({
        expected: currentData,
        ownerScope,
        reviewId: pendingReview.reviewId,
        createdAt: pendingReview.createdAt,
        confirmedAt: new Date().toISOString(),
        analysis: pendingReview.analysis,
      });
      if (saveOperationRef.current !== operation) return;
      if (
        accountWrite.status !== "applied" &&
        accountWrite.status !== "applied_with_warnings"
      ) {
        applyStructuredSaveFailure(activeId, accountWrite);
        return;
      }

      const savedDocumentId =
        "documentIds" in accountWrite.value
          ? (accountWrite.value.documentIds[0] ?? null)
          : accountWrite.value.documentId;

      filesRef.current.delete(activeId);
      advanceAfterSuccessfulSave(activeId, savedDocumentId);
    } finally {
      if (saveOperationRef.current === operation) {
        saveOperationRef.current = null;
      }
    }
  }

  function applyStructuredSaveFailure(
    activeId: string,
    write: ReturnType<
      typeof runSaveFiscalNotificationStructuredReviewCommandV1
    >,
  ): void {
    if (
      write.status === "applied" ||
      write.status === "applied_with_warnings"
    ) {
      return;
    }
    setLastSaveFailure({
      safeCode: write.safeCode,
      ...(write.status === "blocked" && "reason" in write && write.reason
        ? { reason: write.reason }
        : {}),
    });
    if (write.safeCode === "CORE_INVALID_INPUT") {
      updateStoredReview(activeId, "no_structured_facts", false);
      setPersistenceState("no_structured_facts");
    } else if (write.safeCode === "CORE_WORKSPACE_INTEGRITY_FAILED") {
      updateStoredReview(activeId, "invalid_structured_review", false);
      setPersistenceState("invalid_structured_review");
    } else if (
      write.safeCode === "DURABILITY_CONFLICT" &&
      "reason" in write &&
      write.reason === "storage_state_unknown"
    ) {
      updateStoredReview(activeId, "indeterminate", false);
      setPersistenceState("indeterminate");
    } else {
      updateStoredReview(activeId, "blocked", false);
      setPersistenceState("blocked");
    }
    setSaveError(structuredSaveFailureMessage(write));
  }

  function advanceAfterSuccessfulSave(
    savedItemId: string,
    savedDocumentId: string | null,
  ): void {
    const currentQueue = queueRef.current;
    const savedIndex = currentQueue.findIndex(
      (item) => item.id === savedItemId,
    );
    reviewsRef.current.delete(savedItemId);
    const remainingQueue = currentQueue.filter(
      (item) => item.id !== savedItemId,
    );
    replaceQueue(remainingQueue);

    const nextStartIndex =
      savedIndex < 0 ? 0 : Math.min(savedIndex, remainingQueue.length);
    const orderedCandidates = [
      ...remainingQueue.slice(nextStartIndex),
      ...remainingQueue.slice(0, nextStartIndex),
    ];
    const nextReview = orderedCandidates.find((item) =>
      reviewsRef.current.has(item.id),
    );

    if (nextReview) {
      setRecentlySavedDocumentId(null);
      showReview(nextReview.documentId);
      return;
    }

    activeDocumentIdRef.current = null;
    setActiveDocumentId(null);
    clearReviewDisplay();
    setRecentlySavedDocumentId(savedDocumentId);
    setScannerOpen(false);
  }

  function updateStoredReview(
    id: string,
    nextState: ReviewPersistenceState,
    saved: boolean,
  ): void {
    const current = reviewsRef.current.get(id);
    if (!current) return;
    reviewsRef.current.set(
      id,
      Object.freeze({
        ...current,
        persistenceState: nextState,
        saved,
      }),
    );
  }

  function buildAnalysisSupportReport(
    item: FiscalNotificationBatchItem,
  ): FiscalNotificationSupportReportInputV1 {
    return {
      stage: "LOCAL_ANALYSIS",
      status: item.status,
      message: item.errorMessage ?? "Documento no leído por el lector local.",
      route: "/consultor-fiscal/notificaciones",
      fileByteLength: item.byteLength,
      mimeType: item.mimeType,
    };
  }

  const saving = persistenceState === "saving";
  const batchCapacityCount = new Set(queue.map((item) => item.sha256)).size;
  const busy = admitting || processing || saving;
  const pendingCount = queue.filter(
    (item) =>
      (item.status === "PREPARED" || item.status === "ERROR") &&
      filesRef.current.has(item.id),
  ).length;
  const showBatchControls = pendingCount > 0 || processing;
  const batchReviewSummaries = new Map(
    queue.flatMap((item) => {
      const review = reviewsRef.current.get(item.id);
      return review
        ? ([[item.id, projectBatchReviewSummary(review.analysis)]] as const)
        : [];
    }),
  );
  const reviewedCount = batchReviewSummaries.size;
  const activeBatchPosition = activeDocumentId
    ? queue.findIndex((item) => item.documentId === activeDocumentId) + 1
    : 0;
  const activeBatchItem =
    activeBatchPosition > 0 ? (queue[activeBatchPosition - 1] ?? null) : null;
  const activeBatchContext: FiscalNotificationBatchContext | null =
    activeBatchItem
      ? {
          displayName: activeBatchItem.displayName,
          position: activeBatchPosition,
          total: queue.length,
        }
      : null;
  const hasAnotherReview = queue.some(
    (item) =>
      item.documentId !== activeDocumentId && reviewsRef.current.has(item.id),
  );
  const reviewGuidance = result
    ? projectFiscalNotificationReviewGuidanceV1({
        technicalReview: result,
        ephemeralEnforcementMoneyFacts: ephemeralMoneyFacts,
      })
    : null;
  const saveSupportReport: FiscalNotificationSupportReportInputV1 | null =
    saveError
      ? {
          stage: "STRUCTURED_SAVE",
          status: lastSaveFailure
            ? `${lastSaveFailure.safeCode}:${lastSaveFailure.reason ?? "unspecified"}`
            : persistenceState,
          message: saveError,
          route: "/consultor-fiscal/notificaciones",
          fileByteLength: activeBatchItem?.byteLength,
          mimeType: activeBatchItem?.mimeType,
          pageCount: result?.pageCount,
          persistenceState,
        }
      : null;

  return (
    <>
      {scannerOpen ? (
        <Card>
          <div className="flex items-start gap-3">
            <FileUp
              aria-hidden="true"
              className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Escanear notificaciones y documentos oficiales
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Prepara un lote de hasta{" "}
                {FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1} PDF, revísalo y pulsa
                una sola vez Analizar. Cada PDF puede tener hasta 4 MB y 80
                páginas.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            id="fiscal-notification-file"
            name="fiscal-notification-file"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            disabled={
              busy ||
              batchCapacityCount >= FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1
            }
            onChange={(event) => {
              void addFiles(Array.from(event.currentTarget.files ?? []));
            }}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />

          <div
            role="group"
            aria-label="Archivos de notificaciones"
            data-drop-zone="FISCAL_NOTIFICATION_FILES"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-5 rounded-2xl border-2 border-dashed p-6 text-center transition ${
              dragging
                ? "border-blue-600 bg-blue-50 ring-4 ring-blue-100"
                : "border-sky-200 bg-sky-50/60"
            }`}
          >
            {admitting ? (
              <Loader2
                aria-hidden="true"
                className="mx-auto h-7 w-7 animate-spin text-blue-600"
              />
            ) : (
              <Upload
                aria-hidden="true"
                className="mx-auto h-7 w-7 text-blue-600"
              />
            )}
            <p className="mt-2 font-bold text-slate-950" aria-live="polite">
              {admitting
                ? "Comprobando formato y duplicados…"
                : dragging
                  ? "Suelta aquí los PDF"
                  : "Arrastra aquí tus notificaciones y documentos oficiales"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              PDF · hasta {FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1} documentos ·
              no se analizan hasta que tú pulses el botón
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              Primero prepara la cola. No analizaremos nada hasta que pulses
              Analizar.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              disabled={
                busy ||
                batchCapacityCount >= FISCAL_NOTIFICATION_BATCH_MAX_FILES_V1
              }
              aria-describedby="fiscal-notification-file-help"
              onClick={() => fileInputRef.current?.click()}
            >
              <Files aria-hidden="true" className="h-5 w-5" />
              Elegir varios PDF
            </Button>
          </div>

          <p
            id="fiscal-notification-file-help"
            className="mt-3 text-sm leading-6 text-slate-500"
          >
            El análisis es local y la ficha se guarda en Factu. El PDF original
            no se conserva. Los documentos duplicados se detectan
            automáticamente.
          </p>

          {queue.length > 0 ? (
            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-950">
                    {reviewedCount > 0
                      ? `Documentos escaneados · ${reviewedCount}/${queue.length} leídos`
                      : `Archivos en la cola · ${queue.length}`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {reviewedCount > 0
                      ? "Revisa y guarda cada documento. Al guardar se abrirá automáticamente el siguiente."
                      : "Puedes añadir más o quitar alguno antes de analizar."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={clearQueue}
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Quitar todos
                </Button>
              </div>
              <ul className="mt-4 space-y-2">
                {queue.map((item) => {
                  const presentation = batchStatusPresentation(item.status);
                  const hasReview = reviewsRef.current.has(item.id);
                  const summary = batchReviewSummaries.get(item.id) ?? null;
                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border p-3 ${
                        activeDocumentId === item.documentId
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText
                          aria-hidden="true"
                          className="mt-1 h-5 w-5 shrink-0 text-slate-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              {summary ? (
                                <>
                                  <p className="font-bold text-slate-950">
                                    {summary.title}
                                  </p>
                                  <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                                    {item.displayName}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    PDF · {summary.pageCount} página
                                    {summary.pageCount === 1 ? "" : "s"} ·{" "}
                                    {formatBytes(item.byteLength)}
                                    {summary.primaryAmount
                                      ? ` · ${formatStructuredMoney(
                                          summary.primaryAmount.amountCents,
                                          summary.primaryAmount.currency,
                                        )}`
                                      : ""}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="truncate font-bold text-slate-950">
                                    {item.displayName}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    PDF · {formatBytes(item.byteLength)}
                                  </p>
                                </>
                              )}
                            </div>
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${presentation.className}`}
                            >
                              {item.status === "ANALYZING" ? (
                                <Loader2
                                  aria-hidden="true"
                                  className="mr-1 h-3.5 w-3.5 animate-spin"
                                />
                              ) : null}
                              {presentation.label}
                              {item.saved ? " · ficha guardada" : ""}
                            </span>
                          </div>
                          {item.errorMessage ? (
                            <p className="mt-2 text-sm text-red-700">
                              {item.errorMessage}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {hasReview ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => showReview(item.documentId)}
                              >
                                <FileSearch
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                                {activeDocumentId === item.documentId
                                  ? "Revisión abierta"
                                  : "Revisar"}
                              </Button>
                            ) : null}
                            {item.status === "ERROR" &&
                            filesRef.current.has(item.id) ? (
                              <Button
                                type="button"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void analyzeQueue([item.id])}
                              >
                                <RotateCcw
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                />
                                Reintentar
                              </Button>
                            ) : null}
                            {item.status === "ERROR" && item.errorMessage ? (
                              <SupportCaseButton
                                report={buildAnalysisSupportReport(item)}
                              />
                            ) : null}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => removeItem(item.id)}
                              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <X aria-hidden="true" className="h-4 w-4" />
                              Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <p className="min-w-0 flex-1">{error}</p>
            </div>
          ) : null}

          {showBatchControls ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={pendingCount === 0 || busy}
                onClick={() => void analyzeQueue()}
              >
                {processing ? (
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin"
                  />
                ) : (
                  <ScanLine aria-hidden="true" className="h-5 w-5" />
                )}
                {processing
                  ? "Analizando el lote localmente…"
                  : `Analizar ${pendingCount} documento${pendingCount === 1 ? "" : "s"}`}
              </Button>
              {processing ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelAnalysis}
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                  Cancelar
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="mb-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setScannerOpen(true)}
          >
            <ScanLine aria-hidden="true" className="h-5 w-5" />
            Escanear más documentos
          </Button>
        </div>
      )}

      {scannerOpen && result ? (
        <ReviewResult
          result={result}
          ephemeralMoneyFacts={ephemeralMoneyFacts}
          ephemeralDeferralFacts={ephemeralDeferralFacts}
          ephemeralOffsetFacts={ephemeralOffsetFacts}
          explicitFieldsReview={explicitFieldsReview}
          partyFactsReview={partyFactsReview}
          textAcquisition={textAcquisition}
          verticalSliceReview={verticalSliceReview}
          batchContext={activeBatchContext}
        />
      ) : null}
      {scannerOpen && reviewGuidance ? (
        <div className="mt-4">
          <FiscalNotificationReviewSteps
            guidance={reviewGuidance}
            documentTypeRecognized={
              result
                ? recognizedCandidateFrom(result) !== null ||
                  verticalSliceReview?.status === "REVIEW_REQUIRED"
                : false
            }
          />
        </div>
      ) : null}
      {scannerOpen && result ? (
        <ReviewPersistencePanel
          state={persistenceState}
          canSave={pendingReview !== null}
          hasNextReview={hasAnotherReview}
          errorMessage={saveError}
          supportReport={saveSupportReport}
          onSave={saveStructuredReview}
        />
      ) : null}
      <div id="documentos-guardados" className="scroll-mt-6">
        <FiscalNotificationDocumentLibrary
          viewModel={documentLibrary}
          ownerScope={ownerScope}
          focusDocumentId={recentlySavedDocumentId}
        />
      </div>
    </>
  );
}

function ReviewPersistencePanel({
  state,
  canSave,
  hasNextReview,
  errorMessage,
  supportReport,
  onSave,
}: {
  state: ReviewPersistenceState;
  canSave: boolean;
  hasNextReview: boolean;
  errorMessage: string | null;
  supportReport: FiscalNotificationSupportReportInputV1 | null;
  onSave: () => void;
}) {
  const copy: Readonly<Record<ReviewPersistenceState, string>> = {
    idle: "Los datos estructurados todavía no se han guardado.",
    pending: "Revisa los datos y guarda este documento cuando estén correctos.",
    saving: "Guardando el documento en Factu…",
    saved:
      "Ficha guardada en los datos de tu cuenta. Ya puedes volver a consultar sus importes, referencias permitidas, fechas, estados y relaciones estructurados.",
    no_structured_facts:
      "Este análisis no contiene todavía campos exactos compatibles con la ficha estructurada. No se ha guardado una tarjeta vacía.",
    invalid_structured_review:
      "Los datos no superan la validación de integridad y no se han guardado. El resultado visible sigue disponible para revisarlo.",
    blocked:
      "No se ha podido completar la escritura en Factu. Ninguna ficha existente se ha sustituido.",
    indeterminate:
      "No se puede confirmar el estado de la escritura. Comprueba el historial antes de volver a intentarlo.",
  };
  const successful = state === "saved";

  return (
    <Card
      className={`mt-4 ${
        successful
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-950">Guardar documento</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {copy[state]}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Se guardará la ficha estructurada en Factu. El PDF original no se
            conserva.
          </p>
        </div>
        {canSave ? (
          <Button
            type="button"
            variant={state === "indeterminate" ? "secondary" : "primary"}
            disabled={state === "saving"}
            onClick={() => void onSave()}
          >
            {state === "saving" ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            )}
            {state === "indeterminate"
              ? "Comprobar ficha y reintentar"
              : state === "saving"
                ? "Guardando ficha…"
                : hasNextReview
                  ? "Guardar y revisar siguiente"
                  : "Guardar documento"}
          </Button>
        ) : null}
      </div>
      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800">
          <p role="alert">{errorMessage}</p>
          {supportReport ? (
            <div className="mt-3">
              <SupportCaseButton report={supportReport} tone="error" />
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function SupportCaseButton({
  report,
  tone = "default",
}: {
  report: FiscalNotificationSupportReportInputV1;
  tone?: "default" | "error";
}) {
  const [state, setState] = useState<
    | { status: "idle" | "sending" }
    | { status: "sent"; caseId: string }
    | { status: "failed"; error: string }
  >({ status: "idle" });

  async function submit(): Promise<void> {
    if (state.status === "sending" || state.status === "sent") return;
    setState({ status: "sending" });
    const result = await sendFiscalNotificationSupportReportV1(report);
    setState(
      result.ok
        ? { status: "sent", caseId: result.caseId }
        : { status: "failed", error: result.error },
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={state.status === "sending" || state.status === "sent"}
        onClick={() => void submit()}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70 ${
          tone === "error"
            ? "border-red-200 text-red-800 hover:bg-red-100"
            : "border-blue-200 text-blue-700 hover:bg-blue-50"
        }`}
      >
        {state.status === "sending" ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Mail aria-hidden="true" className="h-4 w-4" />
        )}
        {state.status === "sending"
          ? "Enviando…"
          : state.status === "sent"
            ? "Caso enviado"
            : "Enviar caso a soporte"}
      </button>
      {state.status === "sent" ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Recibido por soporte · {state.caseId}
        </p>
      ) : state.status === "failed" ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold">
          <p role="alert" className="text-red-700">
            {state.error}
          </p>
          <a
            href={buildFiscalNotificationSupportMailtoHrefV1(report)}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-red-800 hover:bg-red-100"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            Abrir correo saneado
          </a>
        </div>
      ) : null}
    </div>
  );
}

function structuredSaveFailureMessage(
  write: ReturnType<typeof runSaveFiscalNotificationStructuredReviewCommandV1>,
): string {
  if (write.status === "applied" || write.status === "applied_with_warnings") {
    return "";
  }
  if (write.safeCode === "CORE_INVALID_INPUT") {
    return "No se ha podido preparar esta ficha para guardarla. El documento sigue abierto para que puedas reintentar.";
  }
  if (write.safeCode === "CORE_WORKSPACE_INTEGRITY_FAILED") {
    return "No se ha guardado porque el expediente de esta cuenta necesita revisión. El documento sigue abierto.";
  }
  if (
    write.safeCode === "DURABILITY_CONFLICT" &&
    "reason" in write &&
    write.reason === "storage_state_unknown"
  ) {
    return "No se puede confirmar si la ficha se guardó. Comprueba el listado antes de reintentar.";
  }
  if (write.safeCode === "DURABILITY_CONFLICT" && "reason" in write) {
    if (write.reason === "quota_exceeded") {
      return "El almacenamiento local del navegador está lleno. La ficha sigue abierta y no se ha sustituido ningún dato.";
    }
    if (write.reason === "storage_unavailable") {
      return "El navegador no permite guardar datos locales ahora. La ficha sigue abierta para que puedas reintentar.";
    }
    if (
      write.reason === "serialization_failed" ||
      write.reason === "fiscal_workspace_projection_failed" ||
      write.reason === "fiscal_pending_change_projection_failed" ||
      write.reason === "fiscal_projection_failed" ||
      write.reason === "fiscal_serialization_failed"
    ) {
      return "No se ha podido preparar el expediente para guardarlo. La ficha sigue abierta y no se ha sustituido ningún dato.";
    }
    if (write.reason === "protected_existing_data") {
      return "El guardado se ha detenido para proteger los datos existentes. La ficha sigue abierta.";
    }
    if (
      write.reason === "write_failed" ||
      write.reason === "verification_failed"
    ) {
      return "El navegador no ha confirmado la escritura local. La ficha sigue abierta y no se ha sustituido ningún dato.";
    }
  }
  if (write.stage === "COMMIT") {
    return "No se ha podido confirmar el guardado. El documento sigue abierto y no se ha sustituido ningún dato.";
  }
  return "No se ha podido guardar la ficha. El documento sigue abierto y no se ha sustituido ningún dato.";
}

function ReviewResult({
  result,
  ephemeralMoneyFacts,
  ephemeralDeferralFacts,
  ephemeralOffsetFacts,
  explicitFieldsReview,
  partyFactsReview,
  textAcquisition,
  verticalSliceReview,
  batchContext,
}: {
  result: FiscalNotificationLocalReviewResult;
  ephemeralMoneyFacts: AeatEnforcementMoneyFactsResult | null;
  ephemeralDeferralFacts: AeatDeferralGrantFactsResultV1 | null;
  ephemeralOffsetFacts: AeatOffsetAgreementFactsResultV1 | null;
  explicitFieldsReview: ExplicitFieldsReviewViewModelV2 | null;
  partyFactsReview: PartyFactsReviewViewModelV1 | null;
  textAcquisition:
    FiscalNotificationLocalAnalysisResult["textAcquisition"] | null;
  verticalSliceReview: FiscalNotificationVerticalSliceReviewV1 | null;
  batchContext: FiscalNotificationBatchContext | null;
}) {
  const recognizedCandidate = recognizedCandidateFrom(result);
  const verticallyRecognized =
    verticalSliceReview?.status === "REVIEW_REQUIRED" &&
    verticalSliceReview.documents.length > 0;
  const primaryVerticalDocument = verticallyRecognized
    ? verticalSliceReview.documents[0]!
    : null;
  const copy = primaryVerticalDocument
    ? {
        title:
          verticalSliceReview!.documents.length === 1
            ? primaryVerticalDocument.title
            : `${verticalSliceReview!.documents.length} documentos reconocidos`,
        detail:
          verticalSliceReview!.documents.length === 1
            ? primaryVerticalDocument.subtitle
            : "El PDF contiene varios actos cubiertos que se han separado para revisarlos.",
      }
    : result.reason === "SUPPORTED_FAMILY_CANDIDATE" && !recognizedCandidate
      ? {
          title: "Clasificación pendiente",
          detail:
            "Esta ficha no contiene la firma estructural versionada necesaria para mostrar un tipo definitivo.",
        }
      : REASON_COPY[result.reason];
  return (
    <section
      className="mt-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-labelledby="notification-review-heading"
    >
      <Card
        className={
          recognizedCandidate || verticallyRecognized
            ? "border-emerald-200"
            : result.candidates.length > 0
              ? "border-amber-200"
              : "border-blue-200"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {batchContext
                ? `Ficha seleccionada · documento ${batchContext.position} de ${batchContext.total}`
                : recognizedCandidate || verticallyRecognized
                  ? "Resultado local"
                  : "Resultado local · pendiente de revisión"}
            </p>
            <h2
              id="notification-review-heading"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              {copy.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {copy.detail}
            </p>
            {batchContext ? (
              <p className="mt-1 max-w-3xl truncate text-xs font-semibold text-slate-500">
                Archivo temporal: {batchContext.displayName}
              </p>
            ) : null}
            {textAcquisition?.mode === "LOCAL_OCR" ? (
              <p className="mt-2 text-sm font-bold text-blue-800">
                Lectura OCR local
                {textAcquisition.averageConfidence === null
                  ? ""
                  : ` · ${Math.round(textAcquisition.averageConfidence * 100)} % de confianza de lectura`}
              </p>
            ) : null}
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
              recognizedCandidate || verticallyRecognized
                ? "bg-emerald-100 text-emerald-900"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {recognizedCandidate || verticallyRecognized
              ? "Documento reconocido"
              : "Revisa antes de actuar"}
          </span>
        </div>

        {verticalSliceReview && verticallyRecognized ? (
          <FiscalNotificationVerticalSliceReview review={verticalSliceReview} />
        ) : recognizedCandidate ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
              Tipo de documento
            </p>
            <h3 className="mt-1 text-lg font-bold text-emerald-950">
              {FAMILY_LABELS[recognizedCandidate.familyId]}
            </h3>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              Título y estructura coinciden
            </p>
            {recognizedCandidate.familyId ===
            "AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE" ? (
              <p className="mt-2 text-sm text-emerald-900">
                Este acuerdo describe el alta que figura en el documento; no
                confirma que siga vigente ni valida el estado actual en VIES.
              </p>
            ) : null}
          </div>
        ) : result.candidates.length ? (
          <div className="mt-5 space-y-3">
            <h3 className="font-bold text-slate-900">
              Coincidencias documentales
            </h3>
            {result.candidates.map((candidate) => (
              <article
                key={candidate.familyId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <h4 className="font-bold text-slate-900">
                  {FAMILY_INDICATION_LABELS[candidate.familyId]}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {SIGNAL_LABELS[candidate.signalStatus]}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            No hay una familia confirmable para esta revisión. No se crea
            ninguna entidad ni se toma ninguna acción automática.
          </div>
        )}

        <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer font-bold text-slate-900">
            Traza técnica
          </summary>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <ResultFact label="Páginas" value={String(result.pageCount)} />
            <ResultFact label="Tamaño" value={formatBytes(result.byteLength)} />
            <ResultFact
              label="Motor"
              value={
                result.engineId && result.engineVersion
                  ? `${result.engineId} · v${result.engineVersion}`
                  : "No ejecutado"
              }
            />
            {result.candidates.map((candidate) => (
              <div key={candidate.familyId} className="contents">
                <ResultFact
                  label="Regla"
                  value={`${candidate.handlerId} · v${candidate.handlerVersion}`}
                />
                <ResultFact
                  label="Anclas encontradas"
                  value={String(candidate.matchedAnchors.length)}
                />
                <ResultFact
                  label="Anclas pendientes"
                  value={String(candidate.missingRequiredAnchorIds.length)}
                />
                <ResultFact
                  label="Conflictos"
                  value={String(candidate.conflictingAnchorIds.length)}
                />
              </div>
            ))}
          </dl>
        </details>

        {ephemeralMoneyFacts ? (
          <EphemeralMoneyFactsPanel result={ephemeralMoneyFacts} />
        ) : null}

        {ephemeralDeferralFacts ? (
          <DeferralGrantFactsPanel result={ephemeralDeferralFacts} />
        ) : null}

        {ephemeralOffsetFacts ? (
          <OffsetAgreementFactsPanel result={ephemeralOffsetFacts} />
        ) : null}

        {partyFactsReview ? (
          <FiscalNotificationPartyFactsReview viewModel={partyFactsReview} />
        ) : null}

        {explicitFieldsReview ? (
          <FiscalNotificationExplicitFieldsReview
            viewModel={explicitFieldsReview}
          />
        ) : null}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            El análisis se ha realizado en este navegador. No se ha llamado a un
            proveedor y el texto no se conserva. Si eliges guardar, solo se
            mantienen los campos estructurados mostrados y su procedencia; no
            existe ninguna acción automática pendiente.
          </p>
        </div>
      </Card>
    </section>
  );
}

function EphemeralMoneyFactsPanel({
  result,
}: {
  result: AeatEnforcementMoneyFactsResult;
}) {
  if (result.outcome !== "FACTS_AVAILABLE") {
    const copy =
      result.outcome === "AMBIGUOUS"
        ? {
            title: "Importes ambiguos",
            detail:
              "Hay etiquetas o secciones repetidas. No mostramos ninguna cifra hasta que una persona revise el documento.",
          }
        : result.outcome === "PROCESSING_BLOCKED"
          ? {
              title: "Lectura de importes bloqueada",
              detail:
                "El formato no supera la validación estricta. No se ha aceptado ni corregido ninguna cifra automáticamente.",
            }
          : {
              title: "Importes todavía pendientes",
              detail:
                "No se han encontrado importes bajo las etiquetas cerradas de esta versión. Una ausencia nunca se convierte en cero.",
            };
    return (
      <div
        className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
        role={result.outcome === "INFORMATION_PENDING" ? "status" : "alert"}
      >
        <h3 className="font-bold text-amber-950">{copy.title}</h3>
        <p className="mt-1 text-sm leading-6 text-amber-900">{copy.detail}</p>
      </div>
    );
  }

  const labelWithoutAmountKinds = new Set(
    result.issues.flatMap((item) =>
      item.code === "LABEL_WITHOUT_AMOUNT" && item.kind !== null
        ? [item.kind]
        : [],
    ),
  );
  const missingLabelCount = result.issues.filter(
    (item) =>
      item.code === "NO_CLOSED_LABEL_MATCH" &&
      item.kind !== null &&
      !labelWithoutAmountKinds.has(item.kind),
  ).length;
  const labelWithoutAmountCount = labelWithoutAmountKinds.size;
  return (
    <section
      className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4"
      aria-labelledby="notification-money-facts-heading"
    >
      <h3
        id="notification-money-facts-heading"
        className="font-bold text-blue-950"
      >
        Importes detectados
      </h3>
      <p className="mt-1 text-sm leading-6 text-blue-900">
        Son cifras leídas literalmente. No se han sumado, recalculado ni elegido
        como importe a pagar.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {result.facts.map((fact) => (
          <div
            key={fact.kind}
            className="rounded-xl border border-blue-100 bg-white p-4"
          >
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {MONEY_FACT_LABELS[fact.kind]}
            </dt>
            <dd className="mt-1 text-lg font-bold text-slate-950">
              {formatPrintedMoney(fact)}
            </dd>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Página {fact.evidence[0]?.pageNumber} · según el documento ·
              revisión obligatoria
            </p>
          </div>
        ))}
      </dl>
      {missingLabelCount > 0 ? (
        <p className="mt-3 text-sm font-semibold text-blue-950">
          {missingLabelCount === 1
            ? "No se encontró una etiqueta cubierta; no se ha convertido en cero."
            : `No se encontraron ${missingLabelCount} etiquetas cubiertas; no se han convertido en cero.`}
        </p>
      ) : null}
      {labelWithoutAmountCount > 0 ? (
        <p className="mt-3 text-sm font-semibold text-blue-950">
          {labelWithoutAmountCount === 1
            ? "Una etiqueta cubierta aparece sin cifra; se mantiene pendiente."
            : `${labelWithoutAmountCount} etiquetas cubiertas aparecen sin cifra; se mantienen pendientes.`}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-blue-900">
        Permanecen solo en memoria hasta que pulses <strong>Guardar</strong>.
        Factu conserva la cifra estructurada y su procedencia, nunca el PDF ni
        el texto completo.
      </p>
    </section>
  );
}

function DeferralGrantFactsPanel({
  result,
}: {
  result: AeatDeferralGrantFactsResultV1;
}) {
  const headerFacts = [
    result.header.subjectName,
    result.header.subjectTaxId,
    result.header.expediente,
    result.header.grantedTotal,
    result.header.paymentAccount,
  ];
  const hasFacts =
    headerFacts.some((fact) => fact !== null) ||
    result.debtSchedules.length > 0;

  if (!hasFacts) {
    return (
      <div
        className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
        role={result.outcome === "INFORMATION_PENDING" ? "status" : "alert"}
      >
        <h3 className="font-bold text-amber-950">
          Datos del aplazamiento todavía pendientes
        </h3>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          El documento es una concesión de aplazamiento o fraccionamiento, pero
          esta copia no contiene un cuadro de cuotas completo que pueda
          mostrarse como datos estructurados.
        </p>
      </div>
    );
  }

  return (
    <section
      className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"
      aria-labelledby="deferral-grant-facts-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
            Datos del documento
          </p>
          <h3
            id="deferral-grant-facts-heading"
            className="mt-1 text-lg font-bold text-blue-950"
          >
            Concesión de aplazamiento o fraccionamiento
          </h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Cuotas, importes y vencimientos leídos literalmente de los anexos de
            la concesión.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-950">
          {result.debtSchedules.reduce(
            (total, schedule) => total + schedule.installments.length,
            0,
          )}{" "}
          cuotas
        </span>
      </div>

      {result.outcome === "AMBIGUOUS" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Alguna fila del documento no cuadra o está incompleta. Se muestran los
          valores que sí se han leído, sin corregirlos ni convertirlos en una
          instrucción de pago.
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.header.subjectName ? (
          <DeferralFactCard
            label="Obligado"
            value={result.header.subjectName.printedValue}
          />
        ) : null}
        {result.header.subjectTaxId ? (
          <DeferralFactCard
            label="NIF"
            value={result.header.subjectTaxId.printedValue}
          />
        ) : null}
        {result.header.expediente ? (
          <DeferralFactCard
            label="Expediente"
            value={result.header.expediente.printedValue}
          />
        ) : null}
        {result.header.grantedTotal ? (
          <DeferralFactCard
            label="Importe concedido"
            value={formatStructuredMoney(
              result.header.grantedTotal.amountCents,
              "EUR",
            )}
          />
        ) : null}
        {result.header.paymentAccount ? (
          <DeferralFactCard
            label="Cuenta de pago"
            value={result.header.paymentAccount.printedValue}
          />
        ) : null}
      </dl>

      <div className="mt-5 space-y-4">
        {result.debtSchedules.map((schedule, scheduleIndex) => (
          <article
            key={`${schedule.liquidationKey.printedValue}:${scheduleIndex}`}
            className="rounded-2xl border border-blue-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Liquidación
                </p>
                <h4 className="mt-1 break-all font-bold text-slate-950">
                  {schedule.liquidationKey.printedValue}
                </h4>
                {schedule.concept ? (
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {schedule.concept.printedValue}
                  </p>
                ) : null}
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {schedule.listedDebtAmount ? (
                  <ResultFact
                    label="Importe de deuda"
                    value={formatStructuredMoney(
                      schedule.listedDebtAmount.amountCents,
                      "EUR",
                    )}
                  />
                ) : null}
                {schedule.interestStartDate ? (
                  <ResultFact
                    label="Fecha de intereses"
                    value={schedule.interestStartDate.printedValue}
                  />
                ) : null}
              </dl>
            </div>

            <ol className="mt-4 grid gap-3 lg:grid-cols-2">
              {schedule.installments.map((installment, installmentIndex) => (
                <li
                  key={`${installment.dueDate.calendarDate}:${installmentIndex}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Cuota {installmentIndex + 1}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {formatStructuredMoney(
                          installment.installmentTotal.amountCents,
                          "EUR",
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Vencimiento
                      </p>
                      <p className="mt-1 font-bold text-slate-950">
                        {installment.dueDate.printedValue}
                      </p>
                    </div>
                  </div>
                  {installment.layout === "COMPONENT_BREAKDOWN" ? (
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs">
                      <ResultFact
                        label="Principal"
                        value={formatStructuredMoney(
                          installment.principal.amountCents,
                          "EUR",
                        )}
                      />
                      <ResultFact
                        label="Recargo"
                        value={formatStructuredMoney(
                          installment.enforcementSurcharge.amountCents,
                          "EUR",
                        )}
                      />
                      <ResultFact
                        label="Deuda"
                        value={formatStructuredMoney(
                          installment.debtTotal.amountCents,
                          "EUR",
                        )}
                      />
                      <ResultFact
                        label="Intereses"
                        value={formatStructuredMoney(
                          installment.interest.amountCents,
                          "EUR",
                        )}
                      />
                    </dl>
                  ) : (
                    <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-5 text-slate-600">
                      Este formato de la AEAT imprime el importe de la cuota,
                      pero no desglosa sus componentes.
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-blue-900">
        Estas son fechas e instrucciones del documento. No se ha marcado ninguna
        cuota como pagada ni se ha creado un gasto o asiento.
      </p>
    </section>
  );
}

const OFFSET_EFFECT_LABELS: Readonly<
  Record<AeatOffsetPrintedEffectMeaningV1, string>
> = {
  TOTAL_EXTINGUISHED_IN_VOLUNTARY_PERIOD:
    "Deuda totalmente extinguida en período voluntario",
  PARTIALLY_EXTINGUISHED_IN_ENFORCEMENT:
    "Deuda parcialmente extinguida en período ejecutivo",
  TOTAL_EXTINGUISHED_IN_ENFORCEMENT:
    "Deuda totalmente extinguida en período ejecutivo",
  PRINTED_CODE_UNMAPPED: "Código de efecto sin equivalencia verificada",
};

function OffsetAgreementFactsPanel({
  result,
}: {
  result: AeatOffsetAgreementFactsResultV1;
}) {
  const hasFacts =
    Object.values(result.header).some((fact) => fact !== null) ||
    result.credits.length > 0 ||
    result.debts.length > 0;
  if (!hasFacts) {
    return (
      <div
        className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"
        role={result.outcome === "INFORMATION_PENDING" ? "status" : "alert"}
      >
        <h3 className="font-bold text-amber-950">
          Datos del acuerdo todavía pendientes
        </h3>
        <p className="mt-1 text-sm leading-6 text-amber-900">
          El documento se ha reconocido como acuerdo de compensación, pero sus
          anexos no contienen filas completas que puedan mostrarse como datos
          estructurados.
        </p>
      </div>
    );
  }

  return (
    <section
      className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"
      aria-labelledby="offset-agreement-facts-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
            Datos del documento
          </p>
          <h3
            id="offset-agreement-facts-heading"
            className="mt-1 text-lg font-bold text-blue-950"
          >
            {result.agreementMode === "EX_OFFICIO"
              ? "Acuerdo de compensación de oficio"
              : "Acuerdo de compensación solicitado"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Crédito, deudas, importes compensados, saldos y efectos leídos de
            los anexos del acuerdo.
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-950">
          {result.credits.length}{" "}
          {result.credits.length === 1 ? "crédito" : "créditos"}
          {" · "}
          {result.debts.length} {result.debts.length === 1 ? "deuda" : "deudas"}
        </span>
      </div>

      {result.outcome === "AMBIGUOUS" ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
          Hay alguna fila incompleta o un código de efecto sin texto
          explicativo. Se muestran los valores exactos que sí constan, sin
          completar ni corregir los demás.
        </div>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {result.header.subjectName ? (
          <DeferralFactCard
            label="Obligado"
            value={result.header.subjectName.printedValue}
          />
        ) : null}
        {result.header.subjectTaxId ? (
          <DeferralFactCard
            label="NIF"
            value={result.header.subjectTaxId.printedValue}
          />
        ) : null}
        {result.header.agreementNumber ? (
          <DeferralFactCard
            label="Número de acuerdo"
            value={result.header.agreementNumber.printedValue}
          />
        ) : null}
        {result.header.requestDate ? (
          <DeferralFactCard
            label="Fecha de solicitud"
            value={result.header.requestDate.printedValue}
          />
        ) : null}
      </dl>

      <div className="mt-5 space-y-4">
        {result.credits.map((credit, index) => (
          <article
            key={`${credit.reference.printedValue}:${index}`}
            className="rounded-2xl border border-emerald-200 bg-white p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
              Crédito {index + 1}
            </p>
            <h4 className="mt-1 break-all font-bold text-slate-950">
              {credit.reference.printedValue}
            </h4>
            <p className="mt-1 text-sm text-slate-700">
              {credit.description.printedValue}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <ResultFact
                label="Reconocimiento"
                value={credit.recognitionDate.printedValue}
              />
              <ResultFact
                label="Crédito"
                value={formatStructuredMoney(
                  credit.creditAmount.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Intereses de demora"
                value={formatStructuredMoney(
                  credit.delayInterest.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Total del crédito"
                value={formatStructuredMoney(
                  credit.totalCredit.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Aplicado a compensar"
                value={formatStructuredMoney(
                  credit.compensatedAmount.amountCents,
                  "EUR",
                )}
              />
            </dl>
          </article>
        ))}

        {result.debts.map((debt, index) => (
          <article
            key={`${debt.liquidationKey.printedValue}:${index}`}
            className="rounded-2xl border border-blue-200 bg-white p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Deuda {index + 1}
                </p>
                <h4 className="mt-1 break-all font-bold text-slate-950">
                  {debt.liquidationKey.printedValue}
                </h4>
                <p className="mt-1 text-sm text-slate-700">
                  {debt.description.printedValue}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">
                Efecto {debt.effectCode.printedValue}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultFact
                label="Fecha de efectos"
                value={debt.effectDate.printedValue}
              />
              <ResultFact
                label="Principal pendiente"
                value={formatStructuredMoney(
                  debt.principalPending.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Recargo ejecutivo"
                value={formatStructuredMoney(
                  debt.enforcementSurcharge.amountCents,
                  "EUR",
                )}
              />
              {debt.delayInterest ? (
                <ResultFact
                  label="Intereses de demora"
                  value={formatStructuredMoney(
                    debt.delayInterest.amountCents,
                    "EUR",
                  )}
                />
              ) : null}
              <ResultFact
                label="Ingresos a cuenta"
                value={formatStructuredMoney(
                  debt.paymentsOnAccount.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Total antes de compensar"
                value={formatStructuredMoney(
                  debt.totalBeforeOffset.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Importe compensado"
                value={formatStructuredMoney(
                  debt.compensatedAmount.amountCents,
                  "EUR",
                )}
              />
              <ResultFact
                label="Pendiente después de compensar"
                value={formatStructuredMoney(
                  debt.remainingAfterOffset.amountCents,
                  "EUR",
                )}
              />
            </dl>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800">
              {OFFSET_EFFECT_LABELS[debt.effectMeaning]}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-blue-900">
        Los importes se muestran tal como aparecen en el documento. No se
        recalculan y no se crea, cancela ni marca como pagada ninguna deuda,
        gasto o asiento.
      </p>
    </section>
  );
}

function DeferralFactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-all font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function ResultFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function projectBatchReviewSummary(
  analysis: FiscalNotificationLocalAnalysisResult,
): FiscalNotificationBatchReviewSummary {
  const technicalReview = analysis.technicalReview;
  const verticalReview = analysis.ephemeralVerticalSliceReview;
  const recognizedCandidate = recognizedCandidateFrom(technicalReview);
  const verticalDocuments =
    verticalReview?.status === "REVIEW_REQUIRED"
      ? verticalReview.documents
      : [];
  const primaryAmount = projectBatchPrimaryAmount(
    analysis.ephemeralEnforcementMoneyFacts,
  );

  if (verticalDocuments.length > 0) {
    return {
      title: verticalDocuments.map((document) => document.title).join(" · "),
      pageCount: technicalReview.pageCount,
      primaryAmount,
    };
  }

  if (recognizedCandidate) {
    return {
      title: FAMILY_LABELS[recognizedCandidate.familyId],
      pageCount: technicalReview.pageCount,
      primaryAmount,
    };
  }

  return {
    title:
      technicalReview.reason === "SUPPORTED_FAMILY_CANDIDATE"
        ? "Clasificación pendiente"
        : REASON_COPY[technicalReview.reason].title,
    pageCount: technicalReview.pageCount,
    primaryAmount,
  };
}

function projectBatchPrimaryAmount(
  result: AeatEnforcementMoneyFactsResult | null,
): FiscalNotificationBatchReviewSummary["primaryAmount"] {
  if (!result || result.outcome !== "FACTS_AVAILABLE") return null;
  const fact =
    result.facts.find((item) => item.kind === "DOCUMENT_TOTAL") ??
    result.facts.find((item) => item.kind === "OUTSTANDING_PRINCIPAL") ??
    null;
  return fact
    ? {
        amountCents: fact.amountCents,
        currency: fact.currency,
      }
    : null;
}

function batchStatusForAnalysis(
  analysis: FiscalNotificationLocalAnalysisResult,
): FiscalNotificationBatchStatus {
  if (
    recognizedCandidateFrom(analysis.technicalReview) !== null ||
    (analysis.ephemeralVerticalSliceReview?.status === "REVIEW_REQUIRED" &&
      analysis.ephemeralVerticalSliceReview.documents.length > 0)
  ) {
    return "READ";
  }
  return analysis.technicalReview.candidates.length > 0
    ? "NEEDS_REVIEW"
    : "NOT_RECOGNIZED";
}

function batchStatusPresentation(status: FiscalNotificationBatchStatus): {
  readonly label: string;
  readonly className: string;
} {
  const presentations = {
    PREPARED: {
      label: "Preparado",
      className: "bg-slate-200 text-slate-800",
    },
    ANALYZING: {
      label: "Analizando",
      className: "bg-blue-100 text-blue-900",
    },
    READ: {
      label: "Leído",
      className: "bg-emerald-100 text-emerald-900",
    },
    NEEDS_REVIEW: {
      label: "Necesita revisión",
      className: "bg-amber-100 text-amber-900",
    },
    NOT_RECOGNIZED: {
      label: "No reconocido",
      className: "bg-slate-200 text-slate-800",
    },
    ERROR: {
      label: "No se pudo leer",
      className: "bg-red-100 text-red-900",
    },
  } as const;
  return presentations[status];
}

function safeBatchFileError(value: unknown): string {
  if (!(value instanceof FiscalNotificationBatchFileErrorV1)) {
    return "no se ha podido comprobar de forma segura";
  }
  const copy: Readonly<
    Record<FiscalNotificationBatchFileErrorV1["code"], string>
  > = {
    ABORTED: "comprobación cancelada",
    EMPTY_FILE: "el archivo está vacío",
    FILE_TOO_LARGE: "supera el límite de 4 MB",
    HASH_UNAVAILABLE: "el navegador no puede comprobar duplicados",
    INVALID_FILE_NAME: "el nombre local no es válido",
    INVALID_PDF: "no es un PDF válido",
    UNSUPPORTED_FILE: "solo se admiten archivos PDF",
  };
  return copy[value.code];
}

function safeLocalFileLabel(value: unknown): string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 255 &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : "Archivo sin nombre válido";
}

function safeAnalysisError(value: unknown): string {
  if (value instanceof FiscalNotificationPdfError) {
    return ERROR_COPY[value.code];
  }
  return "No se ha podido completar el análisis local de forma segura.";
}

function formatBytes(value: number): string {
  if (value < 1_024) return `${value} B`;
  if (value < 1_024 * 1_024) return `${Math.ceil(value / 1_024)} KB`;
  return `${(value / (1_024 * 1_024)).toFixed(1)} MB`;
}

function formatPrintedMoney(fact: AeatEnforcementMoneyFact): string {
  return formatStructuredMoney(fact.amountCents, fact.currency);
}

function formatStructuredMoney(
  amountCents: number,
  currency: "EUR" | "UNKNOWN",
): string {
  const cents = BigInt(amountCents);
  const hundred = BigInt(100);
  const integerPart = (cents / hundred)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimalPart = (cents % hundred).toString().padStart(2, "0");
  const value = `${integerPart},${decimalPart}`;
  return currency === "EUR" ? `${value} €` : `${value} · moneda no confirmada`;
}
