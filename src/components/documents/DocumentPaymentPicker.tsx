"use client";

import { Field, Input, Select } from "@/components/ui/Field";
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

  return (
    <div className="space-y-4">
      {methods.length > 0 && (
        <Field
          label="Forma de pago guardada"
          hint={
            defaultMethod
              ? "Opcional. La predeterminada ya está rellenada; puedes cambiarla aquí."
              : "Opcional. Elige un texto configurado en Ajustes."
          }
        >
          <Select
            defaultValue=""
            onChange={(e) => {
              const method = methods.find((item) => item.id === e.target.value);
              if (method) onChange(method.text);
              e.target.value = "";
            }}
          >
            <option value="">Elegir otra forma de pago…</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.id === defaultMethod?.id ? "★ " : ""}
                {paymentMethodPreview(method.text)}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field
        label="Forma de pago (aparece en el PDF)"
        hint="Ej: transferencia, efectivo, Bizum…"
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Pago por transferencia bancaria"
        />
      </Field>
    </div>
  );
}
