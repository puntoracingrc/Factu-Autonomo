"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { VERIFACTU_SOFTWARE } from "@/lib/verifactu/constants";
import type { BusinessProfile, VerifactuSettings } from "@/lib/types";

interface Props {
  form: BusinessProfile;
  onChange: (settings: VerifactuSettings) => void;
}

export function VerifactuSettingsCard({ form, onChange }: Props) {
  const settings = form.verifactu ?? { enabled: true, environment: "test" };

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Veri*Factu</h2>
          <p className="mt-1 text-sm text-slate-600">
            Registro encadenado, QR tributario en PDF y remisión a AEAT (entorno
            de pruebas por defecto). Obligatorio para autónomos antes del{" "}
            <strong>1 julio 2027</strong>.
          </p>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) =>
            onChange({ ...settings, enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="text-sm font-medium text-slate-800">
          Activar Veri*Factu en facturas emitidas
        </span>
      </label>

      {settings.enabled && (
        <Field
          label="Entorno AEAT"
          hint="Usa «Pruebas» hasta tener certificado de producción configurado en el servidor."
        >
          <select
            value={settings.environment}
            onChange={(e) =>
              onChange({
                ...settings,
                environment: e.target.value === "production" ? "production" : "test",
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="test">Pruebas (prewww2.aeat.es)</option>
            <option value="production">Producción</option>
          </select>
        </Field>
      )}

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Verificación in situ (SIF)</p>
        <ul className="mt-2 space-y-1 text-emerald-800">
          <li>Productor: {VERIFACTU_SOFTWARE.developerName}</li>
          <li>NIF productor: {VERIFACTU_SOFTWARE.developerNif}</li>
          <li>Software: {VERIFACTU_SOFTWARE.softwareName}</li>
          <li>Código SIF: {VERIFACTU_SOFTWARE.softwareId}</li>
          <li>Versión: {VERIFACTU_SOFTWARE.softwareVersion}</li>
        </ul>
      </div>

      <Link
        href="/legal/declaracion-responsable"
        className="inline-block text-sm font-semibold text-blue-600 hover:underline"
      >
        Ver declaración responsable del SIF →
      </Link>
    </Card>
  );
}
