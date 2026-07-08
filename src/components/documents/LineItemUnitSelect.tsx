"use client";

import { Select } from "@/components/ui/Field";
import {
  DOCUMENT_UNIT_CATALOG,
  enabledDocumentUnits,
  normalizeDocumentUnitId,
  normalizeDocumentUnits,
} from "@/lib/document-units";
import type { DocumentUnitsSettings } from "@/lib/types";

const PRACTICAL_LINE_UNIT_IDS = ["ud", "m", "ml", "m2", "h", "serv"];

interface LineItemUnitSelectProps {
  settings?: DocumentUnitsSettings | null;
  value: string;
  onChange: (unitId: string) => void;
  compact?: boolean;
  className?: string;
}

export function LineItemUnitSelect({
  settings,
  value,
  onChange,
  compact = false,
  className = "",
}: LineItemUnitSelectProps) {
  const normalized = normalizeDocumentUnits(settings);
  const currentUnitId = normalizeDocumentUnitId(value) ?? value;
  const enabledUnits = enabledDocumentUnits(normalized);
  const currentUnit = DOCUMENT_UNIT_CATALOG.find(
    (unit) => unit.id === currentUnitId,
  );
  const practicalUnits = PRACTICAL_LINE_UNIT_IDS.map((unitId) =>
    DOCUMENT_UNIT_CATALOG.find((unit) => unit.id === unitId),
  ).filter((unit): unit is (typeof DOCUMENT_UNIT_CATALOG)[number] =>
    Boolean(unit),
  );
  const units = [...enabledUnits, ...practicalUnits, currentUnit]
    .filter((unit): unit is (typeof DOCUMENT_UNIT_CATALOG)[number] =>
      Boolean(unit),
    )
    .filter(
      (unit, index, allUnits) =>
        allUnits.findIndex((candidate) => candidate.id === unit.id) === index,
    );

  if (units.length <= 1) {
    const singleUnitClass = className
      ? `flex items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 ${className}`
      : "min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700";

    return <p className={singleUnitClass}>{units[0]?.shortLabel ?? "ud"}</p>;
  }

  return (
    <Select
      value={currentUnitId}
      onChange={(e) =>
        onChange(normalizeDocumentUnitId(e.target.value) ?? e.target.value)
      }
      className={className}
    >
      {units.map((unit) => (
        <option key={unit.id} value={unit.id}>
          {compact ? unit.shortLabel : `${unit.shortLabel} — ${unit.label}`}
        </option>
      ))}
    </Select>
  );
}
