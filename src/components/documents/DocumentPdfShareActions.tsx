"use client";

import { Download, Printer } from "lucide-react";
import { DocumentShareActions } from "@/components/documents/DocumentShareActions";
import { IconActionButton } from "@/components/ui/IconAction";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { BusinessProfile, Document } from "@/lib/types";

interface DocumentPdfShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
}

export function DocumentPdfShareActions({
  doc,
  profile,
  markSentOnShare,
}: DocumentPdfShareActionsProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <IconActionButton
        label="PDF"
        tooltip="Descargar PDF"
        onClick={() => void downloadDocumentPdf(doc, profile)}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Download className="h-5 w-5" />
      </IconActionButton>
      <IconActionButton
        label="Imprimir"
        tooltip="Imprimir vista actual; descarga el PDF para imprimirlo exacto"
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
