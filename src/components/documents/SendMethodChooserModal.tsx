"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface SendMethodOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

interface SendMethodChooserModalProps<T extends string> {
  open: boolean;
  title: string;
  description: string;
  options: readonly SendMethodOption<T>[];
  rememberMethod: boolean;
  onRememberMethodChange: (remember: boolean) => void;
  onChoose: (method: T) => void;
  onClose: () => void;
  busy?: boolean;
  testId?: string;
}

export function SendMethodChooserModal<T extends string>({
  open,
  title,
  description,
  options,
  rememberMethod,
  onRememberMethodChange,
  onChoose,
  onClose,
  busy = false,
  testId = "document-send-method-modal",
}: SendMethodChooserModalProps<T>) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl supports-[height:100dvh]:max-h-[90dvh]"
      testId={testId}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 id={titleId} className="text-lg font-bold text-slate-900">
            {title}
          </h2>
          <p id={descriptionId} className="mt-1 text-sm text-slate-600">
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3 p-5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChoose(option.value)}
            disabled={busy}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block font-bold text-slate-900">
              {option.label}
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              {option.description}
            </span>
          </button>
        ))}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <input
            type="checkbox"
            checked={rememberMethod}
            onChange={(event) => onRememberMethodChange(event.target.checked)}
            disabled={busy}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-semibold text-slate-900">
              Usar siempre este método
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              Podrás cambiarlo en Ajustes, Preferencias.
            </span>
          </span>
        </label>
      </div>

      <div className="flex justify-end border-t border-slate-100 p-5">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </Modal>
  );
}
