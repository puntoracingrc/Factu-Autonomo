"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveRestore, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { BACKUP_SCOPE_NOTICE, downloadBackup } from "@/lib/backup";
import { formatMoney } from "@/lib/calculations";
import {
  buildLegacyImportRepairPreview,
  type LegacyImportRepairReviewReason,
} from "@/lib/document-integrity/legacy-import-attestation";
import type {
  LegacyImportCompletenessException,
  LegacyImportIssuerOrigin,
  LegacyImportSource,
} from "@/lib/types";

type Feedback = { tone: "success" | "error"; message: string } | null;

const CANDIDATE_PAGE_SIZE = 100;

const IMPORTER_LABELS: Record<LegacyImportSource, string> = {
  pcfacturacion: "PCFacturación",
  holded: "Holded",
  facturadirecta: "FacturaDirecta",
  generic_documents: "Word, Excel o importación genérica",
};

const ISSUER_ORIGIN_LABELS: Record<LegacyImportIssuerOrigin, string> = {
  source_document: "emisor leído del documento de origen",
  current_profile_at_import:
    "emisor tomado del perfil activo durante la importación",
  unknown_legacy_import: "origen del encabezado de emisor no acreditado",
};

const REVIEW_LABELS: Record<LegacyImportRepairReviewReason, string> = {
  namespace_type_mismatch: "procedencia no inequívoca",
  duplicate_document_id: "identificador duplicado",
  duplicate_fiscal_identity: "identidad fiscal duplicada",
  draft_document: "documento todavía en borrador",
  unsupported_historical_relation:
    "relación histórica huérfana, unilateral o ambigua",
  existing_integrity_evidence: "evidencia de integridad ya presente",
  verifactu_evidence: "evidencia Veri*Factu presente",
  integrity_quarantine: "documento en cuarentena",
  unexpected_integrity_issue: "incidencia de integridad no compatible",
  issuer_incomplete: "no conserva un encabezado de emisor representable",
  fiscal_content_invalid: "no conserva líneas e importes finitos",
  attestation_invalid: "atestación anterior incoherente",
};

const RELATION_LABELS = {
  rectification_correction: "Factura y rectificativa de corrección",
  rectification_cancellation: "Factura y rectificativa de anulación",
  invoice_receipt: "Factura y recibo",
} as const;

const RELATION_ROLE_LABELS = {
  original_invoice: "Factura original",
  rectification: "Rectificativa",
  invoice: "Factura",
  receipt: "Recibo",
} as const;

const COMPLETENESS_LABELS: Record<LegacyImportCompletenessException, string> = {
  issuer_name_missing: "nombre del emisor",
  issuer_nif_missing_or_nonstandard: "NIF del emisor",
  issuer_address_missing: "dirección del emisor",
  issuer_city_missing: "localidad del emisor",
  issuer_postal_code_missing: "código postal del emisor",
  customer_name_missing: "nombre del cliente",
  customer_nif_missing_or_nonstandard: "NIF del cliente",
  customer_address_missing: "dirección del cliente",
  customer_city_missing: "localidad del cliente",
  customer_postal_code_missing: "código postal del cliente",
  line_description_missing: "descripción de alguna línea",
};

function blockedMessage(reason: string): string {
  if (reason === "stale_preview" || reason === "stale_precondition") {
    return "Los datos cambiaron después de preparar la vista previa. No se aplicó nada; revísala de nuevo.";
  }
  if (reason === "quota_exceeded") {
    return "No hay espacio suficiente para guardar la reparación. Exporta una copia y libera espacio del navegador antes de reintentar.";
  }
  if (reason === "storage_unavailable") {
    return "El navegador ha bloqueado el almacenamiento. No se aplicó nada; habilítalo antes de reintentar.";
  }
  return "No se pudo guardar la reparación de forma segura. No se aplicó ningún cambio.";
}

