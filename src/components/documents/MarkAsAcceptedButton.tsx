"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useCentralQuoteWorkflow } from "@/hooks/useCentralQuoteWorkflow";
import { canMarkQuoteAsAccepted, isAcceptedQuote } from "@/lib/quotes";
import type { Document } from "@/lib/types";

interface MarkAsAcceptedButtonProps {
  doc: Document;
}

export function MarkAsAcceptedButton({ doc }: MarkAsAcceptedButtonProps) {
  const changeWorkflow = useCentralQuoteWorkflow();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canMarkQuoteAsAccepted(doc)) return null;

  const accepted = isAcceptedQuote(doc);

  async function toggleAccepted() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await changeWorkflow(
        doc.id,
        accepted ? "unaccept" : "accept",
      );
      if (!result.ok) setError(result.error);
    } catch {
      setError(
        "No se pudo confirmar la aceptación. Sincroniza y vuelve a intentarlo.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <span className="relative inline-flex">
      <IconActionButton
        label={pending ? "Guardando" : accepted ? "Aceptado" : "Aceptar"}
        tooltip={
          accepted
            ? "Aceptado — pulsa para desmarcar"
            : "Marcar presupuesto como aceptado"
        }
        onClick={toggleAccepted}
        aria-pressed={accepted}
        aria-busy={pending}
        disabled={pending}
        className={`transition-colors ${
          accepted
            ? "bg-green-100 text-green-700 ring-2 ring-green-300"
            : "bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600"
        }`}
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : accepted ? (
          <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
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
