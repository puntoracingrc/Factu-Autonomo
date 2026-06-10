"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { canMarkAsCollected, isCollectedDocument } from "@/lib/income";
import type { Document } from "@/lib/types";

interface MarkAsPaidButtonProps {
  doc: Document;
}

export function MarkAsPaidButton({ doc }: MarkAsPaidButtonProps) {
  const { markAsCollected, unmarkAsCollected } = useAppStore();

  if (!canMarkAsCollected(doc)) return null;

  const collected = isCollectedDocument(doc);

  function toggleCollected() {
    if (collected) {
      unmarkAsCollected(doc.id);
      return;
    }
    markAsCollected(doc.id);
  }

  const tooltip = collected
    ? "Cobrado — pulsa para desmarcar"
    : doc.type === "factura"
      ? "Marcar como cobrado y crear recibo"
      : "Marcar como cobrado";

  return (
    <IconActionButton
      label={collected ? "Cobrado" : "Cobrar"}
      tooltip={tooltip}
      onClick={toggleCollected}
      aria-pressed={collected}
      className={`transition-colors ${
        collected
          ? "bg-green-100 text-green-700 ring-2 ring-green-300"
          : "bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600"
      }`}
    >
      {collected ? (
        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </IconActionButton>
  );
}
