"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
  BACKUP_SCOPE_NOTICE,
  downloadBackup,
  readBackupFile,
} from "@/lib/backup";
import { documentTotals, formatMoney } from "@/lib/calculations";
import {
  appIssuedRecoveryBackupProofKey,
  appIssuedRecoveryExportableDataFingerprint,
  isAppIssuedRecoveryActionReady,
  isAppIssuedRecoveryBackupFileSizeAllowed,
  isAppIssuedRecoveryBackupProofCurrent,
  verifyAppIssuedRecoveryBackup,
  type AppIssuedRecoveryBackupProof,
} from "./app-issued-document-recovery-gate";
import {
  buildAppIssuedDocumentRecoveryPreview,
  buildAppIssuedDocumentRecoveryRollbackPreview,
  type AppIssuedDocumentRecoveryCandidateMember,
  type AppIssuedDocumentRecoveryPdfEvidenceByDocumentId,
  type AppIssuedDocumentRecoveryReviewReason,
} from "@/lib/document-integrity/app-issued-recovery";
import {
  AppIssuedRecoveryPdfFileError,
  readAppIssuedRecoveryPdfFile,
} from "@/lib/document-integrity/app-issued-recovery-file";
import type {
  AppData,
  AppIssuedDocumentRecoveryPdfEvidenceV1,
  Document,
  DocumentSnapshot,
} from "@/lib/types";

type Feedback = { tone: "success" | "error"; message: string } | null;

const RECOVERY_LABELS = {
  pre_canonical_rectification_v1:
    "Factura y rectificativa anteriores al sellado canónico",
  receipt_source_snapshot_gap_v1:
    "Factura y recibo anteriores a la congelación del origen",
  pre_seal_snapshot_pdf_gap_v1:
    "Factura anterior al sellado canónico con snapshot y PDF preservados",
  receipt_source_and_payment_markers_gap_v1:
    "Factura y recibo anteriores a la congelación de origen y cobro",
} as const;

const ROLE_LABELS = {
  original_invoice: "Factura original",
  rectification: "Rectificativa",
  standalone_invoice: "Factura",
  invoice: "Factura",
  receipt: "Recibo",
} as const;

type BackupProof = AppIssuedRecoveryBackupProof<AppData>;

const REVIEW_LABELS: Record<AppIssuedDocumentRecoveryReviewReason, string> = {
  duplicate_document_id: "identificador duplicado",
  legacy_document: "documento histórico importado",
  verifactu_evidence: "evidencia Veri*Factu presente",
  integrity_quarantine: "documento en cuarentena",
  existing_evidence_invalid: "snapshot, hash o sello existente no válido",
  partial_evidence: "bundle moderno incompleto o ambiguo",
  unexpected_integrity_issue: "incidencia de integridad no compatible",
  relationship_invalid: "relación documental incompleta o incoherente",
  pdf_evidence_missing: "falta seleccionar el PDF original",
  pdf_evidence_invalid: "la huella o el resumen confirmado no son coherentes",
  fiscal_content_mismatch: "contenido fiscal no compatible",
  recovery_attestation_invalid: "recuperación anterior incoherente",
};

function fixedFailureMessage(reason: string): string {
  if (reason === "stale_preview" || reason === "stale_precondition") {
    return "Los datos cambiaron después de preparar la vista previa. No se aplicó nada; revísala de nuevo.";
  }
  if (reason === "quota_exceeded") {
    return "No hay espacio suficiente para guardar la reparación. Descarga una copia JSON y libera espacio antes de reintentar.";
  }
  if (reason === "storage_unavailable") {
    return "El navegador ha bloqueado el almacenamiento. No se aplicó nada; habilítalo antes de reintentar.";
  }
  if (reason === "candidate_invalid") {
    return "El grupo ya no cumple las condiciones de recuperación segura. No se modificó ningún documento.";
  }
  return "No se pudo guardar la reparación de forma segura. No se aplicó ningún cambio.";
}

function fileFailureMessage(error: unknown): string {
  if (!(error instanceof AppIssuedRecoveryPdfFileError)) {
    return "No se pudo verificar el PDF. Elige de nuevo el archivo original.";
  }
  if (error.code === "FILE_TOO_LARGE") {
    return "El PDF original supera el tamaño admitido. Consérvalo intacto y detén esta recuperación; no generes ni uses una versión derivada como sustituto.";
  }
  if (error.code === "HASH_UNAVAILABLE") {
    return "Este navegador no puede calcular la huella segura del PDF. Actualízalo antes de continuar.";
  }
  if (error.code === "FILE_READ_FAILED") {
    return "El navegador no pudo leer el PDF. Vuelve a seleccionarlo sin mover ni cerrar el archivo.";
  }
  return "El archivo no presenta un formato PDF reconocible. Conserva siempre el PDF original.";
}

function backupVerificationFailureMessage(
  reason: "invalid_backup" | "backup_mismatch" | "stale_backup",
): string {
  if (reason === "invalid_backup") {
    return "El JSON seleccionado no se puede reimportar como copia válida de Factu. No se habilitó ninguna acción.";
  }
  if (reason === "backup_mismatch") {
    return "El JSON seleccionado es válido, pero no coincide con el estado exportable de esta vista previa. Conserva ambos archivos y selecciona la copia correcta; no se habilitó ninguna acción.";
  }
  return "Los datos, el grupo o su precondición cambiaron durante la verificación. Esta copia queda obsoleta para la acción; descarga y verifica una nueva.";
}

function vatExemptForRecovery(data: AppData, document: Document): boolean {
  const originalId = document.rectification?.originalDocumentId;
  const original = originalId
    ? data.documents.find((entry) => entry.id === originalId)
    : undefined;
  return original?.documentSnapshot?.fiscalContext.vatExempt ?? false;
}

