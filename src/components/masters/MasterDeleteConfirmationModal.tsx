"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type {
  CustomerDeletionImpact,
  SupplierDeletionImpact,
} from "@/lib/master-record-deletion";

type MasterDeleteConfirmationModalProps =
  | {
      open: boolean;
      kind: "customer";
      name: string;
      impact: CustomerDeletionImpact;
      onClose: () => void;
      onConfirm: () => void;
    }
  | {
      open: boolean;
      kind: "supplier";
      name: string;
      impact: SupplierDeletionImpact;
      onClose: () => void;
      onConfirm: () => void;
    };

function recordLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function MasterDeleteConfirmationModal(
  props: MasterDeleteConfirmationModalProps,
) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      closeOnBackdrop={false}
      initialFocusSelector="[data-modal-initial-focus]"
      panelClassName="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl supports-[height:100dvh]:max-h-[85dvh] dark:border-slate-700 dark:bg-slate-900"
      testId={`delete-${props.kind}-master-modal`}
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-slate-50">
        Borrar ficha de {props.kind === "customer" ? "cliente" : "proveedor"}
      </h2>
      <div id={descriptionId} className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        <p>
          Se borrará solo la ficha maestra de <strong>«{props.name}»</strong>.
        </p>

        {props.kind === "customer" ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-bold">Antes de confirmar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                {recordLabel(props.impact.documentCount, "documento", "documentos")} se
                desvincularán: {recordLabel(props.impact.draftDocumentCount, "borrador", "borradores")} y {recordLabel(props.impact.historicalDocumentCount, "emitido o histórico", "emitidos o históricos")}.
              </li>
              {props.impact.reminderCount > 0 ? (
                <li>
                  {recordLabel(props.impact.reminderCount, "recordatorio", "recordatorios")} conservarán su texto, pero dejarán de abrir esta ficha.
                </li>
              ) : null}
              <li>
                El cliente guardado en cada documento, sus snapshots, PDF y
                hashes no cambiarán.
              </li>
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-bold">Antes de confirmar:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                {recordLabel(props.impact.expenseCount, "gasto", "gastos")} y {recordLabel(props.impact.productCount, "producto", "productos")} se desvincularán.
              </li>
              {props.impact.nifSnapshotCount > 0 ? (
                <li>
                  {recordLabel(props.impact.nifSnapshotCount, "gasto", "gastos")} conservarán ahora el NIF del proveedor como dato histórico.
                </li>
              ) : null}
              <li>
                Se conservarán nombres, NIF de cada documento de compra,
                líneas, precios y costes históricos.
              </li>
            </ul>
          </div>
        )}

        <p className="font-semibold text-slate-900 dark:text-slate-50">
          No se borrará ningún documento, gasto, producto ni histórico.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={props.onClose}
          data-modal-initial-focus
        >
          Cancelar
        </Button>
        <Button type="button" variant="danger" fullWidth onClick={props.onConfirm}>
          Sí, borrar ficha
        </Button>
      </div>
    </Modal>
  );
}
