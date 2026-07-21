"use client";

import { useState } from "react";
import { useAppStore } from "@/context/AppStore";

export function useFiscalNotificationLibraryClear(input: {
  readonly ownerScope: string;
  readonly documentCount: number;
  readonly onCleared?: () => void;
}) {
  const { getCurrentData, deleteAllFiscalNotificationDocuments } =
    useAppStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function request(): void {
    if (input.documentCount === 0 || busy) return;
    setError(null);
    setOpen(true);
  }

  function close(): void {
    if (busy) return;
    setError(null);
    setOpen(false);
  }

  function confirm(): void {
    if (!open || busy || input.documentCount === 0) return;
    setBusy(true);
    setError(null);
    const result = deleteAllFiscalNotificationDocuments({
      expected: getCurrentData(),
      ownerScope: input.ownerScope,
      deletedAt: new Date().toISOString(),
    });
    setBusy(false);
    if (result.status === "applied") {
      setOpen(false);
      input.onCleared?.();
      return;
    }
    setError(
      result.status === "indeterminate"
        ? "No se puede confirmar si el borrado quedó guardado. Recarga antes de volver a intentarlo."
        : result.status === "NOT_FOUND"
          ? "La biblioteca ya está vacía."
          : "No se ha borrado ninguna ficha porque los datos cambiaron o no superaron la comprobación final.",
    );
  }

  return Object.freeze({ open, busy, error, request, close, confirm });
}
