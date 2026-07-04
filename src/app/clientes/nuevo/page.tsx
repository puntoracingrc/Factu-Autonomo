"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import { CustomerAiAutofill } from "@/components/clients/CustomerAiAutofill";
import type { CustomerAiAutofillValues } from "@/components/clients/CustomerAiAutofill";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { GoogleAddressAutocomplete } from "@/components/places/GoogleAddressAutocomplete";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { maybeCelebrateFirstCustomer } from "@/lib/factu/milestones";
import { RESIDENCE_TYPE_LABELS } from "@/lib/customer-address";
import {
  CUSTOMER_TYPE_LABELS,
  customerFullName,
  customerPayloadFromInput,
  normalizeCustomerType,
  validateCustomerInput,
} from "@/lib/customers";
import type { GooglePlaceAddressSuggestion } from "@/lib/google-places";
import type { AddressResidenceType, CustomerType } from "@/lib/types";

const EMPTY_FORM = {
  customerType: "person" as CustomerType,
  firstName: "",
  lastName: "",
  contactName: "",
  nif: "",
  email: "",
  phone: "",
  streetType: "",
  residenceType: "flat" as AddressResidenceType,
  address: "",
  addressExtra: "",
  city: "",
  postalCode: "",
  notes: "",
};

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/clientes";
  }
  return value;
}

