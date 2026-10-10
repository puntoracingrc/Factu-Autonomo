"use client";

import { useRef, useState } from "react";
import { Ban, Circle, LoaderCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useCentralQuoteWorkflow } from "@/hooks/useCentralQuoteWorkflow";
import { canMarkQuoteAsRejected, isRejectedQuote } from "@/lib/quotes";
import type { Document } from "@/lib/types";

interface MarkAsRejectedButtonProps {
  doc: Document;
}

export function MarkAsRejectedButton({ doc }: MarkAsRejectedButtonProps) {
  const changeWorkflow = useCentralQuoteWorkflow();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMarkQuoteAsRejected(doc)) return null;

  const rejected = isRejectedQuote(doc);

  async function toggleRejected() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await changeWorkflow(
        doc.id,
        rejected ? "unreject" : "reject",
      );
      if (!result.ok) setError(result.error);
    } catch {
      setError(
        "No se pudo confirmar el rechazo. Sincroniza y vuelve a intentarlo.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <IconActionButton
        label={pending ? "Guardando" : rejected ? "Rechazado" : "Rechazar"}
        tooltip={
          rejected
            ? "Rechazado — pulsa para desmarcar"
            : "Marcar presupuesto como rechazado"
        }
        onClick={toggleRejected}
        aria-pressed={rejected}
        aria-busy={pending}
        disabled={pending}
        className={`transition-colors ${
          rejected
            ? "bg-red-100 text-red-700 ring-2 ring-red-300"
            : "bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600"
        }`}
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : rejected ? (
          <Ban className="h-5 w-5" strokeWidth={2.5} />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </IconActionButton>
      {error ? (
        <span
          role="alert"
          className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 shadow-lg"
        >
          {error}
        </span>
      ) : null}
    </span>
  );
}
