"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function FiscalNotificationDeleteAllConfirmationModal(props: {
  readonly open: boolean;
  readonly documentCount: number;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={props.open}
      onClose={props.busy ? () => undefined : props.onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      closeOnBackdrop={false}
      closeOnEscape={!props.busy}
      initialFocusSelector="[data-modal-initial-focus]"
      panelClassName="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
      testId="delete-all-fiscal-notifications-modal"
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-950">
        ¿Borrar las {props.documentCount} fichas guardadas?
      </h2>
      <div
        id={descriptionId}
        className="mt-3 space-y-2 text-sm leading-6 text-slate-700"
      >
        <p>
          Se eliminarán del listado todas las fichas, sus relaciones y sus datos
          estructurados en una única operación.
        </p>
        <p>
          Los archivos originales que existan en Google Drive no se borrarán.
        </p>
        {props.error ? (
          <p
            className="border-l-4 border-red-500 bg-red-50 px-4 py-3 font-semibold text-red-800"
            role="alert"
          >
            {props.error}
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={props.onClose}
          disabled={props.busy}
          data-modal-initial-focus
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          fullWidth
          onClick={props.onConfirm}
          disabled={props.busy}
        >
          {props.busy ? "Borrando…" : "Borrar todas las fichas"}
        </Button>
      </div>
    </Modal>
  );
}
