"use client";

import { Field, Input } from "@/components/ui/Field";

export interface CustomerPhoneValues {
  phone: string;
  phoneContactName: string;
  phone2: string;
  phone2ContactName: string;
}

export function CustomerPhoneFields({
  values,
  onChange,
}: {
  values: CustomerPhoneValues;
  onChange: (field: keyof CustomerPhoneValues, value: string) => void;
}) {
  return (
    <div className="space-y-4 sm:col-span-2">
      {([1, 2] as const).map((slot) => {
        const phoneField = slot === 1 ? "phone" : "phone2";
        const nameField = slot === 1 ? "phoneContactName" : "phone2ContactName";
        return (
          <div key={slot} className="grid grid-cols-2 items-end gap-3 sm:gap-4">
            <Field label={`Teléfono ${slot}`}>
              <Input
                type="tel"
                autoComplete={slot === 1 ? "tel" : "off"}
                value={values[phoneField]}
                onChange={(event) => onChange(phoneField, event.target.value)}
                placeholder="600 000 000"
              />
            </Field>
            <Field label={`Contacto ${slot} (opcional)`}>
              <Input
                autoComplete="off"
                value={values[nameField]}
                onChange={(event) => onChange(nameField, event.target.value)}
                placeholder="Nombre"
              />
            </Field>
          </div>
        );
      })}
    </div>
  );
}
