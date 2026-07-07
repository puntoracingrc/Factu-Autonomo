"use client";

import { Download, FileText, GripVertical, X } from "lucide-react";
import { type DragEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  buildDocumentPdfBlob,
  documentPdfFilename,
  triggerPdfBlobDownload,
} from "@/lib/pdf";
import type { DocumentPdfOptions } from "@/lib/pdf";
import type { BusinessProfile, Document } from "@/lib/types";

type DragTarget = "email" | "whatsapp";

interface PreparedPdfFile {
  file: File;
  url: string;
}

interface DocumentPdfDragTrayProps {
  doc: Document;
  profile: BusinessProfile;
  target: DragTarget;
  pdfOptions?: DocumentPdfOptions;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function targetLabel(target: DragTarget): string {
  return target === "whatsapp" ? "WhatsApp" : "el email";
}

function targetHint(target: DragTarget): string {
  return target === "whatsapp"
    ? "Arrastra esta ficha al chat de WhatsApp."
    : "Arrastra esta ficha al borrador del correo.";
}

export function DocumentPdfDragTray({
  doc,
  profile,
  target,
  pdfOptions,
  onClose,
}: DocumentPdfDragTrayProps) {
  const [prepared, setPrepared] = useState<PreparedPdfFile | null>(null);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);
  const filename = useMemo(() => documentPdfFilename(doc), [doc]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function preparePdf() {
      setPrepared(null);
      setError(false);
      try {
        const blob = await buildDocumentPdfBlob(doc, profile, pdfOptions);
        if (cancelled) return;
        const file = new File([blob], filename, { type: "application/pdf" });
        objectUrl = URL.createObjectURL(file);
        setPrepared({ file, url: objectUrl });
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void preparePdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc, filename, pdfOptions, profile]);

  function handleDragStart(event: DragEvent<HTMLDivElement>) {
    if (!prepared) return;
    setDragging(true);
    event.dataTransfer.effectAllowed = "copy";

    try {
      event.dataTransfer.items.clear();
    } catch {
      // Algunos navegadores no permiten limpiar items durante dragstart.
    }

    event.dataTransfer.setData("text/plain", prepared.file.name);
    event.dataTransfer.setData(
      "DownloadURL",
      `${prepared.file.type}:${prepared.file.name}:${prepared.url}`,
    );

    try {
      event.dataTransfer.items.add(prepared.file);
    } catch {
      // Si el navegador no acepta File en el arrastre, queda el fallback DownloadURL.
    }
  }

  function handleDragEnd() {
    setDragging(false);
    window.setTimeout(onClose, 250);
  }

  function handleDownloadFallback() {
    if (!prepared) return;
    triggerPdfBlobDownload(prepared.file, prepared.file.name);
  }

  return (
    <section className="fixed bottom-24 right-4 z-50 w-[min(calc(100vw-2rem),25rem)] rounded-2xl border border-blue-200 bg-white p-4 text-slate-900 shadow-2xl shadow-slate-900/20 dark:border-blue-900/60 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black">PDF listo para arrastrar</p>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Lo preparamos aquí porque {targetLabel(target)} no adjunta el PDF
            automáticamente desde otra web. {targetHint(target)} Al soltarlo,
            este bloque desaparece.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Cerrar adjunto temporal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        draggable={Boolean(prepared)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`mt-3 flex items-center gap-3 rounded-xl border p-3 transition ${
          prepared
            ? "cursor-grab border-emerald-200 bg-emerald-50 active:cursor-grabbing dark:border-emerald-900/70 dark:bg-emerald-950/40"
            : "cursor-wait border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
        } ${dragging ? "scale-[0.98] opacity-80" : ""}`}
      >
        <div className="rounded-xl bg-white p-2 text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">
            {prepared ? prepared.file.name : filename}
          </p>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {error
              ? "No se pudo preparar el PDF"
              : prepared
                ? `${formatFileSize(prepared.file.size)} · arrastra al destino`
                : "Preparando PDF..."}
          </p>
        </div>
        <GripVertical className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Si el destino no acepta el arrastre, usa la descarga normal.
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={handleDownloadFallback}
          disabled={!prepared}
          className="shrink-0 gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar
        </Button>
      </div>
    </section>
  );
}
