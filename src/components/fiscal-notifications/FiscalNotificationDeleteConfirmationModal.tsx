"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function FiscalNotificationDeleteConfirmationModal(props: {
  readonly open: boolean;
  readonly hasDriveOriginal: boolean;
  readonly busy: boolean;
  readonly error: string | null;
  readonly onClose: () => void;
  readonly onConfirmLocalOnly: () => void;
  readonly onConfirmIncludingDrive: () => void;
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
      testId="delete-fiscal-notification-modal"
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-950">
        {props.hasDriveOriginal
          ? "¿Quieres eliminar también el documento original subido a Google Drive?"
          : "¿Eliminar este documento?"}
      </h2>
      <div
        id={descriptionId}
        className="mt-3 text-sm leading-6 text-slate-700"
      >
        {props.hasDriveOriginal && !props.error ? (
          <p>
            Puedes conservar el original en Drive o enviarlo también a su
            papelera.
          </p>
        ) : null}
        {props.error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-800" role="alert">
            {props.error}
          </p>
        ) : null}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-flow-col sm:auto-cols-fr">
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
        {props.hasDriveOriginal ? (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            onClick={props.onConfirmLocalOnly}
            disabled={props.busy}
          >
            {props.busy ? "Eliminando…" : "Solo ficha"}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="danger"
          fullWidth
          onClick={
            props.hasDriveOriginal
              ? props.onConfirmIncludingDrive
              : props.onConfirmLocalOnly
          }
          disabled={props.busy}
        >
          {props.busy
            ? "Eliminando…"
            : props.hasDriveOriginal
              ? "Ficha y original"
              : "Sí"}
        </Button>
      </div>
    </Modal>
  );
}
