"use client";

import { Card } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import {
  DOCUMENT_UNIT_CATALOG,
  enabledDocumentUnits,
  normalizeDocumentUnits,
  setDefaultDocumentUnit,
  toggleDocumentUnit,
} from "@/lib/document-units";
import type { DocumentUnitsSettings } from "@/lib/types";

interface DocumentUnitsCardProps {
  settings: DocumentUnitsSettings;
  onChange: (settings: DocumentUnitsSettings) => void;
}

export function DocumentUnitsCard({
  settings,
  onChange,
}: DocumentUnitsCardProps) {
  const normalized = normalizeDocumentUnits(settings);
  const enabled = enabledDocumentUnits(normalized);

  return (
    <Card className="mb-6 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900">Unidades de medida</h2>
        <p className="mt-1 text-sm text-slate-600">
          Activa las unidades que uses en facturas y presupuestos (ud, m²,
          metros, horas…). Al crear documentos podrás elegir la unidad en cada
          línea.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_UNIT_CATALOG.map((unit) => {
          const checked = normalized.enabledUnitIds.includes(unit.id);
          const onlyOneLeft = normalized.enabledUnitIds.length === 1 && checked;
          return (
            <label
              key={unit.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                checked
                  ? "border-blue-200 bg-blue-50/70"
                  : "border-slate-200 bg-white"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={onlyOneLeft}
                onChange={(e) =>
                  onChange(
                    toggleDocumentUnit(normalized, unit.id, e.target.checked),
                  )
                }
                className="h-5 w-5 rounded"
              />
              <span className="text-sm font-medium text-slate-800">
                {unit.label}{" "}
                <span className="text-slate-500">({unit.shortLabel})</span>
              </span>
            </label>
          );
        })}
      </div>

      <Field
        label="Unidad predeterminada"
        hint="Se aplicará al añadir nuevas líneas en facturas y presupuestos."
      >
        <Select
          value={normalized.defaultUnitId}
          onChange={(e) =>
            onChange(setDefaultDocumentUnit(normalized, e.target.value))
          }
        >
          {enabled.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.label} ({unit.shortLabel})
            </option>
          ))}
        </Select>
      </Field>
    </Card>
  );
}
