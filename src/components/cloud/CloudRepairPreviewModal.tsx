"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CloudRepairPreviewModalTable } from "./CloudRepairPreviewModalTable";
import {
  cloudRepairPreviewAllowsConfirmation,
  type CloudRepairConfirmation,
  type CloudRepairPreview,
  type CloudRepairSnapshotSummary,
} from "@/lib/cloud/device-repair-preview";

function formatRecordedAt(value: string | null): string {
  if (!value) return "Fecha no disponible";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SnapshotHeading(props: {
  title: string;
  summary: CloudRepairSnapshotSummary;
  detail: string;
}) {
  return (
    <div className="min-w-0 py-3">
      <p className="text-xs font-semibold uppercase text-slate-500">
        {props.title}
      </p>
      <p className="mt-1 font-semibold text-slate-950">
        {formatRecordedAt(props.summary.recordedAt)}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{props.detail}</p>
      {props.summary.fiscalRevision !== null ? (
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Expediente fiscal: revisión {props.summary.fiscalRevision}
          {props.summary.fiscalUpdatedAt
            ? `, ${formatRecordedAt(props.summary.fiscalUpdatedAt)}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

export function CloudRepairPreviewModal(props: {
  preview: CloudRepairPreview | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (confirmation: CloudRepairConfirmation) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [reductionsAcknowledged, setReductionsAcknowledged] = useState(false);

  useEffect(() => {
    setReductionsAcknowledged(false);
  }, [props.preview?.id]);

  const preview = props.preview;
  if (!preview) return null;
  const canConfirm = cloudRepairPreviewAllowsConfirmation(
    preview,
    reductionsAcknowledged,
  );

  return (
    <Modal
      open
      onClose={props.busy ? () => undefined : props.onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      closeOnBackdrop={false}
      closeOnEscape={!props.busy}
      initialFocusSelector="[data-modal-initial-focus]"
      panelClassName="max-h-[90vh] min-w-0 w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-xl supports-[height:100dvh]:max-h-[90dvh] sm:p-5"
      testId="cloud-repair-preview-modal"
    >
      <h2 id={titleId} className="text-lg font-bold text-slate-950">
        Compara antes de conservar la nube
      </h2>
      <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-700">
        Factu sustituirá los datos de este navegador por la columna Nube. La
        fecha orienta, pero no decide qué versión es correcta.
      </p>

      <div className="mt-4 grid gap-x-5 border-y border-slate-200 sm:grid-cols-2">
        <SnapshotHeading
          title="Este dispositivo"
          summary={preview.local}
          detail="Último cambio registrado localmente."
        />
        <SnapshotHeading
          title="Nube"
          summary={preview.cloud}
          detail={
            preview.cloudSource === "legacy"
              ? "Fecha de la copia antigua de la cuenta."
              : "Cambio más reciente entre los registros de la nube."
          }
        />
      </div>

      <CloudRepairPreviewModalTable counts={preview.counts} />

      {preview.hasReductions ? (
        <div className="mt-4 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm leading-6 text-red-950">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
            <p>
              La nube contiene menos elementos en una o varias categorías
              {preview.hasProtectedReductions
                ? ", incluidos datos documentales o fiscales protegidos."
                : "."}
            </p>
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-red-700"
              checked={reductionsAcknowledged}
              onChange={(event) =>
                setReductionsAcknowledged(event.target.checked)
              }
            />
            <span>
              He revisado las reducciones y quiero conservar esta versión de la
              nube. La versión local se solicitará al navegador como copia
              cifrada.
            </span>
          </label>
        </div>
      ) : (
        <p
          className={`mt-4 border-l-4 px-4 py-3 text-sm leading-6 ${
            preview.exactBusinessStateMatches
              ? "border-emerald-500 bg-emerald-50 text-emerald-950"
              : "border-amber-500 bg-amber-50 text-amber-950"
          }`}
        >
          {preview.exactBusinessStateMatches
            ? "El contenido de negocio de ambas versiones coincide exactamente."
            : "La nube no reduce ninguna categoría contabilizada, pero el contenido exacto de ambas versiones no es idéntico."}
        </p>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-600">
        Antes de reemplazar, Factu volverá a comprobar que ambas versiones son
        exactamente las comparadas. También solicitará al navegador una copia
        cifrada con nombre
        <strong> factu-autonomo-backup-antes-restaurar-…json</strong>. Comprueba
        Descargas o la carpeta configurada en tu navegador.
      </p>

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
          variant={preview.hasReductions ? "danger" : "primary"}
          fullWidth
          onClick={() =>
            props.onConfirm({
              previewId: preview.id,
              reductionsAcknowledged,
            })
          }
          disabled={props.busy || !canConfirm}
        >
          <CloudDownload className="h-4 w-4" />
          {props.busy ? "Reparando…" : "Conservar esta copia de la nube"}
        </Button>
      </div>
    </Modal>
  );
}
