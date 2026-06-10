"use client";

import { useState } from "react";
import { Pencil, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  customerFullName,
  customerPayloadFromInput,
  getCustomerDisplayName,
  sortCustomersByName,
  validateUniqueCustomer,
} from "@/lib/customers";
import type { Customer } from "@/lib/types";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  nif: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

export default function ClientesPage() {
  const { data, addCustomer, updateCustomer, deleteCustomer } = useAppStore();
  const { checkCanAddCustomer } = useBilling();
  const [form, setForm] = useState(EMPTY_FORM);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const customers = sortCustomersByName(data.customers);

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      nif: customer.nif ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      postalCode: customer.postalCode ?? "",
      notes: customer.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    const validation = validateUniqueCustomer(
      data.customers,
      form.firstName,
      form.lastName,
      editingId ?? undefined,
    );
    if (!validation.ok) {
      alert(validation.error);
      return;
    }

    const payload = {
      ...customerPayloadFromInput({
        firstName: form.firstName,
        lastName: form.lastName,
        nif: form.nif,
        email: form.email,
        phone: form.phone,
        address: form.address,
      }),
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      notes: form.notes || undefined,
    };

    if (editingId) {
      const existing = data.customers.find((c) => c.id === editingId);
      if (existing) updateCustomer({ ...existing, ...payload });
    } else {
      const gate = checkCanAddCustomer(data.customers.length);
      if (!gate.allowed) {
        setUpgradeReason(gate.reason);
        setUpgradeOpen(true);
        return;
      }
      addCustomer(payload);
    }

    setForm(EMPTY_FORM);
    setEditingId(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Nombre y apellidos únicos. Se usan en facturas, recibos y presupuestos"
      />

      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <UserPlus className="h-5 w-5 text-blue-600" />
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-sm text-slate-500"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              placeholder="Ej: María"
            />
          </Field>
          <Field label="Apellidos *" hint="No se pueden repetir con el mismo nombre">
            <Input
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              placeholder="Ej: López García"
            />
          </Field>
          <Field label="NIF / CIF">
            <Input
              value={form.nif}
              onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))}
            />
          </Field>
          <Field label="Teléfono">
            <Input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </Field>
          <Field label="Código postal">
            <Input
              value={form.postalCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, postalCode: e.target.value }))
              }
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </Field>
          <Field label="Notas">
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Observaciones sobre este cliente..."
            />
          </Field>
        </div>

        {form.firstName && form.lastName && (
          <p className="text-sm text-slate-500">
            Se guardará como:{" "}
            <strong>
              {customerFullName(form.firstName, form.lastName)}
            </strong>
          </p>
        )}

        <Button onClick={handleSave} fullWidth>
          {editingId ? "Guardar cambios" : "Guardar cliente"}
        </Button>

        {saved && (
          <p className="text-center text-sm font-medium text-green-600">
            Cliente guardado correctamente
          </p>
        )}
      </Card>

      {customers.length === 0 ? (
        <Card className="text-center text-slate-500">
          Sin clientes todavía. Crea el primero con el formulario de arriba.
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">
            {customers.length} cliente(s) — orden alfabético
          </p>
          {customers.map((customer) => (
            <Card
              key={customer.id}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {getCustomerDisplayName(customer)}
                </p>
                {customer.nif && (
                  <p className="text-sm text-slate-500">NIF: {customer.nif}</p>
                )}
                <p className="text-sm text-slate-500">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ")}
                </p>
                {(customer.address || customer.city) && (
                  <p className="text-sm text-slate-400">
                    {[customer.address, customer.postalCode, customer.city]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(customer)}
                  className="rounded-xl bg-blue-50 p-2 text-blue-700"
                  title="Editar"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Borrar a ${getCustomerDisplayName(customer)}?`))
                      deleteCustomer(customer.id);
                  }}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                  title="Borrar"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
