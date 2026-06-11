"use client";

import { useState } from "react";
import { unitPriceFromGross, unitPriceGross } from "@/lib/calculations";
import { Field, Input } from "@/components/ui/Field";
import {
  decimalInputFromNumber,
  parseDecimalInput,
  sanitizeDecimalTyping,
  selectInputOnFocus,
} from "@/lib/decimal-input";

interface ExpenseAmountFieldsProps {
  amountText: string;
  onAmountTextChange: (value: string) => void;
  ivaPercent: number;
  vatExempt: boolean;
}

export function ExpenseAmountFields({
  amountText,
  onAmountTextChange,
  ivaPercent,
  vatExempt,
}: ExpenseAmountFieldsProps) {
  const [grossDraft, setGrossDraft] = useState<string | null>(null);

  if (vatExempt) {
    return (
      <Field label="Importe *">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={amountText}
          onChange={(e) =>
            onAmountTextChange(sanitizeDecimalTyping(e.target.value))
          }
          onFocus={selectInputOnFocus}
        />
      </Field>
    );
  }

  const amount = parseDecimalInput(amountText);
  const grossDisplay =
    grossDraft ??
    (amount === 0
      ? ""
      : decimalInputFromNumber(unitPriceGross(amount, ivaPercent)));

  return (
    <>
      <Field label="Importe (sin IVA) *">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={amountText}
          onChange={(e) => {
            setGrossDraft(null);
            onAmountTextChange(sanitizeDecimalTyping(e.target.value));
          }}
          onFocus={selectInputOnFocus}
        />
      </Field>
      <Field label="Importe (con IVA)">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={grossDisplay}
          onChange={(e) => {
            const raw = sanitizeDecimalTyping(e.target.value);
            setGrossDraft(raw);
            const gross = parseDecimalInput(raw);
            onAmountTextChange(
              decimalInputFromNumber(unitPriceFromGross(gross, ivaPercent)),
            );
          }}
          onFocus={selectInputOnFocus}
          onBlur={() => setGrossDraft(null)}
        />
      </Field>
    </>
  );
}
