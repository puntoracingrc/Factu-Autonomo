"use client";

import { useEffect, useMemo, useState } from "react";
import { GitMerge, Pencil, Truck, Trash2, X } from "lucide-react";
import { SupplierListSearch } from "@/components/suppliers/SupplierListSearch";
import { SupplierSortBar } from "@/components/suppliers/SupplierSortBar";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { Button } from "@/components/ui/Button";
import { PageActionButton } from "@/components/ui/PageActionButton";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import { formatMoney } from "@/lib/calculations";
import { formatStreetLine } from "@/lib/customer-address";
import {
  findBestSupplierMatch,
  findDuplicateSupplierGroups,
  migrateSupplier,
  pickCanonicalSupplier,
  sortSuppliers,
  SUPPLIER_AUTO_LINK_SCORE,
  SUPPLIER_SORT_FIELD_LABELS,
  supplierPurchasedTotal,
  supplierSortDirectionLabel,
  type SupplierSortDirection,
  type SupplierSortField,
} from "@/lib/suppliers";
import type { Supplier } from "@/lib/types";

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

export default function ProveedoresPage() {
  const { data, addSupplier, updateSupplier, deleteSupplier, mergeSuppliers } =
    useAppStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keepId, setKeepId] = useState("");
  const [listFilterId, setListFilterId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SupplierSortField>("nombre");
  const [sortDirection, setSortDirection] =
    useState<SupplierSortDirection>("asc");

  const suppliers = useMemo(
    () => sortSuppliers(data.suppliers, data.expenses, sortField, sortDirection),
    [data.suppliers, data.expenses, sortField, sortDirection],
  );

  const displayedSuppliers = useMemo(() => {
    if (!listFilterId) return suppliers;
    const match = suppliers.find((supplier) => supplier.id === listFilterId);
    return match ? [match] : suppliers;
  }, [suppliers, listFilterId]);

  const duplicateGroups = useMemo(
    () => findDuplicateSupplierGroups(data.suppliers),
    [data.suppliers],
  );

  const selectedSuppliers = useMemo(
    () => data.suppliers.filter((supplier) => selectedIds.includes(supplier.id)),
    [data.suppliers, selectedIds],
  );

  useEffect(() => {
    if (selectedSuppliers.length < 2) {
      setKeepId("");
      return;
    }
    const canonical = pickCanonicalSupplier(selectedSuppliers, data.expenses);
    setKeepId((current) =>
      selectedIds.includes(current) ? current : canonical.id,
    );
  }, [selectedSuppliers, selectedIds, data.expenses]);

  function toggleSupplierSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  function exitMergeMode() {
    setMergeMode(false);
    setSelectedIds([]);
    setKeepId("");
  }

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

  function startEdit(supplier: Supplier) {
    const migrated = migrateSupplier(supplier);
    setEditingId(supplier.id);
    setFormOpen(true);
    setForm({
      name: migrated.name,
      nif: migrated.nif ?? "",
      phone: migrated.phone ?? "",
      website: migrated.website ?? "",
      streetType: migrated.streetType ?? "",
      address: migrated.address ?? "",
      city: migrated.city ?? "",
      postalCode: migrated.postalCode ?? "",
      notes: migrated.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleManualMerge() {
    if (selectedIds.length < 2 || !keepId) return;
    const keep = data.suppliers.find((supplier) => supplier.id === keepId);
    if (!keep) return;
    const removeIds = selectedIds.filter((id) => id !== keepId);
    if (
      confirm(
        `¿Unificar ${selectedIds.length} proveedores en «${keep.name}»? Todos los gastos vinculados se moverán ahí.`,
      )
    ) {
      mergeSuppliers(keepId, removeIds);
      exitMergeMode();
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      alert("Escribe el nombre del proveedor");
      return;
    }

    if (!editingId) {
      const match = findBestSupplierMatch(data.suppliers, {
        name: form.name.trim(),
        nif: form.nif || undefined,
      });
      if (match && match.score >= SUPPLIER_AUTO_LINK_SCORE) {
        alert(
          `Ya tienes un proveedor muy parecido: «${match.supplier.name}». Usa ese para no duplicar gastos.`,
        );
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      nif: form.nif.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      streetType: form.streetType.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      postalCode: form.postalCode.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (editingId) {
      const existing = data.suppliers.find((supplier) => supplier.id === editingId);
      if (existing) {
        updateSupplier({ ...existing, ...payload });
      }
    } else {
      addSupplier(payload);
    }

    closeForm();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function supplierWebsiteHref(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Quién te vende material o servicios"
      />

      {mergeMode && (
        <Card className="mb-6 border-blue-200 bg-blue-50/70">
          <p className="font-semibold text-blue-950">Unificación manual</p>
          <p className="mt-1 text-sm text-blue-900">
            Marca dos o más proveedores que sean el mismo (aunque la app no los
            haya detectado) y elige cuál nombre conservar.
          </p>
        </Card>
      )}

      {duplicateGroups.length > 0 && (
        <div className="mb-6 space-y-3">
          {duplicateGroups.map((group) => {
            const canonical = pickCanonicalSupplier(group, data.expenses);
            const others = group.filter((supplier) => supplier.id !== canonical.id);
            return (
              <Card
                key={canonical.id}
                className="space-y-3 border-amber-200 bg-amber-50/70"
              >
                <div>
                  <p className="font-semibold text-amber-950">
                    Posibles duplicados
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    {group.map((supplier) => supplier.name).join(" · ")}
                  </p>
                  <p className="mt-2 text-sm text-amber-800">
                    Puedes unificarlos para que todos los gastos queden en un
                    solo proveedor.
                  </p>
                </div>
                <PageActionButton
                  icon={GitMerge}
                  label={`Unificar en «${canonical.name}»`}
                  onClick={() => {
                    if (
                      confirm(
                        `¿Unificar ${group.length} proveedores en «${canonical.name}»? Los gastos se moverán ahí.`,
                      )
                    ) {
                      mergeSuppliers(
                        canonical.id,
                        others.map((supplier) => supplier.id),
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
        <Card className="mb-4 space-y-2 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Acciones
          </h2>
          {!mergeMode ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={openNewForm} fullWidth className="gap-2">
                <Truck className="h-5 w-5" />
                Nuevo proveedor
              </Button>
              {data.suppliers.length >= 2 && (
                <PageActionButton
                  icon={GitMerge}
                  label="Unificar manualmente"
                  onClick={() => setMergeMode(true)}
                  className="mb-0"
                />
              )}
            </div>
          ) : (
            <Button variant="ghost" onClick={exitMergeMode} fullWidth className="gap-2">
              <X className="h-5 w-5" />
              Cancelar unificación
            </Button>
          )}
        </Card>
      )}

      {saved && !formOpen && (
        <p className="mb-4 text-center text-sm font-medium text-green-600">
          Proveedor guardado correctamente
        </p>
      )}

      {formOpen && (
        <Card className="mb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900">
              <Truck className="h-5 w-5 text-blue-600" />
              {editingId ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="flex items-center gap-1 text-sm text-slate-500"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nombre de la empresa"
                />
              </Field>
              <Field label="NIF">
                <Input
                  value={form.nif}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nif: e.target.value }))
                  }
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </Field>
              <Field label="Web" hint="Opcional. Ej: www.tienda.com">
                <Input
                  value={form.website}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website: e.target.value }))
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
                    setForm((prev) => ({ ...prev, streetType }))
                  }
                />
              </Field>
              <Field
                label="Nombre de vía y número"
                hint="Sin C/, Avda. ni otros prefijos"
              >
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Ej: Valencia 546 7/1"
                />
              </Field>
              <Field label="Código postal">
                <Input
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, postalCode: e.target.value }))
                  }
                />
              </Field>
              <Field label="Ciudad">
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notas">
                  <Textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </Field>
              </div>
            </div>
          </FormSection>
          <Button onClick={handleSave} fullWidth>
            {editingId ? "Guardar cambios" : "Guardar proveedor"}
          </Button>
        </Card>
      )}

      {data.suppliers.length === 0 && !formOpen ? (
        <FactuEmptyState
          variant="proveedor"
          action={
            <Button onClick={openNewForm} className="gap-2">
              <Truck className="h-5 w-5" />
              Nuevo proveedor
            </Button>
          }
        />
      ) : data.suppliers.length > 0 ? (
        <div className="space-y-3">
          {!mergeMode && (
            <Card className="space-y-3 p-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Buscar y ordenar
              </h2>
              <SupplierListSearch
                suppliers={suppliers}
                selectedSupplierId={listFilterId}
                onSelectSupplier={(supplier) =>
                  setListFilterId(supplier?.id ?? null)
                }
              />
              <SupplierSortBar
                sortField={sortField}
                sortDirection={sortDirection}
                onSortFieldChange={setSortField}
                onSortDirectionChange={setSortDirection}
              />
            </Card>
          )}
          <p className="text-sm font-medium text-slate-500">
            {listFilterId
              ? "1 proveedor seleccionado"
              : `${suppliers.length} proveedor(es) — ${SUPPLIER_SORT_FIELD_LABELS[sortField].toLowerCase()}, ${supplierSortDirectionLabel(sortField, sortDirection).toLowerCase()}`}
          </p>
          {displayedSuppliers.map((supplier) => {
            const selected = selectedIds.includes(supplier.id);
            const purchased = supplierPurchasedTotal(data.expenses, supplier);
            const migrated = migrateSupplier(supplier);
            return (
              <Card
                key={supplier.id}
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
                      onChange={() => toggleSupplierSelection(supplier.id)}
                      className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600"
                      aria-label={`Seleccionar ${supplier.name}`}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{supplier.name}</p>
                    {supplier.nif && (
                      <p className="text-sm text-slate-500">NIF: {supplier.nif}</p>
                    )}
                    <p className="text-sm text-slate-500">
                      {[supplier.phone, supplier.email].filter(Boolean).join(" · ")}
                    </p>
                    {(migrated.address || supplier.city) && (
                      <p className="text-sm text-slate-400">
                        {[
                          formatStreetLine(migrated.streetType, migrated.address),
                          supplier.postalCode,
                          supplier.city,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                    {supplier.website && (
                      <a
                        href={supplierWebsiteHref(supplier.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block truncate text-sm text-blue-600 underline"
                      >
                        {supplier.website}
                      </a>
                    )}
                    <p className="mt-1 text-sm font-medium text-emerald-700">
                      Compras: {formatMoney(purchased)}
                    </p>
                  </div>
                </div>
                {!mergeMode && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEdit(supplier)}
                      className="rounded-xl bg-slate-100 p-2 text-slate-700"
                      title="Editar"
                      aria-label={`Editar ${supplier.name}`}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Borrar a ${supplier.name}?`)) {
                          deleteSupplier(supplier.id);
                        }
                      }}
                      className="rounded-xl bg-red-50 p-2 text-red-600"
                      title="Borrar"
                      aria-label={`Borrar ${supplier.name}`}
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
            {selectedIds.length} proveedores seleccionados
          </p>
          <Field label="Conservar este proveedor (nombre y gastos)">
            <select
              value={keepId}
              onChange={(e) => setKeepId(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {selectedSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
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
    </div>
  );
}
