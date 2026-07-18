"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { downloadBackup } from "@/lib/backup";
import { documentTotals, formatMoney } from "@/lib/calculations";
import {
  buildTestDocumentRetirementPreview,
  buildTestDocumentRetirementRollbackPreview,
  testDocumentRetirementWorkspaceFingerprint,
  type TestDocumentRetirementBlocker,
  type TestDocumentRetirementPreview,
  type TestDocumentRetirementRollbackPreview,
} from "@/lib/document-integrity/test-document-retirement";
import {
  runTestDocumentRetirementRollbackWithSafetyCopy,
  runTestDocumentRetirementWithSafetyCopy,
} from "@/lib/document-integrity/test-document-retirement-command";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type {
  AppData,
  Document,
  TestDocumentRetirementBatchV1,
} from "@/lib/types";
import {
  maskAccountEmail,
  resolveExactDocumentNumbers,
  testDocumentRetirementReadiness,
  testDocumentRetirementRollbackPhrase,
  testDocumentRetirementSelectionCode,
  testDocumentRetirementTenantFingerprint,
  type ExactDocumentNumberResolution,
  type TestDocumentRetirementReadinessBlocker,
} from "./test-document-retirement-gate";

type Feedback = { tone: "success" | "error"; message: string } | null;

interface MfaAssurance {
  ready: boolean;
  currentAal: string | null;
  nextAal: string | null;
}

interface PreparedRetirement {
  resolution: ExactDocumentNumberResolution;
  preview: TestDocumentRetirementPreview;
}

interface PreparedRollback {
  batchId: string;
  preview: TestDocumentRetirementRollbackPreview;
}

const EMPTY_MFA_ASSURANCE: MfaAssurance = {
  ready: false,
  currentAal: null,
  nextAal: null,
};

const READINESS_LABELS: Record<
  TestDocumentRetirementReadinessBlocker,
  string
> = {
  auth_loading: "La sesión todavía se está comprobando.",
  cloud_disabled: "La nube de Factu no está disponible.",
  session_missing: "Inicia sesión con la cuenta owner del espacio.",
  email_unconfirmed: "Confirma el email de la cuenta antes de continuar.",
  demo_workspace: "Sal de la demo: este mantenimiento no actúa sobre datos ficticios del tour.",
  local_handoff_pending: "Resuelve primero qué hacer con los datos locales de este navegador.",
  sync_not_current: "La nube debe mostrar el estado Sincronizado.",
  pending_changes: "Espera a que terminen de subirse todos los cambios pendientes.",
  never_synced: "Este espacio todavía no tiene una sincronización confirmada.",
  mfa_check_pending: "No se ha podido confirmar el nivel MFA de esta sesión.",
  mfa_session_required: "La cuenta tiene MFA: verifica esta sesión en Seguridad.",
};

const BLOCKER_LABELS: Record<
  TestDocumentRetirementBlocker["reason"],
  string
> = {
  no_selection: "No hay documentos seleccionados.",
  duplicate_selection: "La selección contiene el mismo documento más de una vez.",
  invalid_tenant_fingerprint: "No se pudo vincular la operación a la cuenta owner.",
  duplicate_document_id: "Hay un identificador interno duplicado y el caso requiere revisión manual.",
  unknown_document: "Algún documento dejó de existir desde que se preparó la selección.",
  unsupported_document_type: "Solo se pueden archivar facturas y recibos.",
  verifactu_protected: "Hay evidencia Veri*Factu protegida; el documento queda excluido.",
  rectification_relationship: "La rectificativa seleccionada sigue protegida; retira solo la factura original si corresponde.",
  relationship_ambiguous: "La relación factura–recibo no es completa o inequívoca.",
  external_reference: "Otro registro operativo todavía referencia uno de estos documentos.",
  identity_reserved: "La identidad o numeración ya está reservada por un lote anterior.",
  retirement_record_invalid: "El historial no permite reconstruir este lote de forma segura.",
};

