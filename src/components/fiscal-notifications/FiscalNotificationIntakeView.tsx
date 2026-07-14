"use client";

import {
  CheckCircle2,
  FileSearch,
  FileUp,
  Loader2,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { FiscalNotificationExplicitFieldsReview } from "@/components/fiscal-notifications/FiscalNotificationExplicitFieldsReview";
import { FiscalNotificationPartyFactsReview } from "@/components/fiscal-notifications/FiscalNotificationPartyFactsReview";
import { FiscalNotificationReviewSteps } from "@/components/fiscal-notifications/FiscalNotificationReviewSteps";
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
import {
  projectFiscalNotificationStructuredHistoryV1,
  type FiscalNotificationStructuredHistoryEntryV1,
  type FiscalNotificationStructuredHistoryViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-history-view-model.v1";
import {
  projectStructuredReviewRelationsV1,
  type StructuredReviewRelationEntryV1,
  type StructuredReviewRelationsViewModelV1,
} from "@/lib/fiscal-notifications/structured-review-relations-view-model.v1";

const FAMILY_LABELS = {
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: "Providencia de apremio",
  AEAT_DEFERRAL_GRANT_CANDIDATE:
    "Concesión de aplazamiento o fraccionamiento",
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE:
    "Diligencia de embargo de bienes inmuebles",
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE:
    "Requerimiento formal de presentación",
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE:
    "Acuerdo de alta en el ROI",
} as const;

const FAMILY_INDICATION_LABELS = {
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: "Indicios de providencia de apremio",
  AEAT_DEFERRAL_GRANT_CANDIDATE:
    "Indicios de concesión de aplazamiento o fraccionamiento",
  AEAT_REAL_ESTATE_SEIZURE_CANDIDATE:
    "Indicios de diligencia de embargo de bienes inmuebles",
  AEAT_FORMAL_FILING_REQUIREMENT_CANDIDATE:
    "Indicios de requerimiento formal de presentación",
  AEAT_ROI_REGISTRATION_AGREEMENT_CANDIDATE:
    "Indicios de acuerdo de alta en el ROI",
} as const;

function recognizedCandidateFrom(result: FiscalNotificationLocalReviewResult) {
  const candidate = result.candidates[0];
  return result.engineVersion === "1.3.0" &&
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
  OUTSTANDING_PRINCIPAL: "Principal pendiente impreso",
  ORDINARY_ENFORCEMENT_SURCHARGE: "Recargo ordinario impreso",
  PAYMENT_ON_ACCOUNT: "Ingreso a cuenta impreso",
  DOCUMENT_TOTAL: "Importe total impreso",
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
    title: "Sin texto seleccionable",
    detail:
      "El PDF puede ser una imagen escaneada. Esta versión no ejecuta OCR automáticamente.",
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
    detail:
      "El documento supera los límites seguros del analizador local.",
  },
  TEXT_LINE_LIMIT_EXCEEDED: {
    title: "Demasiadas líneas de texto",
    detail:
      "El documento supera los límites seguros del analizador local.",
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
  TIMEOUT: "El análisis local ha superado el tiempo máximo de 15 segundos.",
  ABORTED: "El análisis se ha cancelado.",
  WORKER_UNAVAILABLE:
    "El navegador no puede ejecutar el lector aislado de PDF.",
  INVALID_WORKER_RESPONSE:
    "El lector local devolvió una respuesta no válida y se ha bloqueado.",
  HASH_UNAVAILABLE: "El navegador no puede calcular la huella del documento.",
};

interface SelectedFileSummary {
  readonly byteLength: number;
  readonly mimeType: string;
}

interface PendingStructuredReview {
  readonly reviewId: string;
  readonly createdAt: string;
  readonly analysis: FiscalNotificationLocalAnalysisResult;
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

export function FiscalNotificationIntakeView() {
  const { authReady, user, emailConfirmed } = useCloudSync();
  const ownerScope =
    authReady && user && emailConfirmed ? `user:${user.id}` : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
      <PageHeader
        title="Notificaciones y expedientes"
        subtitle="Comprende una comunicación administrativa sin enviarla fuera de tu navegador."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <InfoTile
          icon={ShieldCheck}
          title="Lectura local"
          detail="El PDF, su texto y su nombre no se suben ni se guardan."
        />
        <InfoTile
          icon={FileSearch}
          title="Datos exactos visibles"
          detail="Muestra y puede guardar importes, referencias, fechas y sujeto cuando constan expresamente."
        />
        <InfoTile
          icon={LockKeyhole}
          title="Sin efectos fiscales"
          detail="No crea deudas, plazos, pagos, gastos ni asientos."
        />
      </div>

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
      ) : (
        <FiscalNotificationReviewWorkspace
          key={ownerScope}
          ownerScope={ownerScope}
        />
      )}

      <Card className="mt-6 bg-slate-50">
        <h2 className="font-bold text-slate-900">Alcance de esta versión</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>
            Reconoce la familia documental de providencia de apremio, concesión
            de aplazamiento o fraccionamiento, diligencia de embargo de bienes
            inmuebles, requerimiento formal de presentación y acuerdo de alta
            en el ROI. No confirma por sí sola el organismo emisor ni la
            autenticidad.
          </li>
          <li>
            Un acuerdo de alta en el ROI describe el documento analizado: no
            demuestra que el alta siga vigente ni valida el estado en VIES.
          </li>
          <li>
            El nombre, el NIF, los importes, los valores exactos de referencia
            y las fechas impresas pueden guardarse en una ficha estructurada
            mediante una acción explícita. El PDF, su nombre y el texto completo
            no se conservan.
          </li>
          <li>
            Una fecha impresa se presenta como tal: no se convierte por sí sola
            en fecha de notificación o vencimiento ni activa una acción.
          </li>
          <li>
            No consulta automáticamente sedes oficiales, no ejecuta OCR remoto
            y no utiliza IA.
          </li>
        </ul>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Esta herramienta no sustituye la revisión de un asesor ni confirma la
          validez jurídica del documento.
        </p>
      </Card>
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
    saveFiscalNotificationStructuredReview,
  } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const saveOperationRef = useRef<symbol | null>(null);
  const [selectedFile, setSelectedFile] =
    useState<SelectedFileSummary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] =
    useState<FiscalNotificationLocalReviewResult | null>(null);
  const [ephemeralMoneyFacts, setEphemeralMoneyFacts] =
    useState<AeatEnforcementMoneyFactsResult | null>(null);
  const [ephemeralDeferralFacts, setEphemeralDeferralFacts] =
    useState<AeatDeferralGrantFactsResultV1 | null>(null);
  const [explicitFieldsReview, setExplicitFieldsReview] =
    useState<ExplicitFieldsReviewViewModelV2 | null>(null);
  const [partyFactsReview, setPartyFactsReview] =
    useState<PartyFactsReviewViewModelV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingReview, setPendingReview] =
    useState<PendingStructuredReview | null>(null);
  const [persistenceState, setPersistenceState] =
    useState<ReviewPersistenceState>("idle");
  const history = useMemo(
    () =>
      projectFiscalNotificationStructuredHistoryV1(
        data.fiscalNotificationsWorkspace,
        ownerScope,
      ),
    [data.fiscalNotificationsWorkspace, ownerScope],
  );
  const relations = useMemo(
    () =>
      projectStructuredReviewRelationsV1(
        data.fiscalNotificationsWorkspace,
        ownerScope,
      ),
    [data.fiscalNotificationsWorkspace, ownerScope],
  );

  useEffect(() => {
    const fileInput = fileInputRef.current;

    return () => {
      saveOperationRef.current = null;
      processingRef.current = false;
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
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

  function clearFileSelection(): void {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    if (saveOperationRef.current) return;
    controllerRef.current?.abort();
    controllerRef.current = null;
    processingRef.current = false;
    setProcessing(false);
    setResult(null);
    setEphemeralMoneyFacts(null);
    setEphemeralDeferralFacts(null);
    setExplicitFieldsReview(null);
    setPartyFactsReview(null);
    setPendingReview(null);
    setPersistenceState("idle");
    setError(null);
    const file = event.currentTarget.files?.item(0) ?? null;
    setSelectedFile(
      file ? { byteLength: file.size, mimeType: file.type } : null,
    );
  }

  function cancelAnalysis(): void {
    controllerRef.current?.abort();
    controllerRef.current = null;
    processingRef.current = false;
    setProcessing(false);
    setError(null);
    setEphemeralMoneyFacts(null);
    setEphemeralDeferralFacts(null);
    setExplicitFieldsReview(null);
    setPartyFactsReview(null);
    clearFileSelection();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processingRef.current || saveOperationRef.current) return;
    const file = fileInputRef.current?.files?.item(0) ?? null;
    if (!file) {
      setError("Selecciona un PDF para analizar.");
      return;
    }
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID !== "function") {
      setError("Este navegador no puede crear una sesión local segura.");
      return;
    }

    const reviewUuid = randomUUID.call(globalThis.crypto);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    processingRef.current = true;
    setProcessing(true);
    setResult(null);
    setEphemeralMoneyFacts(null);
    setEphemeralDeferralFacts(null);
    setExplicitFieldsReview(null);
    setPartyFactsReview(null);
    setPendingReview(null);
    setPersistenceState("idle");
    setError(null);
    try {
      const nextAnalysis =
        await analyzeFiscalNotificationLocallyWithEphemeralFacts({
          ownerScope,
          documentId: `notification-review:${reviewUuid}`,
          file,
          signal: controller.signal,
        });
      if (
        controller.signal.aborted ||
        controllerRef.current !== controller
      ) {
        return;
      }
      const nextResult = nextAnalysis.technicalReview;
      const nextExplicitFieldsReview =
        nextAnalysis.ephemeralEnforcementExplicitFields === null
          ? null
          : projectExplicitFieldsReviewViewModelV2(
              nextAnalysis.ephemeralEnforcementExplicitFields,
            );
      const nextPartyFactsReview =
        nextAnalysis.ephemeralEnforcementPartyFacts === null
          ? null
          : projectPartyFactsReviewViewModelV1(
              nextAnalysis.ephemeralEnforcementPartyFacts,
            );
      setResult(nextResult);
      setEphemeralMoneyFacts(nextAnalysis.ephemeralEnforcementMoneyFacts);
      setEphemeralDeferralFacts(nextAnalysis.ephemeralDeferralGrantFacts);
      setExplicitFieldsReview(nextExplicitFieldsReview);
      setPartyFactsReview(nextPartyFactsReview);
      setPendingReview({
        reviewId: `review:${reviewUuid}`,
        createdAt: new Date().toISOString(),
        analysis: nextAnalysis,
      });
      setPersistenceState("pending");
    } catch (caught) {
      if (
        controller.signal.aborted ||
        controllerRef.current !== controller
      ) {
        return;
      }
      setError(safeAnalysisError(caught));
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        processingRef.current = false;
        setProcessing(false);
        clearFileSelection();
      }
    }
  }

  function saveStructuredReview(): void {
    if (!pendingReview || saveOperationRef.current) return;

    const operation = Symbol("structured-review-save");
    saveOperationRef.current = operation;
    setPersistenceState("saving");
    try {
      const write = saveFiscalNotificationStructuredReview({
        expected: data,
        ownerScope,
        reviewId: pendingReview.reviewId,
        createdAt: pendingReview.createdAt,
        analysis: pendingReview.analysis,
      });
      if (saveOperationRef.current !== operation) return;

      if (write.status === "applied") {
        setPendingReview(null);
        setPersistenceState("saved");
        return;
      }
      if (write.status === "indeterminate") {
        setPersistenceState("indeterminate");
      } else if (write.reason === "no_structured_facts") {
        setPersistenceState("no_structured_facts");
      } else if (write.reason === "invalid_structured_review") {
        setPersistenceState("invalid_structured_review");
      } else {
        setPersistenceState("blocked");
      }
    } finally {
      if (saveOperationRef.current === operation) {
        saveOperationRef.current = null;
      }
    }
  }

  const saving = persistenceState === "saving";
  const busy = processing || saving;
  const reviewGuidance = result
    ? projectFiscalNotificationReviewGuidanceV1({
        technicalReview: result,
        ephemeralEnforcementMoneyFacts: ephemeralMoneyFacts,
      })
    : null;

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex items-start gap-3">
            <FileUp
              aria-hidden="true"
              className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Analizar una notificación
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Admite PDF con texto seleccionable, hasta 4 MB y 80 páginas.
                Los documentos escaneados quedan pendientes de OCR.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            id="fiscal-notification-file"
            name="fiscal-notification-file"
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={handleFileChange}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="mt-5 flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              aria-describedby="fiscal-notification-file-help"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp aria-hidden="true" className="h-5 w-5" />
              Seleccionar PDF
            </Button>
            <p
              id="fiscal-notification-file-help"
              className="text-sm text-slate-500"
            >
              No mostramos ni conservamos el nombre del archivo. El PDF y el
              texto desaparecen; solo se guardan los campos estructurados que
              aceptes conservar.
            </p>
          </div>

          {selectedFile ? (
            <div
              className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
              role="status"
            >
              <CheckCircle2
                aria-hidden="true"
                className="h-5 w-5 text-emerald-600"
              />
              <span>
                Archivo seleccionado · {formatBytes(selectedFile.byteLength)}
              </span>
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
              <span>
                {selectedFile.mimeType === "application/pdf"
                  ? "PDF declarado"
                  : "Formato pendiente de validar"}
              </span>
            </div>
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
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={!selectedFile || busy}>
              {processing ? (
                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
              ) : (
                <ScanLine aria-hidden="true" className="h-5 w-5" />
              )}
              {processing ? "Analizando localmente…" : "Analizar documento"}
            </Button>
            {processing ? (
              <Button type="button" variant="secondary" onClick={cancelAnalysis}>
                <X aria-hidden="true" className="h-5 w-5" />
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      {result ? (
        <ReviewResult
          result={result}
          ephemeralMoneyFacts={ephemeralMoneyFacts}
          ephemeralDeferralFacts={ephemeralDeferralFacts}
          explicitFieldsReview={explicitFieldsReview}
          partyFactsReview={partyFactsReview}
        />
      ) : null}
      {reviewGuidance ? (
        <div className="mt-4">
          <FiscalNotificationReviewSteps
            guidance={reviewGuidance}
            documentTypeRecognized={
              result ? recognizedCandidateFrom(result) !== null : false
            }
          />
        </div>
      ) : null}
      {result ? (
        <ReviewPersistencePanel
          state={persistenceState}
          canSave={pendingReview !== null}
          onSave={saveStructuredReview}
        />
      ) : null}
      <StructuredReviewRelations viewModel={relations} />
      <StructuredReviewHistory viewModel={history} />
    </>
  );
}

function ReviewPersistencePanel({
  state,
  canSave,
  onSave,
}: {
  state: ReviewPersistenceState;
  canSave: boolean;
  onSave: () => void;
}) {
  const copy: Readonly<Record<ReviewPersistenceState, string>> = {
    idle: "Los datos estructurados todavía no se han guardado.",
    pending:
      "El análisis está disponible. Guarda la ficha si quieres conservar los datos exactos detectados.",
    saving: "Guardando los datos estructurados en tu cuenta…",
    saved:
      "Ficha guardada en los datos de tu cuenta. Ya puedes volver a consultar sus importes, referencias, fechas y sujeto identificado.",
    no_structured_facts:
      "Este análisis no contiene todavía campos exactos compatibles con la ficha estructurada. No se ha guardado una tarjeta vacía.",
    invalid_structured_review:
      "Los datos no superan la validación de integridad y no se han guardado. El resultado visible sigue disponible para revisarlo.",
    blocked:
      "No se ha podido guardar porque los datos de la cuenta cambiaron o el almacenamiento está bloqueado. Ninguna ficha existente se ha sustituido.",
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
          <h2 className="font-bold text-slate-950">
            Guardar ficha estructurada
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {copy[state]}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Guarda únicamente campos estructurados visibles y su procedencia:
            nunca conserva el PDF, su nombre ni el texto completo. Tampoco crea
            una deuda, pago, vencimiento, gasto o asiento.
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
                : "Guardar datos en mi cuenta"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

function StructuredReviewRelations({
  viewModel,
}: {
  viewModel: StructuredReviewRelationsViewModelV1;
}) {
  if (viewModel.status === "BLOCKED") {
    return (
      <Card className="mt-6 border-amber-200 bg-amber-50" role="alert">
        <div className="flex items-start gap-3">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
          />
          <div>
            <h2 className="font-bold text-amber-950">
              Relaciones no disponibles
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              El expediente no supera la validación de integridad para esta
              cuenta. No se muestran ni se recalculan relaciones parciales.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const entries = viewModel.entries;
  return (
    <Card className="mt-6" aria-labelledby="notification-relations-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="notification-relations-heading"
            className="text-lg font-bold text-slate-950"
          >
            Relaciones entre documentos
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Detecta identificadores administrativos que coinciden en dos
            fichas guardadas y conserva la relación como sugerencia revisable.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {entries.length} {entries.length === 1 ? "relación" : "relaciones"}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Todavía no hay dos fichas guardadas que compartan una referencia
          exacta de expediente, liquidación, deuda, notificación o registro.
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry) => (
            <StructuredReviewRelationItem key={entry.key} entry={entry} />
          ))}
        </ol>
      )}
    </Card>
  );
}

function StructuredReviewRelationItem({
  entry,
}: {
  entry: StructuredReviewRelationEntryV1;
}) {
  return (
    <li className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="text-base font-bold text-slate-950">{entry.title}</h3>
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          {entry.statusLabel}
        </span>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {entry.documents.map((document) => (
          <li
            key={document.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="font-bold text-slate-900">{document.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Guardado {formatReviewTimestamp(document.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {entry.matches.map((match) => (
          <div
            key={`${match.label}:${match.value}`}
            className="rounded-xl border border-blue-100 bg-white p-4"
          >
            <dt className="text-xs font-bold uppercase tracking-wide text-blue-800">
              {match.label}
            </dt>
            <dd className="mt-1 break-all font-bold text-blue-950">
              {match.value}
            </dd>
            <dd className="mt-1 text-xs text-slate-500">
              {match.issuer} ·{" "}
              {match.matchMode === "EXACT_PRINTED"
                ? "Mismo valor impreso"
                : "Mismo identificador, con formato distinto"}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-sm leading-6 text-slate-700">
        {entry.explanation}
      </p>
    </li>
  );
}

function StructuredReviewHistory({
  viewModel,
}: {
  viewModel: FiscalNotificationStructuredHistoryViewModelV1;
}) {
  if (viewModel.status === "BLOCKED") {
    return (
      <Card className="mt-6 border-amber-200 bg-amber-50" role="alert">
        <div className="flex items-start gap-3">
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
          />
          <div>
            <h2 className="font-bold text-amber-950">
              Expediente estructurado no disponible
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              Los datos guardados no superan la validación de integridad para
              esta cuenta. No se han sustituido, reinterpretado ni borrado.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const entries = viewModel.entries;
  return (
    <Card className="mt-6" aria-labelledby="notification-structured-history">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="notification-structured-history"
            className="text-lg font-bold text-slate-950"
          >
            Mis notificaciones guardadas
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Fichas estructuradas separadas por cuenta y disponibles para copia
            de seguridad y sincronización.
          </p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Conservan los campos que aceptaste guardar, pero nunca el PDF, su
            nombre ni el texto completo.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {entries.length} {entries.length === 1 ? "ficha" : "fichas"}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          Aún no has guardado ninguna ficha estructurada en esta cuenta.
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {entries.map((entry) => (
            <StructuredReviewHistoryItem key={entry.key} entry={entry} />
          ))}
        </ol>
      )}
    </Card>
  );
}

function StructuredReviewHistoryItem({
  entry,
}: {
  entry: FiscalNotificationStructuredHistoryEntryV1;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Guardado {formatReviewTimestamp(entry.createdAt)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">
            {entry.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {entry.authority}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          {entry.reviewLabel}
        </span>
      </div>

      {entry.subjectName || entry.subjectTaxId ? (
        <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          {entry.subjectName ? (
            <ResultFact label="Obligado al pago" value={entry.subjectName} />
          ) : null}
          {entry.subjectTaxId ? (
            <ResultFact label="NIF impreso" value={entry.subjectTaxId} />
          ) : null}
        </dl>
      ) : null}

      {entry.money.length > 0 ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entry.money.map((fact) => (
            <div
              key={`${fact.label}:${fact.amountCents}`}
              className="rounded-xl border border-blue-100 bg-blue-50 p-4"
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-blue-800">
                {fact.label}
              </dt>
              <dd className="mt-1 text-lg font-bold text-blue-950">
                {formatStructuredMoney(fact.amountCents, fact.currency)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {entry.installments.length > 0 ? (
        <section className="mt-4" aria-label="Cuotas impresas guardadas">
          <h4 className="font-bold text-slate-950">Calendario de cuotas</h4>
          <ol className="mt-3 grid gap-3 lg:grid-cols-2">
            {entry.installments.map((installment) => (
              <li
                key={installment.key}
                className="rounded-xl border border-blue-100 bg-blue-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                      {installment.label}
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-950">
                      {installment.amountCents === null
                        ? "Importe no impreso"
                        : formatStructuredMoney(installment.amountCents, "EUR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-800">
                      Vencimiento impreso
                    </p>
                    <p className="mt-1 font-bold text-blue-950">
                      {installment.dueDate
                        ? formatCalendarDate(installment.dueDate)
                        : "No impreso"}
                    </p>
                  </div>
                </div>
                {installment.components.length > 1 ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-blue-100 pt-3 text-xs">
                    {installment.components.map((component) => (
                      <ResultFact
                        key={`${component.label}:${component.amountCents}`}
                        label={component.label}
                        value={formatStructuredMoney(
                          component.amountCents,
                          "EUR",
                        )}
                      />
                    ))}
                  </dl>
                ) : null}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Son datos impresos guardados para consulta. Ninguna cuota se marca
            como pagada y no se crea automáticamente un gasto o asiento.
          </p>
        </section>
      ) : null}

      {entry.references.length > 0 || entry.printedDates.length > 0 ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
          {[...entry.references, ...entry.printedDates].map((fact) => (
            <ResultFact
              key={`${fact.label}:${fact.value}`}
              label={fact.label}
              value={fact.value}
            />
          ))}
        </dl>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-slate-500">
        {entry.authenticityLabel} · {entry.pageCount} páginas ·{" "}
        {formatBytes(entry.byteLength)} · PDF no conservado
      </p>
    </li>
  );
}

function InfoTile({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof ShieldCheck;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon aria-hidden="true" className="h-5 w-5 text-blue-600" />
      <h2 className="mt-3 font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function ReviewResult({
  result,
  ephemeralMoneyFacts,
  ephemeralDeferralFacts,
  explicitFieldsReview,
  partyFactsReview,
}: {
  result: FiscalNotificationLocalReviewResult;
  ephemeralMoneyFacts: AeatEnforcementMoneyFactsResult | null;
  ephemeralDeferralFacts: AeatDeferralGrantFactsResultV1 | null;
  explicitFieldsReview: ExplicitFieldsReviewViewModelV2 | null;
  partyFactsReview: PartyFactsReviewViewModelV1 | null;
}) {
  const recognizedCandidate = recognizedCandidateFrom(result);
  const copy =
    result.reason === "SUPPORTED_FAMILY_CANDIDATE" && !recognizedCandidate
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
          recognizedCandidate
            ? "border-emerald-200"
            : result.candidates.length > 0
            ? "border-amber-200"
            : "border-blue-200"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {recognizedCandidate
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
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
              recognizedCandidate
                ? "bg-emerald-100 text-emerald-900"
                : "bg-amber-100 text-amber-900"
            }`}
          >
            {recognizedCandidate ? "Documento reconocido" : "Revisa antes de actuar"}
          </span>
        </div>

        {recognizedCandidate ? (
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
          </div>
        ) : result.candidates.length ? (
          <div className="mt-5 space-y-3">
            <h3 className="font-bold text-slate-900">Coincidencias documentales</h3>
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

        {partyFactsReview ? (
          <FiscalNotificationPartyFactsReview viewModel={partyFactsReview} />
        ) : null}

        {explicitFieldsReview ? (
          <FiscalNotificationExplicitFieldsReview
            viewModel={explicitFieldsReview}
          />
        ) : null}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>
            El análisis se ha realizado en este navegador. No se ha llamado a
            un proveedor y el texto no se conserva. Si eliges guardar, solo se
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
        <p className="mt-1 text-sm leading-6 text-amber-900">
          {copy.detail}
        </p>
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
        Importes impresos detectados
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
        Permanecen solo en memoria hasta que pulses{" "}
        <strong>Guardar datos en mi cuenta</strong>. Si los guardas, se conserva
        la cifra estructurada y su procedencia, nunca el PDF ni el texto
        completo.
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
          El documento es una concesión de aplazamiento o fraccionamiento,
          pero esta copia no contiene un cuadro de cuotas completo que pueda
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
            Datos impresos del documento
          </p>
          <h3
            id="deferral-grant-facts-heading"
            className="mt-1 text-lg font-bold text-blue-950"
          >
            Concesión de aplazamiento o fraccionamiento
          </h3>
          <p className="mt-1 text-sm leading-6 text-blue-900">
            Cuotas, importes y vencimientos leídos literalmente de los anexos
            de la concesión.
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
          Alguna fila impresa no cuadra o está incompleta. Se muestran los
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
            label="NIF impreso"
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
            label="Cuenta de pago impresa"
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
                    label="Importe de deuda impreso"
                    value={formatStructuredMoney(
                      schedule.listedDebtAmount.amountCents,
                      "EUR",
                    )}
                  />
                ) : null}
                {schedule.interestStartDate ? (
                  <ResultFact
                    label="Fecha de intereses impresa"
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
                        Vencimiento impreso
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
                        label="Recargo impreso"
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
        Estas son fechas e instrucciones impresas en el documento. No se ha
        marcado ninguna cuota como pagada ni se ha creado un gasto o asiento.
      </p>
    </section>
  );
}

function DeferralFactCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
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
  return currency === "EUR"
    ? `${value} €`
    : `${value} · moneda no confirmada`;
}

function formatReviewTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
