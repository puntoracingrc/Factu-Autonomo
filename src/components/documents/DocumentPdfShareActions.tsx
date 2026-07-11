"use client";

import { Download, Eye, Printer } from "lucide-react";
import { useState } from "react";
import { DocumentShareActions } from "@/components/documents/DocumentShareActions";
import { IconActionButton } from "@/components/ui/IconAction";
import { useBilling } from "@/context/BillingContext";
import {
  downloadDocumentPdf,
  openDocumentPdfPreview,
  printDocumentPdf,
} from "@/lib/pdf";
import { canShareDocumentFromList } from "@/lib/document-integrity/share-flow";
import type { BusinessProfile, Document } from "@/lib/types";

interface DocumentPdfShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
  showPreview?: boolean;
}

export function DocumentPdfShareActions({
  doc,
  profile,
  markSentOnShare,
  showPreview = true,
}: DocumentPdfShareActionsProps) {
  const { billingEnabled, isPro } = useBilling();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const canShare = canShareDocumentFromList(doc);
  const integrityBlocked = doc.snapshotIntegrity?.status === "blocked";

  if (integrityBlocked) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800"
      >
        PDF, impresión y envío bloqueados: la copia histórica no supera la
        comprobación de integridad.
      </p>
    );
  }

  async function handlePdfPreview() {
    setPreviewLoading(true);
    try {
      await openDocumentPdfPreview(doc, profile, pdfOptions);
    } catch {
      alert(
        "No se pudo abrir el PDF. Permite ventanas emergentes o descárgalo.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handlePrint() {
    setPrintLoading(true);
    try {
      await printDocumentPdf(doc, profile, pdfOptions);
    } catch {
      alert(
        "No se pudo preparar la impresión del PDF. Permite ventanas emergentes o descárgalo.",
      );
    } finally {
      setPrintLoading(false);
    }
  }

  return (
    <>
      {showPreview && (
        <IconActionButton
          label="Abrir PDF"
          tooltip="Abre el PDF en una pestaña nueva; desde el visor puedes imprimirlo exacto"
          onClick={() => void handlePdfPreview()}
          disabled={previewLoading}
          className="bg-slate-100 text-slate-700 hover:bg-slate-200"
        >
          <Eye className="h-5 w-5" />
        </IconActionButton>
      )}
      <IconActionButton
        label="PDF"
        tooltip="Descargar PDF"
        onClick={() => void downloadDocumentPdf(doc, profile, pdfOptions)}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Download className="h-5 w-5" />
      </IconActionButton>
      <IconActionButton
        label="Imprimir PDF"
        tooltip="Genera e imprime solo el PDF de este documento"
        onClick={() => void handlePrint()}
        disabled={printLoading}
        className="bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        <Printer className="h-5 w-5" />
      </IconActionButton>
      {canShare && (
        <DocumentShareActions
          doc={doc}
          profile={profile}
          markSentOnShare={markSentOnShare}
          pdfOptions={pdfOptions}
        />
      )}
    </>
  );
}