function actionFailureMessage(reason: string): string {
  if (reason === "stale_preview" || reason === "stale_precondition") {
    return "Los datos cambiaron después de preparar la vista previa. No se archivó ni restauró nada; prepara una nueva.";
  }
  if (reason === "quota_exceeded") {
    return "No hay espacio suficiente para confirmar la escritura durable. La acción no se publicó.";
  }
  if (reason === "storage_unavailable") {
    return "El navegador no permite confirmar el almacenamiento. La acción no se publicó.";
  }
  if (reason === "candidate_invalid" || reason === "no_candidate") {
    return "El lote ya no cumple las condiciones de seguridad. No se modificó ningún documento.";
  }
  return "No se pudo guardar la acción de forma segura. No se publicó ningún cambio.";
}

function formatAuditDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function batchDocumentNumbers(batch: TestDocumentRetirementBatchV1): string[] {
  return batch.reservedIdentities.map((identity) => identity.number);
}

interface ArchivedAmountSource {
  items: Document["items"];
  documentSnapshot?: {
    taxSummary: { subtotal: number; iva: number; total: number };
  };
}

export function archivedTestDocumentAmounts(document: ArchivedAmountSource): {
  subtotal: number;
  iva: number;
  total: number;
} {
  return document.documentSnapshot?.taxSummary ?? documentTotals(document);
}

export function retirementBacklinkChangeSummary(count: number): string {
  if (count === 0) return "0 otros documentos se modifican.";
  if (count === 1) {
    return "1 otro documento se modifica únicamente para limpiar su vínculo con el recibo archivado.";
  }
  return `${count} otros documentos se modifican únicamente para limpiar su vínculo con los recibos archivados.`;
}

function samePhrase(value: string, expected: string): boolean {
  return Boolean(expected) && value === expected;
}

