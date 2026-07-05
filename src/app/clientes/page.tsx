"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GitMerge,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { CustomerAiAutofill } from "@/components/clients/CustomerAiAutofill";
import type { CustomerAiAutofillValues } from "@/components/clients/CustomerAiAutofill";
import { CustomerSortBar } from "@/components/clients/CustomerSortBar";
import { CustomerDocumentActions } from "@/components/clients/CustomerDocumentActions";
import { CustomerListSearch } from "@/components/clients/CustomerListSearch";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { GoogleAddressAutocomplete } from "@/components/places/GoogleAddressAutocomplete";
import { Button } from "@/components/ui/Button";
import { PageActionButton } from "@/components/ui/PageActionButton";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ResponsiveEntityPanel } from "@/components/ui/ResponsiveEntityPanel";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney } from "@/lib/calculations";
import { maybeCelebrateFirstCustomer } from "@/lib/factu/milestones";
import {
  formatAddressBlock,
  RESIDENCE_TYPE_LABELS,
} from "@/lib/customer-address";
import {
  CUSTOMER_TYPE_LABELS,
  customerFullName,
  buildCustomerInvoicedTotals,
  countDocumentsForCustomer,
  customerPayloadFromInput,
  CUSTOMER_SORT_FIELD_LABELS,
  customerSortDirectionLabel,
  findDuplicateCustomerGroups,
  getCustomerDisplayName,
  migrateCustomer,
  normalizeCustomerType,
  sortCustomers,
  validateCustomerInput,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/lib/customers";
import type { GooglePlaceAddressSuggestion } from "@/lib/google-places";
import type {
  AddressResidenceType,
  Customer,
  CustomerType,
  Document,
} from "@/lib/types";

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

const CUSTOMER_LIST_BATCH_SIZE = 30;

function customerWhatsappHref(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  const hasInternationalPrefix =
    trimmed.startsWith("+") || trimmed.startsWith("00");
  const normalized = hasInternationalPrefix
    ? digits.replace(/^00/, "")
    : digits.length === 9
      ? `34${digits}`
      : digits;
  return `https://wa.me/${normalized}`;
}

function customerEmailHref(email: string): string {
  return `mailto:${email.trim()}`;
}

function duplicateGroupKey(group: Customer[]): string {
  return group.map((customer) => customer.id).sort().join(":");
}

function DuplicateCustomerChoiceCard({
  customer,
  documents,
  invoiced,
  name,
  selected,
  onSelect,
}: {
  customer: Customer;
  documents: Document[];
  invoiced: number;
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const migrated = migrateCustomer(customer);
  const address = formatAddressBlock(migrated);
  const documentCount = countDocumentsForCustomer(documents, migrated);
  const details = [
    ["NIF", migrated.nif || "Sin NIF"],
    ["Contacto", migrated.contactName || "Sin contacto"],
    ["Teléfono", migrated.phone || "Sin teléfono"],
    ["Email", migrated.email || "Sin email"],
    ["Dirección", address || "Sin dirección"],
    ["Docs.", `${documentCount}`],
    ["Facturado", formatMoney(invoiced)],
  ];

  return (
    <label
      className={`block cursor-pointer rounded-2xl border bg-white p-3 transition-colors dark:bg-slate-900 ${
        selected
          ? "border-blue-500 ring-2 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/70"
          : "border-amber-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-500"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          name={name}
          checked={selected}
          onChange={onSelect}
          className="mt-1 h-5 w-5 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-slate-950 dark:text-slate-50">
            {getCustomerDisplayName(migrated)}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800"
              >
                <p className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500">
                  {label}
                </p>
                <p className="mt-0.5 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </label>
  );
}

export default function ClientesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, addCustomer, updateCustomer, deleteCustomer, mergeCustomers } =
    useAppStore();
  const { checkCanAddCustomer } = useBilling();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keepId, setKeepId] = useState("");
  const [updateDraftDocuments, setUpdateDraftDocuments] = useState(false);
  const [duplicateKeepIds, setDuplicateKeepIds] = useState<
    Record<string, string>
  >({});
  const [duplicateUpdateDrafts, setDuplicateUpdateDrafts] = useState<
    Record<string, boolean>
  >({});
  const [listFilterId, setListFilterId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<CustomerSortField>("reciente");
  const [sortDirection, setSortDirection] =
    useState<CustomerSortDirection>("desc");
  const [visibleCustomerCount, setVisibleCustomerCount] = useState(
    CUSTOMER_LIST_BATCH_SIZE,
  );

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

  const visibleCustomers = useMemo(
    () => displayedCustomers.slice(0, visibleCustomerCount),
    [displayedCustomers, visibleCustomerCount],
  );

  const hiddenCustomerCount = Math.max(
    displayedCustomers.length - visibleCustomers.length,
    0,
  );

  const mergeVisibleCustomers = useMemo(() => {
    const term = mergeSearch.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [
        getCustomerDisplayName(customer),
        customer.nif,
        customer.email,
        customer.phone,
        customer.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [customers, mergeSearch]);

  const duplicateGroups = useMemo(
    () => findDuplicateCustomerGroups(data.customers),
    [data.customers],
  );

  const selectedCustomers = useMemo(
    () =>
      data.customers.filter((customer) => selectedIds.includes(customer.id)),
    [data.customers, selectedIds],
  );

  useEffect(() => {
    if (selectedCustomers.length < 2) {
      setKeepId("");
      return;
    }
    setKeepId((current) => (selectedIds.includes(current) ? current : ""));
  }, [selectedCustomers, selectedIds]);

  useEffect(() => {
    setVisibleCustomerCount(CUSTOMER_LIST_BATCH_SIZE);
  }, [data.customers.length, listFilterId, sortDirection, sortField]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
    router.replace("/clientes", { scroll: false });
  }, [router, searchParams]);

  function closeForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(false);
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function startEdit(customer: Customer) {
    const migrated = migrateCustomer(customer);
    setEditingId(customer.id);
    setFormOpen(true);
    setFormError(null);
    setForm({
      customerType: normalizeCustomerType(migrated.customerType),
      firstName: migrated.firstName,
      lastName: migrated.lastName,
      contactName: migrated.contactName ?? "",
      nif: migrated.nif ?? "",
      email: migrated.email ?? "",
      phone: migrated.phone ?? "",
      streetType: migrated.streetType ?? "",
      residenceType: migrated.residenceType ?? "flat",
      address: migrated.address ?? "",
      addressExtra: migrated.addressExtra ?? "",
      city: migrated.city ?? "",
      postalCode: migrated.postalCode ?? "",
      notes: migrated.notes ?? "",
    });
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
    setMergeSearch("");
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

  function handleSortFieldChange(field: CustomerSortField) {
    setSortField(field);
    setSortDirection(
      field === "reciente" || field === "facturacion" ? "desc" : "asc",
    );
  }

  function updateFormField<K extends keyof typeof EMPTY_FORM>(
    field: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
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
    };

    const existing = editingId
      ? data.customers.find((c) => c.id === editingId)
      : null;
    if (existing) {
      updateCustomer({ ...existing, ...payload });
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
            const groupKey = duplicateGroupKey(group);
            const selectedKeepId = duplicateKeepIds[groupKey] ?? "";
            const selectedKeep = group.find(
              (customer) => customer.id === selectedKeepId,
            );
            const updateDrafts = Boolean(duplicateUpdateDrafts[groupKey]);
            return (
              <Card
                key={groupKey}
                className="space-y-4 border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/25"
              >
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Mismo NIF en varios clientes
                  </p>
                  <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">
                    {group
                      .map((customer) => getCustomerDisplayName(customer))
                      .join(" · ")}
                  </p>
                  <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                    Elige cuál conservar. No unificamos automáticamente en uno
                    de ellos.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {group.map((customer) => (
                    <DuplicateCustomerChoiceCard
                      key={customer.id}
                      customer={customer}
                      documents={data.documents}
                      invoiced={customerInvoicedTotals.get(customer.id) ?? 0}
                      name={`duplicate-customer-${groupKey}`}
                      selected={selectedKeepId === customer.id}
                      onSelect={() =>
                        setDuplicateKeepIds((current) => ({
                          ...current,
                          [groupKey]: customer.id,
                        }))
                      }
                    />
                  ))}
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white/80 p-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-slate-900 dark:text-amber-100">
                  <input
                    type="checkbox"
                    checked={updateDrafts}
                    onChange={(event) =>
                      setDuplicateUpdateDrafts((current) => ({
                        ...current,
                        [groupKey]: event.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-blue-600"
                  />
                  <span>
                    <span className="font-semibold">
                      Actualizar también borradores
                    </span>
                    <span className="block text-amber-800 dark:text-amber-200">
                      Los documentos emitidos conservan su cliente histórico; los
                      borradores pueden adoptar los datos del cliente conservado.
                    </span>
                  </span>
                </label>
                <Button
                  type="button"
                  fullWidth
                  variant="secondary"
                  disabled={!selectedKeep}
                  className="mb-0"
                  onClick={() => {
                    if (!selectedKeep) return;
                    const removeIds = group
                      .filter((customer) => customer.id !== selectedKeep.id)
                      .map((customer) => customer.id);
                    if (
                      confirm(
                        `¿Unificar ${group.length} clientes en «${getCustomerDisplayName(selectedKeep)}»? Los documentos emitidos conservarán el cliente original por integridad histórica.`,
                      )
                    ) {
                      mergeCustomers(selectedKeep.id, removeIds, {
                        updateDraftDocuments: updateDrafts,
                      });
                      setDuplicateKeepIds((current) => {
                        const next = { ...current };
                        delete next[groupKey];
                        return next;
                      });
                      setDuplicateUpdateDrafts((current) => {
                        const next = { ...current };
                        delete next[groupKey];
                        return next;
                      });
                    }
                  }}
                >
                  <GitMerge className="h-5 w-5" />
                  {selectedKeep
                    ? `Unificar en «${getCustomerDisplayName(selectedKeep)}»`
                    : "Elige qué cliente conservar"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {!formOpen && (
        <Card className="mb-4 space-y-2 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Acciones
          </h2>
          {!mergeMode ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={openCreateForm}
                fullWidth
                className="gap-2"
              >
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
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={exitMergeMode}
              fullWidth
              className="gap-2"
            >
              <X className="h-5 w-5" />
              Cancelar unificación
            </Button>
          )}
        </Card>
      )}

      {saved && !formOpen && (
        <p className="mb-4 text-center text-sm font-medium text-green-600">
          Cliente guardado correctamente
        </p>
      )}

      {formOpen && (
        <ResponsiveEntityPanel
          open={formOpen}
          title={editingId ? "Editar cliente" : "Nuevo cliente"}
          subtitle="Guarda solo los datos necesarios para facturar o enviar documentos."
          icon={UserPlus}
          onClose={cancelEdit}
        >
          <div className="space-y-4">
            <CustomerAiAutofill onApply={applyAiCustomer} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo">
                <Select
                  value={formCustomerType}
                  onChange={(e) =>
                    updateFormField(
                      "customerType",
                      e.target.value as CustomerType,
                    )
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
                  onChange={(e) =>
                    updateFormField("postalCode", e.target.value)
                  }
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
                  {formIsCompany
                    ? form.firstName.trim()
                    : customerFullName(form.firstName, form.lastName)}
                </strong>
              </p>
            )}

            <Button onClick={handleSave} fullWidth>
              {editingId ? "Guardar cambios" : "Guardar cliente"}
            </Button>
          </div>
        </ResponsiveEntityPanel>
      )}

      {customers.length === 0 && !formOpen ? (
        <FactuEmptyState
          variant="cliente"
          action={
            <Button type="button" onClick={openCreateForm} className="gap-2">
              <UserPlus className="h-5 w-5" />
              Nuevo cliente
            </Button>
          }
        />
      ) : customers.length > 0 ? (
        <div className="space-y-3">
          {!mergeMode ? (
            <Card className="space-y-3 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Buscar y ordenar
              </h2>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(14rem,0.8fr)]">
                <CustomerListSearch
                  customers={customers}
                  selectedCustomerId={listFilterId}
                  onSelectCustomer={(customer) =>
                    setListFilterId(customer?.id ?? null)
                  }
                />
                <CustomerSortBar
                  sortField={sortField}
                  onSortFieldChange={handleSortFieldChange}
                />
              </div>
            </Card>
          ) : (
            <Card className="space-y-3 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Buscar clientes para unificar
              </h2>
              <label className="block">
                <span className="sr-only">Buscar cliente para unificar</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={mergeSearch}
                    onChange={(event) => setMergeSearch(event.target.value)}
                    placeholder="Nombre, NIF, teléfono o email..."
                    className="pl-10"
                  />
                </div>
              </label>
              <p className="text-sm font-medium text-slate-500">
                Marca los duplicados y elige abajo cuál conservar.
              </p>
            </Card>
          )}
          <p className="text-sm font-medium text-slate-500">
            {listFilterId
              ? "1 cliente seleccionado"
              : `${customers.length} cliente(s) — ${CUSTOMER_SORT_FIELD_LABELS[sortField].toLowerCase()}, ${customerSortDirectionLabel(sortField, sortDirection).toLowerCase()}`}
            {!listFilterId && displayedCustomers.length > 0
              ? ` · mostrando ${visibleCustomers.length}`
              : ""}
          </p>
          {(mergeMode ? mergeVisibleCustomers : visibleCustomers).map(
            (customer) => {
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
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-bold text-slate-900">
                        {getCustomerDisplayName(customer)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">
                          {
                            CUSTOMER_TYPE_LABELS[
                              normalizeCustomerType(migrated.customerType)
                            ]
                          }
                        </span>
                        {migrated.contactName && (
                          <span>Contacto: {migrated.contactName}</span>
                        )}
                      </div>
                      {customer.nif && (
                        <p className="text-sm text-slate-500">
                          NIF: {customer.nif}
                        </p>
                      )}
                      <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                        {migrated.phone && (
                          <a
                            href={customerWhatsappHref(migrated.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                            aria-label={`Contactar por WhatsApp con ${getCustomerDisplayName(customer)}`}
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{migrated.phone}</span>
                          </a>
                        )}
                        {migrated.email && (
                          <a
                            href={customerEmailHref(migrated.email)}
                            className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition-colors hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                            aria-label={`Enviar email a ${getCustomerDisplayName(customer)}`}
                            title="Enviar email"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{migrated.email}</span>
                          </a>
                        )}
                        {!migrated.phone && !migrated.email && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Sin contacto de envío
                          </span>
                        )}
                      </div>
                      {(migrated.address || migrated.addressExtra || migrated.city) && (
                        <p className="break-words text-sm text-slate-400">
                          {formatAddressBlock(migrated)}
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
                            if (
                              confirm(
                                `¿Borrar a ${getCustomerDisplayName(customer)}?`,
                              )
                            )
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
            },
          )}
          {!mergeMode && hiddenCustomerCount > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setVisibleCustomerCount((current) =>
                    Math.min(
                      current + CUSTOMER_LIST_BATCH_SIZE,
                      displayedCustomers.length,
                    ),
                  )
                }
                className="min-h-12 w-full rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Cargar {Math.min(CUSTOMER_LIST_BATCH_SIZE, hiddenCustomerCount)}{" "}
                más
              </button>
              <p className="mt-2 text-center text-xs font-medium text-slate-400">
                Mostrando {visibleCustomers.length} de{" "}
                {displayedCustomers.length} clientes
              </p>
            </div>
          )}
        </div>
      ) : null}

      {mergeMode && selectedIds.length >= 2 && (
        <Card className="sticky bottom-20 z-10 mt-4 max-h-[calc(100vh-8rem)] space-y-3 overflow-y-auto border-blue-300 bg-white shadow-lg dark:border-blue-900/70 dark:bg-slate-900 sm:bottom-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-slate-900 dark:text-slate-50">
              {selectedIds.length} clientes seleccionados
            </p>
            <Button
              variant="ghost"
              onClick={exitMergeMode}
              className="min-h-10 px-3 text-sm sm:w-auto"
            >
              Cancelar
            </Button>
          </div>
          <Field label="Conservar">
            <select
              value={keepId}
              onChange={(e) => setKeepId(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Elige qué cliente conservar...</option>
              {selectedCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {getCustomerDisplayName(customer)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/25 dark:text-blue-100">
            <input
              type="checkbox"
              checked={updateDraftDocuments}
              onChange={(event) =>
                setUpdateDraftDocuments(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-blue-300 text-blue-600"
            />
            <span>
              <span className="font-semibold">
                Actualizar también borradores
              </span>
              <span className="block text-blue-800 dark:text-blue-200">
                Los documentos emitidos conservarán el cliente original y sus
                snapshots históricos.
              </span>
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button fullWidth onClick={handleManualMerge} disabled={!keepId}>
              <GitMerge className="h-5 w-5" />
              {keepId ? "Unificar en uno" : "Elige qué cliente conservar"}
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
