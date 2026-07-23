"use client";

import { Download, Eye, LoaderCircle, Printer, Share2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

interface ShareMenuPosition {
  top: number;
  left: number;
}

function shareMenuPositionFor(trigger: HTMLElement): ShareMenuPosition {
  const rect = trigger.getBoundingClientRect();
  const width = 288;
  const height = 236;
  const gap = 8;
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 8,
  );
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - height - gap;
  const top =
    belowTop + height > window.innerHeight - 8
      ? Math.max(8, aboveTop)
      : belowTop;
  return { top, left };
}

function ShareMenuAction({
  title,
  description,
  icon,
  loading,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  loading?: boolean;
  tone: "blue" | "slate";
  onClick: () => void;
}) {
  const toneClass =
    tone === "blue"
      ? "text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        loading ? "cursor-wait text-slate-400" : toneClass
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {description}
        </span>
      </span>
    </button>
  );
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
  const [shareMenuPosition, setShareMenuPosition] =
    useState<ShareMenuPosition | null>(null);
  const shareTriggerRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const canShare = canShareDocumentFromList(doc);
  const integrityBlocked = doc.snapshotIntegrity?.status === "blocked";
  const legacyImportedAccepted = isUsableLegacyImportedDocument(doc);
  // En históricos importados cualquier PDF generado es una reconstrucción:
  // no sustituye al original ni se usa para marcarlo como enviado desde Factu.

  function closeShareMenu() {
    setShareMenuPosition(null);
  }

  function toggleShareMenu() {
    const trigger = shareTriggerRef.current;
    if (!trigger) return;
    setShareMenuPosition((current) =>
      current ? null : shareMenuPositionFor(trigger),
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

  function handleMenuDownload() {
    closeShareMenu();
    void handlePdfDownload();
  }

  function handleMenuPrint() {
    closeShareMenu();
    void handlePrint();
  }

  useEffect(() => {
    if (!shareMenuPosition) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (shareTriggerRef.current?.contains(target)) return;
      if (shareMenuRef.current?.contains(target)) return;
      closeShareMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeShareMenu();
    }

    function handleViewportChange() {
      closeShareMenu();
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [shareMenuPosition]);

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
        ref={shareTriggerRef}
        label="Compartir"
        tooltip="Compartir, descargar o imprimir"
        onClick={toggleShareMenu}
        aria-expanded={shareMenuPosition ? "true" : "false"}
        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Share2 className="h-5 w-5" />
      </IconActionButton>
      {shareMenuPosition && (
        <div
          ref={shareMenuRef}
          role="menu"
          aria-label={`Compartir ${doc.number}`}
          style={{
            top: `${shareMenuPosition.top}px`,
            left: `${shareMenuPosition.left}px`,
          }}
          className="fixed z-50 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
        >
          <ShareMenuAction
            title={downloadLoading ? "Preparando PDF" : "Descargar PDF"}
            description="Guarda una copia del documento"
            icon={<Download className="h-5 w-5" />}
            loading={downloadLoading}
            tone="blue"
            onClick={handleMenuDownload}
          />
          <ShareMenuAction
            title={printLoading ? "Preparando impresión" : "Imprimir"}
            description="Abre el PDF preparado para imprimir"
            icon={<Printer className="h-5 w-5" />}
            loading={printLoading}
            tone="slate"
            onClick={handleMenuPrint}
          />
          {canShare && (
            <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
              <DocumentShareActions
                doc={doc}
                profile={profile}
                markSentOnShare={
                  legacyImportedAccepted ? false : markSentOnShare
                }
                pdfOptions={pdfOptions}
                variant="menu"
                onActionInvoked={closeShareMenu}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
