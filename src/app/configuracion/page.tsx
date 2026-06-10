"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PlanStatusCard } from "@/components/billing/PlanStatusCard";
import { VerifactuSettingsCard } from "@/components/verifactu/VerifactuSettingsCard";
import { normalizeVerifactuSettings } from "@/lib/verifactu/eligibility";
import { useAppStore } from "@/context/AppStore";
import { getMaxSequence } from "@/lib/documents";
import {
  addIvaRate,
  normalizeIvaSettings,
  removeIvaRate,
  setDefaultIvaRate,
} from "@/lib/iva";
import {
  NUMBERING_FORMAT_EXAMPLES,
  NUMBERING_KIND_LABELS,
  nextSequencePreview,
  normalizeNumbering,
  setManualFormat,
  setManualLastSequence,
} from "@/lib/numbering";
import { DEFAULT_IRPF_PERCENT, normalizeIrpfPercent } from "@/lib/taxes";
import type {
  BusinessProfile,
  IvaSettings,
  NumberingFormats,
  NumberingLastSequence,
} from "@/lib/types";

const CloudAccountCard = dynamic(
  () =>
    import("@/components/cloud/CloudAccountCard").then(
      (mod) => mod.CloudAccountCard,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="mb-6 text-sm text-slate-500">Cargando cuenta y copia…</p>
    ),
  },
);

