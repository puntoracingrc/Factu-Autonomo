"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  SearchCheck,
} from "lucide-react";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  DOCUMENT_UNIT_CATALOG,
  normalizeDocumentUnitId,
} from "@/lib/document-units";
import {
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
  addProductAttributeLine,
  productAttributesFromText,
} from "@/lib/product-attributes";
import {
  productCalculationLabel,
  productDuplicateReasonLabel,
  type ProductDuplicateCandidate,
  type ProductFormDraft,
} from "@/lib/product-form";
import type {
  ProductNumericErrors,
  ProductNumericField,
} from "@/lib/product-form-validation";
import type { ProductSource } from "@/lib/types";

interface ProductFormFieldsProps {
  idPrefix: string;
  draft: ProductFormDraft;
  source: ProductSource;
  fieldErrors: ProductNumericErrors;
  familyOptions: string[];
  subfamilyOptions: string[];
  supplierOptions: string[];
  onChange: (field: keyof ProductFormDraft, value: string) => void;
}

const NUMERIC_FIELD_LABELS: Record<ProductNumericField, string> = {
  salePrice: "Precio de venta",
  saleIvaPercent: "IVA %",
  purchaseListPrice: "Tarifa proveedor",
  purchaseDiscountPercent: "Descuento %",
  purchaseNetUnitCost: "Coste real",
};

function hasPurchaseDetails(draft: ProductFormDraft): boolean {
  return Boolean(
    draft.supplierName.trim() ||
    draft.supplierReference.trim() ||
    draft.purchaseDescription.trim() ||
    draft.purchaseListPrice.trim() ||
    draft.purchaseDiscountPercent.trim() ||
    draft.purchaseNetUnitCost.trim(),
  );
}

function hasAdvancedDetails(draft: ProductFormDraft): boolean {
  return Boolean(
    draft.calculationKind !== "none" ||
    draft.attributesText.trim() ||
    draft.notes.trim(),
  );
}

