"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { normalizeDocumentUnitId } from "@/lib/document-units";
import {
  clearDocumentProductPickRequest,
  getDocumentProductPickRequest,
  productSummaryToPickedLine,
  saveDocumentProductPickedLine,
  type DocumentProductPickRequest,
} from "@/lib/product-document-draft";
import {
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
  addProductAttributeLine,
  productAttributesFromText,
} from "@/lib/product-attributes";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
} from "@/lib/purchase-products";

const EMPTY_FORM = {
  sku: "",
  name: "",
  family: "",
  saleDescription: "",
  saleUnit: "ud",
  salePrice: "",
  saleIvaPercent: "21",
  supplierName: "",
  supplierReference: "",
  purchaseDescription: "",
  purchaseUnit: "ud",
  purchaseListPrice: "",
  purchaseDiscountPercent: "",
  purchaseNetUnitCost: "",
  calculationKind: "none",
  attributesText: "",
  notes: "",
};

function parseAmount(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function NuevoProductoPage() {
  const router = useRouter();
  const { data, addProduct } = useAppStore();
  const { checkCanAddProduct } = useBilling();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [documentPickRequest, setDocumentPickRequest] =
    useState<DocumentProductPickRequest | null>(null);

  useLayoutEffect(() => {
    const request = getDocumentProductPickRequest();
    setDocumentPickRequest(request);
    const prefill = request?.prefill;
    if (!prefill) return;
    setForm((current) => ({
      ...current,
      name: prefill.name || current.name,
      saleDescription:
        prefill.description || prefill.name || current.saleDescription,
      saleUnit: prefill.unit || current.saleUnit,
      purchaseUnit: prefill.unit || current.purchaseUnit,
      salePrice:
        prefill.unitPrice !== undefined && prefill.unitPrice > 0
          ? String(prefill.unitPrice)
          : current.salePrice,
      saleIvaPercent:
        prefill.ivaPercent !== undefined
          ? String(prefill.ivaPercent)
          : current.saleIvaPercent,
    }));
  }, []);

  const familyOptions = useMemo(
    () =>
      [
        ...new Set(
          data.products
            .map((product) => product.family)
            .filter((family) => family.trim().length > 0),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [data.products],
  );

  const supplierOptions = useMemo(
    () => data.suppliers.map((supplier) => supplier.name).sort(),
    [data.suppliers],
  );

  function updateField(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "calculationKind" && value === "area"
        ? { saleUnit: "m2" }
        : {}),
    }));
    setError(null);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) {
      setError("Escribe el nombre del producto.");
      return;
    }

    const key = purchaseProductKey(name);
    if (data.products.some((product) => product.key === key)) {
      setError(
        "Ya existe un producto muy parecido. Edítalo desde la lista o unifícalo.",
      );
      return;
    }

    const productLimit = checkCanAddProduct(
      data.products.filter((product) => !product.hidden).length,
    );
    if (!productLimit.allowed) {
      setError(productLimit.reason ?? "No puedes añadir más productos con tu plan actual.");
      return;
    }

    const supplierName = form.supplierName.trim();
    const supplier = data.suppliers.find(
      (entry) => entry.name.toLowerCase() === supplierName.toLowerCase(),
    );
    const salePrice = parseAmount(form.salePrice);
    const saleIvaPercent = parseAmount(form.saleIvaPercent);
    const purchaseListPrice = parseAmount(form.purchaseListPrice);
    const purchaseDiscountPercent = parseAmount(form.purchaseDiscountPercent);
    const purchaseNetUnitCost =
      parseAmount(form.purchaseNetUnitCost) ??
      (purchaseListPrice !== undefined && purchaseDiscountPercent !== undefined
        ? purchaseListPrice * (1 - purchaseDiscountPercent / 100)
        : undefined);
    const calculationKind = form.calculationKind === "area" ? "area" : "none";
    const saleUnit =
      calculationKind === "area"
        ? "m2"
        : (normalizeDocumentUnitId(form.saleUnit) ?? form.saleUnit.trim()) ||
          "ud";
    const purchaseUnit =
      (normalizeDocumentUnitId(form.purchaseUnit) ??
        form.purchaseUnit.trim()) ||
      saleUnit;

    const created = addProduct({
      key,
      aliases: [],
      sku: form.sku.trim() || undefined,
      name,
      family: form.family.trim() || "Sin familia",
      unit: saleUnit,
      supplierId: supplier?.id,
      supplierName: supplier?.name ?? (supplierName || undefined),
      pvp: purchaseListPrice,
      cost: purchaseNetUnitCost,
      ivaPercent: saleIvaPercent,
      sales: {
        enabled: true,
        description: form.saleDescription.trim() || undefined,
        unit: saleUnit,
        unitPrice: salePrice,
        ivaPercent: saleIvaPercent,
      },
      purchase: {
        enabled: Boolean(
          supplierName ||
          form.purchaseDescription.trim() ||
          form.supplierReference.trim() ||
          purchaseListPrice ||
          purchaseDiscountPercent ||
          purchaseNetUnitCost,
        ),
        description: form.purchaseDescription.trim() || undefined,
        unit: purchaseUnit,
        listPrice: purchaseListPrice,
        discountPercent: purchaseDiscountPercent,
        netUnitCost: purchaseNetUnitCost,
        ivaPercent: saleIvaPercent,
        supplierId: supplier?.id,
        supplierName: supplier?.name ?? (supplierName || undefined),
        supplierReference: form.supplierReference.trim() || undefined,
      },
      calculation:
        calculationKind === "area"
          ? { kind: "area", unit: saleUnit, roundingDecimals: 2 }
          : undefined,
      attributes: productAttributesFromText(form.attributesText),
      notes: form.notes.trim() || undefined,
      source: "manual",
    });

    if (documentPickRequest) {
      const createdSummary = buildPurchaseProductSummaries([], [created])[0];
      if (
        !createdSummary ||
        !saveDocumentProductPickedLine(
          productSummaryToPickedLine(
            createdSummary,
            documentPickRequest,
            data.profile.iva?.defaultRate ?? 21,
          ),
        )
      ) {
        setError(
          "El producto se ha guardado, pero no se pudo llevar al documento.",
        );
        return;
      }
      clearDocumentProductPickRequest();
      router.push(documentPickRequest.returnPath);
      return;
    }
    router.push("/productos");
  }

  function handleCancel() {
    if (documentPickRequest) {
      clearDocumentProductPickRequest();
      router.push(documentPickRequest.returnPath);
      return;
    }
    router.push("/productos");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nuevo producto"
        subtitle={
          documentPickRequest
            ? "Se guardará en Productos y volverá al documento."
            : "Crea un material o servicio habitual para tenerlo controlado."
        }
        action={
          <Button type="button" variant="secondary" onClick={handleCancel}>
            <ArrowLeft className="h-5 w-5" />
            {documentPickRequest ? "Volver al documento" : "Volver"}
          </Button>
        }
      />

      <Card className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[0.55fr_1.4fr_1fr]">
          <Field label="Código / SKU">
            <Input
              value={form.sku}
              onChange={(event) => updateField("sku", event.target.value)}
              placeholder="Ej: MB490"
            />
          </Field>
          <Field label="Producto o servicio">
            <Input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Ej: Persiana ALU PC43 Panel Blanco"
            />
          </Field>
          <Field label="Familia">
            <Input
              list="new-product-family-options"
              value={form.family}
              onChange={(event) => updateField("family", event.target.value)}
              placeholder="Ej: Persianas y accesorios"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h2 className="text-base font-black text-slate-950">Venta</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-[1.3fr_0.45fr_0.65fr_0.45fr]">
            <Field label="Descripción para documentos">
              <Input
                value={form.saleDescription}
                onChange={(event) =>
                  updateField("saleDescription", event.target.value)
                }
                placeholder="Si se deja vacío, se usa el nombre"
              />
            </Field>
            <Field label="Unidad venta">
              <Input
                value={form.saleUnit}
                onChange={(event) =>
                  updateField("saleUnit", event.target.value)
                }
                placeholder="ud"
              />
            </Field>
            <Field label="Precio venta" hint="Sin IVA.">
              <Input
                inputMode="decimal"
                value={form.salePrice}
                onChange={(event) =>
                  updateField("salePrice", event.target.value)
                }
                placeholder="0,00"
              />
            </Field>
            <Field label="IVA %">
              <Input
                inputMode="decimal"
                value={form.saleIvaPercent}
                onChange={(event) =>
                  updateField("saleIvaPercent", event.target.value)
                }
                placeholder="21"
              />
            </Field>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h2 className="text-base font-black text-slate-950">Compra</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Proveedor habitual">
              <Input
                list="new-product-supplier-options"
                value={form.supplierName}
                onChange={(event) =>
                  updateField("supplierName", event.target.value)
                }
                placeholder="Proveedor"
              />
            </Field>
            <Field label="Referencia proveedor">
              <Input
                value={form.supplierReference}
                onChange={(event) =>
                  updateField("supplierReference", event.target.value)
                }
                placeholder="Código del proveedor"
              />
            </Field>
            <Field label="Unidad compra">
              <Input
                value={form.purchaseUnit}
                onChange={(event) =>
                  updateField("purchaseUnit", event.target.value)
                }
                placeholder="ud"
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Descripción de compra">
              <Input
                value={form.purchaseDescription}
                onChange={(event) =>
                  updateField("purchaseDescription", event.target.value)
                }
                placeholder="Texto habitual de la factura del proveedor"
              />
            </Field>
            <Field label="Tarifa proveedor" hint="Antes de descuento, sin IVA.">
              <Input
                inputMode="decimal"
                value={form.purchaseListPrice}
                onChange={(event) =>
                  updateField("purchaseListPrice", event.target.value)
                }
                placeholder="0,00"
              />
            </Field>
            <Field label="Descuento %">
              <Input
                inputMode="decimal"
                value={form.purchaseDiscountPercent}
                onChange={(event) =>
                  updateField("purchaseDiscountPercent", event.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field label="Coste real" hint="Después de descuento, sin IVA.">
              <Input
                inputMode="decimal"
                value={form.purchaseNetUnitCost}
                onChange={(event) =>
                  updateField("purchaseNetUnitCost", event.target.value)
                }
                placeholder="0,00"
              />
            </Field>
          </div>
        </div>

        <Field label="Cálculo de cantidad">
          <select
            value={form.calculationKind}
            onChange={(event) =>
              updateField("calculationKind", event.target.value)
            }
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="none">Cantidad directa</option>
            <option value="area">Área: alto x ancho = m²</option>
          </select>
          {form.calculationKind === "area" ? (
            <p className="mt-2 text-sm font-semibold text-blue-800">
              Se venderá en m². En facturas y presupuestos podrás calcular la
              cantidad introduciendo alto y ancho.
            </p>
          ) : null}
        </Field>

        <Field
          label="Atributos"
          hint="Uno por línea. Ej: Talla: L, Color: Blanco, Material: aluminio."
        >
          <Textarea
            value={form.attributesText}
            onChange={(event) =>
              updateField("attributesText", event.target.value)
            }
            placeholder={"Talla: L\nColor: Blanco\nMetro lineal: barras de 6 m"}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {PRODUCT_ATTRIBUTE_SUGGESTIONS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  updateField(
                    "attributesText",
                    addProductAttributeLine(form.attributesText, label),
                  )
                }
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Regla interna / notas">
          <Textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Ej: Persianas: alto x ancho en metros. Revisar color y lama antes de enviar."
          />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            <Save className="h-5 w-5" />
            {documentPickRequest ? "Guardar y volver" : "Guardar producto"}
          </Button>
        </div>
      </Card>

      <Card className="border-blue-100 bg-blue-50/70">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">
              También se completará solo
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Los productos detectados en facturas de proveedor seguirán
              apareciendo automáticamente. Si editas una familia aquí o en la
              lista, Factu la recordará para futuros escaneos parecidos.
            </p>
          </div>
        </div>
      </Card>

      <datalist id="new-product-family-options">
        {familyOptions.map((family) => (
          <option key={family} value={family} />
        ))}
      </datalist>
      <datalist id="new-product-supplier-options">
        {supplierOptions.map((supplier) => (
          <option key={supplier} value={supplier} />
        ))}
      </datalist>
    </div>
  );
}
