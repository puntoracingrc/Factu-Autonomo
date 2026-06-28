"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChevronDown,
  CreditCard,
  FileCog,
  FileText,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PlanStatusCard } from "@/components/billing/PlanStatusCard";
import { SubscriptionBillingCard } from "@/components/billing/SubscriptionBillingCard";
import { DocumentPaymentMethodsCard } from "@/components/settings/DocumentPaymentMethodsCard";
import { DocumentUnitsCard } from "@/components/settings/DocumentUnitsCard";
import { ManualHelpLink } from "@/components/manual/ManualHelpLink";
import { DataOwnershipCard } from "@/components/settings/DataOwnershipCard";
import { DocumentPhrasesCard } from "@/components/settings/DocumentPhrasesCard";
import { VerifactuSettingsCard } from "@/components/verifactu/VerifactuSettingsCard";
import { normalizeDocumentPhrases } from "@/lib/document-phrases";
import { normalizeDocumentPaymentMethods } from "@/lib/document-payment-methods";
import { normalizeDocumentUnits } from "@/lib/document-units";
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
import {
  businessProfileNotices,
  businessProfileQrNotice,
  isBusinessProfileReadyForIssuedInvoices,
  normalizeBusinessProfileForSave,
} from "@/lib/business-profile";
import {
  DEFAULT_QUOTE_VALIDITY_DAYS,
  MAX_QUOTE_VALIDITY_DAYS,
  normalizeQuoteValidityDays,
} from "@/lib/quote-validity";
import type {
  BusinessProfile,
  IvaSettings,
  NumberingFormats,
  NumberingLastSequence,
} from "@/lib/types";

const ReferralCard = dynamic(
  () =>
    import("@/components/referrals/ReferralCard").then((mod) => mod.ReferralCard),
  {
    ssr: false,
    loading: () => null,
  },
);

type SettingsSectionKey = "business" | "documents" | "taxes" | "account";

const SETTINGS_NAV_ITEMS: Array<{
  key: SettingsSectionKey;
  id: string;
  title: string;
  Icon: LucideIcon;
}> = [
  {
    key: "business",
    id: "ajustes-negocio",
    title: "Negocio",
    Icon: Building2,
  },
  {
    key: "documents",
    id: "ajustes-documentos",
    title: "Documentos",
    Icon: FileText,
  },
  {
    key: "taxes",
    id: "ajustes-impuestos",
    title: "Impuestos",
    Icon: Calculator,
  },
  {
    key: "account",
    id: "ajustes-cuenta",
    title: "Cuenta",
    Icon: CreditCard,
  },
];

function SettingsSection({
  id,
  title,
  description,
  Icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <details
        open={open}
        onToggle={(event) => onToggle(event.currentTarget.open)}
        className="group mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-slate-900">{title}</span>
              <span className="mt-0.5 block text-sm text-slate-500">
                {description}
              </span>
            </span>
          </span>
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          {children}
        </div>
      </details>
    </section>
  );
}

