"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  hasAiProcessingConsent,
  saveAiProcessingConsent,
} from "@/lib/ai-consent";

interface AiProcessingConsentNoticeProps {
  accepted: boolean;
  onAccepted: () => void;
  compact?: boolean;
  contextNote?: string;
}

export function useAiProcessingConsent() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    setAccepted(hasAiProcessingConsent());
  }, []);

  function accept() {
    saveAiProcessingConsent();
    setAccepted(true);
  }

  return {
    accepted,
    accept,
  };
}

export function AiProcessingConsentNotice({
  accepted,
  onAccepted,
  compact = false,
  contextNote,
}: AiProcessingConsentNoticeProps) {
  if (accepted) {
    return (
      <div className="space-y-1 text-xs text-slate-500">
        <p>
          Usa IA externa.{" "}
          <Link href="/legal/privacidad" className="font-semibold underline">
            Privacidad
          </Link>
        </p>
        {contextNote ? <p>{contextNote}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 text-amber-950 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="space-y-2">
          <p className="text-sm font-semibold">Antes de usar la IA</p>
          <p className="text-sm leading-relaxed">
            Para analizar textos, imágenes o PDF, enviaremos el contenido a un
            proveedor de IA. Sube solo la información necesaria y revisa siempre
            el resultado antes de guardarlo.
          </p>
          {contextNote ? (
            <p className="text-sm leading-relaxed">{contextNote}</p>
          ) : null}
          <p className="text-xs">
            Más detalle en{" "}
            <Link href="/legal/privacidad" className="font-semibold underline">
              Política de privacidad
            </Link>{" "}
            y{" "}
            <Link href="/legal/terminos" className="font-semibold underline">
              Términos
            </Link>
            .
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={onAccepted}
            className="min-h-10 rounded-xl px-4 text-sm"
          >
            Aceptar y usar IA
          </Button>
        </div>
      </div>
    </div>
  );
}