export default function ConfiguracionPage() {
  const { data, updateProfile } = useAppStore();
  const [form, setForm] = useState({
    ...data.profile,
    numbering: normalizeNumbering(data.profile.numbering),
  });
  const [saved, setSaved] = useState(false);
  const [ivaError, setIvaError] = useState<string | null>(null);
  const [newIva, setNewIva] = useState("");

  useEffect(() => {
    setForm({
      ...data.profile,
      numbering: normalizeNumbering(data.profile.numbering),
    });
  }, [data.profile]);

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("El logo debe pesar menos de 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, logoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    updateProfile({
      ...form,
      numbering: normalizeNumbering(form.numbering),
      verifactu: normalizeVerifactuSettings(form.verifactu),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function updateNumberingYear(year: number) {
    setForm((prev) => ({
      ...prev,
      numbering: normalizeNumbering({
        ...prev.numbering,
        year,
      }),
    }));
  }

  function updateLastSequence(
    kind: keyof NumberingLastSequence,
    value: number,
  ) {
    setForm((prev) => ({
      ...prev,
      numbering: setManualLastSequence(prev.numbering, kind, value),
    }));
  }

  function updateFormat(kind: keyof NumberingFormats, template: string) {
    setForm((prev) => ({
      ...prev,
      numbering: setManualFormat(prev.numbering, kind, template),
    }));
  }

  function update(field: keyof BusinessProfile, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateIva(next: IvaSettings) {
    setIvaError(null);
    setForm((prev) => ({ ...prev, iva: normalizeIvaSettings(next) }));
  }

  function handleAddIva() {
    const rate = Number(newIva);
    if (!Number.isFinite(rate)) {
      setIvaError("Introduce un porcentaje válido");
      return;
    }
    const result = addIvaRate(form.iva, rate);
    if ("error" in result) {
      setIvaError(result.error);
      return;
    }
    updateIva(result);
    setNewIva("");
  }

  function handleRemoveIva(rate: number) {
    const result = removeIvaRate(form.iva, rate);
    if ("error" in result) {
      setIvaError(result.error);
      return;
    }
    updateIva(result);
  }

  function handleSetDefault(rate: number) {
    updateIva(setDefaultIvaRate(form.iva, rate));
  }

  const sortedRates = [...form.iva.rates].sort((a, b) => b - a);

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Tus datos aparecerán en facturas y recibos"
      />

      <PlanStatusCard />
      <CloudAccountCard />

      <Card className="mb-6 space-y-4">
        <Field
          label="Logo en PDF"
          hint="PNG, JPG o WebP (máx. 2 MB). Aparece en facturas, presupuestos y recibos."
        >
          <div className="space-y-3">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/*"
              onChange={(e) => handleLogoFile(e.target.files?.[0])}
            />
            {form.logoUrl && (
              <div className="flex flex-wrap items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.logoUrl}
                  alt="Vista previa de tu logo"
                  className="h-14 max-w-[180px] rounded-lg border border-slate-200 bg-white object-contain p-1"
                />
                <button
                  type="button"
                  className="text-sm font-semibold text-red-600"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: undefined }))}
                >
                  Quitar logo
                </button>
              </div>
            )}
          </div>
        </Field>
      </Card>

      <Card className="mb-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre o razón social *">
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ej: Juan Pérez Fontanería"
            />
          </Field>
          <Field label="NIF / CIF *">
            <Input
              value={form.nif}
              onChange={(e) => update("nif", e.target.value)}
              placeholder="12345678A"
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </Field>
          <Field label="Código postal">
            <Input
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </Field>
          <Field label="IBAN" hint="Para que te paguen las facturas">
            <Input
              value={form.iban ?? ""}
              onChange={(e) => update("iban", e.target.value)}
              placeholder="ES00 0000 0000..."
            />
          </Field>
        </div>
      </Card>

      <Card className="mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Numeración</h2>
          <p className="mt-1 text-sm text-slate-600">
            Personaliza cómo se ve el número y desde cuál continúas. Usa{" "}
            <strong>{"{num}"}</strong> para el contador y{" "}
            <strong>{"{year}"}</strong> si quieres incluir el año.
          </p>
        </div>

        <Field
          label="Año de la numeración"
          hint="Sirve para el contador y para {year} en el formato"
        >
          <Input
            type="number"
            min={2000}
            max={2100}
            value={form.numbering.year}
            onChange={(e) => updateNumberingYear(Number(e.target.value))}
          />
        </Field>

        <div className="space-y-3">
          {(
            Object.keys(NUMBERING_KIND_LABELS) as Array<
              keyof NumberingLastSequence
            >
          ).map((kind) => {
            const meta = NUMBERING_KIND_LABELS[kind];
            const docsMax = getMaxSequence(
              data.documents,
              kind,
              form.numbering.year,
              form.numbering,
            );
            const preview = nextSequencePreview(
              form.numbering,
              kind,
              docsMax,
            );

            return (
              <div
                key={kind}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-semibold text-slate-900">{meta.label}</p>

                <Field
                  label="Formato del número"
                  hint="Ejemplos rápidos debajo. Debe incluir {num}."
                >
                  <Input
                    value={form.numbering.formats[kind].template}
                    onChange={(e) => updateFormat(kind, e.target.value)}
                    placeholder="Factura - {num}"
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  {NUMBERING_FORMAT_EXAMPLES[kind].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => updateFormat(kind, example)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field
                      label="Último número usado"
                      hint={
                        docsMax > 0
                          ? `En tus documentos guardados el máximo es ${docsMax}`
                          : "Pon 0 si aún no has emitido ninguno este año"
                      }
                    >
                      <Input
                        type="number"
                        min={0}
                        value={form.numbering.lastSequence[kind]}
                        onChange={(e) =>
                          updateLastSequence(kind, Number(e.target.value))
                        }
                        placeholder="Ej: 47"
                      />
                    </Field>
                  </div>
                  <div className="rounded-xl bg-white px-4 py-3 text-sm sm:min-w-[12rem]">
                    <p className="text-slate-500">Siguiente</p>
                    <p className="font-bold text-blue-700">
                      {preview.nextNumber}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Régimen de IVA</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si te acoges a no repercutir IVA, tus facturas, presupuestos y recibos
            no llevarán IVA y no podrás deducir el IVA de tus gastos.
          </p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-slate-300"
            checked={Boolean(form.vatExempt)}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, vatExempt: e.target.checked }))
            }
          />
          <span>
            <span className="font-semibold text-slate-900">
              Exento de repercusión de IVA
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              No facturaré IVA a mis clientes y no desgravaré IVA en mis gastos.
            </span>
          </span>
        </label>
      </Card>

      <Card className="mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">IRPF estimado</h2>
          <p className="mt-1 text-sm text-slate-600">
            Porcentaje orientativo para calcular el impuesto sobre el beneficio
            en el resumen de Inicio (modelo 130 u otros pagos fraccionados).
          </p>
        </div>
        <Field
          label="% IRPF sobre el beneficio"
          hint={`Por defecto ${DEFAULT_IRPF_PERCENT}% en actividades generales. Ajusta si tu gestor te indica otro.`}
        >
          <Input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={form.irpfPercent ?? DEFAULT_IRPF_PERCENT}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                irpfPercent: normalizeIrpfPercent(Number(e.target.value)),
              }))
            }
          />
        </Field>
      </Card>

      {!form.vatExempt && (
      <Card className="mb-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tipos de IVA</h2>
          <p className="mt-1 text-sm text-slate-600">
            Elige los porcentajes que uses al crear facturas, presupuestos,
            recibos y gastos. El marcado como por defecto se aplicará en las
            líneas nuevas.
          </p>
        </div>

        <ul className="space-y-2">
          {sortedRates.map((rate) => {
            const isDefault = rate === form.iva.defaultRate;
            return (
              <li
                key={rate}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900">
                    {rate}%
                  </span>
                  {isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      <Star className="h-3 w-3 fill-current" />
                      Por defecto
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(rate)}
                      className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                    >
                      Usar por defecto
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveIva(rate)}
                    className="flex min-h-10 min-w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                    title="Quitar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field
              label="Añadir otro IVA"
              hint="Ej: 7,5 para un tipo especial"
            >
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={newIva}
                onChange={(e) => {
                  setNewIva(e.target.value);
                  setIvaError(null);
                }}
                placeholder="Ej: 5"
              />
            </Field>
          </div>
          <Button variant="secondary" onClick={handleAddIva}>
            Añadir
          </Button>
        </div>

        {ivaError && (
          <p className="text-sm font-medium text-red-600">{ivaError}</p>
        )}
      </Card>
      )}

      <VerifactuSettingsCard
        form={form}
        onChange={(verifactu) =>
          setForm((prev) => ({
            ...prev,
            verifactu: normalizeVerifactuSettings(verifactu),
          }))
        }
      />

      <Button fullWidth onClick={handleSave}>
        Guardar configuración
      </Button>
      {saved && (
        <p className="mt-3 text-center text-sm font-medium text-green-600">
          Datos guardados correctamente
        </p>
      )}

      <Card className="mt-6 bg-slate-100">
        <h2 className="font-bold text-slate-900">Cómo usar la app</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. Rellena tus datos, numeración y tipos de IVA (solo una vez).</li>
          <li>2. Crea facturas, presupuestos o recibos desde el inicio.</li>
          <li>3. Anota tus gastos en «Gastos».</li>
          <li>
            4. En el móvil: menú del navegador → «Añadir a pantalla de inicio».
          </li>
        </ul>
      </Card>
    </div>
  );
}
