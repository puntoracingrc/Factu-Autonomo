"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  EyeOff,
  Link2,
  RotateCcw,
  Search,
  Unlink,
} from "lucide-react";
import { ExpensePurchaseLinesPreview } from "@/components/expenses/ExpensePurchaseLinesPreview";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  decimalInputFromNumber,
  parseDecimalInput,
  sanitizeDecimalTyping,
} from "@/lib/decimal-input";
import { uniqueSupplierOptions } from "@/lib/expense-filters";
import { expenseFiscalAmounts } from "@/lib/expenses";
import { purchaseProductCatalogKeys } from "@/lib/purchase-products";
import {
  buildExpenseLinkImpact,
  buildExpenseUnlinkImpact,
  canLinkExpenseToWork,
  createExpenseWorkDocumentUnlinkPayload,
  createExpenseWorkDocumentUpdatePayload,
  filterAndSortExpenseLinkCandidates,
  groupExpenseLinkCandidatesByMonth,
  getHiddenExpenseCandidateIdsForWork,
  hideExpenseCandidateForWork,
  restoreAllExpenseCandidatesForWork,
  restoreExpenseCandidateForWork,
  setExpenseCostAllocationForWork,
  clearExpenseCostAllocationForWork,
  sortExpenseLinkCandidatesByDateDesc,
  type ExpenseCostAllocationsByExpenseId,
  type RentabilidadRealExpenseLinkCandidate,
} from "@/lib/rentabilidad-real/expense-linking";
import type { RentabilidadRealWorkProfitabilityInput } from "@/lib/rentabilidad-real/calculation";
import type { Expense } from "@/lib/types";

function originLabel(expense: Expense): string {
  if (expense.origin === "scan") return "escaneo IA";
  if (expense.origin === "import") return "importado";
  if (expense.origin === "recurring") return "recurrente";
  return "manual";
}

function confirmationText(
  message: string,
  warnings: { message: string }[],
): string {
  const relevantWarnings = warnings
    .map((warning) => warning.message)
    .filter((warning, index, list) => list.indexOf(warning) === index)
    .join("\n");
  return relevantWarnings ? `${message}\n\n${relevantWarnings}` : message;
}

const EMPTY_EXPENSE_LINK_CANDIDATES: RentabilidadRealExpenseLinkCandidate[] = [];
const CANDIDATE_PAGE_SIZE = 10;

