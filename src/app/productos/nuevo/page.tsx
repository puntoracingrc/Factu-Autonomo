"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { purchaseProductKey } from "@/lib/purchase-products";

const EMPTY_FORM = {
  name: "",
  family: "",
  unit: "ud",
  supplierName: "",
  pvp: "",
  cost: "",
  ivaPercent: "21",
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

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
    setForm((current) => ({ ...current, [field]: value }));
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
      setError("Ya existe un producto muy parecido. Edítalo desde la lista o unifícalo.");
      return;
    }

    const supplierName = form.supplierName.trim();
    const supplier = data.suppliers.find(
      (entry) => entry.name.toLowerCase() === supplierName.toLowerCase(),
    );

    addProduct({
      key,
      aliases: [],
      name,
      family: form.family.trim() || "Sin familia",
      unit: form.unit.trim() || undefined,
      supplierId: supplier?.id,
      supplierName: supplier?.name ?? (supplierName || undefined),
      pvp: parseAmount(form.pvp),
      cost: parseAmount(form.cost),
      ivaPercent: parseAmount(form.ivaPercent),
      notes: form.notes.trim() || undefined,
      source: "manual",
    });
    router.push("/productos");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nuevo producto"
        subtitle="Crea un material o servicio habitual para tenerlo controlado."
        action={
          <ButtonLink href="/productos" variant="secondary">
            <ArrowLeft className="h-5 w-5" />
            Volver
          </ButtonLink>
        }
      />

      <Card className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_0.45fr]">
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
          <Field label="Unidad">
            <Input
              value={form.unit}
              onChange={(event) => updateField("unit", event.target.value)}
              placeholder="ud"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <Field label="PVP proveedor" hint="Tarifa antes de descuento.">
            <Input
              inputMode="decimal"
              value={form.pvp}
              onChange={(event) => updateField("pvp", event.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="Coste real" hint="Precio después de descuento.">
            <Input
              inputMode="decimal"
              value={form.cost}
              onChange={(event) => updateField("cost", event.target.value)}
              placeholder="0,00"
            />
          </Field>
          <Field label="IVA %">
            <Input
              inputMode="decimal"
              value={form.ivaPercent}
              onChange={(event) =>
                updateField("ivaPercent", event.target.value)
              }
              placeholder="21"
            />
          </Field>
        </div>

        <Field label="Notas">
          <Textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Referencia interna, medidas habituales, proveedor alternativo..."
          />
        </Field>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <ButtonLink href="/productos" variant="secondary">
            Cancelar
          </ButtonLink>
          <Button type="button" onClick={handleSave}>
            <Save className="h-5 w-5" />
            Guardar producto
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
              Los productos detectados en facturas de proveedor seguirán apareciendo
              automáticamente. Si editas una familia aquí o en la lista, Factu la
              recordará para futuros escaneos parecidos.
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
