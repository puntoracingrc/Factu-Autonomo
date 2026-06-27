"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { showFactuToast } from "@/lib/factu/occasional";
import { canConvertQuoteToInvoice } from "@/lib/quote-to-invoice";
import type { Document } from "@/lib/types";

interface ConvertQuoteToInvoiceButtonProps {
  doc: Document;
}

export function ConvertQuoteToInvoiceButton({
  doc,
}: ConvertQuoteToInvoiceButtonProps) {
  const router = useRouter();
  const { convertQuoteToInvoice } = useAppStore();
  const [busy, setBusy] = useState(false);

  if (!canConvertQuoteToInvoice(doc)) return null;

  function handleConvert() {
    if (busy) return;
    setBusy(true);
    const invoice = convertQuoteToInvoice(doc.id);
    if (!invoice) {
      setBusy(false);
      alert("No se pudo convertir este presupuesto.");
      return;
    }

    showFactuToast(
      "Factura creada en borrador desde el presupuesto. Revisa la factura antes de emitirla.",
      5000,
    );
    router.push(`/facturas/${invoice.id}`);
  }

  return (
    <IconActionButton
      label="Convertir"
      tooltip="Convertir a factura"
      onClick={handleConvert}
      disabled={busy}
      className="bg-blue-50 text-blue-700 hover:bg-blue-100"
    >
      <FileText className={`h-5 w-5 ${busy ? "animate-pulse" : ""}`} />
    </IconActionButton>
  );
}
