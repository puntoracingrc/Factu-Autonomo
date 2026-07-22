"use client";

import { useId } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function ProductUnsavedChangesDialog({
  open,
  onContinue,
  onDiscard,
}: {
  open: boolean;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={open}
      onClose={onContinue}
      titleId={titleId}
      descriptionId={descriptionId}
      panelClassName="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
      testId="product-unsaved-changes-dialog"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div>
          <h2 id={titleId} className="text-lg font-bold text-slate-950">
            Hay cambios sin guardar
          </h2>
          <p id={descriptionId} className="mt-1 text-sm font-medium text-slate-600">
            Puedes seguir editando o salir y descartar estos cambios.
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
        >
          Descartar
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Seguir editando
        </button>
      </div>
    </Modal>
  );
}
