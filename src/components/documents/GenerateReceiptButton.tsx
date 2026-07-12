"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { IconActionButton, IconActionLink } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { documentDetailPath } from "@/lib/document-links";
import { showFactuToast } from "@/lib/factu/occasional";
import { inspectReceiptGenerationForDisplay } from "@/lib/receipts";
import type { Document } from "@/lib/types";
import { receiptGenerationBlockedMessage } from "./generate-receipt-eligibility";

interface GenerateReceiptButtonProps {
  doc: Document;
}

export function GenerateReceiptButton({ doc }: GenerateReceiptButtonProps) {
  const { data, generateReceiptForInvoice } = useAppStore();
  const [saving, setSaving] = useState(false);
  const inspection = inspectReceiptGenerationForDisplay(
    data.documents,
    doc.id,
  );

  if (doc.type !== "factura") return null;

  if (inspection.status === "existing") {
    const integrityHint = inspection.integrityBlocked
      ? " El recibo existe, pero su integridad está bloqueada; ábrelo para ver el motivo."
      : "";
    return (
      <IconActionLink
        href={documentDetailPath(inspection.receipt)}
        label="Ver recibo"
        tooltip={`Esta factura ya tiene un recibo. Abrir ${inspection.receipt.number}.${integrityHint}`}
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
        label="Recibo"
        tooltip={message}
        onClick={() => showFactuToast(message, 6500)}
        className="bg-amber-50 text-amber-800 hover:bg-amber-100"
      >
        <FileText className="h-5 w-5" />
      </IconActionButton>
    );
  }

  function handleGenerate() {
    if (saving) return;
    setSaving(true);
    try {
      const result = generateReceiptForInvoice(doc.id);
      if (result.status === "created") {
        showFactuToast(`Recibo ${result.receipt.number} creado y guardado.`, 5000);
        return;
      }
      if (result.status === "existing") {
        showFactuToast(
          `Esta factura ya tenía el recibo ${result.receipt.number}. No se ha creado otro.`,
          5500,
        );
        return;
      }
      if (result.status === "blocked") {
        showFactuToast(receiptGenerationBlockedMessage(result.reason), 6500);
        return;
      }
      showFactuToast(
        "No se pudo confirmar el estado del almacenamiento. El recibo no se ha publicado en pantalla; recarga o exporta una copia antes de continuar.",
        7500,
      );
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
      label={saving ? "Guardando" : "Recibo"}
      tooltip="Generar y guardar un recibo vinculado si el cliente lo solicita. No cobra por banco ni pasarela."
      onClick={handleGenerate}
      disabled={saving}
      className="bg-green-50 text-green-700 hover:bg-green-100"
    >
      <FileText className="h-5 w-5" />
    </IconActionButton>
  );
}
