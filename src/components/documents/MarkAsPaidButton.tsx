"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, LoaderCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import {
  canToggleCollectionStatus,
  isCollectedDocument,
} from "@/lib/income";
import { collectionActionCopy } from "@/lib/invoice-status-actions";
import type { Document } from "@/lib/types";

interface MarkAsPaidButtonProps {
  doc: Document;
}

export function MarkAsPaidButton({ doc }: MarkAsPaidButtonProps) {
  const { markAsCollected, unmarkAsCollected } = useAppStore();
  const [pendingTarget, setPendingTarget] = useState<boolean | null>(null);
  const requestGeneration = useRef(0);

  useEffect(
    () => () => {
      requestGeneration.current += 1;
    },
    [],
  );

  if (doc.type === "recibo" && doc.sourceDocumentId) return null;
  if (!canToggleCollectionStatus(doc)) return null;

  const collected = isCollectedDocument(doc);
  const displayedCollected = pendingTarget ?? collected;
  const pending = pendingTarget !== null;
  const copy = collectionActionCopy(doc, displayedCollected);

  function toggleCollected() {
    if (pending) return;

    const target = !collected;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setPendingTarget(target);

    window.setTimeout(() => {
      const update = target
        ? markAsCollected(doc.id)
        : unmarkAsCollected(doc.id);
      void update
        .catch(() => false)
        .then(() => {
          if (requestGeneration.current === generation) {
            setPendingTarget(null);
          }
        });
    }, 0);
  }

  return (
    <IconActionButton
      label={pending ? "Guardando" : copy.label}
      tooltip={pending ? "Confirmando el cambio de cobro" : copy.tooltip}
      onClick={toggleCollected}
      aria-pressed={displayedCollected}
      aria-busy={pending}
      disabled={pending}
      className={`touch-manipulation transition-colors disabled:cursor-wait ${
        displayedCollected
          ? "bg-green-100 text-green-700 ring-2 ring-green-300"
          : "bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600"
      }`}
    >
      {pending ? (
        <LoaderCircle className="h-5 w-5 animate-spin" />
      ) : displayedCollected ? (
        <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <Circle className="h-5 w-5" />
      )}
    </IconActionButton>
  );
}