export default function NuevoClientePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = useMemo(
    () => safeReturnPath(searchParams.get("from")),
    [searchParams],
  );
  const { data, addCustomer } = useAppStore();
  const { checkCanAddCustomer } = useBilling();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();

  function updateFormField<K extends keyof typeof EMPTY_FORM>(
    field: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setFormError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyAiCustomer(values: Partial<CustomerAiAutofillValues>) {
    setFormError(null);
    setForm((current) => ({
      ...current,
      customerType:
        (values.customerType as CustomerType | undefined) || current.customerType,
      firstName: values.firstName || current.firstName,
      lastName: values.lastName || current.lastName,
      contactName: values.contactName || current.contactName,
      nif: values.nif || current.nif,
      email: values.email || current.email,
      phone: values.phone || current.phone,
      streetType: values.streetType || current.streetType,
      residenceType:
        (values.residenceType as AddressResidenceType | undefined) ||
        current.residenceType,
      address: values.address || current.address,
      addressExtra: values.addressExtra || current.addressExtra,
      city: values.city || current.city,
      postalCode: values.postalCode || current.postalCode,
      notes: values.notes || current.notes,
    }));
  }

  function applyAddressSuggestion(suggestion: GooglePlaceAddressSuggestion) {
    setFormError(null);
    setForm((current) => ({
      ...current,
      streetType: suggestion.streetType || current.streetType,
      address: suggestion.streetLine || suggestion.address || current.address,
      city: suggestion.city || current.city,
      postalCode: suggestion.postalCode || current.postalCode,
    }));
  }

  function handleSave() {
    const validation = validateCustomerInput(data.customers, form);
    if (!validation.ok) {
      setFormError(validation.error ?? "Revisa los datos del cliente");
      return;
    }

    const gate = checkCanAddCustomer(data.customers.length);
    if (!gate.allowed) {
      setUpgradeReason(gate.reason);
      setUpgradeOpen(true);
      return;
    }

    maybeCelebrateFirstCustomer(data.customers.length);
    addCustomer({
      ...customerPayloadFromInput({
        firstName: validation.firstName ?? form.firstName,
        lastName: validation.lastName ?? form.lastName,
        customerType: form.customerType,
        contactName: form.contactName,
        nif: form.nif,
        email: validation.email,
        phone: validation.phone,
        streetType: form.streetType,
        residenceType: form.residenceType,
        address: form.address,
        addressExtra: form.addressExtra,
      }),
      city: form.city.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });

    router.push(returnPath);
  }

  const formCustomerType = normalizeCustomerType(form.customerType);
  const formIsCompany = formCustomerType === "company";
  const formNameLabel = formIsCompany ? "Razón social *" : "Nombre *";
  const formNamePlaceholder = formIsCompany
    ? "Ej: Persianas Almar S.L."
    : "Ej: María";
  const formNifLabel = formIsCompany ? "CIF" : "NIF / CIF";
  const formIsFlat = form.residenceType !== "house";

  return (
    <div>
      <PageHeader
        title="Nuevo cliente"
        subtitle="Guarda solo los datos necesarios para facturar o enviar documentos."
        action={
          <ButtonLink href={returnPath} variant="secondary" className="gap-2">
            <ArrowLeft className="h-5 w-5" />
            Volver
          </ButtonLink>
        }
      />

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Datos del cliente
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

        <CustomerAiAutofill onApply={applyAiCustomer} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select
              value={formCustomerType}
              onChange={(e) =>
                updateFormField("customerType", e.target.value as CustomerType)
              }
            >
              <option value="person">{CUSTOMER_TYPE_LABELS.person}</option>
              <option value="company">{CUSTOMER_TYPE_LABELS.company}</option>
            </Select>
          </Field>
          <Field label={formNameLabel}>
            <Input
              value={form.firstName}
              onChange={(e) => updateFormField("firstName", e.target.value)}
              placeholder={formNamePlaceholder}
              aria-invalid={Boolean(formError && !form.firstName.trim())}
            />
          </Field>
          <Field
            label={formIsCompany ? "Persona de contacto" : "Apellidos"}
            hint={
              formIsCompany
                ? "Opcional. Para saber con quién hablar dentro de la empresa."
                : "Opcional. Útil para distinguir clientes con el mismo nombre."
            }
          >
            <Input
              value={formIsCompany ? form.contactName : form.lastName}
              onChange={(e) =>
                updateFormField(
                  formIsCompany ? "contactName" : "lastName",
                  e.target.value,
                )
              }
              placeholder={
                formIsCompany ? "Ej: Laura Gómez" : "Ej: López García"
              }
              aria-invalid={Boolean(
                formError &&
                  !formIsCompany &&
                  form.lastName.trim() &&
                  form.lastName.trim().length < 2,
              )}
            />
          </Field>
          <Field
            label={formNifLabel}
            hint="Opcional. No se valida oficialmente; solo se evita duplicarlo en tu lista."
          >
            <Input
              value={form.nif}
              onChange={(e) => updateFormField("nif", e.target.value)}
            />
          </Field>
          <Field
            label="Teléfono"
            hint="El teléfono se usará para WhatsApp si está informado."
          >
            <Input
              value={form.phone}
              onChange={(e) => updateFormField("phone", e.target.value)}
              placeholder="600 000 000"
            />
          </Field>
          <Field
            label="Email"
            hint="Se usará para activar el envío por email en documentos guardados."
          >
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateFormField("email", e.target.value)}
              placeholder="cliente@email.com"
              aria-invalid={formError === "Revisa el formato del email"}
            />
          </Field>
          <Field label="Tipo de vía">
            <StreetTypeSelect
              value={form.streetType}
              onChange={(streetType) => updateFormField("streetType", streetType)}
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
              displayStreetLineOnly
              placeholder="Ej: Valencia 546 7/1"
            />
          </Field>
          <Field label="Vivienda">
            <Select
              value={form.residenceType}
              onChange={(e) =>
                updateFormField(
                  "residenceType",
                  e.target.value as AddressResidenceType,
                )
              }
            >
              <option value="flat">{RESIDENCE_TYPE_LABELS.flat}</option>
              <option value="house">{RESIDENCE_TYPE_LABELS.house}</option>
            </Select>
          </Field>
          {formIsFlat && (
            <Field label="Piso / puerta">
              <Input
                value={form.addressExtra}
                onChange={(e) =>
                  updateFormField("addressExtra", e.target.value)
                }
                placeholder="Ej: 2º 2ª"
              />
            </Field>
          )}
          <Field label="Código postal">
            <Input
              value={form.postalCode}
              onChange={(e) => updateFormField("postalCode", e.target.value)}
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={form.city}
              onChange={(e) => updateFormField("city", e.target.value)}
            />
          </Field>
          <Field label="Notas">
            <Textarea
              value={form.notes}
              onChange={(e) => updateFormField("notes", e.target.value)}
              placeholder="Observaciones sobre este cliente..."
            />
          </Field>
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
          >
            {formError}
          </p>
        )}

        {form.firstName && (
          <p className="text-sm text-slate-500">
            Se guardará como:{" "}
            <strong>
              {form.customerType === "company"
                ? form.firstName.trim()
                : customerFullName(form.firstName, form.lastName)}
            </strong>
          </p>
        )}

        <Button onClick={handleSave} fullWidth>
          Guardar cliente
        </Button>
      </Card>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
