"use client";

import { Ban, Circle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { canMarkQuoteAsRejected, isRejectedQuote } from "@/lib/quotes";
import type { Document } from "@/lib/types";

interface MarkAsRejectedButtonProps {
  doc: Document;
}

export function MarkAsRejectedButton({ doc }: MarkAsRejectedButtonProps) {
  const { markQuoteAsRejected, unmarkQuoteAsRejected } = useAppStore();

  if (!canMarkQuoteAsRejected(doc)) return null;

  const rejected = isRejectedQuote(doc);

  function toggleRejected() {
    if (rejected) {
      unmarkQuoteAsRejected(doc.id);
      return;
    }
    markQuoteAsRejected(doc.id);
  }

  return (
    <IconActionButton
      label={rejected ? "Rechazado" : "Rechazar"}
      tooltip={
        rejected
          ? "Rechazado en tu registro local - pulsa para desmarcar"
          : "Marcar presupuesto como rechazado en local"
      }
      onClick={toggleRejected}
      aria-pressed={rejected}
      className={`transition-colors ${
        rejected
          ? "bg-red-100 text-red-700 ring-2 ring-red-300"
          : "bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600"
      }`}
    >
      {rejected ? (
        <Ban className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </IconActionButton>
  );
}
