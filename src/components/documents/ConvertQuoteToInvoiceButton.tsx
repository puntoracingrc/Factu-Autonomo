"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { useCentralSharedBusinessMutations } from "@/hooks/useCentralSharedBusinessMutations";
import { showFactuToast } from "@/lib/factu/occasional";
import {
  canConvertQuoteToInvoice,
  findInvoiceCreatedFromQuote,
  buildInvoiceDraftFromQuote,
} from "@/lib/quote-to-invoice";
import type { Document } from "@/lib/types";

interface ConvertQuoteToInvoiceButtonProps {
  doc: Document;
}

export function ConvertQuoteToInvoiceButton({
  doc,
}: ConvertQuoteToInvoiceButtonProps) {
  const router = useRouter();
  const { data, getCurrentData } = useAppStore();
  const { saveDraft } = useCentralSharedBusinessMutations();
  const [busy, setBusy] = useState(false);
  const existingInvoice = findInvoiceCreatedFromQuote(data.documents, doc.id);

  if (!existingInvoice && !canConvertQuoteToInvoice(doc)) return null;

  async function handleConvert() {
    if (busy) return;

    if (existingInvoice) {
      router.push(`/facturas/${existingInvoice.id}`);
      return;
    }

    setBusy(true);
    try {
      const current = getCurrentData().documents.find(
        (entry) => entry.id === doc.id,
      );
      if (!current) throw new Error("Presupuesto no encontrado.");
      const now = new Date().toISOString();
      // Stable per quote: simultaneous conversions converge through CAS, not two drafts.
      const id = `quote-invoice:${doc.id}`;
      const result = await saveDraft({
        ...buildInvoiceDraftFromQuote(current),
        id,
        number: "BORRADOR",
        createdAt: now,
        updatedAt: now,
      });
      if (!result.ok) throw new Error(result.error);
      showFactuToast(
        "Factura creada en borrador desde el presupuesto. Revisa la factura antes de emitirla.",
        5000,
      );
      router.push(`/facturas/${result.value.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo convertir este presupuesto.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <IconActionButton
      label={existingInvoice ? "Ver factura" : "Convertir"}
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
