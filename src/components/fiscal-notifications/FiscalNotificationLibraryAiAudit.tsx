"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  AiProcessingConsentNotice,
  useAiProcessingConsent,
} from "@/components/legal/AiProcessingConsentNotice";
import { Button } from "@/components/ui/Button";
import { AI_PROCESSING_CONSENT_VERSION } from "@/lib/ai-consent";
import {
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1,
  FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1,
  parseFiscalNotificationLibraryAiAuditResultV1,
  projectFiscalNotificationLibraryAiAuditInputV1,
  type FiscalNotificationLibraryAiAuditFindingV1,
  type FiscalNotificationLibraryAiAuditResultV1,
  type FiscalNotificationLibraryAiAuditSessionSourceV1,
} from "@/lib/fiscal-notifications/library-ai-audit.v1";
import type { FiscalNotificationDocumentLibraryViewModelV1 } from "@/lib/fiscal-notifications/structured-review-document-library.v1";

type AuditState =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly auditSignature: string }
  | {
      readonly status: "error";
      readonly auditSignature: string;
      readonly message: string;
    }
  | {
      readonly status: "ready";
      readonly auditSignature: string;
      readonly result: FiscalNotificationLibraryAiAuditResultV1;
      readonly usageWarning: string | null;
    };

export function FiscalNotificationLibraryAiAudit({
  viewModel,
  sessionFileInventory,
}: {
  readonly viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >;
  readonly sessionFileInventory: readonly FiscalNotificationLibraryAiAuditSessionSourceV1[];
}) {
  const [state, setState] = useState<AuditState>({ status: "idle" });
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const aiConsent = useAiProcessingConsent();
  const controllerRef = useRef<AbortController | null>(null);
  const auditLimitExceeded =
    viewModel.documents.length >
    FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1;
  const auditPayload = useMemo(
    () =>
      auditLimitExceeded
        ? null
        : projectFiscalNotificationLibraryAiAuditInputV1(
            viewModel,
            sessionFileInventory,
          ),
    [auditLimitExceeded, sessionFileInventory, viewModel],
  );
  const auditPayloadTransportJson = useMemo(
    () => (auditPayload ? JSON.stringify(auditPayload) : ""),
    [auditPayload],
  );
  const auditPayloadPreviewJson = useMemo(
    () => (auditPayload ? JSON.stringify(auditPayload, null, 2) : ""),
    [auditPayload],
  );
  const auditSignature =
    auditPayloadTransportJson || `LIMIT:${viewModel.documents.length}`;
  const latestAuditSignatureRef = useRef(auditSignature);
  latestAuditSignatureRef.current = auditSignature;
  const visibleState: AuditState =
    state.status === "idle" || state.auditSignature === auditSignature
      ? state
      : { status: "idle" };
  const aliasLabels = useMemo(
    () => buildAuditAliasLabels(viewModel, sessionFileInventory),
    [sessionFileInventory, viewModel],
  );

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const previousAuditSignatureRef = useRef(auditSignature);
  useEffect(() => {
    if (previousAuditSignatureRef.current === auditSignature) return;
    previousAuditSignatureRef.current = auditSignature;
    controllerRef.current?.abort();
    setCopyState("idle");
  }, [auditSignature]);

  async function copyAuditPayload(): Promise<void> {
    if (!auditPayload) return;
    try {
      await navigator.clipboard.writeText(auditPayloadTransportJson);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }

  function downloadAuditPayload(): void {
    if (!auditPayload) return;
    const blob = new Blob([auditPayloadTransportJson], {
      type: "application/json;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `revision-fiscal-gpt4o-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function runAudit(): Promise<void> {
    if (
      !auditPayload ||
      visibleState.status === "loading" ||
      !aiConsent.accepted
    ) {
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    const requestedAuditSignature = auditSignature;
    controllerRef.current = controller;
    setState({
      status: "loading",
      auditSignature: requestedAuditSignature,
    });

    try {
      const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
      const supabase = await getSupabaseClientAsync();
      const { data } = (await supabase?.auth.getSession()) ?? {
        data: { session: null },
      };
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Inicia sesión para revisar tus fichas con IA.");
      }
      const response = await fetch("/api/fiscal-notifications/audit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-AI-Consent-Version": AI_PROCESSING_CONSENT_VERSION,
        },
        body: auditPayloadTransportJson,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        readonly data?: unknown;
        readonly error?: unknown;
        readonly modelId?: unknown;
        readonly usageWarning?: unknown;
      } | null;
      if (!response.ok) {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : "No se pudo completar la revisión.",
        );
      }
      if (body?.modelId !== FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1) {
        throw new Error("La revisión no confirmó el modelo solicitado.");
      }
      const result = parseFiscalNotificationLibraryAiAuditResultV1(
        body.data,
        auditPayload,
      );
      if (!result) {
        throw new Error("La revisión devolvió un resultado no válido.");
      }
      if (
        controller.signal.aborted ||
        latestAuditSignatureRef.current !== requestedAuditSignature
      ) {
        return;
      }
      setState({
        status: "ready",
        auditSignature: requestedAuditSignature,
        result,
        usageWarning:
          typeof body.usageWarning === "string" ? body.usageWarning : null,
      });
    } catch (error) {
      if (
        controller.signal.aborted ||
        latestAuditSignatureRef.current !== requestedAuditSignature
      ) {
        return;
      }
      setState({
        status: "error",
        auditSignature: requestedAuditSignature,
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : "No se pudo completar la revisión.",
      });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  return (
    <section
      className="mt-5 border-t border-slate-200 pt-4"
      aria-labelledby="fiscal-notification-ai-audit-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3
            id="fiscal-notification-ai-audit-heading"
            className="text-sm font-bold text-slate-950"
          >
            Revisión cruzada de fichas y relaciones
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {viewModel.documents.length} fichas · {relationCount(viewModel)}{" "}
            relaciones
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={
            auditLimitExceeded ||
            visibleState.status === "loading" ||
            !aiConsent.accepted
          }
          onClick={() => void runAudit()}
          title="Revisar los datos estructurados guardados sin aplicar cambios"
        >
          {visibleState.status === "loading" ? (
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
          ) : visibleState.status === "ready" ? (
            <RefreshCw aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          )}
          {visibleState.status === "loading"
            ? "Revisando todas las fichas…"
            : visibleState.status === "ready"
              ? "Repetir revisión con GPT-4o"
              : "Revisar fichas y relaciones con GPT-4o"}
        </Button>
      </div>

      <div className="mt-4">
        <AiProcessingConsentNotice
          accepted={aiConsent.accepted}
          onAccepted={aiConsent.accept}
          compact
          contextNote="Solo se envían fichas estructuradas con alias. No se envían el PDF, el texto bruto, identidades, referencias reales ni nombres de archivo."
        />
      </div>

      {auditLimitExceeded ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>
            La revisión admite hasta{" "}
            {FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1} fichas por
            ejecución. El listado sigue disponible y no se ha enviado nada.
          </p>
        </div>
      ) : null}

      {auditPayload ? (
        <details className="mt-4 border-y border-slate-200 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-slate-900">
            <FileJson aria-hidden="true" className="h-5 w-5 text-blue-600" />
            <span>Información enviada a GPT-4o</span>
          </summary>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyAuditPayload()}
              >
                <ClipboardCopy aria-hidden="true" className="h-4 w-4" />
                {copyState === "copied" ? "JSON copiado" : "Copiar JSON"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={downloadAuditPayload}
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                Descargar JSON
              </Button>
              {copyState === "error" ? (
                <span
                  className="text-xs font-semibold text-red-700"
                  role="alert"
                >
                  No se pudo copiar el JSON.
                </span>
              ) : null}
            </div>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              {auditPayloadPreviewJson}
            </pre>
          </div>
        </details>
      ) : null}

      {visibleState.status === "error" ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>{visibleState.message}</p>
        </div>
      ) : null}

      {visibleState.status === "ready" ? (
        <AuditResult
          result={visibleState.result}
          usageWarning={visibleState.usageWarning}
          aliasLabels={aliasLabels}
        />
      ) : null}
    </section>
  );
}

function AuditResult({
  result,
  usageWarning,
  aliasLabels,
}: {
  readonly result: FiscalNotificationLibraryAiAuditResultV1;
  readonly usageWarning: string | null;
  readonly aliasLabels: ReadonlyMap<string, string>;
}) {
  return (
    <div className="mt-4 border-t border-slate-200 pt-4" role="status">
      <div className="flex items-start gap-3">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
        />
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-950">
            {result.documentsReviewed} fichas y {result.relationsReviewed}{" "}
            relaciones revisadas
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {resolveAuditAliases(result.summary, aliasLabels)}
          </p>
        </div>
      </div>

      {result.findings.length > 0 ? (
        <ol className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {result.findings.map((finding) => (
            <AuditFinding
              key={finding.id}
              finding={finding}
              aliasLabels={aliasLabels}
            />
          ))}
        </ol>
      ) : null}

      {usageWarning ? (
        <p className="mt-3 text-xs font-semibold text-amber-800">
          {usageWarning}
        </p>
      ) : null}
    </div>
  );
}

function AuditFinding({
  finding,
  aliasLabels,
}: {
  readonly finding: FiscalNotificationLibraryAiAuditFindingV1;
  readonly aliasLabels: ReadonlyMap<string, string>;
}) {
  const tone =
    finding.severity === "HIGH"
      ? "border-red-500 text-red-800"
      : finding.severity === "MEDIUM"
        ? "border-amber-500 text-amber-800"
        : "border-blue-500 text-blue-800";
  return (
    <li className={`border-l-4 px-4 py-4 ${tone}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-950">{finding.title}</h4>
        <span className="text-xs font-bold uppercase">
          {finding.severity === "HIGH"
            ? "Prioridad alta"
            : finding.severity === "MEDIUM"
              ? "Prioridad media"
              : "Observación"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {resolveAuditAliases(finding.detail, aliasLabels)}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-900">
        <strong>Propuesta:</strong>{" "}
        {resolveAuditAliases(finding.recommendation, aliasLabels)}
      </p>
      {finding.documentAliases.length > 0 ||
      finding.relationAliases.length > 0 ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          {[...finding.documentAliases, ...finding.relationAliases]
            .map((alias) => aliasLabels.get(alias) ?? alias)
            .join(" · ")}
        </p>
      ) : null}
      {finding.evidence.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {finding.evidence.map((evidence, index) => (
            <li key={`${finding.id}:evidence:${index}`}>
              {evidence.label}:{" "}
              {resolveAuditAliases(evidence.value, aliasLabels)}
              {evidence.pages.length > 0
                ? ` · pág. ${evidence.pages.join(", ")}`
                : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function buildAuditAliasLabels(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
  sessionSources: readonly FiscalNotificationLibraryAiAuditSessionSourceV1[],
): ReadonlyMap<string, string> {
  const fileAliases = new Map<string, string>();
  const fileNamesByDocumentId = new Map<string, string[]>();
  sessionSources.forEach((source, index) => {
    const fileAlias = `FILE-${String(index + 1).padStart(3, "0")}`;
    fileAliases.set(fileAlias, `${fileAlias} · ${source.fileName}`);
    for (const documentId of source.documentIds) {
      fileNamesByDocumentId.set(documentId, [
        ...new Set([
          ...(fileNamesByDocumentId.get(documentId) ?? []),
          source.fileName,
        ]),
      ]);
    }
  });
  const labels = new Map(fileAliases);
  viewModel.documents.forEach((document, index) => {
    const alias = `DOC-${String(index + 1).padStart(3, "0")}`;
    const fileNames = fileNamesByDocumentId.get(document.key) ?? [];
    labels.set(
      alias,
      fileNames.length > 0 ? `${alias} · ${fileNames.join(" · ")}` : alias,
    );
  });
  const links = new Map(
    viewModel.groups.flatMap((group) =>
      group.links.map((link) => [link.key, link] as const),
    ),
  );
  [...links.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .forEach((link, index) => {
      const alias = `REL-${String(index + 1).padStart(3, "0")}`;
      labels.set(alias, `${alias} · ${link.label}`);
    });
  return labels;
}

function resolveAuditAliases(
  value: string,
  aliasLabels: ReadonlyMap<string, string>,
): string {
  return value.replace(
    /\b(?:DOC|REL|FILE)-\d{3}\b/gu,
    (alias) => aliasLabels.get(alias) ?? alias,
  );
}

function relationCount(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
): number {
  return new Set(
    viewModel.groups.flatMap((group) => group.links.map((link) => link.key)),
  ).size;
}
