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
import {
  expenseTotalsFromBase,
} from "@/lib/expenses";
import {
  expenseAmountVatView,
  expenseVatSourceLabel,
} from "./expense-vat-ui";
import type { Expense, ExpensePurchaseLine } from "@/lib/types";

interface ExpenseAmountFieldsProps {
  amountText: string;
  onAmountTextChange: (value: string) => void;
  ivaPercent: number;
  vatExempt: boolean;
  profileVatExempt?: boolean;
  businessKind?: Expense["businessKind"];
  deductibility?: Expense["deductibility"];
  origin?: Expense["origin"];
  recurringExpenseId?: Expense["recurringExpenseId"];
  purchaseLines?: ExpensePurchaseLine[];
}

export function ExpenseAmountFields({
  amountText,
  onAmountTextChange,
  ivaPercent,
  vatExempt,
  profileVatExempt = vatExempt,
  businessKind,
  deductibility,
  origin,
  recurringExpenseId,
  purchaseLines,
}: ExpenseAmountFieldsProps) {
  const [grossDraft, setGrossDraft] = useState<string | null>(null);
  const amount = parseDecimalInput(amountText);
  const vatView = expenseAmountVatView(
    {
      amount,
      ivaPercent,
      purchaseLines,
      businessKind,
      deductibility,
      origin,
      recurringExpenseId,
    },
    profileVatExempt,
  );
  const vat = vatView.resolution;

  if (vatExempt) {
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
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Base: <strong>{formatMoney(vat.base)}</strong> · IVA:{" "}
          <strong>{formatMoney(vat.iva)}</strong> · Total:{" "}
          <strong>{formatMoney(vat.total)}</strong>
          <span className="mt-1 block text-xs font-semibold">
            Origen IVA:{" "}
            {expenseVatSourceLabel(vat, profileVatExempt, {
              businessKind,
              deductibility,
              origin,
              recurringExpenseId,
            })}
          </span>
        </div>
      </div>
    );
  }

  const headerTotals = expenseTotalsFromBase(
    amount,
    ivaPercent,
    vatExempt,
  );
  const rates = vatView.ratesLabel;
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
      {vat.source === "header" ? (
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
      ) : (
        <div
          role={vat.blocked ? "alert" : "status"}
          className={`rounded-xl border px-3 py-2 text-sm sm:self-end ${
            vat.blocked
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <strong>
            {vat.blocked ? "Revisar IVA por líneas" : "Total por líneas"}
          </strong>
          <span className="mt-0.5 block text-xs">
            {vat.blocked
              ? "La base de las líneas no permite usar un total fiscal fiable."
              : `Tipos ${rates || "0%"}; la cabecera no gobierna este total.`}
          </span>
        </div>
      )}
      <div
        className={`rounded-xl px-3 py-2 text-sm sm:col-span-2 ${
          vat.blocked
            ? "border border-amber-200 bg-amber-50 text-amber-900"
            : "bg-slate-50 text-slate-600"
        }`}
      >
        {vat.blocked ? (
          <>
            Base de cabecera: <strong>{formatMoney(headerTotals.base)}</strong>
            {" · "}IVA y total: <strong>pendientes de revisar</strong>
          </>
        ) : (
          <>
            Base: <strong>{formatMoney(vat.base)}</strong> · IVA:{" "}
            <strong>{formatMoney(vat.iva)}</strong> · Total:{" "}
            <strong>{formatMoney(vat.total)}</strong>
          </>
        )}
        <span className="mt-1 block text-xs font-semibold">
          Origen IVA:{" "}
          {vat.source === "lines"
            ? `líneas conciliadas (${rates})`
            : vat.source === "blocked"
              ? "líneas pendientes de revisar"
              : `cabecera · sin desglose mixto completo (${vat.headerIvaPercent}%)`}
        </span>
      </div>
    </>
  );
}
