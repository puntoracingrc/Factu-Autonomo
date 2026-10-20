"use client";
import { useRef, useState } from "react";
import { Loader2, Paperclip, Upload } from "lucide-react";
import {
  openExpenseOriginal,
  uploadExpenseOriginal,
} from "@/lib/expense-originals/client";
import {
  EXPENSE_ORIGINAL_ACCEPT,
  type ExpenseOriginalStatus,
} from "@/lib/expense-originals/types";
import type { Expense } from "@/lib/types";

export function ExpenseOriginalButton({
  expense,
  ownerScope,
  status,
  enabled = true,
  loading = false,
}: {
  expense: Pick<Expense, "id" | "description" | "sourceInboxItemId">;
  ownerScope: string | null;
  status?: ExpenseOriginalStatus;
  enabled?: boolean;
  loading?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedTo, setAttachedTo] = useState<string | null>(null);
  const attachmentScope = `${ownerScope}:${expense.id}`;
  const attached = attachedTo === attachmentScope;
  const hasOriginal =
    attached || Boolean(status) || Boolean(expense.sourceInboxItemId);
  async function run(action: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo abrir o adjuntar el original.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={!enabled || busy || loading}
        title={
          !enabled
            ? "Los originales necesitan la nube de Factu"
            : hasOriginal
              ? "Ver factura original"
              : "Adjuntar factura original"
        }
        aria-label={`${hasOriginal ? "Ver" : "Adjuntar"} factura original de ${expense.description}`}
        onClick={() =>
          hasOriginal
            ? void run(() => openExpenseOriginal(expense.id, ownerScope))
            : input.current?.click()
        }
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-white transition-colors disabled:opacity-40 ${hasOriginal ? "border-blue-200 text-blue-700 hover:bg-blue-50" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={EXPENSE_ORIGINAL_ACCEPT}
        className="sr-only"
        aria-label={`Archivo original de ${expense.description}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file)
            void run(async () => {
              await uploadExpenseOriginal(expense.id, file, ownerScope);
              setAttachedTo(attachmentScope);
            });
        }}
      />
      {error ? (
        <div
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-red-200 bg-white p-3 text-xs font-semibold text-red-800 shadow-lg"
        >
          {error}
          {status !== "archived" && !attached ? (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-2 flex items-center gap-1 font-bold text-blue-700"
            >
              <Upload className="h-3 w-3" />
              Adjuntar manualmente
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 mt-2 font-bold text-slate-500"
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
