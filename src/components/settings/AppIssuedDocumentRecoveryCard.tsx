"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { documentTotals, formatMoney } from "@/lib/calculations";
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
} as const;

const ROLE_LABELS = {
  original_invoice: "Factura original",
  rectification: "Rectificativa",
  invoice: "Factura",
  receipt: "Recibo",
} as const;

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
    return "La pareja ya no cumple las condiciones de recuperación segura. No se modificó ningún documento.";
  }
  return "No se pudo guardar la reparación de forma segura. No se aplicó ningún cambio.";
}

function fileFailureMessage(error: unknown): string {
  if (!(error instanceof AppIssuedRecoveryPdfFileError)) {
    return "No se pudo verificar el PDF. Elige de nuevo el archivo original.";
  }
  if (error.code === "FILE_TOO_LARGE") {
    return "El PDF supera el tamaño admitido. Conserva el original y usa una copia PDF más ligera del mismo documento.";
  }
  if (error.code === "HASH_UNAVAILABLE") {
    return "Este navegador no puede calcular la huella segura del PDF. Actualízalo antes de continuar.";
  }
  if (error.code === "FILE_READ_FAILED") {
    return "El navegador no pudo leer el PDF. Vuelve a seleccionarlo sin mover ni cerrar el archivo.";
  }
  return "El archivo no presenta un formato PDF reconocible. Conserva siempre el PDF original.";
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
      {(snapshot.paymentTerms || snapshot.notes || snapshot.dueDate) && (
        <p className="break-words">
          <span className="font-semibold">Otros datos visibles:</span>{" "}
          {[snapshot.dueDate, snapshot.paymentTerms, snapshot.notes]
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
  const [confirmedApplyPrecondition, setConfirmedApplyPrecondition] = useState<
    string | null
  >(null);
  const [confirmedRollbackPrecondition, setConfirmedRollbackPrecondition] =
    useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);

  const initialPreview = useMemo(
    () => buildAppIssuedDocumentRecoveryPreview(data),
    [data],
  );
  const preview = useMemo(
    () => buildAppIssuedDocumentRecoveryPreview(data, pdfEvidenceByDocumentId),
    [data, pdfEvidenceByDocumentId],
  );
  const rollbackPreview = useMemo(
    () => buildAppIssuedDocumentRecoveryRollbackPreview(data),
    [data],
  );
  const confirmedApply = confirmedApplyPrecondition === preview.precondition;
  const confirmedRollback =
    confirmedRollbackPrecondition === rollbackPreview.precondition;
  const actionableReview = preview.manualReview.filter(
    (item) =>
      !item.reasons.every((reason) => reason === "pdf_evidence_missing"),
  );
  const preparedPdfDocumentIds = Object.keys(pdfEvidenceByDocumentId).filter(
    (documentId) =>
      data.documents.some((document) => document.id === documentId),
  );

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const visible =
    initialPreview.affectedCount > 0 ||
    initialPreview.requiredPdfDocumentIds.length > 0 ||
    initialPreview.manualReview.length > 0 ||
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
      const snapshot = recoveredSnapshotForDocument(preview, documentId);
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
      setConfirmedApplyPrecondition(null);
      setFeedback({ tone: "error", message: fileFailureMessage(error) });
    } finally {
      setReadingDocumentId((current) =>
        current === documentId ? null : current,
      );
    }
  }

  function handleApply() {
    if (
      !confirmedApply ||
      preview.affectedCount === 0 ||
      preview.requiredPdfDocumentIds.length > 0
    ) {
      return;
    }
    const result = applyAppIssuedDocumentRecovery(preview, data);
    setConfirmedApplyPrecondition(null);
    if (result.status === "indeterminate") {
      setFeedback({
        tone: "error",
        message:
          "El navegador no pudo confirmar el estado del almacenamiento. No continúes editando: recarga o descarga una copia JSON antes de reintentar.",
      });
      return;
    }
    if (result.status === "blocked") {
      setFeedback({
        tone: "error",
        message: fixedFailureMessage(result.reason),
      });
      return;
    }
    setFeedback({
      tone: "success",
      message: `${result.value.appliedRepairIds.length} ${
        result.value.appliedRepairIds.length === 1
          ? "documento recuperado"
          : "documentos recuperados"
      } y guardados de forma segura. Sus cifras vuelven a participar en las cuentas sin atribuirles un sello moderno perdido.`,
    });
  }

  function handleRollback() {
    if (!confirmedRollback || rollbackPreview.affectedCount === 0) return;
    const result = rollbackAppIssuedDocumentRecovery(rollbackPreview, data);
    setConfirmedRollbackPrecondition(null);
    if (result.status === "indeterminate") {
      setFeedback({
        tone: "error",
        message:
          "El navegador no pudo confirmar si el rollback quedó guardado. No continúes editando: recarga o descarga una copia JSON.",
      });
      return;
    }
    if (result.status === "blocked") {
      setFeedback({
        tone: "error",
        message: fixedFailureMessage(result.reason),
      });
      return;
    }
    setFeedback({
      tone: "success",
      message: `${result.value.rolledBackRepairIds.length} ${
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
            Veri*Factu. La pareja completa se valida y guarda de forma atómica.
          </p>
        </div>
      </div>

      {preview.requiredPdfDocumentIds.length > 0 && (
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
            {preview.requiredPdfDocumentIds.map((documentId) => {
              const summary = documentSummary(data, documentId);
              const snapshot = recoveredSnapshotForDocument(
                preview,
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
                      disabled={readingDocumentId === documentId}
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

      {preview.affectedCount > 0 && (
        <div className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-950">
              {preview.candidates.length}{" "}
              {preview.candidates.length === 1
                ? "pareja detectada"
                : "parejas detectadas"}{" "}
              · {preview.affectedCount}{" "}
              {preview.affectedCount === 1
                ? "documento a recuperar"
                : "documentos a recuperar"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Revisa todos los miembros. Si cualquiera cambia antes de guardar,
              la operación completa se bloqueará.
            </p>
          </div>
          <ul className="space-y-3">
            {preview.candidates.map((group) => (
              <li
                key={group.groupFingerprint}
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
                        key={`${group.groupFingerprint}:${member.documentId}`}
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

          {preview.requiredPdfDocumentIds.length === 0 && (
            <>
              <p className="text-sm text-slate-700">
                Descarga antes una copia JSON y conserva también cada PDF
                original. El rollback restaura el estado bloqueado anterior
                mientras no haya cambios posteriores.
              </p>
              <ButtonLink
                href="#datos-privacidad"
                variant="secondary"
                fullWidth
              >
                Descargar copia JSON antes
              </ButtonLink>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 accent-indigo-700"
                  checked={confirmedApply}
                  onChange={(event) =>
                    setConfirmedApplyPrecondition(
                      event.target.checked ? preview.precondition : null,
                    )
                  }
                />
                <span>
                  He descargado una copia JSON, conservo los PDF originales y he
                  comprobado en cada PDF emisor, cliente, número, fecha, todas
                  las líneas, base, IVA, total, notas y relación documental.
                  Entiendo que se recupera ese contenido, pero no el sello de
                  emisión perdido.
                </span>
              </label>
              <Button
                type="button"
                onClick={handleApply}
                disabled={
                  !confirmedApply ||
                  readingDocumentId !== null ||
                  preview.requiredPdfDocumentIds.length > 0
                }
                fullWidth
              >
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Aplicar recuperación a {preview.affectedCount}
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
                key={candidate.groupFingerprint}
                className="min-w-0 rounded-xl border border-emerald-200 bg-white p-3"
              >
                <span className="font-semibold">
                  {RECOVERY_LABELS[candidate.recoveryKind]}
                </span>
                <span className="mt-1 block break-words">
                  {candidate.documentIds
                    .map((documentId) => documentLabel(data, documentId))
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-emerald-950">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              checked={confirmedRollback}
              onChange={(event) =>
                setConfirmedRollbackPrecondition(
                  event.target.checked ? rollbackPreview.precondition : null,
                )
              }
            />
            <span>
              Quiero restaurar exactamente el estado bloqueado anterior y
              conservar el evento de auditoría.
            </span>
          </label>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRollback}
            disabled={!confirmedRollback}
            fullWidth
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            Deshacer recuperación
          </Button>
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
