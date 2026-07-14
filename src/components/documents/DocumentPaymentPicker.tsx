"use client";

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
}

export function DocumentPaymentPicker({
  documentType,
  settings,
  value,
  onChange,
}: DocumentPaymentPickerProps) {
  const normalized = normalizeDocumentPaymentMethods(settings);
  const methods = paymentMethodsForType(normalized, documentType);
  const defaultMethod = defaultPaymentMethodForType(normalized, documentType);
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
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pago por transferencia bancaria"
      />
    </div>
  );
}
