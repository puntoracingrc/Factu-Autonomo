"use client";

import { useState } from "react";
import { BookmarkPlus, Star } from "lucide-react";

import { Input, Select } from "@/components/ui/Field";
import {
  defaultPaymentMethodForType,
  normalizeDocumentPaymentMethods,
  paymentMethodPreview,
  paymentMethodsForType,
} from "@/lib/document-payment-methods";
import type { DocumentPaymentMethodsSettings, DocumentType } from "@/lib/types";

interface DocumentPaymentPickerProps {
  documentType: DocumentType;
  settings?: DocumentPaymentMethodsSettings | null;
  value: string;
  onChange: (value: string) => void;
  onSave: (text: string, makeDefault: boolean) => void;
}

export function DocumentPaymentPicker({
  documentType,
  settings,
  value,
  onChange,
  onSave,
}: DocumentPaymentPickerProps) {
  const [makeDefault, setMakeDefault] = useState(false);
  const normalized = normalizeDocumentPaymentMethods(settings);
  const methods = paymentMethodsForType(normalized, documentType);
  const defaultMethod = defaultPaymentMethodForType(normalized, documentType);
  const trimmedValue = value.trim();
  const matchingMethod = methods.find(
    (method) => method.text.trim() === trimmedValue,
  );
  const isCurrentDefault = Boolean(
    matchingMethod && matchingMethod.id === defaultMethod?.id,
  );
  const inputId = `document-payment-method-${documentType}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-700"
        >
          Forma de pago
        </label>
        {methods.length > 0 && (
          <Select
            aria-label="Elegir otra forma de pago"
            className="!min-h-9 w-full text-sm sm:w-auto sm:max-w-md"
            defaultValue=""
            onChange={(e) => {
              const method = methods.find((item) => item.id === e.target.value);
              if (method) onChange(method.text);
              setMakeDefault(false);
              e.target.value = "";
            }}
          >
            <option value="">Elegir otra…</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.id === defaultMethod?.id ? "★ " : ""}
                {paymentMethodPreview(method.text)}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setMakeDefault(false);
        }}
        placeholder="Pago por transferencia bancaria"
      />
      {trimmedValue && !isCurrentDefault && (
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          {!matchingMethod && (
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Dejar como predeterminada
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              onSave(trimmedValue, matchingMethod ? true : makeDefault);
              setMakeDefault(false);
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {matchingMethod ? (
              <Star className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {matchingMethod
              ? "Usar como predeterminada"
              : "Guardar forma de pago"}
          </button>
        </div>
      )}
    </div>
  );
}
