"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import { CustomerAiAutofill } from "@/components/clients/CustomerAiAutofill";
import type { CustomerAiAutofillValues } from "@/components/clients/CustomerAiAutofill";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { maybeCelebrateFirstCustomer } from "@/lib/factu/milestones";
import {
  customerFullName,
  customerPayloadFromInput,
  validateCustomerInput,
} from "@/lib/customers";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  nif: "",
  email: "",
  phone: "",
  streetType: "",
  address: "",
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

  function updateFormField(field: keyof typeof EMPTY_FORM, value: string) {
    setFormError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyAiCustomer(values: Partial<CustomerAiAutofillValues>) {
    setFormError(null);
    setForm((current) => ({
      ...current,
      firstName: values.firstName || current.firstName,
      lastName: values.lastName || current.lastName,
      nif: values.nif || current.nif,
      email: values.email || current.email,
      phone: values.phone || current.phone,
      streetType: values.streetType || current.streetType,
      address: values.address || current.address,
      city: values.city || current.city,
      postalCode: values.postalCode || current.postalCode,
      notes: values.notes || current.notes,
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
        nif: form.nif,
        email: validation.email,
        phone: validation.phone,
        streetType: form.streetType,
        address: form.address,
      }),
      city: form.city.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });

    router.push(returnPath);
  }

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
          <Field label="Nombre *">
            <Input
              value={form.firstName}
              onChange={(e) => updateFormField("firstName", e.target.value)}
              placeholder="Ej: María"
              aria-invalid={Boolean(formError && !form.firstName.trim())}
            />
          </Field>
          <Field label="Apellidos *" hint="No se pueden repetir con el mismo nombre">
            <Input
              value={form.lastName}
              onChange={(e) => updateFormField("lastName", e.target.value)}
              placeholder="Ej: López García"
              aria-invalid={Boolean(formError && !form.lastName.trim())}
            />
          </Field>
          <Field
            label="NIF / CIF"
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
            <Input
              value={form.address}
              onChange={(e) => updateFormField("address", e.target.value)}
              placeholder="Ej: Valencia 546 7/1"
            />
          </Field>
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

        {form.firstName && form.lastName && (
          <p className="text-sm text-slate-500">
            Se guardará como:{" "}
            <strong>{customerFullName(form.firstName, form.lastName)}</strong>
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
