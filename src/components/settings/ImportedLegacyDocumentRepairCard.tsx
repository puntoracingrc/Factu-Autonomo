"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveRestore, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
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

const COMPLETENESS_LABELS: Record<
  LegacyImportCompletenessException,
  string
> = {
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
  const [feedback, setFeedback] = useState<Feedback>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const previewKey = `${preview.precondition}:${preview.affectedCount}:${preview.relationshipGroups
    .map((group) => group.groupFingerprint)
    .join(",")}`;

  useEffect(() => {
    setConfirmed(false);
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

  const visible =
    preview.affectedCount > 0 ||
    preview.manualReview.length > 0 ||
    preview.alreadyAttestedDocumentIds.length > 0;
  if (!visible) return null;

  function handleApply() {
    if (!confirmed || preview.affectedCount === 0) return;
    const result = applyImportedLegacyDocumentRepair(preview, data);
    if (result.status === "indeterminate") {
      setFeedback({
        tone: "error",
        message:
          "El navegador no pudo confirmar el estado del almacenamiento. No continúes editando: recarga o exporta una copia antes de reintentar.",
      });
      return;
    }
    if (result.status === "blocked") {
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
            rentabilidad e informes aunque falten campos que Factu exige hoy.
            No se les atribuye un sello moderno ni registro Veri*Factu de Factu.
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
              casos sin evidencia moderna previa. Las carencias antiguas se
              muestran como avisos; esta reparación no las rellena ni corrige.
              Si un importador antiguo tomó el emisor del perfil activo, se
              indica expresamente y no se presenta como dato del archivo fuente.
            </p>
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
              {preview.candidates.map((candidate) => (
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
                    {IMPORTER_LABELS[candidate.importer]} · ID interno: {candidate.documentId}
                  </span>
                  <span className="block text-slate-500">
                    {ISSUER_ORIGIN_LABELS[candidate.issuerOrigin]}
                  </span>
                </li>
              ))}
            </ul>
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
            copia JSON. Esa copia permite deshacer de forma exacta restaurando
            el workspace anterior si después detectas un problema.
          </p>
          <ButtonLink href="#datos-privacidad" variant="secondary">
            Descargar copia antes
          </ButtonLink>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 accent-sky-700"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              He descargado y guardado una copia JSON, he revisado la vista
              previa y confirmo que la base, el IVA y el total coinciden con mis
              documentos históricos declarados. Cuando se muestra una relación,
              confirmo también que sus miembros y vínculos son correctos. Acepto
              conservarlos tal como fueron importados, incluidos los campos
              antiguos incompletos.
            </span>
          </label>
          <Button type="button" onClick={handleApply} disabled={!confirmed}>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Aceptar {preview.affectedCount}
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
