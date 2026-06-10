"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { todayISO } from "@/lib/calculations";
import { isVatExempt } from "@/lib/vat-regime";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/types";
import type { ExpenseScanPayload } from "@/lib/expense-scan/schema";

export default function NuevoGastoPage() {
  const router = useRouter();
  const { data, addExpense, addSupplier } = useAppStore();

  const [date, setDate] = useState(todayISO());
  const [supplierName, setSupplierName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
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
  const [scanHint, setScanHint] = useState<string | null>(null);

  function applyScanResult(payload: ExpenseScanPayload) {
    setSupplierName(payload.supplier.name);
    setSupplierNif(payload.supplier.nif ?? undefined);
    setDescription(payload.expense.description);
    setAmount(payload.expense.amount);
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
    setScanHint(
      "Datos importados del escaneo. Revisa importe, IVA y fecha antes de guardar.",
    );
  }

  function handleSubmit() {
    if (!supplierName.trim() || !description.trim() || amount <= 0) {
      alert("Completa proveedor, descripción y cantidad");
      return;
    }

    const existing = data.suppliers.find(
      (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase(),
    );

    let supplierId = existing?.id;
    if (!existing && saveSupplier) {
      const created = addSupplier({
        name: supplierName.trim(),
        nif: supplierNif,
        category,
      });
      supplierId = created.id;
    }

    addExpense({
      date,
      supplierId,
      supplierName: supplierName.trim(),
      description: description.trim(),
      amount,
      ivaPercent: vatExempt ? 0 : ivaPercent,
      category,
      paymentMethod,
      notes: notes || undefined,
    });

    router.push("/gastos");
  }

  return (
    <div>
      <PageHeader
        title="Añadir gasto"
        subtitle="Anota una compra o gasto del negocio"
      />
      <div className="space-y-5">
        <ExpenseScanCard onScanned={applyScanResult} />
        {scanHint && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
            {scanHint}
          </p>
        )}
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Proveedor / tienda *">
            <Input
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Ej: Leroy Merlin"
              list="suppliers-list"
            />
            <datalist id="suppliers-list">
              {data.suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
            <input
              type="checkbox"
              checked={saveSupplier}
              onChange={(e) => setSaveSupplier(e.target.checked)}
              className="h-5 w-5 rounded"
            />
            Guardar este proveedor para la próxima vez
          </label>
          <Field label="¿Qué compraste? *" hint="Describe el gasto">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Material de fontanería"
            />
          </Field>
          <Field label={vatExempt ? "Importe *" : "Importe (sin IVA) *"}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
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
          <Field label="Notas">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nº factura del proveedor, observaciones..."
            />
          </Field>
        </Card>
        <Button fullWidth onClick={handleSubmit}>
          Guardar gasto
        </Button>
      </div>
    </div>
  );
}
