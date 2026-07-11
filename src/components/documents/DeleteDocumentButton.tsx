"use client";

import { useId, useState } from "react";
import { Trash2 } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAppStore } from "@/context/AppStore";
import { getDeletePolicy } from "@/lib/rectificativas";
import type { Document } from "@/lib/types";

interface DeleteDocumentButtonProps {
  doc: Document;
}

export function DeleteDocumentButton({ doc }: DeleteDocumentButtonProps) {
  const { deleteDocument } = useAppStore();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const policy = getDeletePolicy(doc);

  const needsCheckbox =
    policy.level === "legal" || policy.level === "legal_strict";

  if (!policy.allowed) {
    return (
      <IconActionButton
        label="Borrar"
        tooltip={policy.message}
        disabled
        className="cursor-not-allowed bg-slate-50 text-slate-300"
      >
        <Trash2 className="h-5 w-5" />
      </IconActionButton>
    );
  }

  function handleClose() {
    setOpen(false);
    setConfirmed(false);
  }

  function handleConfirm() {
    if (needsCheckbox && !confirmed) return;
    deleteDocument(doc.id);
    handleClose();
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

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            fullWidth
            onClick={handleClose}
            data-modal-initial-focus
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={handleConfirm}
            disabled={needsCheckbox && !confirmed}
          >
            Sí, borrar
          </Button>
        </div>
      </Modal>
    </>
  );
}
