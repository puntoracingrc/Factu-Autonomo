"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  CUSTOMER_SORT_FIELD_LABELS,
  customerSortDirectionLabel,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/lib/customers";

interface CustomerSortBarProps {
  sortField: CustomerSortField;
  sortDirection: CustomerSortDirection;
  onSortFieldChange: (field: CustomerSortField) => void;
  onSortDirectionChange: (direction: CustomerSortDirection) => void;
}

export function CustomerSortBar({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}: CustomerSortBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
      <Field label="Sentido">
        <Select
          value={sortDirection}
          onChange={(event) =>
            onSortDirectionChange(event.target.value as CustomerSortDirection)
          }
        >
          <option value="asc">{customerSortDirectionLabel(sortField, "asc")}</option>
          <option value="desc">
            {customerSortDirectionLabel(sortField, "desc")}
          </option>
        </Select>
      </Field>
    </div>
  );
}
