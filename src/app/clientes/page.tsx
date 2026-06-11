"use client";

import { useEffect, useMemo, useState } from "react";
import { GitMerge, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { maybeCelebrateFirstCustomer } from "@/lib/factu/milestones";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import {
  customerFullName,
  customerPayloadFromInput,
  findDuplicateCustomerGroups,
  getCustomerDisplayName,
  pickCanonicalCustomer,
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
  const { data, addCustomer, updateCustomer, deleteCustomer, mergeCustomers } =
    useAppStore();
  const { checkCanAddCustomer } = useBilling();
  const [form, setForm] = useState(EMPTY_FORM);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keepId, setKeepId] = useState("");

  const customers = sortCustomersByName(data.customers);

  const duplicateGroups = useMemo(
    () => findDuplicateCustomerGroups(data.customers),
    [data.customers],
  );

  const selectedCustomers = useMemo(
    () => data.customers.filter((customer) => selectedIds.includes(customer.id)),
    [data.customers, selectedIds],
  );

  useEffect(() => {
    if (selectedCustomers.length < 2) {
      setKeepId("");
      return;
    }
    const canonical = pickCanonicalCustomer(selectedCustomers, data.documents);
    setKeepId((current) =>
      selectedIds.includes(current) ? current : canonical.id,
    );
  }, [selectedCustomers, selectedIds, data.documents]);

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setFormOpen(true);
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
    closeForm();
  }

  function toggleCustomerSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function exitMergeMode() {
    setMergeMode(false);
    setSelectedIds([]);
    setKeepId("");
  }

  function handleManualMerge() {
    if (selectedIds.length < 2 || !keepId) return;
    const keep = data.customers.find((customer) => customer.id === keepId);
    if (!keep) return;
    const removeIds = selectedIds.filter((id) => id !== keepId);
    if (
      confirm(
        `¿Unificar ${selectedIds.length} clientes en «${getCustomerDisplayName(keep)}»? Los borradores usarán los datos del cliente conservado.`,
      )
    ) {
      mergeCustomers(keepId, removeIds);
      exitMergeMode();
    }
  }

  function handleSave() {
    const validation = validateUniqueCustomer(
      data.customers,
      form.firstName,
      form.lastName,
      editingId ?? undefined,
      form.nif,
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
      maybeCelebrateFirstCustomer(data.customers.length);
      addCustomer(payload);
    }

    closeForm();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Nombre, apellidos y NIF únicos. Se usan en facturas, recibos y presupuestos"
        action={
          customers.length >= 2 ? (
            mergeMode ? (
              <Button variant="ghost" onClick={exitMergeMode}>
                <X className="h-5 w-5" />
                Cancelar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setMergeMode(true)}>
                <GitMerge className="h-5 w-5" />
                Unificar manualmente
              </Button>
            )
          ) : undefined
        }
      />

      {mergeMode && (
        <Card className="mb-6 border-blue-200 bg-blue-50/70">
          <p className="font-semibold text-blue-950">Unificación manual</p>
          <p className="mt-1 text-sm text-blue-900">
            Marca dos o más clientes que sean la misma persona y elige cuál
            conservar.
          </p>
        </Card>
      )}

      {duplicateGroups.length > 0 && (
        <div className="mb-6 space-y-3">
          {duplicateGroups.map((group) => {
            const canonical = pickCanonicalCustomer(group, data.documents);
            const others = group.filter((customer) => customer.id !== canonical.id);
            return (
              <Card
                key={canonical.id}
                className="space-y-3 border-amber-200 bg-amber-50/70"
              >
                <div>
                  <p className="font-semibold text-amber-950">
                    Mismo NIF en varios clientes
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    {group.map((customer) => getCustomerDisplayName(customer)).join(" · ")}
                  </p>
                  <p className="mt-2 text-sm text-amber-800">
                    Unifícalos para evitar duplicados al facturar.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Unificar ${group.length} clientes en «${getCustomerDisplayName(canonical)}»?`,
                      )
                    ) {
                      mergeCustomers(
                        canonical.id,
                        others.map((customer) => customer.id),
                      );
                    }
                  }}
                >
                  Unificar en «{getCustomerDisplayName(canonical)}»
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {!formOpen && !mergeMode && (
        <Button onClick={openNewForm} fullWidth className="mb-6 gap-2">
          <UserPlus className="h-5 w-5" />
          Nuevo cliente
        </Button>
      )}

      {saved && !formOpen && (
        <p className="mb-4 text-center text-sm font-medium text-green-600">
          Cliente guardado correctamente
        </p>
      )}

      {formOpen && (
      <Card className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <UserPlus className="h-5 w-5 text-blue-600" />
            {editingId ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1 text-sm text-slate-500"
          >
            <X className="h-4 w-4" /> Cancelar
          </button>
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
          <Field label="NIF / CIF" hint="No puede repetirse en otro cliente">
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

      </Card>
      )}

      {customers.length === 0 && !formOpen ? (
        <FactuEmptyState
          variant="cliente"
          action={
            <Button onClick={openNewForm} className="gap-2">
              <UserPlus className="h-5 w-5" />
              Nuevo cliente
            </Button>
          }
        />
      ) : customers.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">
            {customers.length} cliente(s) — orden alfabético
          </p>
          {customers.map((customer) => {
            const selected = selectedIds.includes(customer.id);
            return (
            <Card
              key={customer.id}
              className={`flex items-start justify-between gap-3 ${
                mergeMode && selected
                  ? "border-blue-400 ring-2 ring-blue-200"
                  : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {mergeMode && (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleCustomerSelection(customer.id)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600"
                    aria-label={`Seleccionar ${getCustomerDisplayName(customer)}`}
                  />
                )}
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
              </div>
              {!mergeMode && (
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
              )}
            </Card>
            );
          })}
        </div>
      ) : null}

      {mergeMode && selectedIds.length >= 2 && keepId && (
        <Card className="sticky bottom-20 z-10 mt-4 space-y-4 border-blue-300 bg-white shadow-lg sm:bottom-4">
          <p className="font-semibold text-slate-900">
            {selectedIds.length} clientes seleccionados
          </p>
          <Field label="Conservar este cliente">
            <select
              value={keepId}
              onChange={(e) => setKeepId(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {selectedCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {getCustomerDisplayName(customer)}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button fullWidth onClick={handleManualMerge}>
              <GitMerge className="h-5 w-5" />
              Unificar en uno
            </Button>
            <Button variant="ghost" fullWidth onClick={exitMergeMode}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