function buildPdfEvidence(
  snapshot: DocumentSnapshot,
  fileEvidence: Awaited<ReturnType<typeof readAppIssuedRecoveryPdfFile>>,
): AppIssuedDocumentRecoveryPdfEvidenceV1 {
  return {
    kind: "external_pdf_user_confirmed",
    sha256: fileEvidence.sha256,
    byteLength: fileEvidence.byteLength,
    mediaType: fileEvidence.mediaType,
    preservation: "user_managed",
    confirmedSummary: {
      number: snapshot.number,
      date: snapshot.date,
      subtotal: snapshot.taxSummary.subtotal,
      iva: snapshot.taxSummary.iva,
      total: snapshot.taxSummary.total,
      confirmedFiscalContentHash: snapshot.snapshotHash,
    },
  };
}

function recoveredSnapshotForDocument(
  preview: ReturnType<typeof buildAppIssuedDocumentRecoveryPreview>,
  documentId: string,
): DocumentSnapshot | undefined {
  return preview.candidates
    .flatMap((candidate) => candidate.members)
    .find((member) => member.documentId === documentId)?.recoveredSnapshot;
}

function identityValues(record: Record<string, unknown>): string {
  return Object.entries(record)
    .filter(
      ([key, value]) =>
        key !== "capturedAt" &&
        key !== "logoUrl" &&
        value !== undefined &&
        value !== null &&
        value !== "",
    )
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function ConfirmedFiscalContent({ snapshot }: { snapshot: DocumentSnapshot }) {
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-2 text-xs text-slate-700">
      <p className="break-words">
        <span className="font-semibold">Emisor:</span>{" "}
        {identityValues(snapshot.issuer as unknown as Record<string, unknown>)}
      </p>
      <p className="break-words">
        <span className="font-semibold">Cliente:</span>{" "}
        {identityValues(
          snapshot.customer as unknown as Record<string, unknown>,
        )}
      </p>
      {snapshot.rectification && (
        <p className="break-words">
          <span className="font-semibold">Rectificación:</span>{" "}
          {snapshot.rectification.type} ·{" "}
          {snapshot.rectification.originalNumber}
          {" · "}
          {snapshot.rectification.originalDate} ·{" "}
          {snapshot.rectification.reason}
        </p>
      )}
      <ul className="space-y-1">
        {snapshot.items.map((item, index) => (
          <li key={item.id} className="break-words">
            <span className="font-semibold">Línea {index + 1}:</span>{" "}
            {item.description} · {item.quantity} {item.unit ?? "ud"} ×{" "}
            {formatMoney(item.unitPrice)} · IVA {item.ivaPercent}% · Total{" "}
            {formatMoney(item.total)}
          </li>
        ))}
      </ul>
      {(snapshot.paymentTerms ||
        snapshot.salesTerms ||
        snapshot.notes ||
        snapshot.dueDate) && (
        <p className="break-words">
          <span className="font-semibold">Otros datos visibles:</span>{" "}
          {[
            snapshot.dueDate,
            snapshot.paymentTerms,
            snapshot.salesTerms,
            snapshot.notes,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function memberAmounts(
  data: AppData,
  member: AppIssuedDocumentRecoveryCandidateMember,
) {
  const snapshot = member.recoveredSnapshot;
  if (snapshot) return snapshot.taxSummary;
  const document = data.documents.find(
    (entry) => entry.id === member.documentId,
  );
  if (!document) return { subtotal: 0, iva: 0, total: 0 };
  if (document.documentSnapshot) return document.documentSnapshot.taxSummary;
  return documentTotals(document, vatExemptForRecovery(data, document));
}

function documentLabel(data: AppData, documentId: string): string {
  return (
    data.documents.find((document) => document.id === documentId)?.number ??
    "Documento"
  );
}

function documentSummary(data: AppData, documentId: string) {
  const document = data.documents.find((entry) => entry.id === documentId);
  if (!document) return null;
  return {
    document,
    amounts: documentTotals(document, vatExemptForRecovery(data, document)),
  };
}

export function AppIssuedDocumentRecoveryCard() {
  const {
    data,
    getCurrentData,
    applyAppIssuedDocumentRecovery,
    rollbackAppIssuedDocumentRecovery,
  } = useAppStore();
  const [pdfEvidenceByDocumentId, setPdfEvidenceByDocumentId] =
    useState<AppIssuedDocumentRecoveryPdfEvidenceByDocumentId>({});
  const [readingDocumentId, setReadingDocumentId] = useState<string | null>(
    null,
  );
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<
    string | null
  >(null);
  const [selectedRollbackCandidateKey, setSelectedRollbackCandidateKey] =
    useState<string | null>(null);
  const [backupProof, setBackupProof] = useState<BackupProof | null>(null);
  const [verifiedBackupProofKey, setVerifiedBackupProofKey] = useState<
    string | null
  >(null);
  const [confirmedBackupProofKey, setConfirmedBackupProofKey] = useState<
    string | null
  >(null);
  const [verifyingBackupProofKey, setVerifyingBackupProofKey] = useState<
    string | null
  >(null);
  const [confirmedApplyDocumentIds, setConfirmedApplyDocumentIds] = useState<
    string[]
  >([]);
  const [confirmedApplyPrecondition, setConfirmedApplyPrecondition] = useState<
    string | null
  >(null);
  const [confirmedRollbackPrecondition, setConfirmedRollbackPrecondition] =
    useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [storageStateUnknown, setStorageStateUnknown] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const backupProofRef = useRef<BackupProof | null>(null);
  const applyLockRef = useRef(false);
  const rollbackLockRef = useRef(false);

  backupProofRef.current = backupProof;

  const initialPreview = useMemo(
    () => buildAppIssuedDocumentRecoveryPreview(data),
    [data],
  );
  const preview = useMemo(
    () => buildAppIssuedDocumentRecoveryPreview(data, pdfEvidenceByDocumentId),
    [data, pdfEvidenceByDocumentId],
  );
  const selectedPreview = useMemo(
    () =>
      buildAppIssuedDocumentRecoveryPreview(data, pdfEvidenceByDocumentId, {
        selectedCandidateKeys: selectedCandidateKey
          ? [selectedCandidateKey]
          : [],
      }),
    [data, pdfEvidenceByDocumentId, selectedCandidateKey],
  );
  const rollbackPreview = useMemo(
    () => buildAppIssuedDocumentRecoveryRollbackPreview(data),
    [data],
  );
  const selectedRollbackPreview = useMemo(
    () =>
      buildAppIssuedDocumentRecoveryRollbackPreview(data, {
        selectedCandidateKeys: selectedRollbackCandidateKey
          ? [selectedRollbackCandidateKey]
          : [],
      }),
    [data, selectedRollbackCandidateKey],
  );
  const selectedGroup = selectedPreview.candidates[0] ?? null;
  const selectedRollbackGroup = selectedRollbackPreview.candidates[0] ?? null;
  const requiredApplyConfirmationIds = selectedGroup
    ? selectedGroup.members.map((member) => member.documentId)
    : [];
  const applyBackupReady = isAppIssuedRecoveryBackupProofCurrent({
    action: "apply",
    candidateKey: selectedCandidateKey,
    precondition: selectedPreview.precondition,
    currentData: data,
    proof: backupProof,
  });
  const rollbackBackupReady = isAppIssuedRecoveryBackupProofCurrent({
    action: "rollback",
    candidateKey: selectedRollbackCandidateKey,
    precondition: selectedRollbackPreview.precondition,
    currentData: data,
    proof: backupProof,
  });
  const currentBackupProofKey = backupProof
    ? appIssuedRecoveryBackupProofKey(backupProof)
    : null;
  const applyBackupVerified = Boolean(
    applyBackupReady &&
    currentBackupProofKey &&
    verifiedBackupProofKey === currentBackupProofKey,
  );
  const rollbackBackupVerified = Boolean(
    rollbackBackupReady &&
    currentBackupProofKey &&
    verifiedBackupProofKey === currentBackupProofKey,
  );
  const applyBackupConfirmed = Boolean(
    applyBackupVerified &&
    currentBackupProofKey &&
    confirmedBackupProofKey === currentBackupProofKey,
  );
  const rollbackBackupConfirmed = Boolean(
    rollbackBackupVerified &&
    currentBackupProofKey &&
    confirmedBackupProofKey === currentBackupProofKey,
  );
  const confirmedApply = Boolean(
    selectedGroup &&
    isAppIssuedRecoveryActionReady({
      action: "apply",
      candidateKey: selectedCandidateKey,
      precondition: selectedPreview.precondition,
      currentData: data,
      proof: backupProof,
      verifiedBackupProofKey,
      confirmedBackupProofKey,
      confirmedGroupPrecondition: confirmedApplyPrecondition,
      requiredDocumentIds: requiredApplyConfirmationIds,
      confirmedDocumentIds: confirmedApplyDocumentIds,
      affectedCount: selectedPreview.affectedCount,
      requiredPdfCount: selectedPreview.requiredPdfDocumentIds.length,
      unknownCandidateCount: selectedPreview.unknownCandidateKeys.length,
      busy: isApplying || isRollingBack,
      storageStateUnknown,
    }),
  );
  const confirmedRollback = Boolean(
    selectedRollbackGroup &&
    isAppIssuedRecoveryActionReady({
      action: "rollback",
      candidateKey: selectedRollbackCandidateKey,
      precondition: selectedRollbackPreview.precondition,
      currentData: data,
      proof: backupProof,
      verifiedBackupProofKey,
      confirmedBackupProofKey,
      confirmedGroupPrecondition: confirmedRollbackPrecondition,
      requiredDocumentIds: [],
      confirmedDocumentIds: [],
      affectedCount: selectedRollbackPreview.affectedCount,
      requiredPdfCount: 0,
      unknownCandidateCount:
        selectedRollbackPreview.unknownCandidateKeys.length,
      busy: isApplying || isRollingBack,
      storageStateUnknown,
    }),
  );
  const actionableReview = preview.manualReview.filter(
    (item) =>
      !item.reasons.every(
        (reason) =>
          reason === "pdf_evidence_missing" || reason === "legacy_document",
      ),
  );
  const initialActionableReview = initialPreview.manualReview.filter(
    (item) =>
      !item.reasons.every(
        (reason) =>
          reason === "pdf_evidence_missing" || reason === "legacy_document",
      ),
  );
  const selectedDocumentIds = new Set(
    selectedGroup?.members.map((member) => member.documentId) ?? [],
  );
  const preparedPdfDocumentIds = Object.keys(pdfEvidenceByDocumentId).filter(
    (documentId) => selectedDocumentIds.has(documentId),
  );

  useEffect(() => {
    setSelectedCandidateKey(null);
    setSelectedRollbackCandidateKey(null);
    setPdfEvidenceByDocumentId({});
    setBackupProof(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setConfirmedApplyDocumentIds([]);
    setConfirmedApplyPrecondition(null);
    setConfirmedRollbackPrecondition(null);
  }, [data]);

  useEffect(() => {
    setBackupProof(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setConfirmedApplyDocumentIds([]);
    setConfirmedApplyPrecondition(null);
  }, [selectedCandidateKey, selectedPreview.precondition]);

  useEffect(() => {
    setBackupProof(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setConfirmedRollbackPrecondition(null);
  }, [selectedRollbackCandidateKey, selectedRollbackPreview.precondition]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const visible =
    initialPreview.affectedCount > 0 ||
    initialPreview.requiredPdfDocumentIds.length > 0 ||
    initialActionableReview.length > 0 ||
    initialPreview.alreadyAppliedRepairIds.length > 0 ||
    preview.affectedCount > 0 ||
    rollbackPreview.affectedCount > 0 ||
    rollbackPreview.blockedRepairIds.length > 0;
  if (!visible) return null;

  async function handlePdfSelection(documentId: string, file: File) {
    const expected = data;
    setReadingDocumentId(documentId);
    setFeedback(null);
    try {
      const document = expected.documents.find(
        (entry) => entry.id === documentId,
      );
      if (!document) {
        setFeedback({
          tone: "error",
          message:
            "El documento ya no existe en la vista actual. No se guardó ninguna evidencia.",
        });
        return;
      }
      const fileEvidence = await readAppIssuedRecoveryPdfFile(file);
      if (getCurrentData() !== expected) {
        setFeedback({
          tone: "error",
          message:
            "Los datos cambiaron mientras se verificaba el PDF. Selecciónalo de nuevo sobre la vista actual.",
        });
        return;
      }
      const snapshot = recoveredSnapshotForDocument(
        selectedPreview,
        documentId,
      );
      if (!snapshot) {
        setFeedback({
          tone: "error",
          message:
            "La vista previa ya no contiene el contenido fiscal completo. No se guardó ninguna evidencia; vuelve a revisarla.",
        });
        return;
      }
      const evidence = buildPdfEvidence(snapshot, fileEvidence);
      setPdfEvidenceByDocumentId((current) => ({
        ...current,
        [documentId]: evidence,
      }));
      setBackupProof(null);
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setVerifyingBackupProofKey(null);
      setConfirmedApplyDocumentIds([]);
      setConfirmedApplyPrecondition(null);
      setFeedback({
        tone: "success",
        message: `Formato y huella SHA-256 de ${document.number} calculados localmente. Factu solo conserva esa huella y el tamaño; tú confirmas el contenido al revisar las cifras.`,
      });
    } catch (error) {
      setPdfEvidenceByDocumentId((current) => {
        const next = { ...current };
        delete next[documentId];
        return next;
      });
      setBackupProof(null);
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setVerifyingBackupProofKey(null);
      setConfirmedApplyDocumentIds([]);
      setConfirmedApplyPrecondition(null);
      setFeedback({ tone: "error", message: fileFailureMessage(error) });
    } finally {
      setReadingDocumentId((current) =>
        current === documentId ? null : current,
      );
    }
  }

  function handleBackupDownload(
    action: BackupProof["action"],
    candidateKey: string,
    precondition: string,
  ) {
    setFeedback(null);
    const expected = data;
    let exportableDataFingerprint: string;
    try {
      exportableDataFingerprint =
        appIssuedRecoveryExportableDataFingerprint(expected);
    } catch {
      setBackupProof(null);
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setVerifyingBackupProofKey(null);
      setConfirmedApplyDocumentIds([]);
      setConfirmedApplyPrecondition(null);
      setConfirmedRollbackPrecondition(null);
      setFeedback({
        tone: "error",
        message:
          "No se pudo calcular la huella estable de la copia. No se descargó ni se habilitó ninguna acción.",
      });
      return;
    }
    const result = downloadBackup(expected);
    if (!result.ok) {
      setBackupProof(null);
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setVerifyingBackupProofKey(null);
      setConfirmedApplyDocumentIds([]);
      setConfirmedApplyPrecondition(null);
      setConfirmedRollbackPrecondition(null);
      setFeedback({
        tone: "error",
        message: `${result.error} No se puede continuar sin esa copia.`,
      });
      return;
    }
    if (getCurrentData() !== expected || storageStateUnknown) {
      setBackupProof(null);
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setVerifyingBackupProofKey(null);
      setConfirmedApplyDocumentIds([]);
      setConfirmedApplyPrecondition(null);
      setConfirmedRollbackPrecondition(null);
      setFeedback({
        tone: storageStateUnknown ? "error" : "success",
        message: storageStateUnknown
          ? `Copia preparada: ${result.filename}. Recarga antes de intentar cualquier recuperación porque el estado durable es desconocido.`
          : `Copia preparada: ${result.filename}, pero los datos cambiaron. Descarga otra sobre la vista actual.`,
      });
      return;
    }
    setBackupProof({
      action,
      candidateKey,
      precondition,
      data: expected,
      filename: result.filename,
      exportableDataFingerprint,
    });
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setFeedback({
      tone: "success",
      message: `Descarga solicitada: ${result.filename}. Selecciona ahora el JSON resultante para demostrar que se puede reimportar y que coincide con esta vista previa.`,
    });
  }

  async function handleBackupVerification(file: File) {
    const expectedProof = backupProof;
    if (!expectedProof) return;

    const expectedProofKey = appIssuedRecoveryBackupProofKey(expectedProof);
    setFeedback(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setConfirmedApplyDocumentIds([]);
    setConfirmedApplyPrecondition(null);
    setConfirmedRollbackPrecondition(null);
    setVerifyingBackupProofKey(expectedProofKey);

    try {
      if (!isAppIssuedRecoveryBackupFileSizeAllowed(file.size)) {
        setFeedback({
          tone: "error",
          message:
            "El JSON seleccionado supera el tamaño máximo seguro para verificarlo en el navegador. No se leyó ni se habilitó ninguna acción.",
        });
        return;
      }
      const importedData = await readBackupFile(file);
      const currentData = getCurrentData();
      const liveProof = backupProofRef.current;
      if (
        !liveProof ||
        appIssuedRecoveryBackupProofKey(liveProof) !== expectedProofKey ||
        currentData !== expectedProof.data
      ) {
        setFeedback({
          tone: "error",
          message: backupVerificationFailureMessage("stale_backup"),
        });
        return;
      }

      const result = verifyAppIssuedRecoveryBackup({
        action: expectedProof.action,
        candidateKey: expectedProof.candidateKey,
        precondition: expectedProof.precondition,
        currentData,
        proof: expectedProof,
        importedData,
      });
      if (result.status === "blocked") {
        setFeedback({
          tone: "error",
          message: backupVerificationFailureMessage(result.reason),
        });
        return;
      }

      setVerifiedBackupProofKey(result.proofKey);
      setFeedback({
        tone: "success",
        message:
          "El JSON seleccionado se puede reimportar y su huella estable coincide con el estado exportable de esta vista previa. Confirma ahora por separado que conservarás esa copia; la aplicación no puede comprobar dónde la has guardado.",
      });
    } catch {
      setVerifiedBackupProofKey(null);
      setConfirmedBackupProofKey(null);
      setFeedback({
        tone: "error",
        message:
          "No se pudo completar la comparación local del JSON. No se habilitó ninguna acción; conserva el archivo y vuelve a seleccionarlo.",
      });
    } finally {
      setVerifyingBackupProofKey((current) =>
        current === expectedProofKey ? null : current,
      );
    }
  }

  function toggleConfirmedDocument(documentId: string, checked: boolean) {
    setConfirmedApplyDocumentIds((current) =>
      checked
        ? [...new Set([...current, documentId])]
        : current.filter((entry) => entry !== documentId),
    );
  }

  async function handleApply() {
    if (
      applyLockRef.current ||
      storageStateUnknown ||
      !confirmedApply ||
      !selectedGroup ||
      selectedPreview.affectedCount === 0 ||
      selectedPreview.requiredPdfDocumentIds.length > 0 ||
      selectedPreview.unknownCandidateKeys.length > 0
    ) {
      return;
    }
    applyLockRef.current = true;
    setIsApplying(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    let result: ReturnType<typeof applyAppIssuedDocumentRecovery>;
    try {
      result = applyAppIssuedDocumentRecovery(selectedPreview, data);
    } finally {
      applyLockRef.current = false;
      setIsApplying(false);
    }
    setBackupProof(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setConfirmedApplyDocumentIds([]);
    setConfirmedApplyPrecondition(null);
    if (result.status === "indeterminate") {
      setStorageStateUnknown(true);
      setFeedback({
        tone: "error",
        message:
          "El navegador no pudo confirmar el estado del almacenamiento. No continúes editando: recarga o descarga una copia JSON antes de reintentar.",
      });
      return;
    }
    if (result.status === "blocked") {
      if (
        result.reason === "stale_preview" ||
        result.reason === "stale_precondition" ||
        result.reason === "candidate_invalid"
      ) {
        setSelectedCandidateKey(null);
      }
      setFeedback({
        tone: "error",
        message: fixedFailureMessage(result.reason),
      });
      return;
    }
    setSelectedCandidateKey(null);
    setFeedback({
      tone: "success",
      message: result.replayed
        ? "Este grupo ya estaba recuperado exactamente con esta evidencia. No se escribió ni duplicó nada."
        : `${result.value.appliedRepairIds.length} ${
            result.value.appliedRepairIds.length === 1
              ? "documento recuperado"
              : "documentos recuperados"
          } y guardados de forma segura. Sus cifras vuelven a participar en las cuentas sin atribuirles un sello moderno perdido.`,
    });
  }

  async function handleRollback() {
    if (
      rollbackLockRef.current ||
      storageStateUnknown ||
      !confirmedRollback ||
      !selectedRollbackGroup ||
      selectedRollbackPreview.affectedCount === 0 ||
      selectedRollbackPreview.unknownCandidateKeys.length > 0
    ) {
      return;
    }
    rollbackLockRef.current = true;
    setIsRollingBack(true);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    let result: ReturnType<typeof rollbackAppIssuedDocumentRecovery>;
    try {
      result = rollbackAppIssuedDocumentRecovery(selectedRollbackPreview, data);
    } finally {
      rollbackLockRef.current = false;
      setIsRollingBack(false);
    }
    setBackupProof(null);
    setVerifiedBackupProofKey(null);
    setConfirmedBackupProofKey(null);
    setVerifyingBackupProofKey(null);
    setConfirmedRollbackPrecondition(null);
    if (result.status === "indeterminate") {
      setStorageStateUnknown(true);
      setFeedback({
        tone: "error",
        message:
          "El navegador no pudo confirmar si el rollback quedó guardado. No continúes editando: recarga o descarga una copia JSON.",
      });
      return;
    }
    if (result.status === "blocked") {
      if (
        result.reason === "stale_preview" ||
        result.reason === "stale_precondition" ||
        result.reason === "candidate_invalid"
      ) {
        setSelectedRollbackCandidateKey(null);
      }
      setFeedback({
        tone: "error",
        message: fixedFailureMessage(result.reason),
      });
      return;
    }
    setSelectedRollbackCandidateKey(null);
    setFeedback({
      tone: "success",
      message: result.replayed
        ? "Este grupo ya estaba deshecho. No se escribió ni duplicó ningún evento."
        : `${result.value.rolledBackRepairIds.length} ${
            result.value.rolledBackRepairIds.length === 1
              ? "documento restaurado"
              : "documentos restaurados"
          } al estado bloqueado anterior. La auditoría del cambio se conserva.`,
    });
  }

  return (
    <Card className="mb-6 space-y-4 overflow-hidden border-indigo-200 bg-indigo-50/70">
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0 rounded-xl bg-white p-2 text-indigo-700 shadow-sm">
          <Wrench className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-950">
            Recuperar documentos emitidos por Factu
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Esta reparación excepcional cubre documentos que Factu emitió antes
            de completar el sellado actual. No los reclasifica como históricos,
            no fabrica el sello perdido y no modifica ningún registro
            Veri*Factu. Cada documento o pareja se revisa y guarda como un solo
            grupo atómico.
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Un registro <strong>TEST local no atestado</strong> puede
            conservarse exactamente como artefacto técnico, pero no acredita
            presentación, registro ni aceptación por la AEAT. Evidencia
            server/production o cualquier registro real incompatible permanece
            bloqueado y no se ofrece para recuperar.
          </p>
          <p className="mt-2 rounded-lg border border-violet-200 bg-white p-2 text-sm font-semibold text-violet-900">
            Si el documento fue solo una prueba, no lo recuperes: usa primero
            «Archivar documentos de prueba», justo encima de este bloque.
          </p>
        </div>
      </div>

      {storageStateUnknown && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
          role="alert"
        >
          El estado durable del navegador es desconocido. Las acciones quedan
          bloqueadas: descarga lo visible si lo necesitas y recarga antes de
          continuar.
        </p>
      )}

      {preview.candidates.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-950">
              Elige un único grupo para revisar
            </p>
            <p className="mt-1 text-sm text-slate-600">
              No se aplican lotes generales. Cada selección tiene su propia
              precondición, copia y confirmación.
            </p>
          </div>
          <ul className="space-y-2">
            {preview.candidates.map((candidate) => (
              <li
                key={candidate.candidateKey}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-slate-950">
                    {RECOVERY_LABELS[candidate.recoveryKind]}
                  </p>
                  <p className="mt-1 break-words text-slate-700">
                    {candidate.members
                      .map((member) => member.documentNumber)
                      .join(" · ")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={storageStateUnknown || isApplying || isRollingBack}
                  onClick={() => {
                    setSelectedRollbackCandidateKey(null);
                    setSelectedCandidateKey(candidate.candidateKey);
                    setFeedback(null);
                  }}
                >
                  {selectedCandidateKey === candidate.candidateKey
                    ? "Grupo seleccionado"
                    : "Revisar este grupo"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedCandidateKey &&
        selectedPreview.unknownCandidateKeys.length > 0 && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            El grupo seleccionado ya no coincide con la vista actual. No hay
            ninguna acción disponible; vuelve a seleccionarlo.
          </p>
        )}

      {selectedPreview.requiredPdfDocumentIds.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-950">
              Selecciona los PDF originales pendientes
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Compara primero número, fecha, base, IVA y total. El archivo se
              verifica solo en este navegador: Factu no guarda ni sube su
              nombre, texto o bytes; conserva únicamente SHA-256 y tamaño.
            </p>
          </div>
          <ul className="space-y-3">
            {selectedPreview.requiredPdfDocumentIds.map((documentId) => {
              const summary = documentSummary(data, documentId);
              const snapshot = recoveredSnapshotForDocument(
                selectedPreview,
                documentId,
              );
              return (
                <li
                  key={documentId}
                  className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="font-semibold text-slate-950">
                    {summary?.document.number ?? "Documento pendiente"}
                  </p>
                  {summary && (
                    <p className="mt-1 text-sm text-slate-700">
                      {summary.document.date} · Base{" "}
                      {formatMoney(summary.amounts.subtotal)} · IVA{" "}
                      {formatMoney(summary.amounts.iva)} · Total{" "}
                      {formatMoney(summary.amounts.total)}
                    </p>
                  )}
                  {snapshot && <ConfirmedFiscalContent snapshot={snapshot} />}
                  <label className="mt-3 block text-sm font-semibold text-slate-800">
                    PDF original de{" "}
                    {summary?.document.number ?? "este documento"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="mt-2 block w-full min-w-0 max-w-full text-sm font-normal text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-800"
                      disabled={
                        storageStateUnknown ||
                        isApplying ||
                        readingDocumentId === documentId
                      }
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void handlePdfSelection(documentId, file);
                      }}
                    />
                  </label>
                  {readingDocumentId === documentId && (
                    <p className="mt-2 text-sm text-indigo-700" role="status">
                      Verificando formato y SHA-256…
                    </p>
                  )}
                  <p className="mt-2 break-all text-xs text-slate-500">
                    ID interno: {documentId}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {preparedPdfDocumentIds.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="flex min-w-0 items-start gap-2">
            <FileCheck2
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <p className="min-w-0">
              Archivos PDF preparados localmente:{" "}
              {preparedPdfDocumentIds
                .map((documentId) => documentLabel(data, documentId))
                .join(", ")}
              . Factu no ha leído ni validado su texto: comprueba manualmente
              las cifras y conserva los originales fuera de la aplicación.
            </p>
          </div>
        </div>
      )}

      {selectedGroup && selectedPreview.affectedCount > 0 && (
        <div className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-950">
              Grupo seleccionado · {selectedPreview.affectedCount}{" "}
              {selectedPreview.affectedCount === 1
                ? "documento a recuperar"
                : "documentos a recuperar"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Revisa todos los miembros. Si cualquiera cambia antes de guardar,
              la operación completa se bloqueará.
            </p>
          </div>
          <ul className="space-y-3">
            {selectedPreview.candidates.map((group) => (
              <li
                key={group.candidateKey}
                className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="font-semibold text-indigo-950">
                  {RECOVERY_LABELS[group.recoveryKind]}
                </p>
                <ul className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
                  {group.members.map((member) => {
                    const amounts = memberAmounts(data, member);
                    return (
                      <li
                        key={`${group.candidateKey}:${member.documentId}`}
                        className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 text-sm"
                      >
                        <p className="font-semibold text-slate-950">
                          {ROLE_LABELS[member.role]} · {member.documentNumber}
                        </p>
                        <p className="mt-1 text-slate-700">
                          Base {formatMoney(amounts.subtotal)} · IVA{" "}
                          {formatMoney(amounts.iva)} · Total{" "}
                          {formatMoney(amounts.total)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {member.needsAttestation
                            ? member.sourcePdfEvidence
                              ? "Formato y huella registrados; contenido pendiente de tu confirmación manual, sin sello moderno retrospectivo."
                              : "Pendiente de seleccionar y contrastar el PDF original."
                            : "Evidencia moderna existente conservada sin cambios."}
                        </p>
                        {member.verifactuDisposition ===
                          "preserved_unattested_test_artifact" && (
                          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold text-amber-900">
                            Registro TEST local no atestado: se preserva sin
                            alterarlo, pero no acredita AEAT.
                          </p>
                        )}
                        {member.recoveredSnapshot && (
                          <ConfirmedFiscalContent
                            snapshot={member.recoveredSnapshot}
                          />
                        )}
                        <p className="mt-1 break-all text-xs text-slate-500">
                          ID interno: {member.documentId}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>

          {selectedPreview.requiredPdfDocumentIds.length === 0 && (
            <>
              <p className="text-sm text-slate-700">
                Descarga ahora una copia JSON completa y conserva también cada
                PDF original. Si cambia cualquier dato o selección tendrás que
                descargar una copia nueva. El rollback restaura el estado
                bloqueado anterior mientras no haya cambios posteriores.
              </p>
              <p className="text-xs text-slate-600">{BACKUP_SCOPE_NOTICE}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  handleBackupDownload(
                    "apply",
                    selectedGroup.candidateKey,
                    selectedPreview.precondition,
                  )
                }
                disabled={storageStateUnknown || isApplying || isRollingBack}
                fullWidth
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                Descargar copia JSON completa para este grupo
              </Button>
              {applyBackupReady && backupProof && (
                <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="break-all text-xs font-semibold text-emerald-900">
                    Descarga iniciada para esta vista: {backupProof.filename}
                  </p>
                  <label className="block text-sm font-semibold text-slate-800">
                    Selecciona el JSON recién descargado para comprobarlo
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="mt-2 block w-full min-w-0 max-w-full text-sm font-normal text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-900"
                      disabled={
                        storageStateUnknown ||
                        isApplying ||
                        isRollingBack ||
                        verifyingBackupProofKey === currentBackupProofKey
                      }
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) void handleBackupVerification(file);
                      }}
                    />
                  </label>
                  <p className="text-xs leading-5 text-slate-600">
                    Se lee solo para verificar que es reimportable y que su
                    huella estable coincide con el estado exportable actual. No
                    restaura ni escribe datos.
                  </p>
                  {verifyingBackupProofKey === currentBackupProofKey && (
                    <p
                      className="text-sm font-semibold text-emerald-800"
                      role="status"
                    >
                      Releyendo y comparando la copia…
                    </p>
                  )}
                  {applyBackupVerified && (
                    <>
                      <p className="text-sm font-semibold text-emerald-900">
                        JSON reimportable y coincidente con esta vista previa.
                      </p>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-300 bg-white p-3 text-sm text-emerald-950">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
                          checked={applyBackupConfirmed}
                          disabled={
                            storageStateUnknown || isApplying || isRollingBack
                          }
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setConfirmedBackupProofKey(
                              checked ? currentBackupProofKey : null,
                            );
                            if (!checked) {
                              setConfirmedApplyDocumentIds([]);
                              setConfirmedApplyPrecondition(null);
                            }
                          }}
                        />
                        <span>
                          Confirmo que este es el JSON recién descargado y
                          verificado, y que lo conservaré junto con los PDF
                          originales antes de aplicar la recuperación.
                        </span>
                      </label>
                    </>
                  )}
                </div>
              )}
              {requiredApplyConfirmationIds.map((documentId) => (
                <label
                  key={`confirm:${selectedGroup.candidateKey}:${documentId}`}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-indigo-700"
                    checked={confirmedApplyDocumentIds.includes(documentId)}
                    disabled={
                      !applyBackupConfirmed || isApplying || storageStateUnknown
                    }
                    onChange={(event) =>
                      toggleConfirmedDocument(documentId, event.target.checked)
                    }
                  />
                  <span>
                    He revisado y confirmo individualmente{" "}
                    <strong>{documentLabel(data, documentId)}</strong>, sus
                    importes y su papel dentro de este grupo. Cuando requiere
                    PDF, también he contrastado emisor, cliente, número, fecha,
                    todas las líneas, base, IVA, total y notas visibles.
                  </span>
                </label>
              ))}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-700"
                  checked={
                    confirmedApplyPrecondition === selectedPreview.precondition
                  }
                  disabled={
                    !applyBackupConfirmed || isApplying || storageStateUnknown
                  }
                  onChange={(event) =>
                    setConfirmedApplyPrecondition(
                      event.target.checked
                        ? selectedPreview.precondition
                        : null,
                    )
                  }
                />
                <span>
                  {selectedGroup.members.length === 1
                    ? "Confirmo este documento individual, su evidencia preservada y la ausencia de una relación documental que no le corresponde."
                    : "Confirmo este grupo exacto y la relación documental entre todos sus miembros."}{" "}
                  Entiendo que la recuperación no recrea un sello perdido ni
                  convierte un registro TEST local en acreditación AEAT.
                </span>
              </label>
              <Button
                type="button"
                onClick={() => void handleApply()}
                disabled={
                  !confirmedApply ||
                  isApplying ||
                  storageStateUnknown ||
                  readingDocumentId !== null ||
                  selectedPreview.requiredPdfDocumentIds.length > 0 ||
                  selectedPreview.unknownCandidateKeys.length > 0
                }
                fullWidth
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {isApplying
                  ? "Guardando grupo…"
                  : `Aplicar solo este grupo (${selectedPreview.affectedCount})`}
              </Button>
            </>
          )}
        </div>
      )}

      {actionableReview.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="flex min-w-0 items-start gap-2">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">
                {actionableReview.length}{" "}
                {actionableReview.length === 1
                  ? "documento excluido"
                  : "documentos excluidos"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Presentan evidencia o relaciones ambiguas. No se repararán ni se
                rebajará su protección automáticamente.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {actionableReview.map((item) => (
                  <li key={item.documentId} className="min-w-0">
                    <span className="font-semibold">{item.documentNumber}</span>
                    {" · "}
                    {item.reasons
                      .map((reason) => REVIEW_LABELS[reason])
                      .join(", ")}
                    <span className="block break-all text-xs text-slate-500">
                      ID interno: {item.documentId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {rollbackPreview.affectedCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-semibold text-emerald-950">
            Hay {rollbackPreview.affectedCount}{" "}
            {rollbackPreview.affectedCount === 1
              ? "documento recuperado"
              : "documentos recuperados"}{" "}
            que pueden volver al estado bloqueado anterior.
          </p>
          <ul className="space-y-2 text-sm text-emerald-950">
            {rollbackPreview.candidates.map((candidate) => (
              <li
                key={candidate.candidateKey}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {RECOVERY_LABELS[candidate.recoveryKind]}
                  </span>
                  <span className="mt-1 block break-words">
                    {candidate.documentIds
                      .map((documentId) => documentLabel(data, documentId))
                      .join(" · ")}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={storageStateUnknown || isApplying || isRollingBack}
                  onClick={() => {
                    setSelectedCandidateKey(null);
                    setSelectedRollbackCandidateKey(candidate.candidateKey);
                    setFeedback(null);
                  }}
                >
                  {selectedRollbackCandidateKey === candidate.candidateKey
                    ? "Rollback seleccionado"
                    : "Revisar rollback"}
                </Button>
              </li>
            ))}
          </ul>
          {selectedRollbackGroup &&
            selectedRollbackPreview.unknownCandidateKeys.length === 0 && (
              <div className="space-y-3 rounded-xl border border-emerald-300 bg-white p-3">
                <p className="text-sm text-emerald-950">
                  El rollback afecta solo a este grupo y conserva el historial
                  de auditoría. Descarga primero una copia nueva del estado ya
                  recuperado.
                </p>
                <p className="text-xs text-slate-600">{BACKUP_SCOPE_NOTICE}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    handleBackupDownload(
                      "rollback",
                      selectedRollbackGroup.candidateKey,
                      selectedRollbackPreview.precondition,
                    )
                  }
                  disabled={storageStateUnknown || isApplying || isRollingBack}
                  fullWidth
                >
                  <Download className="h-5 w-5" aria-hidden="true" />
                  Descargar copia JSON antes del rollback
                </Button>
                {rollbackBackupReady && backupProof && (
                  <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <p className="break-all text-xs font-semibold text-emerald-900">
                      Descarga iniciada para este rollback:{" "}
                      {backupProof.filename}
                    </p>
                    <label className="block text-sm font-semibold text-slate-800">
                      Selecciona el JSON recién descargado para comprobarlo
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="mt-2 block w-full min-w-0 max-w-full text-sm font-normal text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-900"
                        disabled={
                          storageStateUnknown ||
                          isApplying ||
                          isRollingBack ||
                          verifyingBackupProofKey === currentBackupProofKey
                        }
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          event.currentTarget.value = "";
                          if (file) void handleBackupVerification(file);
                        }}
                      />
                    </label>
                    <p className="text-xs leading-5 text-slate-600">
                      La lectura local solo comprueba reimportación y
                      coincidencia de huella; no ejecuta el rollback ni restaura
                      datos.
                    </p>
                    {verifyingBackupProofKey === currentBackupProofKey && (
                      <p
                        className="text-sm font-semibold text-emerald-800"
                        role="status"
                      >
                        Releyendo y comparando la copia…
                      </p>
                    )}
                    {rollbackBackupVerified && (
                      <>
                        <p className="text-sm font-semibold text-emerald-900">
                          JSON reimportable y coincidente con este rollback.
                        </p>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-300 bg-white p-3 text-sm text-emerald-950">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
                            checked={rollbackBackupConfirmed}
                            disabled={
                              storageStateUnknown || isApplying || isRollingBack
                            }
                            onChange={(event) => {
                              const checked = event.target.checked;
                              setConfirmedBackupProofKey(
                                checked ? currentBackupProofKey : null,
                              );
                              if (!checked) {
                                setConfirmedRollbackPrecondition(null);
                              }
                            }}
                          />
                          <span>
                            Confirmo que este es el JSON recién descargado y
                            verificado, y que lo conservaré junto con los PDF
                            originales antes de deshacer el grupo.
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                )}
                <label className="flex cursor-pointer items-start gap-3 text-sm text-emerald-950">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
                    checked={
                      confirmedRollbackPrecondition ===
                      selectedRollbackPreview.precondition
                    }
                    disabled={
                      !rollbackBackupConfirmed ||
                      storageStateUnknown ||
                      isRollingBack
                    }
                    onChange={(event) =>
                      setConfirmedRollbackPrecondition(
                        event.target.checked
                          ? selectedRollbackPreview.precondition
                          : null,
                      )
                    }
                  />
                  <span>
                    Quiero restaurar solo{" "}
                    {selectedRollbackGroup.documentIds
                      .map((documentId) => documentLabel(data, documentId))
                      .join(" · ")}{" "}
                    al estado bloqueado anterior y conservar el evento de
                    auditoría.
                  </span>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleRollback()}
                  disabled={
                    !confirmedRollback ||
                    storageStateUnknown ||
                    isRollingBack ||
                    selectedRollbackPreview.unknownCandidateKeys.length > 0
                  }
                  fullWidth
                >
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                  {isRollingBack
                    ? "Guardando rollback…"
                    : "Deshacer solo este grupo"}
                </Button>
              </div>
            )}
        </div>
      )}

      {rollbackPreview.blockedRepairIds.length > 0 && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          No se puede deshacer automáticamente{" "}
          {rollbackPreview.blockedRepairIds.length}{" "}
          {rollbackPreview.blockedRepairIds.length === 1
            ? "reparación"
            : "reparaciones"}{" "}
          porque hubo cambios posteriores o la evidencia ya no coincide. No se
          ha sobrescrito nada.
        </p>
      )}

      {preview.affectedCount === 0 &&
        preview.requiredPdfDocumentIds.length === 0 &&
        actionableReview.length === 0 &&
        preview.alreadyAppliedRepairIds.length > 0 &&
        rollbackPreview.affectedCount === 0 && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            No hay recuperaciones seguras pendientes.
          </p>
        )}

      {feedback && (
        <p
          ref={feedbackRef}
          role={feedback.tone === "error" ? "alert" : "status"}
          aria-live={feedback.tone === "error" ? "assertive" : "polite"}
          tabIndex={-1}
          className={`text-sm font-semibold ${
            feedback.tone === "success" ? "text-emerald-800" : "text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      )}
    </Card>
  );
}
