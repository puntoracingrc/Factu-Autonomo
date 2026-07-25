"use client";

import { Field } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import {
  lineGrossUnitPrice,
  unitPriceFromGross,
} from "@/lib/calculations";

interface LineItemPriceFieldsProps {
  unitPrice: number;
  grossUnitPrice?: number;
  ivaPercent: number;
  vatExempt: boolean;
  onUnitPriceChange: (unitPrice: number, grossUnitPrice?: number) => void;
  disabled?: boolean;
}

export function LineItemPriceFields({
  unitPrice,
  grossUnitPrice,
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
          onChange={(nextUnitPrice) => onUnitPriceChange(nextUnitPrice)}
          disabled={disabled}
          maxDecimals={2}
        />
      </Field>
    );
  }

  const grossPrice = lineGrossUnitPrice(
    { unitPrice, grossUnitPrice, ivaPercent },
    vatExempt,
  );

  return (
    <>
      <Field label="Sin IVA">
        <NumericFieldInput
          value={unitPrice}
          onChange={(nextUnitPrice) => onUnitPriceChange(nextUnitPrice)}
          disabled={disabled}
          maxDecimals={2}
        />
      </Field>
      <Field label="Con IVA">
        <NumericFieldInput
          value={grossPrice}
          onChange={(gross) =>
            onUnitPriceChange(unitPriceFromGross(gross, ivaPercent), gross)
          }
          disabled={disabled}
          maxDecimals={2}
        />
      </Field>
    </>
  );
}