export default function ConfiguracionPage() {
  const { data, updateProfile } = useAppStore();
  const [form, setForm] = useState({
    ...data.profile,
    numbering: normalizeNumbering(data.profile.numbering),
  });
  const [saved, setSaved] = useState(false);
  const [ivaError, setIvaError] = useState<string | null>(null);
  const [newIva, setNewIva] = useState("");
  const [openSections, setOpenSections] = useState<
    Record<SettingsSectionKey, boolean>
  >({
    business: true,
    documents: false,
    taxes: false,
    account: false,
  });

  useEffect(() => {
    setForm({
      ...data.profile,
      numbering: normalizeNumbering(data.profile.numbering),
    });
  }, [data.profile]);

  function persistProfile(next: BusinessProfile) {
    updateProfile({
      ...next,
      numbering: normalizeNumbering(next.numbering),
      verifactu: normalizeVerifactuSettings(next.verifactu),
      documentPhrases: normalizeDocumentPhrases(next.documentPhrases),
      documentPaymentMethods: normalizeDocumentPaymentMethods(
        next.documentPaymentMethods,
      ),
      documentUnits: normalizeDocumentUnits(next.documentUnits),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

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
        const next = { ...form, logoUrl: result };
        setForm(next);
        persistProfile(next);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    const next = { ...form, logoUrl: undefined };
    setForm(next);
    persistProfile(next);
  }

  function handleSave() {
    const next = normalizeBusinessProfileForSave(form);
    setForm(next);
    persistProfile(next);
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

  function updateQuoteValidityDays(value: number) {
    setForm((prev) => ({
      ...prev,
      quoteValidityDays: normalizeQuoteValidityDays(value),
    }));
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

  function setSectionOpen(key: SettingsSectionKey, open: boolean) {
    setOpenSections((prev) => ({ ...prev, [key]: open }));
  }

  const sortedRates = [...form.iva.rates].sort((a, b) => b - a);
  const profileNotices = businessProfileNotices(form);
  const missingProfileFields = profileNotices.filter(
    (notice) => notice.level === "missing",
  );
  const profileWarnings = profileNotices.filter(
    (notice) => notice.level === "warning",
  );
  const profileReady = isBusinessProfileReadyForIssuedInvoices(form);

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Datos del negocio, numeración y preferencias de documentos"
      />

      <nav
        aria-label="Secciones de configuración"
        className="mb-5 flex flex-wrap gap-2"
      >
        {SETTINGS_NAV_ITEMS.map((item) => (
          <a
            key={item.key}
            href={`#${item.id}`}
            onClick={() => setSectionOpen(item.key, true)}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700">
              <item.Icon className="h-4 w-4" />
            </span>
            <span>{item.title}</span>
          </a>
        ))}
      </nav>

      <SettingsSection
        id="ajustes-negocio"
        title="Negocio"
        description="Datos fiscales, contacto y logo de tus documentos"
        Icon={Building2}
        open={openSections.business}
        onToggle={(open) => setSectionOpen("business", open)}
      >
        <Card className="space-y-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Datos del negocio en documentos</p>
            <p className="mt-2 leading-relaxed">
              Datos que aparecerán en tus presupuestos y facturas. Revisa estos
              datos antes de emitir una factura: al emitir, el encabezado queda
              guardado en el documento y no cambia si editas la configuración
              después. El NIF no se valida con AEAT desde la app.
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              profileReady && profileWarnings.length === 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <p className="font-semibold">
              {profileReady
                ? "Perfil emisor listo para documentos completos"
                : "Faltan datos del emisor para documentos completos"}
            </p>
            <p className="mt-1">{businessProfileQrNotice(form)}</p>
            {missingProfileFields.length > 0 && (
              <p className="mt-2">
                Completa:{" "}
                {missingProfileFields.map((notice) => notice.label).join(", ")}.
              </p>
            )}
            {profileWarnings.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1">
                {profileWarnings.map((notice) => (
                  <li key={`${notice.field}-${notice.message}`}>
                    {notice.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre fiscal o razón social *"
              hint="Aparece como emisor en PDF de presupuestos, facturas y recibos."
            >
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ej: Juan Pérez Fontanería"
              />
            </Field>
            <Field
              label="NIF / CIF *"
              hint="Necesario antes de emitir facturas. No se valida con AEAT desde la app."
            >
              <Input
                value={form.nif}
                onChange={(e) => update("nif", e.target.value)}
                placeholder="12345678A"
              />
            </Field>
            <Field
              label="Teléfono"
              hint="Opcional. Aparece en el PDF si lo informas."
            >
              <Input
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="600 000 000"
              />
            </Field>
            <Field
              label="Email"
              hint="Opcional. Aparece en el PDF si lo informas."
            >
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="hola@tunegocio.es"
              />
            </Field>
            <Field
              label="Dirección fiscal *"
              hint="Recomendada para presupuestos y necesaria antes de emitir facturas."
            >
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Calle Mayor 1"
              />
            </Field>
            <Field label="Código postal *">
              <Input
                inputMode="numeric"
                value={form.postalCode}
                onChange={(e) => update("postalCode", e.target.value)}
                placeholder="28001"
              />
            </Field>
            <Field label="Ciudad *">
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Madrid"
              />
            </Field>
            <Field
              label="IBAN"
              hint="Opcional. Se muestra en facturas si lo informas."
            >
              <Input
                value={form.iban ?? ""}
                onChange={(e) => update("iban", e.target.value)}
                placeholder="ES00 0000 0000..."
              />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
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
                    onClick={handleRemoveLogo}
                  >
                    Quitar logo
                  </button>
                </div>
              )}
            </div>
          </Field>
        </Card>
      </SettingsSection>

      <SettingsSection
        id="ajustes-documentos"
        title="Documentos"
        description="Presupuestos, plantillas, textos, pagos y numeración"
        Icon={FileText}
        open={openSections.documents}
        onToggle={(open) => setSectionOpen("documents", open)}
      >
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Presupuestos</h2>
            <p className="mt-1 text-sm text-slate-600">
              Define cuántos días serán válidos por defecto. La fecha se
              calculará automáticamente al crear cada presupuesto.
            </p>
          </div>
          <Field
            label="Días de validez"
            hint="0 desactiva la fecha automática. El máximo permitido es 365 días."
          >
            <Input
              type="number"
              min={0}
              max={MAX_QUOTE_VALIDITY_DAYS}
              step={1}
              value={form.quoteValidityDays ?? DEFAULT_QUOTE_VALIDITY_DAYS}
              onChange={(e) => updateQuoteValidityDays(Number(e.target.value))}
            />
          </Field>
        </Card>

        <Card className="border-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <FileCog className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900">
                  Diseñador de formularios
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Edita las plantillas visuales de facturas, presupuestos y
                  recibos en una pantalla dedicada.
                </p>
              </div>
            </div>
            <ButtonLink href="/configuracion/plantillas" variant="secondary">
              Abrir diseñador
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </Card>

        <DocumentPaymentMethodsCard
          settings={normalizeDocumentPaymentMethods(form.documentPaymentMethods)}
          onChange={(documentPaymentMethods) =>
            setForm((prev) => ({ ...prev, documentPaymentMethods }))
          }
        />

        <DocumentPhrasesCard
          settings={normalizeDocumentPhrases(form.documentPhrases)}
          onChange={(documentPhrases) =>
            setForm((prev) => ({ ...prev, documentPhrases }))
          }
        />

        <DocumentUnitsCard
          settings={normalizeDocumentUnits(form.documentUnits)}
          onChange={(documentUnits) =>
            setForm((prev) => ({ ...prev, documentUnits }))
          }
        />

        <Card className="space-y-4">
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
      </SettingsSection>

      <SettingsSection
        id="ajustes-impuestos"
        title="Impuestos"
        description="Régimen de IVA, tipos, IRPF estimado y VeriFactu"
        Icon={Calculator}
        open={openSections.taxes}
        onToggle={(open) => setSectionOpen("taxes", open)}
      >
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Régimen de IVA</h2>
            <p className="mt-1 text-sm text-slate-600">
              Si te acoges a no repercutir IVA, tus facturas, presupuestos y
              recibos no llevarán IVA y no podrás deducir el IVA de tus gastos.
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

        {!form.vatExempt && (
          <Card className="space-y-4">
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

        <Card className="space-y-4">
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

        <VerifactuSettingsCard
          form={form}
          onChange={(verifactu) =>
            setForm((prev) => ({
              ...prev,
              verifactu: normalizeVerifactuSettings(verifactu),
            }))
          }
        />
      </SettingsSection>

      <SettingsSection
        id="ajustes-cuenta"
        title="Cuenta"
        description="Plan, sincronización, propiedad de datos y ayuda"
        Icon={CreditCard}
        open={openSections.account}
        onToggle={(open) => setSectionOpen("account", open)}
      >
        <PlanStatusCard />
        <SubscriptionBillingCard />
        <Suspense fallback={null}>
          <ReferralCard />
        </Suspense>
        <DataOwnershipCard />
        <ManualHelpLink />
        <Card className="border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">Plan por fases (solo tú puedes hacer)</p>
          <p className="mt-2 leading-relaxed">
            Sigue la guía{" "}
            <code className="rounded bg-white/70 px-1">docs/FASES.md</code> en
            el repositorio: Supabase → Vercel → Stripe → pruebas Veri*Factu.
            Cuando termines una fase, dímelo y seguimos.
          </p>
        </Card>
        <Card className="bg-slate-100">
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
      </SettingsSection>

      <div className="sticky bottom-24 z-20 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            fullWidth
            className="sm:w-auto sm:flex-none"
            onClick={handleSave}
          >
            Guardar cambios
          </Button>
          {saved ? (
            <p className="text-center text-sm font-medium text-green-600 sm:text-left">
              Datos guardados correctamente
            </p>
          ) : (
            <p className="text-center text-sm text-slate-500 sm:text-left">
              Los cambios quedan listos al guardar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
