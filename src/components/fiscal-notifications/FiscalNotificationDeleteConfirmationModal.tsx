"use client";

import { useId } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function FiscalNotificationDeleteConfirmationModal(props: {
  readonly open: boolean;
  readonly title: string;
  readonly relationCount: number;
  readonly driveHref: string | null;
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
      panelClassName="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      testId="delete-fiscal-notification-modal"
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-950">
        Eliminar ficha de Factu
      </h2>
      <div
        id={descriptionId}
        className="mt-3 space-y-3 text-sm leading-6 text-slate-700"
      >
        <p>
          Se eliminarán la ficha <strong>«{props.title}»</strong>, sus datos
          extraídos y sus relaciones locales.
        </p>
        {props.relationCount > 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-950">
            También desaparecerán {props.relationCount}{" "}
            {props.relationCount === 1
              ? "vínculo con otra ficha"
              : "vínculos con otras fichas"}.
          </p>
        ) : null}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
          <p className="font-bold">Google Drive es independiente</p>
          <p className="mt-1">
            Esta acción no elimina, mueve ni modifica ningún archivo de tu
            Google Drive.
          </p>
          {props.driveHref ? (
            <a
              href={props.driveHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 font-bold text-emerald-800 hover:underline"
            >
              Abrir el original en Drive
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
            </a>
          ) : null}
        </div>
        {props.error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 font-semibold text-red-800" role="alert">
            {props.error}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
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
          {props.busy ? "Eliminando…" : "Sí, eliminar ficha de Factu"}
        </Button>
      </div>
    </Modal>
  );
}
