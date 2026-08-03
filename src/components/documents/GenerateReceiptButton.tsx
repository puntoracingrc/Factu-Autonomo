"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { IconActionButton, IconActionLink } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { useCentralReceiptCreate } from "@/hooks/useCentralReceiptCreate";
import { documentDetailPath } from "@/lib/document-links";
import { showFactuToast } from "@/lib/factu/occasional";
import { inspectReceiptGenerationForDisplay } from "@/lib/receipts";
import type { Document } from "@/lib/types";
import { receiptGenerationBlockedMessage } from "./generate-receipt-eligibility";

interface GenerateReceiptButtonProps {
  doc: Document;
}

export function GenerateReceiptButton({ doc }: GenerateReceiptButtonProps) {
  const { data } = useAppStore();
  const { createReceipt } = useCentralReceiptCreate();
  const [saving, setSaving] = useState(false);
  const inspection = inspectReceiptGenerationForDisplay(
    data.documents,
    doc.id,
  );

  if (doc.type !== "factura") return null;

  if (inspection.status === "existing") {
    return (
      <IconActionLink
        href={documentDetailPath(inspection.receipt)}
        label="Ver recibo"
        tooltip="Ver recibo"
        className="bg-green-50 text-green-700 hover:bg-green-100"
      >
        <FileText className="h-5 w-5" />
      </IconActionLink>
    );
  }

  if (inspection.status === "blocked") {
    const message = receiptGenerationBlockedMessage(inspection.reason);
    return (
      <IconActionButton
        label="Crear recibo"
        tooltip="Crear recibo"
        onClick={() => showFactuToast(message, 6500)}
        disabled
        className="cursor-not-allowed bg-amber-50 text-amber-800 opacity-50"
      >
        <FileText className="h-5 w-5" />
      </IconActionButton>
    );
  }

  async function handleGenerate() {
    if (saving) return;
    setSaving(true);
    try {
      const result = await createReceipt(doc.id);
      if (result.ok) {
        if (result.delivery === "existing") {
          showFactuToast(
            `Esta factura ya tenía el recibo ${result.receipt.number}. No se ha creado otro.`,
            5500,
          );
          return;
        }
        showFactuToast(
          `Recibo ${result.receipt.number} creado y guardado.`,
          5000,
        );
        return;
      }
      showFactuToast(result.error, 7500);
    } catch {
      showFactuToast(
        "La generación se interrumpió y no se puede confirmar el estado del guardado. No cierres esta pestaña: recarga o exporta una copia antes de continuar.",
        7500,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <IconActionButton
      label={saving ? "Guardando" : "Crear recibo"}
      tooltip="Crear recibo"
      onClick={handleGenerate}
      disabled={saving}
      className="bg-green-50 text-green-700 hover:bg-green-100"
    >
      <FileText className="h-5 w-5" />
    </IconActionButton>
  );
}
