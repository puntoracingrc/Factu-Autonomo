"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import {
  Check,
  ChevronDown,
  EyeOff,
  GripVertical,
  ListChecks,
  Link2,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { ExpensePurchaseLinesPreview } from "@/components/expenses/ExpensePurchaseLinesPreview";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate, roundMoney } from "@/lib/calculations";
import {
  documentDetailPath,
  documentShortNumber,
  findQuoteLinkedToInvoice,
  getDocumentChainItems,
  linkableDocuments,
} from "@/lib/document-links";
import { filterDocumentsByQuery } from "@/lib/documents";
import { uniqueSupplierOptions } from "@/lib/expense-filters";
import {
  expenseFiscalAmounts,
  expensePurchaseLineBaseTotal,
} from "@/lib/expenses";
import { showFactuToast } from "@/lib/factu/occasional";
import { purchaseProductCatalogKeys } from "@/lib/purchase-products";
import {
  buildExpenseLinkImpact,
  buildExpenseUnlinkImpact,
  canLinkExpenseToWork,
  createExpenseWorkDocumentUnlinkPayload,
  createExpenseWorkDocumentUpdatePayload,
  filterAndSortExpenseLinkCandidates,
  getAlreadyLinkedExpensesForWork,
  getExpenseCostAllocationsForWork,
  getExpenseLinkCandidatesForWork,
  getExpenseLineExclusionsForWork,
  getHiddenExpenseCandidateIdsForWork,
  hideExpenseCandidateForWork,
  restoreAllExpenseCandidatesForWork,
  setExpenseCostAllocationForWork,
  setExpenseLineExclusionsForWork,
  type ExpenseCostAllocationsByExpenseId,
  type ExpenseLineExclusionsByExpenseId,
  type RentabilidadRealExpenseLinkCandidate,
} from "@/lib/rentabilidad-real/expense-linking";
import { isVatExempt } from "@/lib/vat-regime";
import type { Document, Expense } from "@/lib/types";
import { DocumentRelationshipFlow } from "./DocumentRelationshipFlow";

type RelationshipTab = "presupuesto" | "recibo" | "gastos";

const EXPENSE_DRAG_TYPE = "application/x-factu-expense-id";
const EXPENSE_PAGE_SIZE = 10;

function confirmationText(
  message: string,
  warnings: { message: string }[],
): string {
  const uniqueWarnings = warnings
    .map((warning) => warning.message)
    .filter((warning, index, all) => all.indexOf(warning) === index)
    .join("\n");
  return uniqueWarnings ? `${message}\n\n${uniqueWarnings}` : message;
}

function relatedWorkDocumentIds(
  doc: Document,
  documents: Document[],
  expenses: ReturnType<typeof useAppStore>["data"]["expenses"],
): string[] {
  const ids = getDocumentChainItems(doc, documents, expenses)
    .filter(
      (item) =>
        item.document &&
        (item.role === "factura" ||
          item.role === "rectificativa" ||
          item.role === "presupuesto"),
    )
    .map((item) => item.document!.id);
  return [...new Set([doc.id, ...ids])];
}

