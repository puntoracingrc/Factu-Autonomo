"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExpenseAmountFields } from "@/components/expenses/ExpenseAmountFields";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, todayISO } from "@/lib/calculations";
import {
  filterDocumentsByQuery,
  sortDocumentsByNewest,
} from "@/lib/documents";
import { documentShortNumber } from "@/lib/document-links";
import { isVatExempt } from "@/lib/vat-regime";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
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
import {
  expensePurchaseLineBaseTotal,
  expensePurchaseLinesBaseTotal,
  expenseTotalsFromBase,
  findExpensePurchaseLinePriceAlerts,
  sanitizeExpensePurchaseDocument,
  sanitizeExpensePurchaseLines,
} from "@/lib/expenses";
import {
  EXPENSE_BUSINESS_KIND_OPTIONS,
  expenseBusinessKindHint,
  inferExpenseBusinessKind,
} from "@/lib/expense-classification";
import type {
  ExpenseBusinessKind,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
} from "@/lib/types";

function emptyPurchaseLine(
  partial: Partial<ExpensePurchaseLine> = {},
): ExpensePurchaseLine {
  return {
    id: crypto.randomUUID(),
    description: partial.description ?? "",
    quantity: partial.quantity ?? 1,
    unit: partial.unit ?? "ud",
    unitPrice: partial.unitPrice ?? 0,
    discountPercent: partial.discountPercent,
    ivaPercent: partial.ivaPercent,
    total: partial.total,
  };
}

