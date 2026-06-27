"use client";

import { Download, Eye, Printer } from "lucide-react";
import { useState } from "react";
import { DocumentShareActions } from "@/components/documents/DocumentShareActions";
import { IconActionButton } from "@/components/ui/IconAction";
import { downloadDocumentPdf, openDocumentPdfPreview } from "@/lib/pdf";
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
  const [previewLoading, setPreviewLoading] = useState(false);

  async function handlePdfPreview() {
    setPreviewLoading(true);
    try {
      await openDocumentPdfPreview(doc, profile);
    } catch {
      alert(
        "No se pudo abrir el PDF. Permite ventanas emergentes o descárgalo.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  function handlePrint() {
    window.print();
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
        onClick={() => void downloadDocumentPdf(doc, profile)}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Download className="h-5 w-5" />
      </IconActionButton>
      <IconActionButton
        label="Imprimir vista"
        tooltip="Imprime la pantalla actual. Para imprimir el PDF exacto, abre o descarga el PDF."
        onClick={handlePrint}
        className="bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        <Printer className="h-5 w-5" />
      </IconActionButton>
      <DocumentShareActions
        doc={doc}
        profile={profile}
        markSentOnShare={markSentOnShare}
      />
    </>
  );
}
