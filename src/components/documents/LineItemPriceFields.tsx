"use client";

import { Field } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import { unitPriceFromGross, unitPriceGross } from "@/lib/calculations";

interface LineItemPriceFieldsProps {
  unitPrice: number;
  ivaPercent: number;
  vatExempt: boolean;
  onUnitPriceChange: (unitPrice: number) => void;
  disabled?: boolean;
}

export function LineItemPriceFields({
  unitPrice,
  ivaPercent,
  vatExempt,
  onUnitPriceChange,
  disabled,
}: LineItemPriceFieldsProps) {
  if (vatExempt) {
    return (
      <Field label="Precio">
        <NumericFieldInput
          value={unitPrice}
          onChange={onUnitPriceChange}
          disabled={disabled}
        />
      </Field>
    );
  }

  const grossPrice = unitPriceGross(unitPrice, ivaPercent);

  return (
    <>
      <Field label="Sin IVA">
        <NumericFieldInput
          value={unitPrice}
          onChange={onUnitPriceChange}
          disabled={disabled}
        />
      </Field>
      <Field label="Con IVA">
        <NumericFieldInput
          value={grossPrice}
          onChange={(gross) =>
            onUnitPriceChange(unitPriceFromGross(gross, ivaPercent))
          }
          disabled={disabled}
        />
      </Field>
    </>
  );
}