interface PendingExpenseScan {
  payload: ExpenseScanPayload;
  fileName?: string;
}

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
  const [businessKind, setBusinessKind] =
    useState<ExpenseBusinessKind>("purchase");
  const [purchaseDocument, setPurchaseDocument] =
    useState<ExpensePurchaseDocument>({});
  const [purchaseLines, setPurchaseLines] = useState<ExpensePurchaseLine[]>([]);
  const [workDocumentId, setWorkDocumentId] = useState("");
  const [workDocumentQuery, setWorkDocumentQuery] = useState("");
  const [pendingScans, setPendingScans] = useState<PendingExpenseScan[]>([]);
  const [, setSupplierHint] = useState<string | null>(null);

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
    setPurchaseDocument(editingExpense.purchaseDocument ?? {});
    setPurchaseLines(editingExpense.purchaseLines ?? []);
    setWorkDocumentId(editingExpense.workDocumentId ?? "");
    setExpenseOrigin(editingExpense.origin === "scan" ? "scan" : "manual");
    setBusinessKind(
      inferExpenseBusinessKind(
        editingExpense,
        editingExpense.supplierId
          ? data.suppliers.find(
              (supplier) => supplier.id === editingExpense.supplierId,
            )
          : undefined,
      ),
    );
    setSaveSupplier(Boolean(editingExpense.supplierId));
    setSupplierHint(
      editingExpense.supplierId
        ? `Usando el proveedor guardado «${editingExpense.supplierName}».`
        : null,
    );
  }, [data.suppliers, editingExpense, loadedExpenseId, vatExempt]);

  function fillFormFromScan(payload: ExpenseScanPayload, fileName?: string) {
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
    setBusinessKind(payload.expense.businessKind ?? "purchase_invoice");
    setNotes(payload.expense.notes ?? "");
    setPurchaseDocument({
      ...(payload.expense.purchaseDocument ?? {}),
      issueDate: payload.expense.purchaseDocument?.issueDate ?? payload.expense.date,
      supplierNif:
        payload.expense.purchaseDocument?.supplierNif ??
        payload.supplier.nif ??
        undefined,
    });
    setPurchaseLines(
      payload.expense.purchaseLines?.map((line) => emptyPurchaseLine(line)) ??
        [],
    );
    setSaveSupplier(true);
    setExpenseOrigin("scan");
    setScanHint(
      fileName
        ? `Datos importados de ${fileName}. Revisa importe, IVA y fecha antes de guardar.`
        : "Datos importados del escaneo. Revisa importe, IVA y fecha antes de guardar.",
    );
  }

  function applyScanResult(
    payload: ExpenseScanPayload,
    options?: { fileName?: string; append?: boolean },
  ) {
    if (options?.append) {
      setPendingScans((prev) => [
        ...prev,
        { payload, fileName: options.fileName },
      ]);
      return;
    }

    fillFormFromScan(payload, options?.fileName);
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

  function updatePurchaseLine(
    id: string,
    patch: Partial<ExpensePurchaseLine>,
  ) {
    setPurchaseLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function addPurchaseLine() {
    setPurchaseLines((prev) => [
      ...prev,
      emptyPurchaseLine({ ivaPercent: vatExempt ? 0 : ivaPercent }),
    ]);
  }

  const purchaseLinesBaseTotal = expensePurchaseLinesBaseTotal(
    sanitizeExpensePurchaseLines(purchaseLines),
  );
  const linkableWorkDocuments = useMemo(
    () =>
      sortDocumentsByNewest(
        data.documents.filter(
          (document) =>
            document.type === "factura" || document.type === "presupuesto",
        ),
      ),
    [data.documents],
  );
  const selectedWorkDocument =
    linkableWorkDocuments.find((document) => document.id === workDocumentId) ??
    null;
  const workDocumentResults = useMemo(() => {
    const query = workDocumentQuery.trim();
    const source = query
      ? filterDocumentsByQuery(linkableWorkDocuments, query, { vatExempt })
      : linkableWorkDocuments;
    return source.slice(0, 6);
  }, [linkableWorkDocuments, vatExempt, workDocumentQuery]);

  function updatePurchaseDocument(patch: Partial<ExpensePurchaseDocument>) {
    setPurchaseDocument((prev) => ({ ...prev, ...patch }));
  }

  const duplicateExpense = useMemo(() => {
    const invoiceNumber = purchaseDocument.invoiceNumber?.trim().toLowerCase();
    if (!invoiceNumber) return null;
    const nif = purchaseDocument.supplierNif?.trim().toLowerCase();
    const supplier = supplierName.trim().toLowerCase();

    return (
      data.expenses.find((expense) => {
        if (editingExpense && expense.id === editingExpense.id) return false;
        const documentNumber =
          expense.purchaseDocument?.invoiceNumber?.trim().toLowerCase();
        if (!documentNumber || documentNumber !== invoiceNumber) return false;

        const expenseNif =
          expense.purchaseDocument?.supplierNif?.trim().toLowerCase();
        if (nif && expenseNif && nif === expenseNif) return true;

        return Boolean(
          supplier &&
            expense.supplierName.trim().toLowerCase() === supplier,
        );
      }) ?? null
    );
  }, [
    data.expenses,
    editingExpense,
    purchaseDocument.invoiceNumber,
    purchaseDocument.supplierNif,
    supplierName,
  ]);

  const priceAlerts = useMemo(
    () =>
      findExpensePurchaseLinePriceAlerts({
        currentLines: purchaseLines,
        expenses: data.expenses,
        supplierId: selectedSupplierId ?? undefined,
        supplierName,
        excludeExpenseId: editingExpense?.id,
      }),
    [
      data.expenses,
      editingExpense?.id,
      purchaseLines,
      selectedSupplierId,
      supplierName,
    ],
  );

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

    if (duplicateExpense) {
      alert(
        `Esta factura de proveedor ya está registrada como «${duplicateExpense.description}».`,
      );
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

    const cleanedPurchaseLines = sanitizeExpensePurchaseLines(purchaseLines);
    const cleanedPurchaseDocument =
      sanitizeExpensePurchaseDocument(purchaseDocument);
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
      purchaseDocument: cleanedPurchaseDocument,
      purchaseLines:
        cleanedPurchaseLines.length > 0 ? cleanedPurchaseLines : undefined,
      workDocumentId: workDocumentId || undefined,
      origin: expenseOrigin,
      businessKind,
    };

    if (editingExpense) {
      updateExpense({
        ...editingExpense,
        ...payload,
      });
    } else {
      addExpense(payload);
    }

    if (!editingExpense && pendingScans.length > 0) {
      const [next, ...rest] = pendingScans;
      setPendingScans(rest);
      fillFormFromScan(next.payload, next.fileName);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
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
        {pendingScans.length > 0 && (
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Quedan {pendingScans.length} archivo(s) escaneados pendientes. Al
            guardar este gasto se cargará el siguiente para revisar.
          </p>
        )}
        {duplicateExpense && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Esta factura de proveedor parece ya registrada:{" "}
            <strong>{duplicateExpense.description}</strong>. Cambia el número si
            no corresponde o evita guardarla de nuevo.
          </p>
        )}
        {priceAlerts.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Revisa precios o descuentos</p>
            <ul className="mt-2 space-y-1">
              {priceAlerts.map((alert) => (
                <li key={alert.lineId}>
                  <strong>{alert.description}</strong>: ahora{" "}
                  {formatMoney(alert.currentUnitPrice)}, antes{" "}
                  {formatMoney(alert.previousUnitPrice)}
                  {Math.abs(alert.priceChangePercent) >= 15
                    ? ` (${alert.priceChangePercent > 0 ? "sube" : "baja"} ${Math.abs(alert.priceChangePercent)}%)`
                    : ""}
                  {Math.abs(alert.discountChangePoints) >= 5
                    ? ` · descuento ${alert.previousDiscountPercent}% → ${alert.currentDiscountPercent}%`
                    : ""}
                  . Última referencia: {alert.previousExpenseDescription},{" "}
                  {alert.previousExpenseDate}.
                </li>
              ))}
            </ul>
          </div>
        )}
        <Card className="space-y-5">
          <FormSection
            variant="fields"
            title="Tipo de gasto"
            hint="La app lo usa para separar compras, facturas recibidas, tickets y fijos. Puedes corregirlo antes de guardar."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPENSE_BUSINESS_KIND_OPTIONS.map((option) => {
                const selected = businessKind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setBusinessKind(option.value)}
                    aria-pressed={selected}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      selected
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-bold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              {expenseBusinessKindHint(businessKind)}
            </p>
          </FormSection>

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
            title="Datos de factura del proveedor"
            hint="Opcional. Se rellena al escanear y ayuda a evitar duplicados, buscar compras y preparar avisos."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nº factura proveedor">
                <Input
                  value={purchaseDocument.invoiceNumber ?? ""}
                  onChange={(e) =>
                    updatePurchaseDocument({ invoiceNumber: e.target.value })
                  }
                  placeholder="Ej: FD-224572"
                />
              </Field>
              <Field label="NIF/CIF proveedor">
                <Input
                  value={purchaseDocument.supplierNif ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    updatePurchaseDocument({ supplierNif: value });
                    setSupplierNif(value || undefined);
                  }}
                  placeholder="Ej: B12345678"
                />
              </Field>
              <Field label="Fecha factura">
                <Input
                  type="date"
                  value={purchaseDocument.issueDate ?? ""}
                  onChange={(e) =>
                    updatePurchaseDocument({ issueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Vencimiento">
                <Input
                  type="date"
                  value={purchaseDocument.dueDate ?? ""}
                  onChange={(e) =>
                    updatePurchaseDocument({ dueDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Código postal">
                <Input
                  value={purchaseDocument.supplierPostalCode ?? ""}
                  onChange={(e) =>
                    updatePurchaseDocument({
                      supplierPostalCode: e.target.value,
                    })
                  }
                  placeholder="Ej: 08001"
                />
              </Field>
              <Field label="Ciudad">
                <Input
                  value={purchaseDocument.supplierCity ?? ""}
                  onChange={(e) =>
                    updatePurchaseDocument({ supplierCity: e.target.value })
                  }
                  placeholder="Ej: Barcelona"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Dirección proveedor">
                  <Input
                    value={purchaseDocument.supplierAddress ?? ""}
                    onChange={(e) =>
                      updatePurchaseDocument({
                        supplierAddress: e.target.value,
                      })
                    }
                    placeholder="Calle, número..."
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Condiciones de pago">
                  <Input
                    value={purchaseDocument.paymentTerms ?? ""}
                    onChange={(e) =>
                      updatePurchaseDocument({ paymentTerms: e.target.value })
                    }
                    placeholder="Ej: Transferencia 30 días"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection
            variant="search"
            title="Trabajo relacionado"
            hint="Opcional. Vincula esta compra a una factura o presupuesto para controlar el margen real del trabajo."
          >
            {selectedWorkDocument ? (
              <div className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-bold">
                  {selectedWorkDocument.type === "factura"
                    ? "Factura"
                    : "Presupuesto"}{" "}
                  {documentShortNumber(selectedWorkDocument)} ·{" "}
                  {selectedWorkDocument.client.name}
                </span>
                <button
                  type="button"
                  onClick={() => setWorkDocumentId("")}
                  className="self-start rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 sm:self-auto"
                >
                  Quitar vínculo
                </button>
              </div>
            ) : null}
            <Field label="Buscar factura o presupuesto">
              <Input
                value={workDocumentQuery}
                onChange={(event) => setWorkDocumentQuery(event.target.value)}
                placeholder="Número, cliente o importe..."
              />
            </Field>
            <div className="space-y-2">
              {workDocumentResults.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  No hay documentos que coincidan.
                </p>
              ) : (
                workDocumentResults.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => {
                      setWorkDocumentId(document.id);
                      setWorkDocumentQuery("");
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      document.id === workDocumentId
                        ? "border-blue-300 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span>
                      <span className="block font-bold">
                        {document.type === "factura"
                          ? "Factura"
                          : "Presupuesto"}{" "}
                        {documentShortNumber(document)}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {document.client.name} · {formatMoney(
                          document.items.reduce(
                            (sum, item) =>
                              sum +
                              item.quantity *
                                item.unitPrice *
                                (1 + item.ivaPercent / 100),
                            0,
                          ),
                        )}
                      </span>
                    </span>
                    {document.id === workDocumentId ? (
                      <span className="text-xs font-bold text-blue-700">
                        Vinculado
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
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

          <FormSection
            variant="fields"
            title="Líneas de compra"
            hint="Opcional. Sirve para recordar precios de materiales o servicios que se repiten."
          >
            <div className="space-y-3">
              {purchaseLines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Si el escaneo detecta líneas, aparecerán aquí. También puedes
                  añadirlas a mano.
                </div>
              ) : (
                purchaseLines.map((line, index) => (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Línea {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseLines((prev) =>
                            prev.filter((entry) => entry.id !== line.id),
                          )
                        }
                        className="text-sm font-semibold text-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-[minmax(14rem,1fr)_5.5rem_5rem_7.5rem_6rem_6rem] xl:items-start">
                      <div className="col-span-2 xl:col-span-1">
                        <Field label="Producto o servicio">
                          <Input
                            value={line.description}
                            onChange={(e) =>
                              updatePurchaseLine(line.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Ej: Lama persiana"
                          />
                        </Field>
                      </div>
                      <Field label="Cant.">
                        <NumericFieldInput
                          value={line.quantity}
                          onChange={(quantity) =>
                            updatePurchaseLine(line.id, { quantity })
                          }
                        />
                      </Field>
                      <Field label="Ud.">
                        <Input
                          value={line.unit ?? ""}
                          onChange={(e) =>
                            updatePurchaseLine(line.id, {
                              unit: e.target.value,
                            })
                          }
                          placeholder="ud"
                        />
                      </Field>
                      <Field label="Precio">
                        <NumericFieldInput
                          value={line.unitPrice}
                          onChange={(unitPrice) =>
                            updatePurchaseLine(line.id, {
                              unitPrice,
                              total: undefined,
                            })
                          }
                        />
                      </Field>
                      <Field label="Dto. %">
                        <NumericFieldInput
                          value={line.discountPercent ?? 0}
                          onChange={(discountPercent) =>
                            updatePurchaseLine(line.id, { discountPercent })
                          }
                        />
                      </Field>
                      <Field label="IVA">
                        <NumericFieldInput
                          value={line.ivaPercent ?? ivaPercent}
                          onChange={(lineIva) =>
                            updatePurchaseLine(line.id, {
                              ivaPercent: lineIva,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <p className="mt-3 text-right text-sm font-bold text-slate-700">
                      Base línea: {formatMoney(expensePurchaseLineBaseTotal(line))}
                    </p>
                  </div>
                ))
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addPurchaseLine}
                  className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700"
                >
                  + Añadir línea
                </button>
                {purchaseLinesBaseTotal > 0 && (
                  <>
                    <p className="text-sm font-semibold text-slate-600">
                      Base líneas: {formatMoney(purchaseLinesBaseTotal)}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setAmountText(decimalInputFromNumber(purchaseLinesBaseTotal))
                      }
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white"
                    >
                      Usar como importe
                    </button>
                  </>
                )}
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