export function ImportedLegacyDocumentRepairCard() {
  const { data, applyImportedLegacyDocumentRepair } = useAppStore();
  const preview = useMemo(() => buildLegacyImportRepairPreview(data), [data]);
  const [confirmed, setConfirmed] = useState(false);
  const [backupPrecondition, setBackupPrecondition] = useState<string | null>(
    null,
  );
  const [backupFeedback, setBackupFeedback] = useState<Feedback>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [visibleCandidateCount, setVisibleCandidateCount] =
    useState(CANDIDATE_PAGE_SIZE);
  const [isApplying, setIsApplying] = useState(false);
  const [storageStateUnknown, setStorageStateUnknown] = useState(false);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const applyLockRef = useRef(false);
  const previewKey = `${preview.precondition}:${preview.affectedCount}:${preview.relationshipGroups
    .map((group) => group.groupFingerprint)
    .join(",")}`;

  useEffect(() => {
    setConfirmed(false);
    setBackupPrecondition(null);
    setBackupFeedback(null);
    setVisibleCandidateCount(CANDIDATE_PAGE_SIZE);
  }, [previewKey]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  const originCounts = useMemo(() => {
    const counts = new Map<LegacyImportSource, number>();
    preview.candidates.forEach((candidate) =>
      counts.set(candidate.importer, (counts.get(candidate.importer) ?? 0) + 1),
    );
    return [...counts.entries()];
  }, [preview.candidates]);
  const rolloutBundleCount = useMemo(
    () =>
      preview.candidates.filter(
        (candidate) =>
          candidate.evidenceBasis === "verified_importer_rollout_bundle",
      ).length,
    [preview.candidates],
  );
  const backupReady =
    !storageStateUnknown && backupPrecondition === preview.precondition;
  const visibleCandidates = preview.candidates.slice(0, visibleCandidateCount);

  const visible =
    preview.affectedCount > 0 ||
    preview.manualReview.length > 0 ||
    preview.alreadyAttestedDocumentIds.length > 0;
  if (!visible) return null;

  async function handleApply() {
    if (
      applyLockRef.current ||
      storageStateUnknown ||
      !confirmed ||
      !backupReady ||
      preview.affectedCount === 0
    ) {
      return;
    }
    applyLockRef.current = true;
    setIsApplying(true);
    // Cede un frame para que el bloqueo y el mensaje "Guardando" sean visibles
    // antes de recalcular una vista grande y comprimir el commit durable.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    let result: ReturnType<typeof applyImportedLegacyDocumentRepair>;
    try {
      result = applyImportedLegacyDocumentRepair(preview, data);
    } finally {
      applyLockRef.current = false;
      setIsApplying(false);
    }
    if (result.status === "indeterminate") {
      setStorageStateUnknown(true);
      setBackupPrecondition(null);
      setConfirmed(false);
      setFeedback({
        tone: "error",
        message:
          "No se puede confirmar el estado del almacenamiento. No se ha publicado ningún cambio en memoria. Exporta lo visible y recarga antes de continuar; esta acción queda bloqueada hasta entonces.",
      });
      return;
    }
    if (result.status === "blocked") {
      if (
        result.reason === "stale_preview" ||
        result.reason === "stale_precondition"
      ) {
        setBackupPrecondition(null);
        setConfirmed(false);
      }
      setFeedback({ tone: "error", message: blockedMessage(result.reason) });
      return;
    }
    const relationshipCount =
      result.value.appliedRelationshipGroupFingerprints.length;
    const relationshipMessage = relationshipCount
      ? ` y ${relationshipCount} ${
          relationshipCount === 1
            ? "relación histórica confirmada"
            : "relaciones históricas confirmadas"
        }`
      : "";
    setFeedback({
      tone: "success",
      message: `${result.value.appliedDocumentIds.length} ${
        result.value.appliedDocumentIds.length === 1
          ? "documento histórico aceptado"
          : "documentos históricos aceptados"
      }${relationshipMessage} y guardado de forma segura. Ya pueden alimentar las cuentas generales, impuestos y rentabilidad sin atribuirles un sello moderno.`,
    });
  }

  function handleBackupDownload() {
    const result = downloadBackup(data);
    if (!result.ok) {
      setBackupPrecondition(null);
      setConfirmed(false);
      setBackupFeedback({
        tone: "error",
        message: `${result.error} No se puede confirmar la reparación sin esa copia.`,
      });
      return;
    }
    if (storageStateUnknown) {
      setBackupPrecondition(null);
      setConfirmed(false);
      setBackupFeedback({
        tone: "success",
        message: `Copia exportada: ${result.filename}. Recarga la página antes de intentar cualquier reparación.`,
      });
      return;
    }
    setBackupPrecondition(preview.precondition);
    setBackupFeedback({
      tone: "success",
      message: `Copia completa descargada: ${result.filename}. La restauración durable recupera el alcance de datos incluido en el archivo.`,
    });
  }

  return (
    <Card className="mb-6 space-y-4 border-sky-200 bg-sky-50/70">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-sky-700 shadow-sm">
          <ArchiveRestore className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-slate-950">
            Históricos importados pendientes de aceptar
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            La reparación conserva estos documentos como históricos importados,
            aceptados por ti y de solo lectura. La base, el IVA y el total que
            confirmes podrán usarse en el Panel, impuestos, ingresos,
            rentabilidad e informes aunque falten campos que Factu exige hoy. No
            se les atribuye un sello moderno ni registro Veri*Factu de Factu. Un
            paquete técnico coherente que creó el rollout antiguo durante la
            importación tampoco equivale a un sello de emisión ni a un registro
            Veri*Factu real: se valida, queda auditado y se retira al aceptar.
            Las relaciones históricas inequívocas se aceptan siempre con todos
            sus miembros; nunca se inventa ni completa un vínculo ausente.
          </p>
        </div>
      </div>

      {preview.affectedCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-sky-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-900">
              {preview.affectedCount}{" "}
              {preview.affectedCount === 1
                ? "documento histórico"
                : "documentos históricos"}{" "}
              para aceptar
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Solo se incluyen IDs de importadores conocidos, cifras finitas y
              casos sin evidencia moderna real. Las carencias antiguas se
              muestran como avisos; esta reparación no las rellena ni corrige.
              Si un importador antiguo tomó el emisor del perfil activo, se
              indica expresamente y no se presenta como dato del archivo fuente.
            </p>
            {rolloutBundleCount > 0 && (
              <p className="mt-2 text-sm font-semibold text-sky-800">
                {rolloutBundleCount}{" "}
                {rolloutBundleCount === 1
                  ? "paquete técnico de importación verificado"
                  : "paquetes técnicos de importación verificados"}
                . Sus hashes y sello interno son coherentes con el rollout
                legacy; no acreditan emisión por Factu ni envío a la AEAT.
              </p>
            )}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {originCounts.map(([importer, count]) => (
              <li
                key={importer}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-900">
                  {IMPORTER_LABELS[importer]}
                </span>{" "}
                <span className="text-slate-600">· {count}</span>
              </li>
            ))}
          </ul>
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Revisar los {preview.affectedCount} documentos incluidos
            </summary>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1 text-xs text-slate-600">
              {visibleCandidates.map((candidate) => (
                <li
                  key={candidate.documentId}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="block font-semibold text-slate-900">
                    {candidate.documentNumber}
                  </span>
                  <span className="block text-slate-700">
                    Base {formatMoney(candidate.amounts.subtotal)} · IVA{" "}
                    {formatMoney(candidate.amounts.iva)} · Total{" "}
                    {formatMoney(candidate.amounts.total)}
                  </span>
                  {candidate.completenessExceptions.length > 0 && (
                    <span className="block text-amber-700">
                      Datos antiguos ausentes o no normalizados:{" "}
                      {candidate.completenessExceptions
                        .map((exception) => COMPLETENESS_LABELS[exception])
                        .join(", ")}
                    </span>
                  )}
                  <span className="block break-all">
                    {IMPORTER_LABELS[candidate.importer]} · ID interno:{" "}
                    {candidate.documentId}
                  </span>
                  <span className="block text-slate-500">
                    {ISSUER_ORIGIN_LABELS[candidate.issuerOrigin]}
                  </span>
                  {candidate.evidenceBasis ===
                    "verified_importer_rollout_bundle" && (
                    <span className="block font-semibold text-sky-700">
                      Paquete técnico coherente generado por el rollout antiguo
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {visibleCandidates.length < preview.candidates.length && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setVisibleCandidateCount((current) =>
                    Math.min(
                      current + CANDIDATE_PAGE_SIZE,
                      preview.candidates.length,
                    ),
                  )
                }
              >
                Mostrar{" "}
                {Math.min(
                  CANDIDATE_PAGE_SIZE,
                  preview.candidates.length - visibleCandidates.length,
                )}{" "}
                más
              </Button>
            )}
          </details>
          {preview.relationshipGroups.length > 0 && (
            <details className="rounded-xl border border-violet-200 bg-violet-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-violet-950">
                Revisar {preview.relationshipGroups.length}{" "}
                {preview.relationshipGroups.length === 1
                  ? "relación histórica incluida"
                  : "relaciones históricas incluidas"}
              </summary>
              <ul className="mt-3 space-y-3 text-xs text-slate-700">
                {preview.relationshipGroups.map((group) => (
                  <li
                    key={group.groupFingerprint}
                    className="rounded-xl border border-violet-200 bg-white p-3"
                  >
                    <span className="block font-semibold text-violet-950">
                      {RELATION_LABELS[group.relation]}
                    </span>
                    <span className="mt-1 block text-slate-600">
                      Se guardará como una sola relación atómica. Si cualquiera
                      de sus miembros cambia, no se aplicará nada.
                    </span>
                    <ul className="mt-2 space-y-2">
                      {group.members.map((member) => (
                        <li
                          key={`${group.groupFingerprint}:${member.documentId}`}
                          className="rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="font-semibold text-slate-900">
                            {RELATION_ROLE_LABELS[member.role]} ·{" "}
                            {member.documentNumber}
                          </span>
                          <span className="block">
                            Base {formatMoney(member.amounts.subtotal)} · IVA{" "}
                            {formatMoney(member.amounts.iva)} · Total{" "}
                            {formatMoney(member.amounts.total)}
                          </span>
                          <span className="block break-all text-slate-500">
                            ID interno: {member.documentId}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-sm text-slate-700">
            Factu no conserva el archivo de origen de estas importaciones.
            Guarda tus Word, Excel, PDF o exportaciones originales junto a una
            copia JSON del alcance exportable. Esa copia permite recuperar los
            datos de negocio anteriores mediante la restauración durable de
            Cuenta si después detectas un problema.
          </p>
          <p className="text-xs text-slate-600">{BACKUP_SCOPE_NOTICE}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={handleBackupDownload}
            disabled={isApplying}
          >
            Descargar copia JSON completa antes
          </Button>
          {backupFeedback && (
            <p
              role={backupFeedback.tone === "error" ? "alert" : "status"}
              className={`text-sm font-semibold ${
                backupFeedback.tone === "success"
                  ? "text-emerald-800"
                  : "text-red-700"
              }`}
            >
              {backupFeedback.message}
            </p>
          )}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-sky-700"
              checked={confirmed}
              disabled={!backupReady || isApplying || storageStateUnknown}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              {backupReady
                ? "He guardado la copia JSON completa recién descargada, he revisado la vista previa y confirmo que la base, el IVA y el total coinciden con mis documentos históricos declarados. Cuando se muestra una relación, confirmo también que sus miembros y vínculos son correctos. Acepto conservarlos tal como fueron importados, incluidos los campos antiguos incompletos."
                : "Descarga primero la copia JSON completa de este estado. Si cambia cualquier dato del workspace, Factu exigirá una copia nueva antes de confirmar."}
            </span>
          </label>
          <Button
            type="button"
            onClick={() => void handleApply()}
            disabled={
              !confirmed || !backupReady || isApplying || storageStateUnknown
            }
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {isApplying ? "Guardando…" : `Aceptar ${preview.affectedCount}`}
          </Button>
        </div>
      )}

      {preview.manualReview.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <div className="flex items-start gap-2">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {preview.manualReview.length}{" "}
                {preview.manualReview.length === 1
                  ? "documento excluido"
                  : "documentos excluidos"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Requieren revisión manual y no se cambiarán automáticamente.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                {preview.manualReview.map((item) => (
                  <li key={`${item.documentId}:${item.reasons.join("-")}`}>
                    <span className="font-semibold text-slate-700">
                      {item.documentNumber}
                    </span>{" "}
                    ·{" "}
                    {item.reasons
                      .map((reason) => REVIEW_LABELS[reason])
                      .join(", ")}
                    <span className="block break-all">
                      ID interno: {item.documentId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {preview.affectedCount === 0 &&
        preview.alreadyAttestedDocumentIds.length > 0 && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            {preview.alreadyAttestedDocumentIds.length}{" "}
            {preview.alreadyAttestedDocumentIds.length === 1
              ? "histórico ya está aceptado"
              : "históricos ya están aceptados"}
            . No hay cambios seguros pendientes.
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
