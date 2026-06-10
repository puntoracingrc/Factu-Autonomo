"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { FactuEmptyState } from "@/components/factu/FactuEmptyState";
import { Button } from "@/components/ui/Button";
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
  const [notes, setNotes] = useState("");

  const duplicateGroups = useMemo(
    () => findDuplicateSupplierGroups(data.suppliers),
    [data.suppliers],
  );

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
      nif: nif || undefined,
      phone: phone || undefined,
      notes: notes || undefined,
    });
    setName("");
    setNif("");
    setPhone("");
    setNotes("");
  }

  return (
    <div>
      <PageHeader
        title="Proveedores"
        subtitle="Quién te vende material o servicios"
      />

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
                <Button
                  variant="secondary"
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
                >
                  Unificar en «{canonical.name}»
                </Button>
              </Card>
            );
          })}
        </div>
      )}

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
          <Field label="Notas">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
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
            return (
              <Card
                key={supplier.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-slate-900">{supplier.name}</p>
                  {supplier.phone && (
                    <p className="text-sm text-slate-500">{supplier.phone}</p>
                  )}
                  <p className="mt-1 text-sm text-emerald-700">
                    Gastado: {formatMoney(spent)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("¿Borrar proveedor?")) deleteSupplier(supplier.id);
                  }}
                  className="rounded-xl bg-red-50 p-2 text-red-600"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
