"use client";

import { Download, Eye, LoaderCircle, Printer } from "lucide-react";
import { useState } from "react";
import { DocumentShareActions } from "@/components/documents/DocumentShareActions";
import { IconActionButton } from "@/components/ui/IconAction";
import { useBilling } from "@/context/BillingContext";
import { canShareDocumentFromList } from "@/lib/document-integrity/share-flow";
import { isUsableLegacyImportedDocument } from "@/lib/document-integrity/legacy-import-attestation";
import type { BusinessProfile, Document } from "@/lib/types";

interface DocumentPdfShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
  showPreview?: boolean;
}

function reservePdfActionWindow(title: string): Window {
  const opened = window.open("", "_blank");
  if (!opened) throw new Error("popup_blocked");

  opened.document.title = title;
  opened.document.body.textContent = "Generando PDF...";
  return opened;
}

export function DocumentPdfShareActions({
  doc,
  profile,
  markSentOnShare,
  showPreview = true,
}: DocumentPdfShareActionsProps) {
  const { billingEnabled, isPro } = useBilling();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
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
    let opened: Window | null = null;
    try {
      opened = reservePdfActionWindow(`Vista previa ${doc.number}`);
      const { openDocumentPdfPreview } = await import("@/lib/pdf");
      await openDocumentPdfPreview(doc, profile, pdfOptions, opened);
    } catch {
      opened?.close();
      alert(
        "No se pudo abrir el PDF. Permite ventanas emergentes o descárgalo.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handlePdfDownload() {
    setDownloadLoading(true);
    try {
      const { downloadDocumentPdf } = await import("@/lib/pdf");
      await downloadDocumentPdf(doc, profile, pdfOptions);
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handlePrint() {
    setPrintLoading(true);
    let opened: Window | null = null;
    try {
      opened = reservePdfActionWindow(`Imprimir ${doc.number}`);
      const { printDocumentPdf } = await import("@/lib/pdf");
      await printDocumentPdf(doc, profile, pdfOptions, opened);
    } catch {
      opened?.close();
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
          {previewLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </IconActionButton>
      )}
      <IconActionButton
        label={downloadLoading ? "Preparando PDF" : "PDF"}
        tooltip="Descargar PDF"
        onClick={() => void handlePdfDownload()}
        disabled={downloadLoading}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        {downloadLoading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Download className="h-5 w-5" />
        )}
      </IconActionButton>
      <IconActionButton
        label="Imprimir"
        tooltip="Imprimir"
        onClick={() => void handlePrint()}
        disabled={printLoading}
        className="bg-slate-100 text-slate-700 hover:bg-slate-200"
      >
        {printLoading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Printer className="h-5 w-5" />
        )}
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