export function WorkExpenseLinkingPanel({
  profitabilityInput,
  directCostAmountOverrides,
  onDirectCostAmountOverridesChange,
}: {
  profitabilityInput: RentabilidadRealWorkProfitabilityInput;
  directCostAmountOverrides: ExpenseCostAllocationsByExpenseId;
  onDirectCostAmountOverridesChange: (
    allocations: ExpenseCostAllocationsByExpenseId,
  ) => void;
}) {
  const { data, updateExpense } = useAppStore();
  const [notice, setNotice] = useState<string | null>(null);
  const targetDocumentId = profitabilityInput.source.sourceDocumentId;
  const linkedExpenses =
    profitabilityInput.linkedExpenses ?? EMPTY_EXPENSE_LINK_CANDIDATES;
  const candidates =
    profitabilityInput.candidateUnlinkedExpenses ?? EMPTY_EXPENSE_LINK_CANDIDATES;
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateSupplierFilter, setCandidateSupplierFilter] = useState<
    string | null
  >(null);
  const [hiddenCandidateIds, setHiddenCandidateIds] = useState<string[]>(() =>
    getHiddenExpenseCandidateIdsForWork(targetDocumentId),
  );
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [visibleCandidateLimit, setVisibleCandidateLimit] =
    useState(CANDIDATE_PAGE_SIZE);
  const productKeys = useMemo(
    () => purchaseProductCatalogKeys(data.products, data.expenses),
    [data.expenses, data.products],
  );
  const sortedLinkedExpenses = useMemo(
    () => sortExpenseLinkCandidatesByDateDesc(linkedExpenses),
    [linkedExpenses],
  );
  const visibleCandidatesWithoutFilters = useMemo(
    () =>
      filterAndSortExpenseLinkCandidates(candidates, {
        hiddenCandidateIds,
      }),
    [candidates, hiddenCandidateIds],
  );
  const visibleCandidates = useMemo(
    () =>
      filterAndSortExpenseLinkCandidates(candidates, {
        hiddenCandidateIds,
        query: candidateSearch,
        supplierFilterKey: candidateSupplierFilter,
      }),
    [candidateSearch, candidateSupplierFilter, candidates, hiddenCandidateIds],
  );
  const pagedVisibleCandidates = useMemo(
    () => visibleCandidates.slice(0, visibleCandidateLimit),
    [visibleCandidates, visibleCandidateLimit],
  );
  const visibleCandidateGroups = useMemo(
    () => groupExpenseLinkCandidatesByMonth(pagedVisibleCandidates),
    [pagedVisibleCandidates],
  );
  const supplierOptions = useMemo(
    () =>
      uniqueSupplierOptions(
        visibleCandidatesWithoutFilters.map((candidate) => candidate.expense),
      ),
    [visibleCandidatesWithoutFilters],
  );
  const hiddenCandidates = useMemo(
    () =>
      sortExpenseLinkCandidatesByDateDesc(
        candidates.filter((candidate) =>
          hiddenCandidateIds.includes(candidate.expense.id),
        ),
      ),
    [candidates, hiddenCandidateIds],
  );
  const remainingVisibleCandidateCount = Math.max(
    visibleCandidates.length - pagedVisibleCandidates.length,
    0,
  );
  const visibleCandidateCountLabel =
    visibleCandidates.length === 0
      ? "Sin gastos visibles"
      : `Mostrando ${pagedVisibleCandidates.length} de ${visibleCandidates.length}`;

  useEffect(() => {
    setHiddenCandidateIds(getHiddenExpenseCandidateIdsForWork(targetDocumentId));
    setCandidateSearch("");
    setCandidateSupplierFilter(null);
    setPanelCollapsed(false);
    setVisibleCandidateLimit(CANDIDATE_PAGE_SIZE);
  }, [targetDocumentId]);

  useEffect(() => {
    setVisibleCandidateLimit(CANDIDATE_PAGE_SIZE);
  }, [candidateSearch, candidateSupplierFilter]);

  function linkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    const expense = candidate.expense;
    const impact = buildExpenseLinkImpact(expense, targetDocumentId);
    if (!canLinkExpenseToWork(expense, targetDocumentId)) {
      window.alert(
        "Este gasto no se puede asignar como coste directo desde esta calculadora.",
      );
      return;
    }
    const confirmed = window.confirm(
      confirmationText(impact.message, impact.warnings),
    );
    if (!confirmed) return;

    updateExpense(createExpenseWorkDocumentUpdatePayload(expense, targetDocumentId));
    setNotice("El cálculo se ha actualizado usando tus gastos existentes.");
  }

  function unlinkExpense(candidate: RentabilidadRealExpenseLinkCandidate) {
    const expense = candidate.expense;
    const impact = buildExpenseUnlinkImpact(expense);
    const confirmed = window.confirm(
      confirmationText(impact.message, impact.warnings),
    );
    if (!confirmed) return;

    updateExpense(createExpenseWorkDocumentUnlinkPayload(expense));
    setNotice("El cálculo se ha actualizado usando tus gastos existentes.");
  }

  function hideCandidate(candidate: RentabilidadRealExpenseLinkCandidate) {
    const nextIds = hideExpenseCandidateForWork(
      targetDocumentId,
      candidate.expense.id,
    );
    setHiddenCandidateIds(nextIds);
    setNotice(
      "Gasto ocultado de esta lista. El gasto sigue intacto en Gastos.",
    );
  }

  function restoreCandidate(candidate: RentabilidadRealExpenseLinkCandidate) {
    const nextIds = restoreExpenseCandidateForWork(
      targetDocumentId,
      candidate.expense.id,
    );
    setHiddenCandidateIds(nextIds);
    setNotice("Gasto recuperado en la lista de candidatos.");
  }

  function restoreAllCandidates() {
    setHiddenCandidateIds(restoreAllExpenseCandidatesForWork(targetDocumentId));
    setNotice("Candidatos ocultos recuperados.");
  }

  function setAppliedAmount(expense: Expense, amount: number) {
    const fiscal = expenseFiscalAmounts(expense);
    const nextAllocations = setExpenseCostAllocationForWork(
      targetDocumentId,
      expense.id,
      amount,
      fiscal.operatingCost,
    );
    onDirectCostAmountOverridesChange(nextAllocations);
  }

  function resetAppliedAmount(expense: Expense) {
    const nextAllocations = clearExpenseCostAllocationForWork(
      targetDocumentId,
      expense.id,
    );
    onDirectCostAmountOverridesChange(nextAllocations);
  }

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
            Gastos del trabajo
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Asigna gastos existentes al documento seleccionado. No se crea
            ningún gasto nuevo ni se cambian importes, IVA o proveedor.
          </p>
        </div>
        <Button
          type="button"
          variant={panelCollapsed ? "secondary" : "ghost"}
          className="min-h-10 w-full px-3 text-sm sm:w-auto"
          onClick={() => setPanelCollapsed((current) => !current)}
        >
          {panelCollapsed ? (
            <>
              <Search className="h-4 w-4" />
              Revisar gastos
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Listo, plegar gastos
            </>
          )}
        </Button>
      </div>

      {notice ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-100">
          {notice}
        </div>
      ) : null}

      {panelCollapsed ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/35">
          <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">
            Gastos plegados
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-100/90">
            Hay {sortedLinkedExpenses.length} gasto(s) enlazado(s) a este
            trabajo. Puedes reabrir la lista si necesitas buscar o añadir más.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos ya enlazados
          </h3>
          <div className="mt-3 space-y-3">
            {sortedLinkedExpenses.length === 0 ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-100">
                No hay gastos enlazados a este trabajo.
              </p>
            ) : (
              sortedLinkedExpenses.map((candidate) => (
                <ExpenseRow
                  key={candidate.expense.id}
                  candidate={candidate}
                  productKeys={productKeys}
                  allocationAmount={
                    directCostAmountOverrides[candidate.expense.id]
                  }
                  onAllocationAmountChange={(amount) =>
                    setAppliedAmount(candidate.expense, amount)
                  }
                  onAllocationAmountReset={() =>
                    resetAppliedAmount(candidate.expense)
                  }
                  action={
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-10 px-3 text-sm"
                      onClick={() => unlinkExpense(candidate)}
                    >
                      <Unlink className="h-4 w-4" />
                      Desvincular
                    </Button>
                  }
                />
              ))
            )}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">
            Gastos candidatos sin enlazar
          </h3>
          {candidates.length > 0 ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <Field
                  label="Buscar producto o línea"
                  hint="Busca por descripción de línea, referencia, factura, proveedor o categoría."
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={candidateSearch}
                      onChange={(event) => setCandidateSearch(event.target.value)}
                      placeholder="Ej. motor, canal, aluminio..."
                      className="pl-10 text-sm"
                    />
                  </div>
                </Field>
                <Field label="Proveedor">
                  <Select
                    value={candidateSupplierFilter ?? ""}
                    onChange={(event) =>
                      setCandidateSupplierFilter(event.target.value || null)
                    }
                    className="text-sm"
                  >
                    <option value="">Todos los proveedores</option>
                    {supplierOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Más recientes primero · {visibleCandidateCountLabel}</span>
                {(candidateSearch || candidateSupplierFilter) && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setCandidateSearch("");
                      setCandidateSupplierFilter(null);
                    }}
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          ) : null}
          <div className="mt-3 space-y-3">
            {candidates.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                No hay gastos candidatos sin enlazar.
              </p>
            ) : visibleCandidatesWithoutFilters.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                No hay gastos candidatos visibles. Puedes recuperar los ocultos
                desde el bloque inferior.
              </p>
            ) : visibleCandidates.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                No hay gastos que coincidan con la búsqueda o el proveedor
                seleccionado.
              </p>
            ) : (
              visibleCandidateGroups.map((group) => (
                <div key={group.key} className="space-y-3">
                  <TimelineMonthDivider label={group.label} />
                  {group.candidates.map((candidate) => (
                    <ExpenseRow
                      key={candidate.expense.id}
                      candidate={candidate}
                      productKeys={productKeys}
                      action={
                        <div className="flex flex-col gap-2 sm:items-end">
                          <Button
                            type="button"
                            className="min-h-10 px-3 text-sm"
                            onClick={() => linkExpense(candidate)}
                          >
                            <Link2 className="h-4 w-4" />
                            Asignar a este trabajo
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="min-h-10 px-3 text-sm text-slate-600 dark:text-slate-200"
                            onClick={() => hideCandidate(candidate)}
                          >
                            <EyeOff className="h-4 w-4" />
                            Ocultar de esta lista
                          </Button>
                        </div>
                      }
                    />
                  ))}
                </div>
              ))
            )}
          </div>
          {remainingVisibleCandidateCount > 0 ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 w-full px-4 text-sm sm:w-auto"
                onClick={() =>
                  setVisibleCandidateLimit(
                    (current) => current + CANDIDATE_PAGE_SIZE,
                  )
                }
              >
                <ChevronDown className="h-4 w-4" />
                Cargar{" "}
                {Math.min(CANDIDATE_PAGE_SIZE, remainingVisibleCandidateCount)}{" "}
                más
              </Button>
            </div>
          ) : null}
          {hiddenCandidates.length > 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-slate-50">
                    {hiddenCandidates.length} gasto(s) oculto(s) en esta lista
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Solo se ocultan aquí. Siguen existiendo en Gastos y no se
                    enlazan al trabajo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 px-3 text-sm"
                  onClick={restoreAllCandidates}
                >
                  <RotateCcw className="h-4 w-4" />
                  Mostrar todos
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {hiddenCandidates.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.expense.id}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                    onClick={() => restoreCandidate(candidate)}
                    title="Volver a mostrar este gasto candidato"
                  >
                    {candidate.expense.supplierName || candidate.expense.description}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        </div>
      )}
    </Card>
  );
}

