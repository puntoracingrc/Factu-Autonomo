"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { showFactuToast } from "@/lib/factu/occasional";
import {
  canConvertQuoteToInvoice,
  findInvoiceCreatedFromQuote,
} from "@/lib/quote-to-invoice";
import type { Document } from "@/lib/types";

interface ConvertQuoteToInvoiceButtonProps {
  doc: Document;
}

export function ConvertQuoteToInvoiceButton({
  doc,
}: ConvertQuoteToInvoiceButtonProps) {
  const router = useRouter();
  const { data, convertQuoteToInvoice } = useAppStore();
  const [busy, setBusy] = useState(false);
  const existingInvoice = findInvoiceCreatedFromQuote(data.documents, doc.id);

  if (!existingInvoice && !canConvertQuoteToInvoice(doc)) return null;

  function handleConvert() {
    if (busy) return;

    if (existingInvoice) {
      router.push(`/facturas/${existingInvoice.id}`);
      return;
    }

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
      label={existingInvoice ? "Factura" : "Convertir"}
      tooltip={
        existingInvoice
          ? `Ya convertido a ${existingInvoice.number}. Abrir factura.`
          : "Convertir a factura en borrador"
      }
      onClick={handleConvert}
      disabled={busy}
      className={
        existingInvoice
          ? "bg-green-50 text-green-700 hover:bg-green-100"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100"
      }
    >
      <FileText className={`h-5 w-5 ${busy ? "animate-pulse" : ""}`} />
    </IconActionButton>
  );
}
