"use client";

import { Download } from "lucide-react";
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
      <DocumentShareActions
        doc={doc}
        profile={profile}
        markSentOnShare={markSentOnShare}
      />
    </>
  );
}