function ExpenseRow({
  candidate,
  action,
  productKeys,
  allocationAmount,
  onAllocationAmountChange,
  onAllocationAmountReset,
}: {
  candidate: RentabilidadRealExpenseLinkCandidate;
  action: ReactNode;
  productKeys: Set<string>;
  allocationAmount?: number;
  onAllocationAmountChange?: (amount: number) => void;
  onAllocationAmountReset?: () => void;
}) {
  const expense = candidate.expense;
  const fiscal = expenseFiscalAmounts(expense);
  const appliedAmount = allocationAmount ?? fiscal.operatingCost;
  const hasPartialAllocation =
    allocationAmount !== undefined && allocationAmount < fiscal.operatingCost;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-black text-slate-950 dark:text-slate-50">
            {expense.supplierName}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {formatShortDate(expense.date)} · {expense.category} ·{" "}
            {originLabel(expense)}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Base registrada {formatMoney(fiscal.registeredBase)} · IVA
            registrado {formatMoney(fiscal.registeredIva)} · Total registrado{" "}
            {formatMoney(fiscal.registeredTotal)}
          </p>
          {!fiscal.deductible ? (
            <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              No deducible: reduce la rentabilidad por su coste completo, pero
              su base e IVA fiscalmente deducibles siguen en 0.
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {candidate.suggestedReason}
          </p>
          <div className="mt-3">
            <ExpensePurchaseLinesPreview
              expense={expense}
              productKeys={productKeys}
              emptyLabel="Sin líneas detectadas en este gasto"
            />
          </div>
          {onAllocationAmountChange ? (
            <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                    Importe aplicado a este trabajo
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-950"
                    value={decimalInputFromNumber(appliedAmount)}
                    onChange={(event) =>
                      onAllocationAmountChange(
                        parseDecimalInput(
                          sanitizeDecimalTyping(event.target.value),
                        ),
                      )
                    }
                    aria-label={`Importe aplicado de ${expense.description}`}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 px-3 text-sm"
                  onClick={onAllocationAmountReset}
                  disabled={!hasPartialAllocation}
                >
                  Aplicar todo
                </Button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Coste completo para rentabilidad:{" "}
                {formatMoney(fiscal.operatingCost)}. Si solo una parte pertenece
                a este trabajo, aplica aquí ese importe. El gasto original no se
                modifica y su asignación fiscal permanece separada.
              </p>
            </div>
          ) : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      {candidate.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {candidate.warnings.map((warning) => (
            <li key={warning.code}>- {warning.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
