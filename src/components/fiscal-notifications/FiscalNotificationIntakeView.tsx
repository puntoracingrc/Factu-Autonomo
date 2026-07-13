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
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  analyzeFiscalNotificationLocally,
  type FiscalNotificationLocalReviewReason,
  type FiscalNotificationLocalReviewResult,
} from "@/lib/fiscal-notifications/local-review-flow";
import {
  FiscalNotificationPdfError,
  type FiscalNotificationPdfErrorCode,
} from "@/lib/fiscal-notifications/pdf-text-layer-parser";

const FAMILY_LABELS = {
  AEAT_ENFORCEMENT_ORDER_CANDIDATE: "Posible providencia de apremio AEAT",
  AEAT_DEFERRAL_GRANT_CANDIDATE:
    "Posible concesión de aplazamiento o fraccionamiento AEAT",
} as const;

const SIGNAL_LABELS = {
  COMPLETE_REQUIRED_ANCHORS: "Anclas estructurales completas",
  INCOMPLETE_REQUIRED_ANCHORS: "Faltan anclas estructurales",
  CONFLICTING_AUTHORITY_OR_TERRITORY: "Organismo o territorio incompatible",
  CONFLICTING_DOCUMENT_SIGNAL: "El archivo parece una guía u otro documento",
} as const;

const REASON_COPY: Readonly<
  Record<
    FiscalNotificationLocalReviewReason,
    { readonly title: string; readonly detail: string }
  >
> = {
  SUPPORTED_FAMILY_CANDIDATE: {
    title: "Posible familia reconocida",
    detail:
      "El documento coincide con una estructura conocida, pero la clasificación sigue pendiente de revisión.",
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
      "El documento contiene señales incompatibles con las dos plantillas AEAT cubiertas por esta versión.",
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
          detail="El PDF y su texto no se suben ni se guardan."
        />
        <InfoTile
          icon={FileSearch}
          title="Revisión obligatoria"
          detail="Toda clasificación es una propuesta, nunca una confirmación."
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
            Reconoce únicamente indicios de providencia de apremio y concesión
            de aplazamiento o fraccionamiento de la AEAT.
          </li>
          <li>
            Todavía no extrae ni guarda importes, fechas, obligado, expediente,
            cuotas u obligaciones.
          </li>
          <li>
            No consulta sedes oficiales, no ejecuta OCR remoto y no utiliza IA.
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [selectedFile, setSelectedFile] =
    useState<SelectedFileSummary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] =
    useState<FiscalNotificationLocalReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      const controller = controllerRef.current;
      controllerRef.current = null;
      controller?.abort();
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  function clearFileSelection(): void {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setProcessing(false);
    setResult(null);
    setError(null);
    const file = event.currentTarget.files?.item(0) ?? null;
    setSelectedFile(
      file ? { byteLength: file.size, mimeType: file.type } : null,
    );
  }

  function cancelAnalysis(): void {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setProcessing(false);
    setError(null);
    clearFileSelection();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setProcessing(true);
    setResult(null);
    setError(null);
    try {
      const nextResult = await analyzeFiscalNotificationLocally({
        ownerScope,
        documentId: `notification-review:${randomUUID.call(globalThis.crypto)}`,
        file,
        signal: controller.signal,
      });
      if (
        controller.signal.aborted ||
        controllerRef.current !== controller
      ) {
        return;
      }
      setResult(nextResult);
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
        setProcessing(false);
        clearFileSelection();
      }
    }
  }

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
            disabled={processing}
            onChange={handleFileChange}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
          <div className="mt-5 flex flex-col items-start gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={processing}
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
              No mostramos ni conservamos el nombre del archivo. Al recargar,
              el análisis desaparece.
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
            <Button type="submit" disabled={!selectedFile || processing}>
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

      {result ? <ReviewResult result={result} /> : null}
    </>
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
}: {
  result: FiscalNotificationLocalReviewResult;
}) {
  const copy = REASON_COPY[result.reason];
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
          result.status === "REVIEW_REQUIRED"
            ? "border-amber-200"
            : "border-blue-200"
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Resultado local · pendiente de revisión
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
          <span className="inline-flex w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            Revisión humana obligatoria
          </span>
        </div>

        <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <ResultFact label="Páginas" value={String(result.pageCount)} />
          <ResultFact label="Tamaño" value={formatBytes(result.byteLength)} />
          <ResultFact
            label="Huella local"
            value={`${result.sha256.slice(0, 12)}…`}
          />
          <ResultFact
            label="Motor"
            value={
              result.engineId && result.engineVersion
                ? `${result.engineId} · v${result.engineVersion}`
                : "No ejecutado"
            }
          />
        </dl>

        {result.candidates.length ? (
          <div className="mt-5 space-y-3">
            <h3 className="font-bold text-slate-900">
              Familias candidatas
            </h3>
            {result.candidates.map((candidate) => (
              <article
                key={candidate.familyId}
                className="rounded-xl border border-slate-200 p-4"
              >
                <h4 className="font-bold text-slate-900">
                  {FAMILY_LABELS[candidate.familyId]}
                </h4>
                <p className="mt-1 text-sm text-slate-600">
                  {SIGNAL_LABELS[candidate.signalStatus]}
                </p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <ResultFact
                    label="Regla candidata"
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
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
            No hay una familia confirmable. El documento queda como información
            pendiente y no se crea ninguna entidad.
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>
            El análisis se ha realizado en este navegador. No se ha llamado a
            un proveedor, el texto no se conserva y no existe ninguna acción
            automática pendiente.
          </p>
        </div>
      </Card>
    </section>
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
