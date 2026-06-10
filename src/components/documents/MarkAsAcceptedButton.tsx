"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { canMarkQuoteAsAccepted, isAcceptedQuote } from "@/lib/quotes";
import type { Document } from "@/lib/types";

interface MarkAsAcceptedButtonProps {
  doc: Document;
}

export function MarkAsAcceptedButton({ doc }: MarkAsAcceptedButtonProps) {
  const { markQuoteAsAccepted, unmarkQuoteAsAccepted } = useAppStore();

  if (!canMarkQuoteAsAccepted(doc)) return null;

  const accepted = isAcceptedQuote(doc);

  function toggleAccepted() {
    if (accepted) {
      unmarkQuoteAsAccepted(doc.id);
      return;
    }
    markQuoteAsAccepted(doc.id);
  }

  return (
    <IconActionButton
      label={accepted ? "Aceptado" : "Aceptar"}
      tooltip={
        accepted
          ? "Aceptado — pulsa para desmarcar"
          : "Marcar presupuesto como aceptado"
      }
      onClick={toggleAccepted}
      aria-pressed={accepted}
      className={`transition-colors ${
        accepted
          ? "bg-green-100 text-green-700 ring-2 ring-green-300"
          : "bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600"
      }`}
    >
      {accepted ? (
        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </IconActionButton>
  );
}
