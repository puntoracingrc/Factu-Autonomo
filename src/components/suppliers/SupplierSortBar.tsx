"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  SUPPLIER_SORT_FIELD_LABELS,
  supplierSortDirectionLabel,
  type SupplierSortDirection,
  type SupplierSortField,
} from "@/lib/suppliers";

interface SupplierSortBarProps {
  sortField: SupplierSortField;
  sortDirection: SupplierSortDirection;
  onSortFieldChange: (field: SupplierSortField) => void;
  onSortDirectionChange: (direction: SupplierSortDirection) => void;
}

export function SupplierSortBar({
  sortField,
  sortDirection,
  onSortFieldChange,
  onSortDirectionChange,
}: SupplierSortBarProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
      <Field label="Sentido">
        <Select
          value={sortDirection}
          onChange={(event) =>
            onSortDirectionChange(event.target.value as SupplierSortDirection)
          }
        >
          <option value="asc">
            {supplierSortDirectionLabel(sortField, "asc")}
          </option>
          <option value="desc">
            {supplierSortDirectionLabel(sortField, "desc")}
          </option>
        </Select>
      </Field>
    </div>
  );
}
