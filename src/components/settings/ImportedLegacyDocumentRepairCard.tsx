"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArchiveRestore, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
  buildLegacyImportRepairPreview,
  type LegacyImportRepairReviewReason,
} from "@/lib/document-integrity/legacy-import-attestation";
import type { LegacyImportSource } from "@/lib/types";

type Feedback = { tone: "success" | "error"; message: string } | null;

const IMPORTER_LABELS: Record<LegacyImportSource, string> = {
  pcfacturacion: "PCFacturación",
  holded: "Holded",
  facturadirecta: "FacturaDirecta",
  generic_documents: "Word, Excel o importación genérica",
};

const REVIEW_LABELS: Record<LegacyImportRepairReviewReason, string> = {
  namespace_type_mismatch: "procedencia no inequívoca",
  duplicate_document_id: "identificador duplicado",
  draft_document: "documento todavía en borrador",
  unsupported_historical_relation:
    "rectificativa o recibo que requiere revisión",
  existing_integrity_evidence: "evidencia de integridad ya presente",
  verifactu_evidence: "evidencia Veri*Factu presente",
  integrity_quarantine: "documento en cuarentena",
  unexpected_integrity_issue: "incidencia de integridad no compatible",
  issuer_incomplete: "emisor histórico incompleto",
  fiscal_content_invalid: "contenido fiscal incompleto",
  attestation_invalid: "atestación anterior incoherente",
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
  const previewKey = `${preview.precondition}:${preview.affectedCount}`;

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
    setFeedback({
      tone: "success",
      message: `${result.value.appliedDocumentIds.length} ${
        result.value.appliedDocumentIds.length === 1
          ? "documento histórico identificado"
          : "documentos históricos identificados"
      } y guardado de forma segura. Ya pueden alimentar impuestos y rentabilidad sin atribuirles un sello moderno.`,
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
            Históricos importados pendientes de identificar
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            La reparación conserva estos documentos como históricos importados,
            aceptados por ti y de solo lectura. Podrán usarse en impuestos y
            rentabilidad, pero no se les atribuye un sello moderno ni registro
            Veri*Factu de Factu.
          </p>
        </div>
      </div>

      {preview.affectedCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-sky-200 bg-white p-4">
          <div>
            <p className="font-semibold text-slate-900">
              {preview.affectedCount}{" "}
              {preview.affectedCount === 1
                ? "documento seguro"
                : "documentos seguros"}{" "}
              para identificar
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Solo se incluyen IDs de importadores conocidos y casos sin
              evidencia moderna previa. No se infiere por fecha ni por ausencia
              de emisión.
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
                  <span className="block break-all">
                    {IMPORTER_LABELS[candidate.importer]} · ID interno: {candidate.documentId}
                  </span>
                </li>
              ))}
            </ul>
          </details>
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
              previa y confirmo que estos documentos proceden de una importación
              histórica aceptada por mí.
            </span>
          </label>
          <Button type="button" onClick={handleApply} disabled={!confirmed}>
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Identificar {preview.affectedCount}
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
              ? "histórico ya está identificado"
              : "históricos ya están identificados"}
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
