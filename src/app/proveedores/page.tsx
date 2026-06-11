"use client";

import { useEffect, useMemo, useState } from "react";
import { GitMerge, Trash2, X } from "lucide-react";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { Button } from "@/components/ui/Button";
import { PageActionButton } from "@/components/ui/PageActionButton";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { expenseTotal, formatMoney } from "@/lib/calculations";
import {
  findBestSupplierMatch,
  findDuplicateSupplierGroups,
  pickCanonicalSupplier,
  SUPPLIER_AUTO_LINK_SCORE,
  supplierSimilarityScore,
} from "@/lib/suppliers";

export default function ProveedoresPage() {
  const { data, addSupplier, deleteSupplier, mergeSuppliers } = useAppStore();
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keepId, setKeepId] = useState("");

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

  function handleAdd() {
    if (!name.trim()) {
      alert("Escribe el nombre del proveedor");
      return;
    }

    const match = findBestSupplierMatch(data.suppliers, {
      name: name.trim(),
      nif: nif || undefined,
    });
    if (match && match.score >= SUPPLIER_AUTO_LINK_SCORE) {
      alert(
        `Ya tienes un proveedor muy parecido: «${match.supplier.name}». Usa ese para no duplicar gastos.`,
      );
      return;
    }

    addSupplier({
      name: name.trim(),
      nif: nif.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName("");
    setNif("");
    setPhone("");
    setWebsite("");
    setAddress("");
    setNotes("");
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

      <div className="mb-6 flex flex-col gap-3">
        {!mergeMode ? (
          data.suppliers.length >= 2 && (
            <PageActionButton
              icon={GitMerge}
              label="Unificar manualmente"
              onClick={() => setMergeMode(true)}
              className="mb-0"
            />
          )
        ) : (
          <Button variant="ghost" onClick={exitMergeMode} fullWidth className="gap-2">
            <X className="h-5 w-5" />
            Cancelar unificación
          </Button>
        )}
      </div>

      <Card className="mb-6 space-y-4">
        <h2 className="font-bold text-slate-900">Añadir proveedor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la empresa"
            />
          </Field>
          <Field label="NIF">
            <Input value={nif} onChange={(e) => setNif(e.target.value)} />
          </Field>
          <Field label="Teléfono">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Web" hint="Opcional. Ej: www.tienda.com">
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.ejemplo.com"
            />
          </Field>
          <Field label="Dirección">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle, número, ciudad"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
        <Button onClick={handleAdd}>Guardar proveedor</Button>
      </Card>

      {data.suppliers.length === 0 ? (
        <FactuEmptyState variant="proveedor" />
      ) : (
        <div className="space-y-3">
          {data.suppliers.map((supplier) => {
            const spent = data.expenses
              .filter(
                (expense) =>
                  expense.supplierId === supplier.id ||
                  (!expense.supplierId &&
                    supplierSimilarityScore(
                      expense.supplierName,
                      supplier.name,
                      undefined,
                      supplier.nif,
                    ) >= SUPPLIER_AUTO_LINK_SCORE),
              )
              .reduce((sum, expense) => sum + expenseTotal(expense), 0);
            const selected = selectedIds.includes(supplier.id);
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
                    {supplier.phone && (
                      <p className="text-sm text-slate-500">{supplier.phone}</p>
                    )}
                    {supplier.address && (
                      <p className="text-sm text-slate-500">{supplier.address}</p>
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
                    <p className="mt-1 text-sm text-emerald-700">
                      Gastado: {formatMoney(spent)}
                    </p>
                  </div>
                </div>
                {!mergeMode && (
                  <button
                    onClick={() => {
                      if (confirm("¿Borrar proveedor?")) deleteSupplier(supplier.id);
                    }}
                    className="shrink-0 rounded-xl bg-red-50 p-2 text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

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
