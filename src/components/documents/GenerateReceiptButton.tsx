"use client";

import { FileText } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { findReceiptForInvoice } from "@/lib/receipts";
import type { Document } from "@/lib/types";
import { isReceiptGenerationEligible } from "./generate-receipt-eligibility";

interface GenerateReceiptButtonProps {
  doc: Document;
}

export function GenerateReceiptButton({ doc }: GenerateReceiptButtonProps) {
  const { data, generateReceiptForInvoice } = useAppStore();

  if (!isReceiptGenerationEligible(doc)) return null;

  const linkedReceipt = findReceiptForInvoice(
    data.documents,
    doc.id,
    doc.receiptDocumentId,
  );
  if (linkedReceipt) return null;

  return (
    <IconActionButton
      label="Recibo"
      tooltip="Generar recibo vinculado si el cliente lo solicita. No cobra por banco ni pasarela."
      onClick={() => generateReceiptForInvoice(doc.id)}
      className="bg-green-50 text-green-700 hover:bg-green-100"
    >
      <FileText className="h-5 w-5" />
    </IconActionButton>
  );
}
