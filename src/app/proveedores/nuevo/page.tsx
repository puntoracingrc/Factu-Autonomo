"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Truck, X } from "lucide-react";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { GoogleAddressAutocomplete } from "@/components/places/GoogleAddressAutocomplete";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import {
  findBestSupplierMatch,
  SUPPLIER_AUTO_LINK_SCORE,
} from "@/lib/suppliers";
import type { GooglePlaceAddressSuggestion } from "@/lib/google-places";

const EMPTY_FORM = {
  name: "",
  nif: "",
  phone: "",
  website: "",
  streetType: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/proveedores";
  }
  return value;
}

export default function NuevoProveedorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const { data, addSupplier } = useAppStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function updateFormField(field: keyof typeof EMPTY_FORM, value: string) {
    setFormError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyAddressSuggestion(suggestion: GooglePlaceAddressSuggestion) {
    setFormError(null);
    setForm((current) => ({
      ...current,
      address: suggestion.address || current.address,
      city: suggestion.city || current.city,
      postalCode: suggestion.postalCode || current.postalCode,
    }));
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) {
      setFormError("Escribe el nombre del proveedor");
      return;
    }

    const payload = {
      name,
      nif: form.nif.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      streetType: form.streetType.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    const match = findBestSupplierMatch(data.suppliers, payload);
    if (match?.score && match.score >= SUPPLIER_AUTO_LINK_SCORE) {
      setFormError(
        `Ya existe un proveedor muy parecido: ${match.supplier.name}. Revísalo antes de crear otro.`,
      );
      return;
    }

    addSupplier(payload);
    router.push(returnPath);
  }

  return (
    <div>
      <PageHeader
        title="Nuevo proveedor"
        subtitle="Guarda quién te vende material, servicios o gastos habituales."
        action={
          <ButtonLink href={returnPath} variant="secondary" className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Volver
          </ButtonLink>
        }
      />

      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <Truck className="h-5 w-5 text-blue-600" />
            Datos del proveedor
          </h2>
          <ButtonLink
            href={returnPath}
            variant="ghost"
            className="min-h-10 px-3 text-sm"
          >
            <X className="h-4 w-4" />
            Cancelar
          </ButtonLink>
        </div>

        <FormSection
          variant="search"
          title="Identidad del proveedor"
          hint="Nombre comercial y datos de contacto."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre *">
              <Input
                value={form.name}
                onChange={(event) => updateFormField("name", event.target.value)}
                placeholder="Nombre de la empresa"
                aria-invalid={Boolean(formError && !form.name.trim())}
              />
            </Field>
            <Field label="NIF">
              <Input
                value={form.nif}
                onChange={(event) => updateFormField("nif", event.target.value)}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={form.phone}
                onChange={(event) => updateFormField("phone", event.target.value)}
              />
            </Field>
            <Field label="Web" hint="Opcional. Ej: www.tienda.com">
              <Input
                value={form.website}
                onChange={(event) =>
                  updateFormField("website", event.target.value)
                }
                placeholder="https://www.ejemplo.com"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection
          variant="fields"
          title="Dirección y notas"
          hint="Opcional. Ayuda a ordenar y localizar proveedores."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de vía">
              <StreetTypeSelect
                value={form.streetType}
                onChange={(streetType) =>
                  updateFormField("streetType", streetType)
                }
              />
            </Field>
            <Field
              label="Nombre de vía y número"
              hint="Sin C/, Avda. ni otros prefijos"
            >
              <GoogleAddressAutocomplete
                value={form.address}
                onChange={(value) => updateFormField("address", value)}
                onAddressSelected={applyAddressSuggestion}
                enabled={Boolean(data.profile.googlePlaces?.enabled)}
                placeholder="Ej: Valencia 546 7/1"
              />
            </Field>
            <Field label="Código postal">
              <Input
                value={form.postalCode}
                onChange={(event) =>
                  updateFormField("postalCode", event.target.value)
                }
              />
            </Field>
            <Field label="Ciudad">
              <Input
                value={form.city}
                onChange={(event) => updateFormField("city", event.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Notas">
                <Textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateFormField("notes", event.target.value)
                  }
                  placeholder="Condiciones, descuentos habituales o notas internas..."
                />
              </Field>
            </div>
          </div>
        </FormSection>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
          >
            {formError}
          </p>
        )}

        <Button onClick={handleSave} fullWidth>
          Guardar proveedor
        </Button>
      </Card>
    </div>
  );
}
