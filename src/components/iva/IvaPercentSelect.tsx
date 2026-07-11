"use client";

import { Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  DEFAULT_IVA_SETTINGS,
  formatIvaLabel,
  ivaOptionsForValue,
} from "@/lib/iva";

interface IvaPercentSelectProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export function IvaPercentSelect({
  value,
  onChange,
  disabled,
  className,
  id,
  ariaLabel,
}: IvaPercentSelectProps) {
  const { data } = useAppStore();
  const iva = data.profile.iva ?? DEFAULT_IVA_SETTINGS;
  const options = ivaOptionsForValue(iva, value);

  return (
    <Select
      value={value}
      disabled={disabled}
      className={className}
      id={id}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {options.map((rate) => (
        <option key={rate} value={rate}>
          {formatIvaLabel(rate, iva.defaultRate)}
        </option>
      ))}
    </Select>
  );
}
