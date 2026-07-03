"use client";

import { Select } from "@/components/ui/Field";
import {
  DOCUMENT_UNIT_CATALOG,
  enabledDocumentUnits,
  normalizeDocumentUnitId,
  normalizeDocumentUnits,
} from "@/lib/document-units";
import type { DocumentUnitsSettings } from "@/lib/types";

interface LineItemUnitSelectProps {
  settings?: DocumentUnitsSettings | null;
  value: string;
  onChange: (unitId: string) => void;
}

export function LineItemUnitSelect({
  settings,
  value,
  onChange,
}: LineItemUnitSelectProps) {
  const normalized = normalizeDocumentUnits(settings);
  const currentUnitId = normalizeDocumentUnitId(value) ?? value;
  const enabledUnits = enabledDocumentUnits(normalized);
  const currentUnit = DOCUMENT_UNIT_CATALOG.find((unit) => unit.id === currentUnitId);
  const units =
    currentUnit && !enabledUnits.some((unit) => unit.id === currentUnit.id)
      ? [currentUnit, ...enabledUnits]
      : enabledUnits;

  if (units.length <= 1) {
    return (
      <p className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700">
        {units[0]?.shortLabel ?? "ud"}
      </p>
    );
  }

  return (
    <Select
      value={currentUnitId}
      onChange={(e) => onChange(normalizeDocumentUnitId(e.target.value) ?? e.target.value)}
    >
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {unit.shortLabel} — {unit.label}
        </option>
      ))}
    </Select>
  );
}
