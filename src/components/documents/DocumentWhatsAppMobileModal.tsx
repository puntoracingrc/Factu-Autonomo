"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { showFactuToast } from "@/lib/factu/occasional";
import { canShareWhatsAppPdf, shareWhatsAppPdf } from "@/lib/whatsapp-share";

export interface PreparedWhatsAppPdf {
  file: File;
  chatUrl: string;
  markSent?: () => Promise<void>;
}

interface DocumentWhatsAppMobileModalProps {
  description: string;
  requiresIssue: boolean;
  prepare: () => Promise<PreparedWhatsAppPdf>;
  onClose: () => void;
}

export function DocumentWhatsAppMobileModal({
  description,
  requiresIssue,
  prepare,
  onClose,
}: DocumentWhatsAppMobileModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const pending = useRef<Promise<PreparedWhatsAppPdf> | undefined>(undefined);
  const marked = useRef(false);
  const [phase, setPhase] = useState<"confirm" | "preparing" | "ready" | "error">(
    requiresIssue ? "confirm" : "preparing",
  );
  const [prepared, setPrepared] = useState<(PreparedWhatsAppPdf & { url: string }) | undefined>();
  const [downloaded, setDownloaded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const downloadUrl = prepared?.url;

  useEffect(() => {
    if (phase !== "preparing") return;
    let active = true;
    const request = pending.current ??= prepare();
    void request.then(
      (result) => {
        if (!active) return;
        setPrepared({ ...result, url: URL.createObjectURL(result.file) });
        setPhase("ready");
      },
      () => {
        if (active) setPhase("error");
      },
    );
    return () => { active = false; };
  }, [phase, prepare]);

  useEffect(() => {
    if (downloadUrl) return () => URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  async function markSent() {
    if (!prepared?.markSent || marked.current) return;
    marked.current = true;
    try {
      await prepared.markSent();
    } catch {
      marked.current = false;
      showFactuToast("No se pudo actualizar el estado del documento.", 5000);
    }
  }

  async function share() {
    if (!prepared || sharing) return;
    setSharing(true);
    const outcome = await shareWhatsAppPdf(prepared.file);
    if (outcome === "shared") {
      void markSent();
      onClose();
      return;
    }
    setSharing(false);
    if (outcome === "unavailable") setShareFailed(true);
  }

  const canShare = Boolean(prepared && canShareWhatsAppPdf(prepared.file));
  const closeDisabled = sharing || (requiresIssue && phase === "preparing");
  const linkAction = "flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-center font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500";

  return (
    <Modal
      open
      onClose={() => { if (!closeDisabled) onClose(); }}
      titleId={titleId}
      descriptionId={descriptionId}
      testId="document-whatsapp-mobile"
    >
      <div className="space-y-4 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold text-slate-900">Enviar por WhatsApp</h2>
          <p id={descriptionId} className="mt-1 text-sm text-slate-700">{description}</p>
        </div>
        {phase === "confirm" && (
          <Button type="button" className="w-full" onClick={() => setPhase("preparing")}>
            Emitir y preparar PDF
          </Button>
        )}
        {phase === "preparing" && (
          <p role="status" className="text-sm text-slate-700">Preparando el PDF para compartir…</p>
        )}
        {phase === "error" && (
          <>
            <p role="alert" className="text-sm text-red-800">No se pudo preparar el PDF. Comprueba el documento antes de reintentar.</p>
            {!requiresIssue && (
              <Button type="button" onClick={() => { pending.current = undefined; setPhase("preparing"); }}>
                Reintentar
              </Button>
            )}
          </>
        )}
        {prepared && (
          <div className="grid gap-2">
            {canShare && (
              <Button type="button" disabled={sharing} onClick={() => void share()}>
                Compartir por WhatsApp
              </Button>
            )}
            <a className={linkAction} href={prepared.url} download={prepared.file.name} onClick={() => setDownloaded(true)}>
              Descargar PDF
            </a>
            <a className={linkAction} href={prepared.chatUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => { if (downloaded) void markSent(); }}>
              Abrir chat en WhatsApp
            </a>
            <p role="status" className="text-sm text-slate-700">
              {canShare && !shareFailed
                ? "Elige WhatsApp y el chat del cliente. Si abres el chat directamente, adjunta el PDF desde Descargas."
                : `Descarga «${prepared.file.name}» y adjúntalo en el chat desde Descargas.`}
            </p>
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={closeDisabled} onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