export function ProductFormFields({
  idPrefix,
  draft,
  source,
  fieldErrors,
  familyOptions,
  subfamilyOptions,
  supplierOptions,
  onChange,
}: ProductFormFieldsProps) {
  const [purchaseOpen, setPurchaseOpen] = useState(() =>
    hasPurchaseDetails(draft),
  );
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    hasAdvancedDetails(draft),
  );
  const addedAttributeLabels = useMemo(
    () =>
      new Set(
        productAttributesFromText(draft.attributesText).map((attribute) =>
          attribute.label.trim().toLocaleLowerCase("es"),
        ),
      ),
    [draft.attributesText],
  );

  return (
    <div className="divide-y divide-slate-200">
      <section className="space-y-4 pb-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">
            Datos principales
          </h2>
        </div>

        {source === "detected" ? (
          <div className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase text-slate-500">
                Detectado en compras
              </p>
              <p className="mt-0.5 break-words text-sm font-bold text-slate-950">
                {draft.name}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-12">
          {source === "manual" ? (
            <FormField label="Nombre del producto" className="lg:col-span-7">
              <Input
                value={draft.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Ej: Motor tubular radio"
                autoComplete="off"
              />
            </FormField>
          ) : (
            <FormField label="Nombre visible" className="lg:col-span-7">
              <Input
                value={draft.saleDescription}
                onChange={(event) =>
                  onChange("saleDescription", event.target.value)
                }
                placeholder={draft.name}
                autoComplete="off"
              />
            </FormField>
          )}
          <FormField label="Código / SKU" className="lg:col-span-5">
            <Input
              value={draft.sku}
              onChange={(event) => onChange("sku", event.target.value)}
              placeholder="Ej: MOT-GH50"
              autoComplete="off"
            />
          </FormField>

          {source === "manual" ? (
            <FormField
              label="Nombre en documentos"
              hint="Opcional"
              className="lg:col-span-12"
            >
              <Input
                value={draft.saleDescription}
                onChange={(event) =>
                  onChange("saleDescription", event.target.value)
                }
                placeholder={draft.name || "Se usará el nombre del producto"}
                autoComplete="off"
              />
            </FormField>
          ) : null}

          <FormField label="Familia" className="lg:col-span-6">
            <Input
              list={`${idPrefix}-family-options`}
              value={draft.family}
              onChange={(event) => onChange("family", event.target.value)}
              placeholder="Sin familia"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Subfamilia" className="lg:col-span-6">
            <Input
              list={`${idPrefix}-subfamily-options`}
              value={draft.subfamily}
              onChange={(event) => onChange("subfamily", event.target.value)}
              placeholder={
                draft.family.trim() ? "Sin subfamilia" : "Elige familia primero"
              }
              autoComplete="off"
            />
          </FormField>
          <ProductUnitField
            label="Unidad de venta"
            value={draft.saleUnit}
            onChange={(value) => onChange("saleUnit", value)}
            className="lg:col-span-4"
          />
          <NumericField
            idPrefix={idPrefix}
            field="salePrice"
            value={draft.salePrice}
            error={fieldErrors.salePrice}
            onChange={(value) => onChange("salePrice", value)}
            hint="Sin IVA"
            className="lg:col-span-4"
          />
          <NumericField
            idPrefix={idPrefix}
            field="saleIvaPercent"
            value={draft.saleIvaPercent}
            error={fieldErrors.saleIvaPercent}
            onChange={(value) => onChange("saleIvaPercent", value)}
            className="lg:col-span-4"
          />
        </div>
      </section>

      <ProgressiveSection
        title="Compra y proveedor"
        summary={
          draft.supplierName.trim() || draft.purchaseNetUnitCost.trim()
            ? [draft.supplierName.trim(), draft.purchaseNetUnitCost.trim()]
                .filter(Boolean)
                .join(" · ")
            : "Sin datos de compra"
        }
        open={purchaseOpen}
        onToggle={() => setPurchaseOpen((current) => !current)}
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <FormField label="Proveedor habitual" className="lg:col-span-6">
            <Input
              list={`${idPrefix}-supplier-options`}
              value={draft.supplierName}
              onChange={(event) => onChange("supplierName", event.target.value)}
              placeholder="Sin proveedor"
              autoComplete="off"
            />
          </FormField>
          <FormField label="Referencia proveedor" className="lg:col-span-6">
            <Input
              value={draft.supplierReference}
              onChange={(event) =>
                onChange("supplierReference", event.target.value)
              }
              autoComplete="off"
            />
          </FormField>
          <FormField label="Descripción de compra" className="lg:col-span-8">
            <Input
              value={draft.purchaseDescription}
              onChange={(event) =>
                onChange("purchaseDescription", event.target.value)
              }
              autoComplete="off"
            />
          </FormField>
          <ProductUnitField
            label="Unidad de compra"
            value={draft.purchaseUnit}
            onChange={(value) => onChange("purchaseUnit", value)}
            className="lg:col-span-4"
          />
          <NumericField
            idPrefix={idPrefix}
            field="purchaseListPrice"
            value={draft.purchaseListPrice}
            error={fieldErrors.purchaseListPrice}
            onChange={(value) => onChange("purchaseListPrice", value)}
            hint="Antes de descuento"
            className="lg:col-span-4"
          />
          <NumericField
            idPrefix={idPrefix}
            field="purchaseDiscountPercent"
            value={draft.purchaseDiscountPercent}
            error={fieldErrors.purchaseDiscountPercent}
            onChange={(value) => onChange("purchaseDiscountPercent", value)}
            className="lg:col-span-4"
          />
          <NumericField
            idPrefix={idPrefix}
            field="purchaseNetUnitCost"
            value={draft.purchaseNetUnitCost}
            error={fieldErrors.purchaseNetUnitCost}
            onChange={(value) => onChange("purchaseNetUnitCost", value)}
            hint="Después de descuento"
            className="lg:col-span-4"
          />
        </div>
      </ProgressiveSection>

      <ProgressiveSection
        title="Cálculo y atributos"
        summary={
          draft.calculationKind !== "none"
            ? productCalculationLabel(draft.calculationKind)
            : draft.attributesText.trim()
              ? "Con atributos"
              : "Cantidad directa"
        }
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((current) => !current)}
      >
        <div className="space-y-4">
          <Field label="Cálculo de cantidad">
            <select
              value={draft.calculationKind}
              onChange={(event) =>
                onChange("calculationKind", event.target.value)
              }
              className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="none">Cantidad directa</option>
              <option value="linear">Piezas x largo = m / ml</option>
              <option value="area">Piezas x ancho x alto = m²</option>
              <option value="volume">Piezas x largo x ancho x alto = m³</option>
            </select>
          </Field>
          <Field label="Atributos" hint="Uno por línea">
            <Textarea
              value={draft.attributesText}
              onChange={(event) =>
                onChange("attributesText", event.target.value)
              }
              placeholder={"Color: Blanco\nMaterial: aluminio"}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PRODUCT_ATTRIBUTE_SUGGESTIONS.map((label) => {
                const added = addedAttributeLabels.has(
                  label.toLocaleLowerCase("es"),
                );
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() =>
                      onChange(
                        "attributesText",
                        addProductAttributeLine(draft.attributesText, label),
                      )
                    }
                    aria-pressed={added}
                    className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors ${
                      added
                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Notas internas">
            <Textarea
              value={draft.notes}
              onChange={(event) => onChange("notes", event.target.value)}
            />
          </Field>
        </div>
      </ProgressiveSection>

      <datalist id={`${idPrefix}-family-options`}>
        {familyOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={`${idPrefix}-subfamily-options`}>
        {subfamilyOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id={`${idPrefix}-supplier-options`}>
        {supplierOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

export function ProductDuplicateNotice({
  candidates,
  onOpen,
}: {
  candidates: ProductDuplicateCandidate[];
  onOpen: (candidate: ProductDuplicateCandidate) => void;
}) {
  if (candidates.length === 0) return null;
  return (
    <section className="border-y border-amber-200 bg-amber-50 px-3 py-3">
      <div className="flex items-start gap-2">
        <SearchCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-amber-950">
            Puede que ya exista
          </h2>
          <div className="mt-2 divide-y divide-amber-200">
            {candidates.map((candidate) => (
              <div
                key={candidate.key}
                className="flex min-w-0 items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {candidate.displayName}
                  </p>
                  <p className="truncate text-xs font-semibold text-amber-800">
                    {candidate.reasons
                      .map(productDuplicateReasonLabel)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(candidate)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                >
                  Abrir
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressiveSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="py-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">
            {title}
          </span>
          <span className="block truncate text-xs font-semibold text-slate-500">
            {summary}
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        )}
      </button>
      {open ? <div className="px-2 pt-4">{children}</div> : null}
    </section>
  );
}

function NumericField({
  idPrefix,
  field,
  value,
  error,
  onChange,
  hint,
  className,
}: {
  idPrefix: string;
  field: ProductNumericField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  hint?: string;
  className?: string;
}) {
  const inputId = `${idPrefix}-${field}`;
  const errorId = `${inputId}-error`;
  return (
    <FormField
      label={NUMERIC_FIELD_LABELS[field]}
      hint={hint}
      className={className}
    >
      <Input
        id={inputId}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.includes("Percent") ? "0" : "0,00"}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={
          error ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""
        }
      />
      {error ? (
        <span id={errorId} className="text-sm font-semibold text-red-700">
          {error}
        </span>
      ) : null}
    </FormField>
  );
}

function ProductUnitField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const normalizedValue = normalizeDocumentUnitId(value) ?? value.trim();
  const known = DOCUMENT_UNIT_CATALOG.some(
    (unit) => unit.id === normalizedValue,
  );
  return (
    <FormField label={label} className={className}>
      <select
        value={normalizedValue}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Sin unidad</option>
        {!known && normalizedValue ? (
          <option value={normalizedValue}>{normalizedValue} (detectada)</option>
        ) : null}
        {DOCUMENT_UNIT_CATALOG.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.shortLabel} - {unit.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function FormField({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Field label={label} hint={hint}>
        {children}
      </Field>
    </div>
  );
}
