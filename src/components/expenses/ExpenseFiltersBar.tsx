"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  ALL_QUARTERS,
  availableSummaryYears,
  quarterLabel,
} from "@/lib/periods";
import type { ExpensePeriodKind } from "@/lib/expense-filters";
import type { Expense } from "@/lib/types";
import type { Quarter } from "@/lib/periods";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

interface ExpenseFiltersBarProps {
  expenses: Expense[];
  periodKind: ExpensePeriodKind;
  year: number;
  month: number;
  quarter: Quarter;
  supplierFilter: string | null;
  supplierOptions: Array<{ key: string; label: string }>;
  onPeriodKindChange: (kind: ExpensePeriodKind) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onQuarterChange: (quarter: Quarter) => void;
  onSupplierFilterChange: (key: string | null) => void;
}

export function ExpenseFiltersBar({
  expenses,
  periodKind,
  year,
  month,
  quarter,
  supplierFilter,
  supplierOptions,
  onPeriodKindChange,
  onYearChange,
  onMonthChange,
  onQuarterChange,
  onSupplierFilterChange,
}: ExpenseFiltersBarProps) {
  const years = availableSummaryYears([], expenses);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Periodo">
        <Select
          value={periodKind}
          aria-label="Periodo de gastos"
          onChange={(e) =>
            onPeriodKindChange(e.target.value as ExpensePeriodKind)
          }
        >
          <option value="month">Mes</option>
          <option value="quarter">Trimestre</option>
          <option value="year">Año</option>
        </Select>
      </Field>

      <Field label="Año">
        <Select
          value={year}
          aria-label="Año de gastos"
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </Field>

      {periodKind === "month" && (
        <Field label="Mes">
          <Select
            value={month}
            aria-label="Mes de gastos"
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {periodKind === "quarter" && (
        <Field label="Trimestre">
          <Select
            value={quarter}
            aria-label="Trimestre de gastos"
            onChange={(e) => onQuarterChange(Number(e.target.value) as Quarter)}
          >
            {ALL_QUARTERS.map((q) => (
              <option key={q} value={q}>
                {quarterLabel(year, q)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label="Proveedor">
        <Select
          value={supplierFilter ?? ""}
          aria-label="Proveedor de gastos"
          onChange={(e) =>
            onSupplierFilterChange(e.target.value || null)
          }
        >
          <option value="">Todos los proveedores</option>
          {supplierOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
