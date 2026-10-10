"use client";

import { useId, useState } from "react";
import { Archive, Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/context/AppStore";
import { useCentralSharedBusinessMutations } from "@/hooks/useCentralSharedBusinessMutations";
import { hasLegacyImportProtectionClaim } from "@/lib/document-integrity/legacy-import-attestation";
import { getDeletePolicy } from "@/lib/rectificativas";
import type { Document } from "@/lib/types";
import {
  canManageCentralIssuedInvoice,
  canDeleteReceiptCentrally,
} from "@/lib/central-invoice-authority/management-policy";

interface DeleteDocumentButtonProps {
  doc: Document;
}

export function DeleteDocumentButton({ doc }: DeleteDocumentButtonProps) {
  const { deleteDocument, deleteIssuedDocumentCentrally } = useAppStore();
  const { deleteQuote, deleteDraft, isCentralWorkspace } =
    useCentralSharedBusinessMutations();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const centralDelete =
    canManageCentralIssuedInvoice(doc) ||
    (doc.status !== "borrador" && canDeleteReceiptCentrally(doc));
  const policy = centralDelete
    ? {
        allowed: true,
        level: "simple" as const,
        title: `¿Borrar ${doc.number}?`,
        message:
          doc.type === "factura"
            ? "El servidor eliminará esta factura. No se conservará una copia de recuperación. Su número quedará libre para la próxima factura de la misma serie y empresa; las demás no cambiarán."
            : "El servidor eliminará este recibo y quitará su vínculo con la factura. La factura y su estado de cobro se conservan. No se renumerarán los demás recibos.",
      }
    : isCentralWorkspace &&
        (doc.type === "presupuesto" || doc.status === "borrador")
      ? {
          ...getDeletePolicy(doc),
          message:
            "Se borrará únicamente este documento. No cambiarán los números de los demás documentos.",
        }
      : getDeletePolicy(doc);

  const needsCheckbox =
    policy.level === "legal" || policy.level === "legal_strict";

  if (!policy.allowed) {
    if (!hasLegacyImportProtectionClaim(doc)) return null;

    return (
      <>
        <IconActionButton
          label="Archivar"
          tooltip="Archivar este histórico desde Cuenta → Copias → Mantenimiento"
          onClick={() => setOpen(true)}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Archive className="h-5 w-5" />
        </IconActionButton>

        <Modal
          open={open}
          onClose={handleClose}
          titleId={titleId}
          descriptionId={descriptionId}
          closeOnBackdrop={false}
          initialFocusSelector="[data-modal-initial-focus]"
          panelClassName="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl supports-[height:100dvh]:max-h-[85dvh]"
          testId="archive-imported-document-modal"
        >
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            Archivar histórico importado
          </h2>
          <p
            id={descriptionId}
            className="mt-3 text-sm leading-relaxed text-slate-700"
          >
            Esto no borra ni modifica el PDF, el snapshot ni los datos fiscales.
            Te lleva al mantenimiento seguro para retirar de las listas activas
            los documentos importados que ya no quieres ver.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleClose}
              data-modal-initial-focus
            >
              Cancelar
            </Button>
            <ButtonLink
              href="/cuenta#copias-cuenta"
              fullWidth
              className="text-center"
            >
              Ir a archivar
            </ButtonLink>
          </div>
        </Modal>
      </>
    );
  }

  function handleClose() {
    if (busy) return;
    setOpen(false);
    setConfirmed(false);
    setError(null);
  }

  async function handleConfirm() {
    if (busy || (needsCheckbox && !confirmed)) return;
    setBusy(true);
    setError(null);
    try {
      const quoteResult =
        doc.type === "presupuesto"
          ? await deleteQuote(doc.id)
          : doc.status === "borrador"
            ? await deleteDraft(doc.id)
            : null;
      if (quoteResult && !quoteResult.ok) throw new Error(quoteResult.error);
      const deleted = quoteResult?.ok
        ? quoteResult.value
        : centralDelete
          ? await deleteIssuedDocumentCentrally(doc)
          : deleteDocument(doc.id);
      if (!deleted) throw new Error("No se pudo confirmar el borrado.");
      setOpen(false);
      setConfirmed(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo confirmar el borrado central.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <IconActionButton
        label="Borrar"
        tooltip="Borrar"
        onClick={() => setOpen(true)}
        className="bg-red-50 text-red-600 hover:bg-red-100"
      >
        <Trash2 className="h-5 w-5" />
      </IconActionButton>

      <Modal
        open={open}
        onClose={handleClose}
        titleId={titleId}
        descriptionId={descriptionId}
        closeOnBackdrop={false}
        initialFocusSelector="[data-modal-initial-focus]"
        panelClassName="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl supports-[height:100dvh]:max-h-[85dvh]"
        testId="delete-document-modal"
      >
        <h2 id={titleId} className="text-lg font-bold text-slate-900">
          {policy.title}
        </h2>

        {policy.level !== "simple" && (
          <div
            id={descriptionId}
            className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
          >
            <p className="text-sm font-bold text-amber-900">
              Aviso legal (España)
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-amber-900">
              {policy.message}
            </p>
          </div>
        )}

        {policy.level === "simple" && (
          <p id={descriptionId} className="mt-3 text-sm text-slate-600">
            {policy.message}
          </p>
        )}

        {needsCheckbox && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded"
            />
            <span className="text-sm text-slate-700">
              Entiendo el aviso legal y quiero borrar esta factura bajo mi
              responsabilidad.
            </span>
          </label>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
            disabled={busy}
            data-modal-initial-focus
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleConfirm}
            disabled={busy || (needsCheckbox && !confirmed)}
          >
            {busy ? "Confirmando con servidor…" : "Sí, borrar"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
