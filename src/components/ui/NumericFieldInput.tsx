"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Field";

interface NumericFieldInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  maxDecimals?: number;
}

/** Text input for decimals — avoids the stuck leading zero of type="number". */
export function NumericFieldInput({
  value,
  onChange,
  disabled,
  placeholder = "0",
  className,
  maxDecimals,
}: NumericFieldInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const display = draft ?? (value === 0 ? "" : String(value));

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={display}
      disabled={disabled}
      className={className}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        if (
          typeof maxDecimals === "number" &&
          raw.includes(".") &&
          (raw.split(".")[1]?.length ?? 0) > maxDecimals
        ) {
          return;
        }
        setDraft(raw);
        if (raw === "" || raw === ".") {
          onChange(0);
          return;
        }
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      onBlur={() => {
        if (
          typeof maxDecimals === "number" &&
          Number.isFinite(value)
        ) {
          onChange(Number(value.toFixed(maxDecimals)));
        }
        setDraft(null);
      }}
    />
  );
}
