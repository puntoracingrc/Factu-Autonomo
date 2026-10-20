"use client";
import { useState } from "react";
import { Paperclip, X } from "lucide-react";
import type { Expense } from "@/lib/types";
import { useExpenseOriginals } from "@/hooks/useExpenseOriginals";
import {
  EXPENSE_ORIGINAL_ACCEPT,
  originalFileError,
} from "@/lib/expense-originals/types";
import { ExpenseOriginalButton } from "./ExpenseOriginalButton";

export function ExpenseOriginalField({
  expense,
  file,
  onChange,
  inbox = false,
  disabled = false,
}: {
  expense?: Expense;
  file: File | null;
  onChange: (file: File | null) => void;
  inbox?: boolean;
  disabled?: boolean;
}) {
  const { enabled, originals, loading, ownerScope } = useExpenseOriginals(
    expense ? [expense] : [],
  );
  const [error, setError] = useState<string | null>(null);
  const archived = expense && originals[expense.id] === "archived";
  return (
    <section className="space-y-3" aria-label="Archivo original del gasto">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Paperclip className="h-5 w-5" />
          Factura o justificante original
        </h2>
        {expense ? (
          <ExpenseOriginalButton
            expense={expense}
            ownerScope={ownerScope}
            status={originals[expense.id]}
            enabled={enabled}
            loading={loading}
          />
        ) : null}
      </div>
      <p className="text-sm text-slate-500">
        {inbox
          ? "El documento del buzón se conserva en la nube privada de esta empresa. Los antiguos se recuperan si el original sigue disponible."
          : "Adjunta el archivo sin escanearlo ni cambiar los importes del gasto. Estará disponible para los administradores de esta empresa."}
      </p>
      {!inbox && !archived ? (
        <label className="block text-sm font-semibold text-slate-700">
          Adjuntar archivo (opcional)
          <input
            type="file"
            accept={EXPENSE_ORIGINAL_ACCEPT}
            disabled={!enabled || disabled}
            className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm disabled:opacity-50"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              event.target.value = "";
              if (!chosen) return;
              const issue = originalFileError(chosen);
              setError(issue);
              if (!issue) onChange(chosen);
            }}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            PDF, PNG, JPG, WebP, GIF, Word o Excel. Máximo 4 MB. Se conserva el
            archivo exacto, no una factura regenerada.
          </span>
        </label>
      ) : null}
      {!enabled ? (
        <p className="text-xs text-slate-500">
          El archivo compartido necesita un plan con nube y una sesión activa.
          Puedes guardar el gasto sin adjunto.
        </p>
      ) : null}
      {file ? (
        <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800">
          {file.name}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            aria-label="Quitar archivo seleccionado sin guardar"
          >
            <X className="h-4 w-4" />
          </button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
