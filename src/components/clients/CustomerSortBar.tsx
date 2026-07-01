"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  CUSTOMER_SORT_FIELD_LABELS,
  type CustomerSortField,
} from "@/lib/customers";

interface CustomerSortBarProps {
  sortField: CustomerSortField;
  onSortFieldChange: (field: CustomerSortField) => void;
}

export function CustomerSortBar({
  sortField,
  onSortFieldChange,
}: CustomerSortBarProps) {
  return (
    <Field label="Ordenar por">
      <Select
        value={sortField}
        onChange={(event) =>
          onSortFieldChange(event.target.value as CustomerSortField)
        }
      >
        {(Object.keys(CUSTOMER_SORT_FIELD_LABELS) as CustomerSortField[]).map(
          (field) => (
            <option key={field} value={field}>
              {CUSTOMER_SORT_FIELD_LABELS[field]}
            </option>
          ),
        )}
      </Select>
    </Field>
  );
}
