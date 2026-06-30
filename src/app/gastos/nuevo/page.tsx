"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseAmountFields } from "@/components/expenses/ExpenseAmountFields";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import { todayISO } from "@/lib/calculations";
import { isVatExempt } from "@/lib/vat-regime";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/types";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";
import {
  buildSupplierMatchHint,
  ensureSupplierForExpense,
  findBestSupplierMatch,
  findSupplierByExactName,
} from "@/lib/suppliers";
import {
  decimalInputFromNumber,
  parseDecimalInput,
} from "@/lib/decimal-input";
import { expenseTotalsFromBase } from "@/lib/expenses";

export default function NuevoGastoPage() {
  const router = useRouter();
  const { data, addExpense, updateExpense, addSupplier } = useAppStore();

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [loadedExpenseId, setLoadedExpenseId] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [supplierName, setSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const vatExempt = isVatExempt(data.profile);
  const defaultIva = data.profile.iva?.defaultRate ?? 21;
  const [ivaPercent, setIvaPercent] = useState(defaultIva);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    PAYMENT_METHODS[0],
  );
  const [notes, setNotes] = useState("");
  const [saveSupplier, setSaveSupplier] = useState(true);
  const [supplierNif, setSupplierNif] = useState<string | undefined>();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [expenseOrigin, setExpenseOrigin] =
    useState<"manual" | "scan">("manual");
  const [supplierHint, setSupplierHint] = useState<string | null>(null);

  const editingExpense = useMemo(
    () =>
      editingExpenseId
        ? data.expenses.find((expense) => expense.id === editingExpenseId)
        : undefined,
    [data.expenses, editingExpenseId],
  );
  const editingRequested = Boolean(editingExpenseId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditingExpenseId(params.get("editar"));
  }, []);

  useEffect(() => {
    if (!editingExpense || loadedExpenseId === editingExpense.id) return;
    setLoadedExpenseId(editingExpense.id);
    setDate(editingExpense.date);
    setSupplierName(
      editingExpense.supplierName === "Sin proveedor"
        ? ""
        : editingExpense.supplierName,
    );
    setSelectedSupplierId(editingExpense.supplierId ?? null);
    setDescription(editingExpense.description);
    setAmountText(decimalInputFromNumber(editingExpense.amount));
    if (!vatExempt) setIvaPercent(editingExpense.ivaPercent);
    setCategory(editingExpense.category);
    setPaymentMethod(editingExpense.paymentMethod);
    setNotes(editingExpense.notes ?? "");
    setExpenseOrigin(editingExpense.origin === "scan" ? "scan" : "manual");
    setSaveSupplier(Boolean(editingExpense.supplierId));
    setSupplierHint(
      editingExpense.supplierId
        ? `Usando el proveedor guardado «${editingExpense.supplierName}».`
        : null,
    );
  }, [editingExpense, loadedExpenseId, vatExempt]);

  function applyScanResult(payload: ExpenseScanPayload) {
    const match = findBestSupplierMatch(data.suppliers, {
      name: payload.supplier.name,
      nif: payload.supplier.nif,
    });

    if (match) {
      setSupplierName(match.supplier.name);
      setSelectedSupplierId(match.supplier.id);
      setSupplierNif(match.supplier.nif ?? payload.supplier.nif ?? undefined);
      setSupplierHint(buildSupplierMatchHint(match));
    } else {
      setSupplierName(payload.supplier.name);
      setSelectedSupplierId(null);
      setSupplierNif(payload.supplier.nif ?? undefined);
      setSupplierHint(null);
    }
    setDescription(payload.expense.description);
    setAmountText(decimalInputFromNumber(payload.expense.amount));
    setDate(payload.expense.date);
    if (!vatExempt) setIvaPercent(payload.expense.ivaPercent);
    setCategory(payload.expense.category);
    setPaymentMethod(payload.expense.paymentMethod);
    const extraNotes = [
      payload.expense.notes,
      payload.supplier.nif ? `NIF proveedor: ${payload.supplier.nif}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
    if (extraNotes) setNotes(extraNotes);
    setSaveSupplier(true);
    setExpenseOrigin("scan");
    setScanHint(
      "Datos importados del escaneo. Revisa importe, IVA y fecha antes de guardar.",
    );
  }

  function handleSupplierNameChange(value: string) {
    setSupplierName(value);
    const exact = findSupplierByExactName(data.suppliers, value);
    setSelectedSupplierId(exact?.id ?? null);
    if (exact) {
      setSupplierHint(`Usando el proveedor guardado «${exact.name}».`);
      return;
    }

    const match = findBestSupplierMatch(data.suppliers, {
      name: value,
      nif: supplierNif,
    });
    setSupplierHint(match ? buildSupplierMatchHint(match) : null);
  }

  function handleSubmit() {
    const totals = expenseTotalsFromBase(
      parseDecimalInput(amountText),
      ivaPercent,
      vatExempt,
    );
    const amount = totals.base;

    if (!description.trim() || amount <= 0) {
      alert("Completa descripción y cantidad");
      return;
    }

    const hasSupplierName = Boolean(supplierName.trim());
    const resolved = hasSupplierName
      ? ensureSupplierForExpense(data.suppliers, {
          name: supplierName,
          nif: supplierNif,
          category,
          saveSupplier,
          selectedSupplierId,
        })
      : {
          supplierId: undefined,
          supplierName: "Sin proveedor",
          create: undefined,
        };

    let supplierId = resolved.supplierId;
    if (resolved.create) {
      const created = addSupplier(resolved.create);
      supplierId = created.id;
    }

    const payload = {
      date,
      supplierId,
      supplierName: resolved.supplierName,
      description: description.trim(),
      amount,
      ivaPercent: totals.ivaPercent,
      category,
      paymentMethod,
      notes: notes || undefined,
      origin: expenseOrigin,
    };

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        ...payload,
      });
    } else {
      addExpense(payload);
    }

    router.push("/gastos");
  }

  return (
    <div>
      <PageHeader
        title={editingRequested ? "Editar gasto" : "Añadir gasto"}
        subtitle={
          editingRequested
            ? "Actualiza importe, IVA, proveedor o categoría"
            : "Anota una compra o gasto del negocio"
        }
      />
      <div className="space-y-5">
        {!editingRequested && <ExpenseScanCard onScanned={applyScanResult} />}
        {editingRequested && !editingExpense && (
          <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
            No encuentro ese gasto en tus datos locales. Puedes volver al listado
            o guardar este formulario como gasto nuevo.
          </Card>
        )}
        {scanHint && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
            {scanHint}
          </p>
        )}
        {supplierHint && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {supplierHint}
          </p>
        )}
        <Card className="space-y-5">
          <FormSection
            variant="search"
            title="Proveedor"
            hint="Elige uno guardado, escribe el nombre de la tienda o deja este campo vacío si todavía no lo sabes."
          >
            <Field label="Nombre de proveedor / tienda">
              <Input
                value={supplierName}
                onChange={(e) => handleSupplierNameChange(e.target.value)}
                placeholder="Ej: Leroy Merlin"
                list="suppliers-list"
              />
              <datalist id="suppliers-list">
                {data.suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={saveSupplier}
                onChange={(e) => setSaveSupplier(e.target.checked)}
                className="h-5 w-5 rounded"
              />
              Guardar este proveedor para la próxima vez
            </label>
          </FormSection>

          <FormSection
            variant="fields"
            title="Detalle del gasto"
            hint="Importe, IVA y categoría para tu libro de compras."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="¿Qué compraste? *" hint="Describe el gasto">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Material de fontanería"
                />
              </Field>
              <ExpenseAmountFields
                amountText={amountText}
                onAmountTextChange={setAmountText}
                ivaPercent={ivaPercent}
                vatExempt={vatExempt}
              />
              {vatExempt ? (
                <p className="text-sm text-slate-500 sm:col-span-2">
                  Sin IVA deducible — tu perfil está marcado como exento de
                  repercusión.
                </p>
              ) : (
                <Field label="IVA %">
                  <IvaPercentSelect
                    value={ivaPercent}
                    onChange={setIvaPercent}
                  />
                </Field>
              )}
              <Field label="Categoría">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Forma de pago">
                <Select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notas">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nº factura del proveedor, observaciones..."
                  />
                </Field>
              </div>
            </div>
          </FormSection>
        </Card>
        <Button fullWidth onClick={handleSubmit}>
          {editingExpense ? "Guardar cambios" : "Guardar gasto"}
        </Button>
      </div>
    </div>
  );
}