export function TestDocumentRetirementCard() {
  const {
    data,
    getCurrentData,
    applyTestDocumentRetirement,
    rollbackTestDocumentRetirement,
  } = useAppStore();
  const {
    authReady,
    cloudEnabled,
    user,
    emailConfirmed,
    syncStatus,
    pendingUpload,
    pendingChangeCount,
    localDataHandoffStatus,
    syncNow,
  } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const userId = user?.id ?? null;
  const tenantFingerprint = useMemo(
    () => (userId ? testDocumentRetirementTenantFingerprint(userId) : ""),
    [userId],
  );
  const [mfaAssurance, setMfaAssurance] = useState<MfaAssurance>(
    EMPTY_MFA_ASSURANCE,
  );
  const [mfaChecking, setMfaChecking] = useState(false);
  const [numberInput, setNumberInput] = useState("");
  const [preparedRetirement, setPreparedRetirement] =
    useState<PreparedRetirement | null>(null);
  const [preparedRollback, setPreparedRollback] =
    useState<PreparedRollback | null>(null);
  const [rollbackPhrase, setRollbackPhrase] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busyAction, setBusyAction] = useState<"retire" | "rollback" | null>(
    null,
  );
  const [storageStateUnknown, setStorageStateUnknown] = useState(false);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const retirementPreviewRef = useRef<HTMLDivElement>(null);
  const rollbackPreviewRef = useRef<HTMLDivElement>(null);
  const actionLockRef = useRef(false);

  const refreshMfa = useCallback(async (): Promise<MfaAssurance> => {
    setMfaChecking(true);
    setMfaAssurance(EMPTY_MFA_ASSURANCE);
    if (!cloudEnabled || !userId) {
      setMfaChecking(false);
      return EMPTY_MFA_ASSURANCE;
    }

    try {
      const supabase = await getSupabaseClientAsync();
      if (!supabase) return EMPTY_MFA_ASSURANCE;
      const result = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (result.error) return EMPTY_MFA_ASSURANCE;
      const assurance: MfaAssurance = {
        ready: true,
        currentAal: result.data.currentLevel ?? null,
        nextAal: result.data.nextLevel ?? null,
      };
      setMfaAssurance(assurance);
      return assurance;
    } catch {
      return EMPTY_MFA_ASSURANCE;
    } finally {
      setMfaChecking(false);
    }
  }, [cloudEnabled, userId]);

  useEffect(() => {
    void refreshMfa();
  }, [refreshMfa]);

  const readinessFor = useCallback(
    (assurance: MfaAssurance, current: AppData) =>
      testDocumentRetirementReadiness({
        authReady,
        cloudEnabled,
        userId,
        emailConfirmed,
        demoMode,
        localDataHandoffStatus,
        syncStatus,
        pendingUpload,
        pendingChangeCount: Math.max(
          pendingChangeCount,
          current.meta?.pendingChanges?.length ?? 0,
        ),
        lastSyncedAt: current.meta?.lastSyncedAt,
        mfaReady: assurance.ready,
        currentAal: assurance.currentAal,
        nextAal: assurance.nextAal,
      }),
    [
      authReady,
      cloudEnabled,
      demoMode,
      emailConfirmed,
      localDataHandoffStatus,
      pendingChangeCount,
      pendingUpload,
      syncStatus,
      userId,
    ],
  );

  const readiness = useMemo(
    () => readinessFor(mfaAssurance, data),
    [data, mfaAssurance, readinessFor],
  );
  const workspaceKey = testDocumentRetirementWorkspaceFingerprint(data);
  const retirementHistoryKey = JSON.stringify(
    (data.testDocumentRetirementBatches ?? []).map((batch) => [
      batch.batchId,
      batch.status,
      batch.events.length,
    ]),
  );

  useEffect(() => {
    setPreparedRetirement(null);
    setPreparedRollback(null);
    setRollbackPhrase("");
  }, [retirementHistoryKey, tenantFingerprint, workspaceKey]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  useEffect(() => {
    if (preparedRetirement) retirementPreviewRef.current?.focus();
  }, [preparedRetirement]);

  useEffect(() => {
    if (preparedRollback) rollbackPreviewRef.current?.focus();
  }, [preparedRollback]);

  const ownerBatches = useMemo(
    () =>
      (data.testDocumentRetirementBatches ?? [])
        .filter(
          (batch) =>
            Boolean(tenantFingerprint) &&
            batch.tenantFingerprint === tenantFingerprint,
        )
        .slice()
        .reverse(),
    [data.testDocumentRetirementBatches, tenantFingerprint],
  );
  const selectedRollbackBatch = preparedRollback
    ? ownerBatches.find(
        (batch) => batch.batchId === preparedRollback.batchId,
      ) ?? null
    : null;
  const expectedRollbackPhrase = selectedRollbackBatch
    ? testDocumentRetirementRollbackPhrase(
        selectedRollbackBatch.selectionFingerprint,
      )
    : "";

  function handlePrepareRetirement() {
    setFeedback(null);
    setPreparedRetirement(null);
    if (!readiness.ready || storageStateUnknown) {
      setFeedback({
        tone: "error",
        message:
          "Resuelve todos los requisitos de cuenta, nube y MFA antes de preparar el lote.",
      });
      return;
    }

    const resolution = resolveExactDocumentNumbers(data.documents, numberInput);
    if (
      resolution.numbers.length === 0 ||
      resolution.unknownNumbers.length > 0 ||
      resolution.ambiguousNumbers.length > 0 ||
      resolution.duplicateNumbers.length > 0
    ) {
      setPreparedRetirement({
        resolution,
        preview: buildTestDocumentRetirementPreview(data, {
          selectedDocumentIds: resolution.selectedDocumentIds,
          tenantFingerprint,
        }),
      });
      return;
    }

    const preview = buildTestDocumentRetirementPreview(data, {
      selectedDocumentIds: resolution.selectedDocumentIds,
      tenantFingerprint,
    });
    setPreparedRetirement({ resolution, preview });
  }

  function handlePrepareRollback(batchId: string) {
    setFeedback(null);
    setRollbackPhrase("");
    setPreparedRollback({
      batchId,
      preview: buildTestDocumentRetirementRollbackPreview(
        data,
        batchId,
        tenantFingerprint,
      ),
    });
  }

  async function handleRetirement() {
    if (
      actionLockRef.current ||
      storageStateUnknown ||
      !preparedRetirement ||
      !preparedRetirement.preview.candidate ||
      preparedRetirement.preview.blockers.length > 0
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction("retire");
    setFeedback(null);
    try {
      const currentAssurance = await refreshMfa();
      const currentReadiness = readinessFor(
        currentAssurance,
        getCurrentData(),
      );
      if (!currentReadiness.ready) {
        setFeedback({
          tone: "error",
          message:
            "La cuenta, la nube o la sesión MFA dejaron de estar listas. No se preparó la copia ni se archivó nada.",
        });
        return;
      }

      const safetyResult = runTestDocumentRetirementWithSafetyCopy({
        getCurrent: getCurrentData,
        downloadCurrent: (current, createdAt) =>
          downloadBackup(current, {
            purpose: "pre_test_retirement",
            now: () => createdAt,
          }),
        preview: preparedRetirement.preview,
        tenantFingerprint,
        apply: applyTestDocumentRetirement,
      });

      if (safetyResult.status === "backup_failed") {
        setFeedback({
          tone: "error",
          message: `${safetyResult.error} Sin copia previa no se archivó nada.`,
        });
        return;
      }
      if (safetyResult.status === "stale_precondition") {
        setFeedback({
          tone: "error",
          message:
            "Los datos cambiaron mientras se preparaba la copia. Se solicitó la descarga del JSON, pero no se archivó nada; prepara otra vista previa.",
        });
        return;
      }
      if (safetyResult.status === "unexpected_failure") {
        setFeedback({
          tone: "error",
          message:
            "No se pudo completar la copia y el commit como una única acción segura. No se archivó nada.",
        });
        return;
      }

      const result = safetyResult.result;
      if (result.status === "indeterminate") {
        setStorageStateUnknown(true);
        setFeedback({
          tone: "error",
          message:
            "El navegador no puede confirmar el estado durable. Si apareció la descarga solicitada, consérvala y recarga antes de realizar otro mantenimiento.",
        });
        return;
      }
      if (result.status === "blocked") {
        setFeedback({
          tone: "error",
          message: actionFailureMessage(result.reason),
        });
        return;
      }

      setNumberInput("");
      setPreparedRetirement(null);
      setFeedback({
        tone: "success",
        message: `Archivado reversible completado: ${preparedRetirement.preview.affectedCount} ${preparedRetirement.preview.affectedCount === 1 ? "documento" : "documentos"}. Factu preparó automáticamente la copia ${safetyResult.safetyCopyFilename}, guardó el historial y solicitó la sincronización.`,
      });
      void syncNow();
    } finally {
      actionLockRef.current = false;
      setBusyAction(null);
    }
  }

  async function handleRollback() {
    if (
      actionLockRef.current ||
      storageStateUnknown ||
      !preparedRollback ||
      !preparedRollback.preview.candidate ||
      preparedRollback.preview.blockers.length > 0 ||
      !selectedRollbackBatch ||
      !samePhrase(rollbackPhrase, expectedRollbackPhrase)
    ) {
      return;
    }

    actionLockRef.current = true;
    setBusyAction("rollback");
    setFeedback(null);
    try {
      const currentAssurance = await refreshMfa();
      const currentReadiness = readinessFor(
        currentAssurance,
        getCurrentData(),
      );
      if (!currentReadiness.ready) {
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message:
            "La cuenta, la nube o la sesión MFA dejaron de estar listas. No se preparó la copia ni se restauró nada.",
        });
        return;
      }

      const safetyResult = runTestDocumentRetirementRollbackWithSafetyCopy({
        getCurrent: getCurrentData,
        downloadCurrent: (current, createdAt) =>
          downloadBackup(current, {
            purpose: "pre_test_retirement",
            now: () => createdAt,
          }),
        preview: preparedRollback.preview,
        tenantFingerprint,
        rollback: rollbackTestDocumentRetirement,
      });

      if (safetyResult.status === "backup_failed") {
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message: `${safetyResult.error} Sin una copia nueva no se restauró nada.`,
        });
        return;
      }
      if (safetyResult.status === "stale_precondition") {
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message:
            "Los datos cambiaron mientras se preparaba la copia. Se solicitó la descarga del JSON, pero no se restauró nada.",
        });
        return;
      }
      if (safetyResult.status === "unexpected_failure") {
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message:
            "No se pudo completar la copia y el rollback como una única acción segura. No se restauró nada.",
        });
        return;
      }

      const result = safetyResult.result;
      if (result.status === "indeterminate") {
        setStorageStateUnknown(true);
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message:
            "El navegador no puede confirmar el estado durable. Si apareció la descarga solicitada, consérvala y recarga antes de realizar otro mantenimiento.",
        });
        return;
      }
      if (result.status === "blocked") {
        setRollbackPhrase("");
        setFeedback({
          tone: "error",
          message: actionFailureMessage(result.reason),
        });
        return;
      }

      setPreparedRollback(null);
      setRollbackPhrase("");
      setFeedback({
        tone: "success",
        message: `Lote restaurado: ${preparedRollback.preview.affectedCount} ${preparedRollback.preview.affectedCount === 1 ? "documento" : "documentos"}. Descarga previa al rollback solicitada: ${safetyResult.safetyCopyFilename}. La identidad reservada y la auditoría se conservan; se ha solicitado sincronización inmediata.`,
      });
      void syncNow();
    } finally {
      actionLockRef.current = false;
      setBusyAction(null);
    }
  }

  const resolutionHasErrors = Boolean(
    preparedRetirement &&
      (preparedRetirement.resolution.numbers.length === 0 ||
        preparedRetirement.resolution.unknownNumbers.length > 0 ||
        preparedRetirement.resolution.ambiguousNumbers.length > 0 ||
        preparedRetirement.resolution.duplicateNumbers.length > 0),
  );
  const retirementReady = Boolean(
    readiness.ready &&
      !storageStateUnknown &&
      preparedRetirement?.preview.candidate &&
      preparedRetirement.preview.blockers.length === 0 &&
      !resolutionHasErrors,
  );
  const rollbackReady = Boolean(
    readiness.ready &&
      !storageStateUnknown &&
      preparedRollback?.preview.candidate &&
      preparedRollback.preview.blockers.length === 0 &&
      samePhrase(rollbackPhrase, expectedRollbackPhrase),
  );

  return (
    <Card className="mb-6 min-w-0 space-y-5 overflow-hidden border-violet-200 bg-violet-50/70">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-violet-700 shadow-sm">
          <Archive className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-950">
            Mantenimiento · archivar documentos descartados
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Retira de las listas activas únicamente facturas o recibos que tú
            identificas expresamente como descartados. Factu no los clasifica
            automáticamente. La operación conserva una copia exacta, auditoría
            e historial para rollback; nunca libera ni reutiliza su número.
          </p>
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 ${
          readiness.ready
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex items-start gap-2">
          {readiness.ready ? (
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          ) : (
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0" role="status" aria-live="polite">
            <p className="break-words font-semibold text-slate-900">
              {readiness.ready
                ? `Owner verificado · ${maskAccountEmail(user?.email)}`
                : "Mantenimiento bloqueado hasta cumplir todos los requisitos"}
            </p>
            {readiness.ready ? (
              <p className="mt-1 text-sm text-slate-700">
                Nube sincronizada sin pendientes, fuera de demo y nivel MFA de
                esta sesión resuelto.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {readiness.blockers.map((blocker) => (
                  <li key={blocker}>• {READINESS_LABELS[blocker]}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={() => void refreshMfa()}
          disabled={mfaChecking || !cloudEnabled || !userId}
        >
          <RefreshCw
            className={`h-4 w-4 ${mfaChecking ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {mfaChecking ? "Comprobando seguridad…" : "Comprobar sesión y MFA"}
        </Button>
      </div>

      <div className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4">
        <div>
          <h4 className="font-semibold text-slate-900">1. Selección exacta</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Escribe el número completo y exacto de cada registro, respetando
            mayúsculas y signos. Separa varios con comas, punto y coma o saltos
            de línea. No pegues nombres, NIF, emails ni otros datos personales.
          </p>
        </div>
        <label className="block text-sm font-semibold text-slate-800">
          Números de factura o recibo
          <textarea
            value={numberInput}
            onChange={(event) => {
              setNumberInput(event.target.value);
              setPreparedRetirement(null);
            }}
            rows={3}
            autoComplete="off"
            spellCheck={false}
            placeholder="Un número exacto por línea"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
        </label>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={handlePrepareRetirement}
          disabled={
            !readiness.ready ||
            !numberInput.trim() ||
            busyAction !== null ||
            storageStateUnknown
          }
        >
          Preparar vista previa exacta
        </Button>

        {preparedRetirement && (
          <div
            ref={retirementPreviewRef}
            tabIndex={-1}
            className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none"
          >
            <h4 className="font-semibold text-slate-900">
              2. Vista previa sellada
            </h4>
            {preparedRetirement.resolution.unknownNumbers.length > 0 && (
              <p className="break-words text-sm text-red-700">
                No encontrados: {preparedRetirement.resolution.unknownNumbers.join(", ")}
              </p>
            )}
            {preparedRetirement.resolution.ambiguousNumbers.length > 0 && (
              <p className="break-words text-sm text-red-700">
                Números ambiguos: {preparedRetirement.resolution.ambiguousNumbers.join(", ")}
              </p>
            )}
            {preparedRetirement.resolution.duplicateNumbers.length > 0 && (
              <p className="break-words text-sm text-red-700">
                Repetidos en la entrada: {preparedRetirement.resolution.duplicateNumbers.join(", ")}
              </p>
            )}
            {preparedRetirement.preview.blockers.length > 0 && (
              <ul className="space-y-1 text-sm text-red-700">
                {preparedRetirement.preview.blockers.map((blocker, index) => (
                  <li key={`${blocker.reason}-${index}`}>
                    • {BLOCKER_LABELS[blocker.reason]}
                  </li>
                ))}
              </ul>
            )}
            {preparedRetirement.preview.candidate &&
              preparedRetirement.preview.blockers.length === 0 &&
              !resolutionHasErrors && (
                <>
                  <p className="text-sm text-slate-700">
                    Se archivarán exactamente {preparedRetirement.preview.affectedCount}{" "}
                    {preparedRetirement.preview.affectedCount === 1
                      ? "registro"
                      : "registros"}
                    .
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {preparedRetirement.preview.candidate.retiredDocuments.map(
                      ({ document }) => {
                        const amounts = archivedTestDocumentAmounts(document);
                        return (
                          <li
                            key={document.id}
                            className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                          >
                            <p className="break-words font-semibold text-slate-900">
                              {document.number}
                            </p>
                            <p className="mt-1 text-slate-600">
                              {document.type === "recibo" ? "Recibo" : "Factura"}{" "}
                              · {document.date} · estado {document.status}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              Importe archivado · Base{" "}
                              {formatMoney(amounts.subtotal)} · IVA{" "}
                              {formatMoney(amounts.iva)} · Total{" "}
                              {formatMoney(amounts.total)}
                            </p>
                          </li>
                        );
                      },
                    )}
                  </ul>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {retirementBacklinkChangeSummary(
                        preparedRetirement.preview.candidate.backlinkChanges
                          .length,
                      )}
                    </p>
                    {preparedRetirement.preview.candidate.backlinkChanges
                      .length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {preparedRetirement.preview.candidate.backlinkChanges.map(
                          (change) => (
                            <li
                              key={change.documentId}
                              className="break-words"
                            >
                              • Factura superviviente {change.before.number}: se
                              conserva completa; la vista activa dejará de mostrar{" "}
                              <code>receiptDocumentId</code> para retirar el
                              vínculo al recibo archivado.
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-slate-700">
                    Factu preparará automáticamente una copia de seguridad en el
                    mismo clic y conservará un historial reversible. Los números
                    retirados quedan reservados y nunca se reutilizan.
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    fullWidth
                    onClick={() => void handleRetirement()}
                    disabled={!retirementReady || busyAction !== null}
                  >
                    <Archive className="h-5 w-5" aria-hidden="true" />
                    {busyAction === "retire"
                      ? "Comprobando y guardando…"
                      : preparedRetirement.preview.affectedCount === 1
                        ? "Retirar este documento"
                        : `Retirar estos ${preparedRetirement.preview.affectedCount} documentos`}
                  </Button>
                </>
              )}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h4 className="font-semibold text-slate-900">
            Historial y rollback
          </h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Cada transición conserva el lote exacto, el nombre, hash y tamaño
            de los bytes cuya descarga se solicitó. Un rollback solo se habilita
            si el estado actual coincide íntegramente; también prepara una nueva
            copia antes de restaurar.
          </p>
        </div>
        {ownerBatches.length === 0 ? (
          <p className="text-sm text-slate-500">
            Esta cuenta no tiene lotes archivados.
          </p>
        ) : (
          <ul className="space-y-3">
            {ownerBatches.map((batch) => {
              const numbers = batchDocumentNumbers(batch);
              const code = testDocumentRetirementSelectionCode(
                batch.selectionFingerprint,
              );
              const latestEvent = batch.events.at(-1);
              return (
                <li
                  key={batch.batchId}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        Lote {code} · {numbers.length}{" "}
                        {numbers.length === 1 ? "documento" : "documentos"}
                      </p>
                      <p className="mt-1 break-words text-sm text-slate-600">
                        {numbers.join(", ")}
                      </p>
                      {latestEvent && (
                        <div className="mt-1 space-y-1 text-xs text-slate-500">
                          <p>
                            Última acción: {formatAuditDate(latestEvent.at)} ·
                            solicitud de copia{" "}
                            <span className="break-all">
                              {latestEvent.backup.filename}
                            </span>
                          </p>
                          <p className="break-all">
                            SHA-256 {latestEvent.backup.contentSha256} ·{" "}
                            {latestEvent.backup.byteLength.toLocaleString("es-ES")} bytes
                          </p>
                        </div>
                      )}
                    </div>
                    <span
                      className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${
                        batch.status === "applied"
                          ? "bg-violet-100 text-violet-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {batch.status === "applied" ? "Archivado" : "Restaurado"}
                    </span>
                  </div>
                  {batch.status === "applied" && (
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      className="mt-3"
                      onClick={() => handlePrepareRollback(batch.batchId)}
                      disabled={busyAction !== null || storageStateUnknown}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Preparar rollback de este lote
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {preparedRollback && selectedRollbackBatch && (
          <div
            ref={rollbackPreviewRef}
            tabIndex={-1}
            className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-3 outline-none"
          >
            <h4 className="font-semibold text-slate-900">
              Vista previa del rollback · lote{" "}
              {testDocumentRetirementSelectionCode(
                selectedRollbackBatch.selectionFingerprint,
              )}
            </h4>
            {preparedRollback.preview.blockers.length > 0 ||
            !preparedRollback.preview.candidate ? (
              <div className="text-sm text-red-700">
                <p>
                  El estado actual no coincide con el posterior a este lote. No
                  se puede restaurar automáticamente.
                </p>
                <ul className="mt-1 space-y-1">
                  {preparedRollback.preview.blockers.map((blocker, index) => (
                    <li key={`${blocker.reason}-${index}`}>
                      • {BLOCKER_LABELS[blocker.reason]}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className="break-words text-sm leading-6 text-slate-700">
                  Se restaurarán exactamente {preparedRollback.preview.affectedCount}{" "}
                  {preparedRollback.preview.affectedCount === 1
                    ? "documento"
                    : "documentos"}
                  : {batchDocumentNumbers(selectedRollbackBatch).join(", ")}.
                  La auditoría y la reserva de numeración permanecerán.
                </p>
                <label className="block text-sm font-semibold text-slate-800">
                  Para confirmar, escribe exactamente{" "}
                  <code className="break-all rounded bg-white px-1 py-0.5">
                    {expectedRollbackPhrase}
                  </code>
                  <input
                    value={rollbackPhrase}
                    onChange={(event) => setRollbackPhrase(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </label>
                <Button
                  type="button"
                  variant="danger"
                  fullWidth
                  onClick={() => void handleRollback()}
                  disabled={!rollbackReady || busyAction !== null}
                >
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  {busyAction === "rollback"
                    ? "Comprobando y restaurando…"
                    : "Preparar copia y restaurar este lote"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <p
          ref={feedbackRef}
          tabIndex={-1}
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-xl border p-3 text-sm font-semibold ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </p>
      )}

      {storageStateUnknown && (
        <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">
          Mantenimiento deshabilitado hasta recargar: el navegador no pudo
          confirmar el último estado durable.
        </p>
      )}
    </Card>
  );
}
