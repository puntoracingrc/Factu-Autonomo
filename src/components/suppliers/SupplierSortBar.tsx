"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  SUPPLIER_SORT_FIELD_LABELS,
  type SupplierSortField,
} from "@/lib/suppliers";

interface SupplierSortBarProps {
  sortField: SupplierSortField;
  onSortFieldChange: (field: SupplierSortField) => void;
}

export function SupplierSortBar({
  sortField,
  onSortFieldChange,
}: SupplierSortBarProps) {
  return (
    <Field label="Ordenar por">
      <Select
        value={sortField}
        onChange={(event) =>
          onSortFieldChange(event.target.value as SupplierSortField)
        }
      >
        {(Object.keys(SUPPLIER_SORT_FIELD_LABELS) as SupplierSortField[]).map(
          (field) => (
            <option key={field} value={field}>
              {SUPPLIER_SORT_FIELD_LABELS[field]}
            </option>
          ),
        )}
      </Select>
    </Field>
  );
}
