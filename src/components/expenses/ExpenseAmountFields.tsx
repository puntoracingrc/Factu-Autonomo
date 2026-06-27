"use client";

import { useState } from "react";
import {
  formatMoney,
  unitPriceFromGross,
  unitPriceGross,
} from "@/lib/calculations";
import { Field, Input } from "@/components/ui/Field";
import {
  decimalInputFromNumber,
  parseDecimalInput,
  sanitizeDecimalTyping,
  selectInputOnFocus,
} from "@/lib/decimal-input";
import { expenseTotalsFromBase } from "@/lib/expenses";

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
    const totals = expenseTotalsFromBase(parseDecimalInput(amountText), 0, true);
    return (
      <div className="space-y-2">
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
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Total: <strong>{formatMoney(totals.total)}</strong>
        </p>
      </div>
    );
  }

  const amount = parseDecimalInput(amountText);
  const totals = expenseTotalsFromBase(amount, ivaPercent);
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
      <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
        Base: <strong>{formatMoney(totals.base)}</strong> · IVA:{" "}
        <strong>{formatMoney(totals.iva)}</strong> · Total:{" "}
        <strong>{formatMoney(totals.total)}</strong>
      </div>
    </>
  );
}