export function InvoiceRelationshipWorkspace({
  doc,
  quoteLinkEditable,
  onClose,
  onExpenseAllocationsChange,
}: {
  doc: Document;
  quoteLinkEditable: boolean;
  onClose: () => void;
  onExpenseAllocationsChange?: (
    allocations: ExpenseCostAllocationsByExpenseId,
  ) => void;
}) {
  const { data, updateDocumentLink, updateExpense } = useAppStore();
  const vatExempt = isVatExempt(data.profile);
  const [activeTab, setActiveTab] = useState<RelationshipTab>("gastos");
  const linkedQuote = findQuoteLinkedToInvoice(data.documents, doc);
  const [quoteId, setQuoteId] = useState(linkedQuote?.id ?? "");
  const [quoteQuery, setQuoteQuery] = useState("");
  const [expenseQuery, setExpenseQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [visibleExpenseLimit, setVisibleExpenseLimit] =
    useState(EXPENSE_PAGE_SIZE);
  const [dragActive, setDragActive] = useState(false);
  const [expenseAllocations, setExpenseAllocations] =
    useState<ExpenseCostAllocationsByExpenseId>({});
  const [lineExclusions, setLineExclusions] =
    useState<ExpenseLineExclusionsByExpenseId>({});
  const [hiddenExpenseIds, setHiddenExpenseIds] = useState<string[]>(() =>
    getHiddenExpenseCandidateIdsForWork(doc.id),
  );

  const chainItems = useMemo(
    () =>
      getDocumentChainItems(
        doc,
        data.documents,
        data.expenses,
        expenseAllocations,
      ),
    [data.documents, data.expenses, doc, expenseAllocations],
  );
  const workDocumentIds = useMemo(
    () => relatedWorkDocumentIds(doc, data.documents, data.expenses),
    [data.documents, data.expenses, doc],
  );
  const linkedExpenses = useMemo(
    () => getAlreadyLinkedExpensesForWork(data, workDocumentIds),
    [data, workDocumentIds],
  );
  const expenseCandidates = useMemo(
    () => getExpenseLinkCandidatesForWork(data, workDocumentIds),
    [data, workDocumentIds],
  );
  const visibleCandidates = useMemo(
    () =>
      filterAndSortExpenseLinkCandidates(expenseCandidates, {
        hiddenCandidateIds: hiddenExpenseIds,
        query: expenseQuery,
        supplierFilterKey: supplierFilter,
      }),
    [expenseCandidates, expenseQuery, hiddenExpenseIds, supplierFilter],
  );
  const pagedCandidates = visibleCandidates.slice(0, visibleExpenseLimit);
  const supplierOptions = useMemo(
    () => uniqueSupplierOptions(expenseCandidates.map((item) => item.expense)),
    [expenseCandidates],
  );
  const productKeys = useMemo(
    () => purchaseProductCatalogKeys(data.products, data.expenses),
    [data.expenses, data.products],
  );
  const receiptItem = chainItems.find((item) => item.role === "recibo");
  const quoteOptions = linkableDocuments(data.documents, "presupuesto");
  const savedQuoteId = linkedQuote?.id ?? "";
  const quoteLinkChanged = quoteId !== savedQuoteId;
  const filteredQuoteOptions = useMemo(
    () =>
      (quoteQuery.trim()
        ? filterDocumentsByQuery(quoteOptions, quoteQuery, { vatExempt })
        : quoteOptions
      ).slice(0, 10),
    [quoteOptions, quoteQuery, vatExempt],
  );

  useEffect(() => {
    setQuoteId(linkedQuote?.id ?? "");
  }, [linkedQuote?.id]);

  useEffect(() => {
    setHiddenExpenseIds(getHiddenExpenseCandidateIdsForWork(doc.id));
    setExpenseAllocations(getExpenseCostAllocationsForWork(doc.id));
    setLineExclusions(getExpenseLineExclusionsForWork(doc.id));
    setExpenseQuery("");
    setSupplierFilter(null);
    setVisibleExpenseLimit(EXPENSE_PAGE_SIZE);
  }, [doc.id]);

  function saveQuoteLink() {
    if (!quoteId || !quoteLinkChanged) return;
    updateDocumentLink({
      relation: "quote_invoice",
      invoiceId: doc.id,
      quoteId,
    });
    showFactuToast("Presupuesto vinculado.");
  }

  function linkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    if (!canLinkExpenseToWork(candidate.expense, doc.id)) {
      window.alert("Este gasto no se puede vincular como coste del trabajo.");
      return;
    }
    const impact = buildExpenseLinkImpact(candidate.expense, doc.id);
    if (!window.confirm(confirmationText(impact.message, impact.warnings))) return;
    updateExpense(
      createExpenseWorkDocumentUpdatePayload(candidate.expense, doc.id),
    );
    showFactuToast("Gasto vinculado a la factura.");
  }

  function unlinkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    const impact = buildExpenseUnlinkImpact(candidate.expense);
    if (!window.confirm(confirmationText(impact.message, impact.warnings))) return;
    updateExpense(createExpenseWorkDocumentUnlinkPayload(candidate.expense));
    showFactuToast("Vínculo del gasto eliminado. El gasto sigue intacto.");
  }

  function updateExpenseLineExclusions(
    expense: Expense,
    excludedLineIds: string[],
  ) {
    const selectableLines = (expense.purchaseLines ?? [])
      .map((line) => ({
        id: line.id,
        base: expensePurchaseLineBaseTotal(line),
      }))
      .filter((line) => line.id && line.base > 0);
    const totalLinesBase = selectableLines.reduce(
      (total, line) => total + line.base,
      0,
    );
    if (totalLinesBase <= 0) return;

    const excluded = new Set(excludedLineIds);
    const includedLinesBase = selectableLines.reduce(
      (total, line) => total + (excluded.has(line.id) ? 0 : line.base),
      0,
    );
    const fiscal = expenseFiscalAmounts(expense);
    const appliedAmount = roundMoney(
      fiscal.operatingCost * (includedLinesBase / totalLinesBase),
    );

    setLineExclusions(
      setExpenseLineExclusionsForWork(doc.id, expense.id, excludedLineIds),
    );
    const nextAllocations = setExpenseCostAllocationForWork(
      doc.id,
      expense.id,
      appliedAmount,
      fiscal.operatingCost,
    );
    setExpenseAllocations(nextAllocations);
    onExpenseAllocationsChange?.(nextAllocations);
    showFactuToast(
      "Importe del trabajo actualizado. La factura del proveedor no se ha modificado.",
    );
  }

  function handleExpenseDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const expenseId = event.dataTransfer.getData(EXPENSE_DRAG_TYPE);
    const candidate = expenseCandidates.find(
      (item) => item.expense.id === expenseId,
    );
    if (candidate) linkExpense(candidate);
  }

  return (
    <section
      className="border-t border-slate-200 pt-5 dark:border-slate-700"
      aria-label={`Vínculos de ${documentShortNumber(doc)}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <h3 className="text-lg font-black text-slate-950 dark:text-slate-50">
              Documentos y gastos vinculados
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulta la cadena del trabajo y enlaza gastos existentes sin salir
            de la factura.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="min-h-10 w-full px-3 text-sm sm:w-auto"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
          Cerrar
        </Button>
      </div>

      <div className="mt-4">
        <DocumentRelationshipFlow
          items={chainItems}
          vatExempt={vatExempt}
          onExpensesClick={() => setActiveTab("gastos")}
        />
      </div>

      <div
        className="mt-5 grid grid-cols-3 border-b border-slate-200 dark:border-slate-700"
        role="tablist"
        aria-label="Tipo de vínculo"
      >
        {(
          [
            ["presupuesto", "Presupuesto"],
            ["recibo", "Recibo"],
            ["gastos", `Gastos (${linkedExpenses.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`min-h-11 border-b-2 px-2 text-sm font-black transition-colors ${
              activeTab === key
                ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-200"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "presupuesto" ? (
        <div className="mt-4">
          {!quoteLinkEditable ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
              {linkedQuote ? (
                <>
                  El presupuesto de origen es una relación histórica y no se
                  puede cambiar ni desvincular. Puedes abrirlo desde la cadena
                  superior.
                </>
              ) : (
                <>
                  Una factura emitida no admite añadir manualmente un
                  presupuesto de origen. Los vínculos operativos posteriores
                  usarán una relación de rentabilidad separada.
                </>
              )}
            </div>
          ) : null}
          {quoteLinkEditable ? (
            <>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <Field
              label="Buscar presupuesto"
              hint="Busca por número, cliente o importe. Vincularlo no cambia el PDF emitido."
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={quoteQuery}
                  onChange={(event) => setQuoteQuery(event.target.value)}
                  placeholder="Número, cliente o importe..."
                  className="pl-10 text-sm"
                />
              </div>
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-12 text-sm"
                onClick={saveQuoteLink}
                disabled={!quoteId || !quoteLinkChanged}
              >
                <Link2 className="h-4 w-4" />
                Guardar vínculo
              </Button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filteredQuoteOptions.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No hay presupuestos que coincidan.
              </p>
            ) : (
              filteredQuoteOptions.map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => setQuoteId(quote.id)}
                  className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                    quoteId === quote.id
                      ? "border-blue-400 bg-blue-50 text-blue-950 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-100"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      {documentShortNumber(quote)} · {quote.client.name}
                    </span>
                    <span className="block text-xs opacity-70">
                      {formatShortDate(quote.date)}
                    </span>
                  </span>
                  {quoteId === quote.id ? (
                    <Check className="h-5 w-5 shrink-0 text-blue-600" />
                  ) : null}
                </button>
              ))
            )}
          </div>
            </>
          ) : null}
        </div>
      ) : null}

      {activeTab === "recibo" ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          {receiptItem?.document ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
                  <ReceiptText className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black text-slate-950 dark:text-slate-50">
                    {receiptItem.value}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Ya está vinculado a esta factura.
                  </p>
                </div>
              </div>
              <Link
                href={documentDetailPath(receiptItem.document)}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200"
              >
                Abrir recibo
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">
                  Esta factura no tiene recibo vinculado
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  El recibo aparecerá aquí automáticamente cuando lo crees desde
                  la factura. Este panel no genera recibos.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === "gastos" ? (
        <div className="mt-4 space-y-4">
          {linkedExpenses.length > 0 ? (
            <section>
              <p className="text-sm font-black text-slate-950 dark:text-slate-50">
                Ya vinculados
              </p>
              <div className="mt-2 space-y-2">
                {linkedExpenses.map((candidate) => (
                  <ExpenseRelationshipRow
                    key={candidate.expense.id}
                    candidate={candidate}
                    productKeys={productKeys}
                    linked
                    allocationAmount={
                      expenseAllocations[candidate.expense.id]
                    }
                    excludedLineIds={
                      lineExclusions[candidate.expense.id] ?? []
                    }
                    onExcludedLineIdsChange={(excludedLineIds) =>
                      updateExpenseLineExclusions(
                        candidate.expense,
                        excludedLineIds,
                      )
                    }
                    onAction={() => unlinkExpense(candidate)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <Field label="Buscar gasto o producto">
                <div className="relative min-w-0 lg:w-[28rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={expenseQuery}
                    onChange={(event) => setExpenseQuery(event.target.value)}
                    placeholder="Factura, producto, proveedor..."
                    className="pl-10 text-sm"
                  />
                </div>
              </Field>
              <Field label="Proveedor">
                <Select
                  value={supplierFilter ?? ""}
                  onChange={(event) =>
                    setSupplierFilter(event.target.value || null)
                  }
                  className="text-sm lg:w-64"
                >
                  <option value="">Todos</option>
                  {supplierOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {(expenseQuery || supplierFilter) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-12 px-3 text-sm"
                  onClick={() => {
                    setExpenseQuery("");
                    setSupplierFilter(null);
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>

            <div
              className={`mt-3 rounded-xl border border-dashed px-4 py-3 text-center text-sm font-bold transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-100"
                  : "border-slate-300 bg-slate-50 text-slate-500 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleExpenseDrop}
            >
              Haz clic en Vincular o arrastra aquí un gasto desde la lista.
            </div>

            <div className="mt-3 space-y-2">
              {pagedCandidates.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
                  No hay gastos sin vincular que coincidan con estos filtros.
                </p>
              ) : (
                pagedCandidates.map((candidate) => (
                  <ExpenseRelationshipRow
                    key={candidate.expense.id}
                    candidate={candidate}
                    productKeys={productKeys}
                    draggable
                    onAction={() => linkExpense(candidate)}
                    onHide={() => {
                      setHiddenExpenseIds(
                        hideExpenseCandidateForWork(doc.id, candidate.expense.id),
                      );
                      showFactuToast(
                        "Gasto ocultado solo para esta factura. Sigue intacto en Gastos.",
                      );
                    }}
                  />
                ))
              )}
            </div>

            {visibleCandidates.length > pagedCandidates.length ? (
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 px-4 text-sm"
                  onClick={() =>
                    setVisibleExpenseLimit(
                      (current) => current + EXPENSE_PAGE_SIZE,
                    )
                  }
                >
                  <ChevronDown className="h-4 w-4" />
                  Cargar más
                </Button>
              </div>
            ) : null}

            {hiddenExpenseIds.length > 0 ? (
              <button
                type="button"
                className="mt-3 text-sm font-bold text-blue-700 hover:underline dark:text-blue-300"
                onClick={() => {
                  setHiddenExpenseIds(restoreAllExpenseCandidatesForWork(doc.id));
                  showFactuToast("Gastos ocultos recuperados.");
                }}
              >
                Recuperar {hiddenExpenseIds.length} gasto(s) oculto(s)
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

function ExpenseRelationshipRow({
  candidate,
  productKeys,
  linked = false,
  draggable = false,
  allocationAmount,
  excludedLineIds = [],
  onExcludedLineIdsChange,
  onAction,
  onHide,
}: {
  candidate: RentabilidadRealExpenseLinkCandidate;
  productKeys: Set<string>;
  linked?: boolean;
  draggable?: boolean;
  allocationAmount?: number;
  excludedLineIds?: string[];
  onExcludedLineIdsChange?: (excludedLineIds: string[]) => void;
  onAction: () => void;
  onHide?: () => void;
}) {
  const expense = candidate.expense;
  const fiscal = expenseFiscalAmounts(expense);
  const reference = expense.purchaseDocument?.invoiceNumber;

  return (
    <article
      draggable={draggable}
      onDragStart={(event) => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(EXPENSE_DRAG_TYPE, expense.id);
      }}
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[minmax(12rem,1.1fr)_minmax(12rem,1.2fr)_7rem_auto] lg:items-center"
    >
      <div className="flex min-w-0 items-start gap-2">
        {draggable ? (
          <GripVertical
            aria-hidden
            className="mt-0.5 hidden h-5 w-5 shrink-0 cursor-grab text-slate-300 lg:block"
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950 dark:text-slate-50">
            {expense.description || expense.supplierName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {expense.supplierName} · {formatShortDate(expense.date)}
            {reference ? ` · ${reference}` : ""}
          </p>
        </div>
      </div>
      <ExpensePurchaseLinesPreview
        expense={expense}
        productKeys={productKeys}
        emptyLabel={expense.category || "Sin líneas de producto"}
      />
      <div>
        <p className="text-sm font-black text-slate-950 dark:text-slate-50">
          {formatMoney(fiscal.registeredTotal)}
        </p>
        <p className="text-xs text-slate-400">IVA incl.</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {linked ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-200"
            aria-label={`Desvincular ${expense.description || expense.supplierName}`}
            title="Desvincular; no borra el gasto"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <Button
            type="button"
            className="min-h-10 px-3 text-sm"
            onClick={onAction}
          >
            <Link2 className="h-4 w-4" />
            Vincular
          </Button>
        )}
        {!linked && onHide ? (
          <Button
            type="button"
            variant="ghost"
            className="min-h-10 px-3 text-sm"
            onClick={onHide}
            title="Ocultar solo de los candidatos de esta factura"
          >
            <EyeOff className="h-4 w-4" />
            Ocultar
          </Button>
        ) : null}
      </div>
      {linked && onExcludedLineIdsChange ? (
        <div className="lg:col-span-4">
          <ExpenseLineAllocationEditor
            expense={expense}
            allocationAmount={allocationAmount}
            excludedLineIds={excludedLineIds}
            onExcludedLineIdsChange={onExcludedLineIdsChange}
          />
        </div>
      ) : null}
    </article>
  );
}

function ExpenseLineAllocationEditor({
  expense,
  allocationAmount,
  excludedLineIds,
  onExcludedLineIdsChange,
}: {
  expense: Expense;
  allocationAmount?: number;
  excludedLineIds: string[];
  onExcludedLineIdsChange: (excludedLineIds: string[]) => void;
}) {
  const [open, setOpen] = useState(excludedLineIds.length > 0);
  const fiscal = expenseFiscalAmounts(expense);
  const lines = (expense.purchaseLines ?? [])
    .map((line) => ({
      id: line.id,
      description: line.description.trim(),
      base: expensePurchaseLineBaseTotal(line),
    }))
    .filter((line) => line.id && line.description && line.base > 0);

  useEffect(() => {
    if (excludedLineIds.length > 0) setOpen(true);
  }, [excludedLineIds.length]);

  if (lines.length === 0) return null;

  const excluded = new Set(excludedLineIds);
  const appliedAmount = allocationAmount ?? fiscal.operatingCost;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/25">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-slate-50">
            Aplicado a este trabajo: {formatMoney(appliedAmount)} de{" "}
            {formatMoney(fiscal.operatingCost)}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
            Solo cambia la rentabilidad de este trabajo. No elimina ni modifica
            líneas de la factura del proveedor.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-10 px-3 text-sm"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
        >
          <ListChecks className="h-4 w-4" />
          {open ? "Ocultar líneas" : "Elegir líneas"}
        </Button>
      </div>

      {open ? (
        <div className="mt-3 space-y-2 border-t border-blue-100 pt-3 dark:border-blue-900">
          {lines.map((line) => {
            const included = !excluded.has(line.id);
            return (
              <label
                key={line.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  included
                    ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100"
                    : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => {
                    const nextExcluded = included
                      ? [...excludedLineIds, line.id]
                      : excludedLineIds.filter((lineId) => lineId !== line.id);
                    onExcludedLineIdsChange(nextExcluded);
                  }}
                  className="h-5 w-5 shrink-0 accent-amber-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{line.description}</span>
                  <span className="mt-0.5 block text-xs font-bold">
                    {included
                      ? "Incluida en este trabajo"
                      : "Fuera del cálculo de este trabajo"}
                  </span>
                </span>
                <span className="shrink-0 font-black">
                  {formatMoney(line.base)}
                </span>
              </label>
            );
          })}
          {excludedLineIds.length > 0 ? (
            <button
              type="button"
              onClick={() => onExcludedLineIdsChange([])}
              className="text-sm font-black text-blue-700 hover:underline dark:text-blue-300"
            >
              Volver a aplicar todas las líneas
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
