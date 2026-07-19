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
import { isUsableLegacyImportedDocument } from "@/lib/document-integrity/legacy-import-attestation";
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
  const legacyImportedAccepted = isUsableLegacyImportedDocument(doc);
  // En históricos importados cualquier PDF generado es una reconstrucción:
  // no sustituye al original ni se usa para marcarlo como enviado desde Factu.

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
          label="Vista previa"
          tooltip="Vista previa"
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
        label="Imprimir"
        tooltip="Imprimir"
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
          markSentOnShare={
            legacyImportedAccepted ? false : markSentOnShare
          }
          pdfOptions={pdfOptions}
        />
      )}
    </>
  );
}
