"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GitMerge,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { CustomerAiAutofill } from "@/components/clients/CustomerAiAutofill";
import type { CustomerAiAutofillValues } from "@/components/clients/CustomerAiAutofill";
import { CustomerSortBar } from "@/components/clients/CustomerSortBar";
import { CustomerDocumentActions } from "@/components/clients/CustomerDocumentActions";
import { CustomerListSearch } from "@/components/clients/CustomerListSearch";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { maybeCelebrateFirstCustomer } from "@/lib/factu/milestones";
import { Button } from "@/components/ui/Button";
import { PageActionButton } from "@/components/ui/PageActionButton";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney } from "@/lib/calculations";
import {
  customerFullName,
  buildCustomerInvoicedTotals,
  customerPayloadFromInput,
  CUSTOMER_SORT_FIELD_LABELS,
  customerSortDirectionLabel,
  findDuplicateCustomerGroups,
  getCustomerDisplayName,
  migrateCustomer,
  pickCanonicalCustomer,
  sortCustomers,
  validateCustomerInput,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/lib/customers";
import { formatStreetLine } from "@/lib/customer-address";
import type { Customer } from "@/lib/types";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keepId, setKeepId] = useState("");
  const [updateDraftDocuments, setUpdateDraftDocuments] = useState(false);
  const [listFilterId, setListFilterId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<CustomerSortField>("apellido");
  const [sortDirection, setSortDirection] =
    useState<CustomerSortDirection>("asc");

  const customerInvoicedTotals = useMemo(
    () => buildCustomerInvoicedTotals(data.customers, data.documents),
    [data.customers, data.documents],
  );

  const customers = useMemo(
    () =>
      sortCustomers(
        data.customers,
        data.documents,
        sortField,
        sortDirection,
        customerInvoicedTotals,
      ),
    [
      data.customers,
      data.documents,
      sortField,
      sortDirection,
      customerInvoicedTotals,
    ],
  );

  const displayedCustomers = useMemo(() => {
    if (!listFilterId) return customers;
    const match = customers.find((customer) => customer.id === listFilterId);
    return match ? [match] : customers;
  }, [customers, listFilterId]);

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
    setFormError(null);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(false);
  }

  function startEdit(customer: Customer) {
    const migrated = migrateCustomer(customer);
    setEditingId(customer.id);
    setFormOpen(true);
    setFormError(null);
    setForm({
      firstName: migrated.firstName,
      lastName: migrated.lastName,
      nif: migrated.nif ?? "",
      email: migrated.email ?? "",
      phone: migrated.phone ?? "",
      streetType: migrated.streetType ?? "",
      address: migrated.address ?? "",
      city: migrated.city ?? "",
      postalCode: migrated.postalCode ?? "",
      notes: migrated.notes ?? "",
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
    setUpdateDraftDocuments(false);
  }

  function handleManualMerge() {
    if (selectedIds.length < 2 || !keepId) return;
    const keep = data.customers.find((customer) => customer.id === keepId);
    if (!keep) return;
    const removeIds = selectedIds.filter((id) => id !== keepId);
    if (
      confirm(
        `¿Unificar ${selectedIds.length} clientes en «${getCustomerDisplayName(keep)}»? Los documentos emitidos conservarán el cliente original por integridad histórica.`,
      )
    ) {
      mergeCustomers(keepId, removeIds, { updateDraftDocuments });
      exitMergeMode();
    }
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

  function updateFormField(field: keyof typeof EMPTY_FORM, value: string) {
    setFormError(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSave() {
    const validation = validateCustomerInput(
      data.customers,
      form,
      editingId ?? undefined,
    );
    if (!validation.ok) {
      setFormError(validation.error ?? "Revisa los datos del cliente");
      return;
    }

    const payload = {
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
                <PageActionButton
                  icon={GitMerge}
                  label={`Unificar en «${getCustomerDisplayName(canonical)}»`}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Unificar ${group.length} clientes en «${getCustomerDisplayName(canonical)}»? Los documentos emitidos conservarán el cliente original por integridad histórica.`,
                      )
                    ) {
                      mergeCustomers(
                        canonical.id,
                        others.map((customer) => customer.id),
                      );
                    }
                  }}
                  className="mb-0"
                />
              </Card>
            );
          })}
        </div>
      )}

      {!formOpen && (
        <div className="mb-6 flex flex-col gap-3">
          {!mergeMode ? (
            <>
              <Button onClick={openNewForm} fullWidth className="gap-2">
                <UserPlus className="h-5 w-5" />
                Nuevo cliente
              </Button>
              {customers.length >= 2 && (
                <PageActionButton
                  icon={GitMerge}
                  label="Unificar manualmente"
                  onClick={() => setMergeMode(true)}
                  className="mb-0"
                />
              )}
            </>
          ) : (
            <Button variant="ghost" onClick={exitMergeMode} fullWidth className="gap-2">
              <X className="h-5 w-5" />
              Cancelar unificación
            </Button>
          )}
        </div>
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
          {!mergeMode && (
            <>
              <CustomerListSearch
                customers={customers}
                selectedCustomerId={listFilterId}
                onSelectCustomer={(customer) =>
                  setListFilterId(customer?.id ?? null)
                }
              />
              <CustomerSortBar
                sortField={sortField}
                sortDirection={sortDirection}
                onSortFieldChange={setSortField}
                onSortDirectionChange={setSortDirection}
              />
            </>
          )}
          <p className="text-sm font-medium text-slate-500">
            {listFilterId
              ? "1 cliente seleccionado"
              : `${customers.length} cliente(s) — ${CUSTOMER_SORT_FIELD_LABELS[sortField].toLowerCase()}, ${customerSortDirectionLabel(sortField, sortDirection).toLowerCase()}`}
          </p>
          {displayedCustomers.map((customer) => {
            const selected = selectedIds.includes(customer.id);
            const invoiced = customerInvoicedTotals.get(customer.id) ?? 0;
            const migrated = migrateCustomer(customer);
            return (
            <Card
              key={customer.id}
              className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${
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
                  <div className="mt-2 flex flex-wrap gap-2">
                    {migrated.phone && (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                        <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{migrated.phone}</span>
                      </span>
                    )}
                    {migrated.email && (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{migrated.email}</span>
                      </span>
                    )}
                    {!migrated.phone && !migrated.email && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Sin contacto de envío
                      </span>
                    )}
                  </div>
                  {(migrated.address || customer.city) && (
                    <p className="text-sm text-slate-400">
                      {[
                        formatStreetLine(migrated.streetType, migrated.address),
                        customer.postalCode,
                        customer.city,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              </div>
              {!mergeMode && (
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                  <div className="flex flex-wrap justify-end gap-2">
                    <CustomerDocumentActions customerId={customer.id} />
                    <button
                      onClick={() => startEdit(customer)}
                      className="rounded-xl bg-slate-100 p-2 text-slate-700 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      title="Editar"
                      aria-label={`Editar ${getCustomerDisplayName(customer)}`}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Borrar a ${getCustomerDisplayName(customer)}?`))
                          deleteCustomer(customer.id);
                      }}
                      className="rounded-xl bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                      title="Borrar"
                      aria-label={`Borrar ${getCustomerDisplayName(customer)}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-right text-sm font-medium text-emerald-700">
                    Facturado: {formatMoney(invoiced)}
                  </p>
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
          <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-950">
            <input
              type="checkbox"
              checked={updateDraftDocuments}
              onChange={(event) =>
                setUpdateDraftDocuments(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600"
            />
            <span>
              <span className="font-semibold">Actualizar también borradores</span>
              <span className="block text-blue-800">
                Los documentos emitidos conservarán el cliente original y sus
                snapshots históricos.
              </span>
            </span>
          </label>
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
