"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Trash2,
  XCircle,
} from "lucide-react";
import { ExpenseAmountFields } from "@/components/expenses/ExpenseAmountFields";
import { ExpenseScanCard } from "@/components/expenses/ExpenseScanCard";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import { formatDate, formatMoney, todayISO } from "@/lib/calculations";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  filterDocumentsByQuery,
  sortDocumentsByNewest,
} from "@/lib/documents";
import { documentShortNumber } from "@/lib/document-links";
import { isVatExempt } from "@/lib/vat-regime";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/types";
import {
  detectNonExpenseDocumentReason,
  type ExpenseScanPayload,
} from "@/lib/expense-scan/schema";
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
  findDuplicatePurchaseExpense,
  findExpensePurchaseLinePriceAlerts,
  purchaseExpenseDuplicateMatches,
  sanitizeExpensePurchaseDocument,
  sanitizeExpensePurchaseLines,
} from "@/lib/expenses";
import {
  EXPENSE_BUSINESS_KIND_OPTIONS,
  expenseBusinessKindHint,
  inferExpenseBusinessKind,
} from "@/lib/expense-classification";
import { occurrenceKey } from "@/lib/recurring-expenses";
import {
  purchaseLineHasCatalogProduct,
  purchaseProductCatalogKeys,
  purchaseProductKey,
} from "@/lib/purchase-products";
import {
  isProviderSummaryPendingOriginal,
  mergeProviderSummaryWithOriginal,
} from "@/lib/provider-summary-expenses";
import type {
  Expense,
  ExpenseBusinessKind,
  ExpenseDeductibility,
  ExpensePurchaseDocument,
  ExpensePurchaseLine,
  RecurringDueTiming,
  RecurringDuration,
  RecurringExpenseFrequency,
} from "@/lib/types";
import type { ExpenseInboxItem } from "@/lib/expense-inbox";

function emptyPurchaseLine(
  partial: Partial<ExpensePurchaseLine> = {},
): ExpensePurchaseLine {
  return {
    id: crypto.randomUUID(),
    description: partial.description ?? "",
    catalogProduct: partial.catalogProduct ?? false,
    sourceQuantity: partial.sourceQuantity,
    quantity: partial.quantity ?? 1,
    chargeQuantity: partial.chargeQuantity,
    calculationBasis: partial.calculationBasis,
    unit: partial.unit ?? "ud",
    dimensionUnit: partial.dimensionUnit,
    width: partial.width,
    height: partial.height,
    length: partial.length,
    unitPrice: partial.unitPrice ?? 0,
    discountPercent: partial.discountPercent,
    netUnitPrice: partial.netUnitPrice,
    ivaPercent: partial.ivaPercent,
    total: partial.total,
    calculationFormula: partial.calculationFormula,
    calculationExpectedTotal: partial.calculationExpectedTotal,
    calculationDifference: partial.calculationDifference,
    productGroupIndex: partial.productGroupIndex,
    productRole: partial.productRole,
  };
}

interface PendingExpenseScan {
  id: string;
  payload: ExpenseScanPayload;
  fileName?: string;
}

interface ExpenseInboxItemResponse {
  item?: ExpenseInboxItem;
  error?: string;
}

type ScanReviewStatus = "ready" | "review" | "blocked";
type FixedDueKind = RecurringDueTiming["kind"];
type ScanProgress = { current: number; total: number; fileName?: string };

const FIXED_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

async function currentAuthHeaders(): Promise<HeadersInit> {
  const supabase = await getSupabaseClientAsync();
  const { data } = (await supabase?.auth.getSession()) ?? {
    data: { session: null },
  };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function NuevoGastoPage() {
  const router = useRouter();
  const {
    data,
    addExpense,
    updateExpense,
    addSupplier,
    saveFixedExpenseWithRecurringTemplate,
  } = useAppStore();

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
  const [fixedDeductibility, setFixedDeductibility] =
    useState<ExpenseDeductibility>("deductible");
  const [fixedFrequency, setFixedFrequency] =
    useState<RecurringExpenseFrequency>("monthly");
  const [fixedDueKind, setFixedDueKind] =
    useState<FixedDueKind>("end_of_month");
  const [fixedDueDay, setFixedDueDay] = useState("1");
  const [fixedDueMonth, setFixedDueMonth] = useState("1");
  const [fixedDurationKind, setFixedDurationKind] =
    useState<RecurringDuration["kind"]>("indefinite");
  const [fixedEndDate, setFixedEndDate] = useState("");
  const [fixedOccurrenceCount, setFixedOccurrenceCount] = useState("12");
  const [fixedStartDate, setFixedStartDate] = useState(todayISO());
  const [purchaseDocument, setPurchaseDocument] =
    useState<ExpensePurchaseDocument>({});
  const [purchaseLines, setPurchaseLines] = useState<ExpensePurchaseLine[]>([]);
  const [workDocumentId, setWorkDocumentId] = useState("");
  const [workDocumentQuery, setWorkDocumentQuery] = useState("");
  const [pendingScans, setPendingScans] = useState<PendingExpenseScan[]>([]);
  const [activeScanReview, setActiveScanReview] =
    useState<PendingExpenseScan | null>(null);
  const [scanFormCollapsed, setScanFormCollapsed] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const scanFormRef = useRef<HTMLDivElement | null>(null);
  const scanReviewReturnScrollY = useRef<number | null>(null);
  const [inboxItemId, setInboxItemId] = useState<string | null>(null);
  const [activeInboxItemId, setActiveInboxItemId] = useState<string | null>(null);
  const [loadedInboxItemId, setLoadedInboxItemId] = useState<string | null>(null);
  const [inboxLoadError, setInboxLoadError] = useState<string | null>(null);
  const [, setSupplierHint] = useState<string | null>(null);

  const editingExpense = useMemo(
    () =>
      editingExpenseId
        ? data.expenses.find((expense) => expense.id === editingExpenseId)
        : undefined,
    [data.expenses, editingExpenseId],
  );
  const editingRequested = Boolean(editingExpenseId);
  const editingRecurringExpense = Boolean(editingExpense?.recurringExpenseId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditingExpenseId(params.get("editar"));
    setInboxItemId(params.get("inbox"));
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
    const recurringTemplate = editingExpense.recurringExpenseId
      ? data.recurringExpenses.find(
          (item) => item.id === editingExpense.recurringExpenseId,
        )
      : undefined;
    if (recurringTemplate) {
      setFixedDeductibility(recurringTemplate.deductibility ?? "deductible");
      setFixedFrequency(recurringTemplate.frequency);
      setFixedDueKind(recurringTemplate.dueTiming.kind);
      setFixedDueDay(
        recurringTemplate.dueTiming.kind === "day_of_month"
          ? String(recurringTemplate.dueTiming.day)
          : "1",
      );
      setFixedDueMonth(String(recurringTemplate.dueMonth ?? 1));
      setFixedDurationKind(recurringTemplate.duration.kind);
      setFixedEndDate(
        recurringTemplate.duration.kind === "until_date"
          ? recurringTemplate.duration.endDate
          : "",
      );
      setFixedOccurrenceCount(
        recurringTemplate.duration.kind === "occurrences"
          ? String(recurringTemplate.duration.count)
          : "12",
      );
      setFixedStartDate(recurringTemplate.startDate);
    } else {
      setFixedDeductibility(editingExpense.deductibility ?? "deductible");
      setFixedStartDate(editingExpense.date);
    }
    setSaveSupplier(Boolean(editingExpense.supplierId));
    setSupplierHint(
      editingExpense.supplierId
        ? `Usando el proveedor guardado «${editingExpense.supplierName}».`
        : null,
    );
  }, [
    data.recurringExpenses,
    data.suppliers,
    editingExpense,
    loadedExpenseId,
    vatExempt,
  ]);

  const fillFormFromScan = useCallback((review: PendingExpenseScan) => {
    const { payload, fileName } = review;
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
    setFixedDeductibility("deductible");
    setFixedFrequency("monthly");
    setFixedDueKind("end_of_month");
    setFixedDueDay("1");
    setFixedDueMonth("1");
    setFixedDurationKind("indefinite");
    setFixedEndDate("");
    setFixedOccurrenceCount("12");
    setFixedStartDate(payload.expense.date);
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
    setActiveScanReview(review);
    setScanFormCollapsed(true);
    setScanHint(
      fileName
        ? `Datos importados de ${fileName}. Revisa importe, IVA y fecha antes de guardar.`
        : "Datos importados del escaneo. Revisa importe, IVA y fecha antes de guardar.",
    );
  }, [data.suppliers, vatExempt]);

  useEffect(() => {
    if (!inboxItemId || loadedInboxItemId === inboxItemId) return;
    let cancelled = false;

    async function loadInboxItem() {
      setInboxLoadError(null);
      try {
        const headers = await currentAuthHeaders();
        const response = await fetch(`/api/expense-inbox?id=${inboxItemId}`, {
          headers,
        });
        const body = (await response.json().catch(() => ({}))) as ExpenseInboxItemResponse;
        if (cancelled) return;

        if (!response.ok || !body.item) {
          setInboxLoadError(body.error ?? "No se pudo abrir la factura del buzón.");
          setLoadedInboxItemId(inboxItemId);
          return;
        }

        if (!body.item.scanPayload) {
          setInboxLoadError(
            body.item.scanError ??
              "Esta factura llegó al buzón, pero no se pudo leer con IA.",
          );
          setLoadedInboxItemId(inboxItemId);
          return;
        }

        fillFormFromScan({
          id: body.item.id,
          payload: body.item.scanPayload,
          fileName: body.item.attachmentFilename,
        });
        setScanFormCollapsed(false);
        setActiveInboxItemId(body.item.id);
        setLoadedInboxItemId(inboxItemId);
        setScanHint(
          `Factura recibida por email: ${body.item.attachmentFilename}. Revisa y guarda para quitarla del buzón.`,
        );
      } catch {
        if (!cancelled) {
          setInboxLoadError("No se pudo abrir la factura del buzón.");
          setLoadedInboxItemId(inboxItemId);
        }
      }
    }

    void loadInboxItem();

    return () => {
      cancelled = true;
    };
  }, [fillFormFromScan, inboxItemId, loadedInboxItemId]);

  function clearScanForm() {
    setDate(todayISO());
    setSupplierName("");
    setDescription("");
    setAmountText("");
    setIvaPercent(defaultIva);
    setCategory(EXPENSE_CATEGORIES[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setNotes("");
    setSaveSupplier(true);
    setSupplierNif(undefined);
    setSelectedSupplierId(null);
    setExpenseOrigin("manual");
    setBusinessKind("purchase");
    setFixedDeductibility("deductible");
    setFixedFrequency("monthly");
    setFixedDueKind("end_of_month");
    setFixedDueDay("1");
    setFixedDueMonth("1");
    setFixedDurationKind("indefinite");
    setFixedEndDate("");
    setFixedOccurrenceCount("12");
    setFixedStartDate(todayISO());
    setPurchaseDocument({});
    setPurchaseLines([]);
    setWorkDocumentId("");
    setWorkDocumentQuery("");
    setActiveScanReview(null);
    setScanFormCollapsed(false);
    setScanHint(null);
  }

  function applyScanResult(
    payload: ExpenseScanPayload,
    options?: { fileName?: string; append?: boolean },
  ) {
    const review: PendingExpenseScan = {
      id: crypto.randomUUID(),
      payload,
      fileName: options?.fileName,
    };

    if (options?.append) {
      setPendingScans((prev) => [...prev, review]);
      return;
    }

    fillFormFromScan(review);
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
  const productKeys = useMemo(
    () => purchaseProductCatalogKeys(data.products, data.expenses),
    [data.expenses, data.products],
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

  const expenseVatExempt =
    vatExempt ||
    (businessKind === "fixed" && fixedDeductibility === "non_deductible");

  const currentAmount = expenseTotalsFromBase(
    parseDecimalInput(amountText),
    ivaPercent,
    expenseVatExempt,
  ).base;

  function buildFixedDueTiming(): RecurringDueTiming {
    if (fixedDueKind === "start_of_month") return { kind: "start_of_month" };
    if (fixedDueKind === "mid_of_month") return { kind: "mid_of_month" };
    if (fixedDueKind === "end_of_month") return { kind: "end_of_month" };
    return {
      kind: "day_of_month",
      day: Math.min(31, Math.max(1, Number(fixedDueDay) || 1)),
    };
  }

  function buildFixedDuration(): RecurringDuration {
    if (fixedDurationKind === "until_date") {
      return { kind: "until_date", endDate: fixedEndDate || fixedStartDate };
    }
    if (fixedDurationKind === "occurrences") {
      return {
        kind: "occurrences",
        count: Math.max(1, Number(fixedOccurrenceCount) || 1),
      };
    }
    return { kind: "indefinite" };
  }

  function findDuplicateExpense(input: {
    invoiceNumber?: string;
    supplierNif?: string | null;
    supplierName?: string;
    amount?: number;
  }) {
    return findDuplicatePurchaseExpense(data.expenses, input, {
      excludeExpenseId: editingExpense?.id,
    });
  }

  const duplicateExpense = findDuplicateExpense({
    invoiceNumber: purchaseDocument.invoiceNumber,
    supplierNif: purchaseDocument.supplierNif,
    supplierName,
    amount: currentAmount,
  });
  const providerSummaryUpgradeTarget =
    duplicateExpense && isProviderSummaryPendingOriginal(duplicateExpense)
      ? duplicateExpense
      : null;
  const blockingDuplicateExpense = providerSummaryUpgradeTarget
    ? null
    : duplicateExpense;
  const duplicateExpenseNumber =
    duplicateExpense?.purchaseDocument?.invoiceNumber?.trim() || "sin número";
  const duplicateExpenseLines =
    duplicateExpense?.purchaseLines
      ?.map((line) => line.description.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(", ") || duplicateExpense?.description;
  const currentScanReviews = useMemo(
    () =>
      [activeScanReview, ...pendingScans].filter(
        (review): review is PendingExpenseScan => Boolean(review),
      ),
    [activeScanReview, pendingScans],
  );
  const showWorkDocumentSection = editingRequested || expenseOrigin !== "scan";
  const showExpenseForm = !scanFormCollapsed;

  function scrollToScanForm() {
    window.setTimeout(() => {
      scanFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  }

  function restoreScanReviewScroll() {
    const top = scanReviewReturnScrollY.current;
    scanReviewReturnScrollY.current = null;
    if (top === null) return;

    window.setTimeout(() => {
      window.scrollTo({ top, behavior: "smooth" });
    }, 0);
  }

  function openScanReview(review: PendingExpenseScan) {
    scanReviewReturnScrollY.current = window.scrollY;
    setPendingScans((prev) => {
      const remaining = prev.filter((item) => item.id !== review.id);
      if (activeScanReview && activeScanReview.id !== review.id) {
        return [activeScanReview, ...remaining];
      }
      return remaining;
    });
    fillFormFromScan(review);
    setScanFormCollapsed(false);
    scrollToScanForm();
  }

  function collapseActiveScanReview() {
    setScanFormCollapsed(true);
    restoreScanReviewScroll();
  }

  function duplicateCandidateForScanPayload(payload: ExpenseScanPayload) {
    return {
      invoiceNumber: payload.expense.purchaseDocument?.invoiceNumber,
      supplierNif:
        payload.expense.purchaseDocument?.supplierNif ?? payload.supplier.nif,
      supplierName: payload.supplier.name,
      amount: payload.expense.amount,
    };
  }

  function duplicateForScanPayload(payload: ExpenseScanPayload) {
    return findDuplicateExpense(duplicateCandidateForScanPayload(payload));
  }

  function providerSummaryUpgradeTargetForScanPayload(
    payload: ExpenseScanPayload,
  ) {
    const duplicate = duplicateForScanPayload(payload);
    return duplicate && isProviderSummaryPendingOriginal(duplicate)
      ? duplicate
      : null;
  }

  function duplicateScanReviewInCurrentBatch(review: PendingExpenseScan) {
    const currentIndex = currentScanReviews.findIndex(
      (item) => item.id === review.id,
    );
    if (currentIndex <= 0) return null;

    const current = duplicateCandidateForScanPayload(review.payload);
    return (
      currentScanReviews
        .slice(0, currentIndex)
        .find((previous) =>
          purchaseExpenseDuplicateMatches(
            current,
            duplicateCandidateForScanPayload(previous.payload),
          ),
        ) ?? null
    );
  }

  function negativeAmountReasonForScanPayload(payload: ExpenseScanPayload) {
    if (payload.expense.amount >= 0) return null;
    return [
      "Factura con importe negativo detectada: parece un abono, devolución",
      "o saldo a tu favor. Revísala y guárdala si quieres que reste gasto e IVA soportado.",
    ].join(" ");
  }

  function newCatalogProductLinesForScanPayload(payload: ExpenseScanPayload) {
    return (payload.expense.purchaseLines ?? []).filter(
      (line) => !purchaseLineHasCatalogProduct(line, productKeys),
    );
  }

  function purchaseLineBatchKeys(
    line: Pick<ExpensePurchaseLine, "description" | "supplierReference">,
  ) {
    return [line.description, line.supplierReference]
      .map((candidate) => (candidate ? purchaseProductKey(candidate) : ""))
      .filter(Boolean);
  }

  function selectedForCatalogInScan(
    line: Pick<ExpensePurchaseLine, "catalogProduct">,
  ) {
    return line.catalogProduct === true;
  }

  function selectedBatchCatalogOwnerForLine(
    review: PendingExpenseScan,
    lineIndex: number,
  ) {
    const line = review.payload.expense.purchaseLines?.[lineIndex];
    if (!line || !selectedForCatalogInScan(line)) return null;

    const lineKeys = purchaseLineBatchKeys(line);
    if (lineKeys.length === 0) return null;
    const lineKeySet = new Set(lineKeys);

    for (const candidateReview of currentScanReviews) {
      const candidateLines = candidateReview.payload.expense.purchaseLines ?? [];
      for (let candidateIndex = 0; candidateIndex < candidateLines.length; candidateIndex += 1) {
        if (
          candidateReview.id === review.id &&
          candidateIndex === lineIndex
        ) {
          return null;
        }

        const candidateLine = candidateLines[candidateIndex];
        if (
          !selectedForCatalogInScan(candidateLine) ||
          purchaseLineHasCatalogProduct(candidateLine, productKeys)
        ) {
          continue;
        }

        const matches = purchaseLineBatchKeys(candidateLine).some((key) =>
          lineKeySet.has(key),
        );
        if (matches) {
          return {
            review: candidateReview,
            line: candidateLine,
          };
        }
      }
    }

    return null;
  }

  function scanReviewCatalogProductPreview(review: PendingExpenseScan) {
    return (review.payload.expense.purchaseLines ?? [])
      .map((line, index) => {
        const description = line.description.trim();
        if (!description) return null;

        const inCatalog = purchaseLineHasCatalogProduct(line, productKeys);
        const selected = selectedForCatalogInScan(line);
        const batchOwner = selectedBatchCatalogOwnerForLine(review, index);
        const state = inCatalog
          ? "catalog"
          : batchOwner
            ? "batch"
            : selected
              ? "new"
              : "off";

        return {
          key: `${review.id}-${index}`,
          description,
          state,
        };
      })
      .filter(
        (
          item,
        ): item is {
          key: string;
          description: string;
          state: "catalog" | "batch" | "new" | "off";
        } => Boolean(item),
      );
  }

  function newCatalogProductLinesEnabledForScanPayload(
    payload: ExpenseScanPayload,
  ) {
    const lines = newCatalogProductLinesForScanPayload(payload);
    return lines.length > 0 && lines.every((line) => line.catalogProduct === true);
  }

  function scanPayloadWithCatalogProductSelection(
    payload: ExpenseScanPayload,
    enabled: boolean,
  ): ExpenseScanPayload {
    return {
      ...payload,
      expense: {
        ...payload.expense,
        purchaseLines: payload.expense.purchaseLines?.map((line) =>
          purchaseLineHasCatalogProduct(line, productKeys)
            ? line
            : { ...line, catalogProduct: enabled },
        ),
      },
    };
  }

  function setScanReviewCatalogProductSelection(
    review: PendingExpenseScan,
    enabled: boolean,
  ) {
    setActiveScanReview((current) =>
      current?.id === review.id
        ? {
            ...current,
            payload: scanPayloadWithCatalogProductSelection(
              current.payload,
              enabled,
            ),
          }
        : current,
    );
    setPendingScans((current) =>
      current.map((item) =>
        item.id === review.id
          ? {
              ...item,
              payload: scanPayloadWithCatalogProductSelection(
                item.payload,
                enabled,
              ),
            }
          : item,
      ),
    );
    if (activeScanReview?.id === review.id) {
      setPurchaseLines((current) =>
        current.map((line) =>
          purchaseLineHasCatalogProduct(line, productKeys)
            ? line
            : { ...line, catalogProduct: enabled },
        ),
      );
    }
  }

  function newCatalogProductReasonForScanPayload(payload: ExpenseScanPayload) {
    const lines = newCatalogProductLinesForScanPayload(payload);
    if (lines.length === 0) return null;
    const sample = lines
      .slice(0, 3)
      .map((line) => line.description.trim())
      .filter(Boolean)
      .join(", ");
    const tail = lines.length > 3 ? ` y ${lines.length - 3} más` : "";
    return `${lines.length} artículo${lines.length === 1 ? "" : "s"} nuevo${lines.length === 1 ? "" : "s"} para Productos${sample ? `: ${sample}${tail}` : ""}.`;
  }

  function batchCatalogProductReasonForScanReview(review: PendingExpenseScan) {
    const lines = review.payload.expense.purchaseLines ?? [];
    const selectedNewLines = lines
      .map((line, index) => ({ line, index }))
      .filter(
        ({ line }) =>
          selectedForCatalogInScan(line) &&
          !purchaseLineHasCatalogProduct(line, productKeys),
      );
    if (selectedNewLines.length === 0) return null;

    const repeated = selectedNewLines.filter(({ index }) =>
      selectedBatchCatalogOwnerForLine(review, index),
    );
    if (repeated.length === 0) {
      return `${selectedNewLines.length} se crearán o actualizarán en Productos al guardar.`;
    }

    const firstTime = selectedNewLines.length - repeated.length;
    return `${firstTime} se crearán una vez; ${repeated.length} ya aparecen en esta tanda y se unirán al mismo producto.`;
  }

  function nonExpenseReasonForScanReview(review: PendingExpenseScan) {
    const explicit =
      review.payload.document?.isExpenseDocument === false
        ? review.payload.document.reason?.trim() ||
          "Este documento no parece una factura o ticket de gasto."
        : null;
    if (explicit) return explicit;

    const filenameReason = review.fileName
      ? detectNonExpenseDocumentReason(review.fileName)
      : null;
    if (filenameReason) return filenameReason;

    return detectNonExpenseDocumentReason(
      [
        review.payload.document?.kind,
        review.payload.document?.reason,
        review.payload.expense.description,
        review.payload.expense.notes,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  function removeScanReview(review: PendingExpenseScan) {
    setPendingScans((prev) => prev.filter((item) => item.id !== review.id));
    if (activeScanReview?.id !== review.id) return;

    const next = pendingScans.find((item) => item.id !== review.id);
    if (next) {
      setPendingScans((prev) => prev.filter((item) => item.id !== next.id));
      fillFormFromScan(next);
      setScanFormCollapsed(true);
      return;
    }

    clearScanForm();
  }

  function priceAlertsForScanPayload(payload: ExpenseScanPayload) {
    const currentLines =
      payload.expense.purchaseLines?.map((line) => emptyPurchaseLine(line)) ??
      [];
    if (currentLines.length === 0) return [];

    const match = findBestSupplierMatch(data.suppliers, {
      name: payload.supplier.name,
      nif: payload.supplier.nif,
    });

    return findExpensePurchaseLinePriceAlerts({
      currentLines,
      expenses: data.expenses,
      supplierId: match?.supplier.id,
      supplierName: match?.supplier.name ?? payload.supplier.name,
    });
  }

  function scanReviewWarning(review: PendingExpenseScan) {
    const nonExpenseReason = nonExpenseReasonForScanReview(review);
    if (nonExpenseReason) return nonExpenseReason;

    const negativeAmountReason = negativeAmountReasonForScanPayload(
      review.payload,
    );
    if (negativeAmountReason) return negativeAmountReason;

    const duplicate = duplicateForScanPayload(review.payload);
    if (duplicate) {
      const invoiceNumber =
        duplicate.purchaseDocument?.invoiceNumber?.trim() || "sin número";
      if (isProviderSummaryPendingOriginal(duplicate)) {
        return `Esta factura ya estaba registrada desde un resumen como ${invoiceNumber}. Al guardar, se completará con la factura original y no se duplicará.`;
      }
      return `Ya existe como ${duplicate.description}, factura ${invoiceNumber}, guardada el ${formatDate(duplicate.date)} por ${formatMoney(duplicate.amount)}.`;
    }

    const duplicateInBatch = duplicateScanReviewInCurrentBatch(review);
    if (duplicateInBatch) {
      return "Esta factura está repetida en este lote. Se guardará solo una vez.";
    }

    const priceAlert = priceAlertsForScanPayload(review.payload)[0];
    if (priceAlert) {
      const discountText =
        Math.abs(priceAlert.discountChangePoints) >= 5
          ? ` · descuento ${priceAlert.previousDiscountPercent}% → ${priceAlert.currentDiscountPercent}%`
          : "";
      return `Revisa ${priceAlert.description}: ahora ${formatMoney(priceAlert.currentUnitPrice)}, antes ${formatMoney(priceAlert.previousUnitPrice)}${discountText}.`;
    }

    if (review.payload.warnings.length > 0) return review.payload.warnings[0];
    if (review.payload.confidence < 0.8) {
      return "Lectura con poca confianza. Conviene revisar antes de guardar.";
    }
    return null;
  }

  function scanReviewNotice(review: PendingExpenseScan) {
    return newCatalogProductReasonForScanPayload(review.payload);
  }

  function scanReviewStatus(review: PendingExpenseScan): ScanReviewStatus {
    if (nonExpenseReasonForScanReview(review)) return "blocked";
    if (negativeAmountReasonForScanPayload(review.payload)) return "review";
    if (duplicateForScanPayload(review.payload)) {
      return providerSummaryUpgradeTargetForScanPayload(review.payload)
        ? "ready"
        : "blocked";
    }
    if (duplicateScanReviewInCurrentBatch(review)) return "blocked";
    if (
      priceAlertsForScanPayload(review.payload).length > 0 ||
      review.payload.warnings.length > 0 ||
      review.payload.confidence < 0.8
    ) {
      return "review";
    }
    return "ready";
  }

  function saveScanPayload(
    review: PendingExpenseScan,
    savedPayloads: ExpenseScanPayload[] = [],
  ): boolean {
    const { payload } = review;
    const currentDuplicateCandidate = duplicateCandidateForScanPayload(payload);
    const duplicate = duplicateForScanPayload(payload);
    const upgradeTarget =
      duplicate && isProviderSummaryPendingOriginal(duplicate) ? duplicate : null;
    if (duplicate && !upgradeTarget) return false;
    if (
      savedPayloads.some((savedPayload) =>
        purchaseExpenseDuplicateMatches(
          currentDuplicateCandidate,
          duplicateCandidateForScanPayload(savedPayload),
        ),
      )
    ) {
      return false;
    }

    const match = findBestSupplierMatch(data.suppliers, {
      name: payload.supplier.name,
      nif: payload.supplier.nif,
    });
    const resolved = ensureSupplierForExpense(data.suppliers, {
      name: match?.supplier.name ?? payload.supplier.name,
      nif:
        match?.supplier.nif ??
        payload.expense.purchaseDocument?.supplierNif ??
        payload.supplier.nif ??
        undefined,
      category: payload.expense.category,
      saveSupplier: true,
      selectedSupplierId: match?.supplier.id ?? null,
    });
    const supplierId = resolved.create
      ? addSupplier(resolved.create).id
      : resolved.supplierId;
    const purchaseDocument = sanitizeExpensePurchaseDocument({
      ...(payload.expense.purchaseDocument ?? {}),
      issueDate: payload.expense.purchaseDocument?.issueDate ?? payload.expense.date,
      supplierNif:
        payload.expense.purchaseDocument?.supplierNif ??
        payload.supplier.nif ??
        undefined,
    });
    const purchaseLines = sanitizeExpensePurchaseLines(
      payload.expense.purchaseLines?.map((line) => emptyPurchaseLine(line)) ?? [],
    );

    const expensePayload: Omit<Expense, "id" | "createdAt"> = {
      date: payload.expense.date,
      supplierId,
      supplierName: resolved.supplierName,
      description: payload.expense.description,
      amount: payload.expense.amount,
      ivaPercent: vatExempt ? 0 : payload.expense.ivaPercent,
      category: payload.expense.category,
      paymentMethod: payload.expense.paymentMethod,
      notes: payload.expense.notes || undefined,
      purchaseDocument,
      purchaseLines: purchaseLines.length > 0 ? purchaseLines : undefined,
      origin: "scan",
      businessKind: payload.expense.businessKind ?? "purchase_invoice",
    };
    if (upgradeTarget) {
      updateExpense(mergeProviderSummaryWithOriginal(upgradeTarget, expensePayload));
    } else {
      addExpense(expensePayload);
    }
    return true;
  }

  async function handleSaveReadyScans() {
    const reviews = [
      ...(activeScanReview && scanFormCollapsed ? [activeScanReview] : []),
      ...pendingScans,
    ];
    const ready = reviews.filter((review) => scanReviewStatus(review) === "ready");
    if (ready.length === 0) return;
    const savedPayloads: ExpenseScanPayload[] = [];
    const savedReviewIds = new Set<string>();
    ready.forEach((review) => {
      if (!saveScanPayload(review, savedPayloads)) return;
      savedPayloads.push(review.payload);
      savedReviewIds.add(review.id);
    });
    if (savedReviewIds.size === 0) return;
    if (activeInboxItemId && savedReviewIds.has(activeInboxItemId)) {
      await markInboxItemProcessed();
    }
    const remaining = reviews.filter((review) => !savedReviewIds.has(review.id));
    setActiveScanReview(null);
    setPendingScans(remaining);
    setScanFormCollapsed(false);
    if (remaining.length === 0) {
      router.push("/gastos");
      return;
    }
    const next = remaining.find(
      (review) => scanReviewStatus(review) !== "blocked",
    );
    if (!next) {
      setPendingScans(remaining);
      return;
    }
    setPendingScans(remaining.filter((review) => review.id !== next.id));
    fillFormFromScan(next);
    setScanFormCollapsed(true);
  }

  async function handleSaveSingleScan(review: PendingExpenseScan) {
    if (scanReviewStatus(review) !== "ready") return;
    if (review.id === activeScanReview?.id && !scanFormCollapsed) return;
    if (!saveScanPayload(review)) return;

    if (activeInboxItemId && review.id === activeInboxItemId) {
      await markInboxItemProcessed();
    }

    const remaining = currentScanReviews.filter((item) => item.id !== review.id);
    setScanHint(
      "Factura guardada. Si el resto del lote trae el mismo producto, aparecerá como ya incluido.",
    );

    if (activeScanReview?.id === review.id) {
      setActiveScanReview(null);
      setPendingScans(remaining);
      setScanFormCollapsed(false);
      if (remaining.length === 0) {
        router.push("/gastos");
        return;
      }

      const next = remaining.find(
        (item) => scanReviewStatus(item) !== "blocked",
      );
      if (!next) return;
      setPendingScans(remaining.filter((item) => item.id !== next.id));
      fillFormFromScan(next);
      setScanFormCollapsed(true);
      return;
    }

    setPendingScans((current) =>
      current.filter((item) => item.id !== review.id),
    );
  }

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

  async function markInboxItemProcessed() {
    if (!activeInboxItemId) return;
    const headers = await currentAuthHeaders();
    await fetch("/api/expense-inbox", {
      method: "PATCH",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: activeInboxItemId, status: "processed" }),
    });
    setActiveInboxItemId(null);
  }

  async function handleSubmit() {
    const totals = expenseTotalsFromBase(
      parseDecimalInput(amountText),
      ivaPercent,
      expenseVatExempt,
    );
    const amount = totals.base;

    if (!description.trim() || amount === 0) {
      alert("Completa descripción e importe");
      return;
    }
    if (businessKind === "fixed") {
      if (!fixedStartDate) {
        alert("Indica desde qué fecha empieza este gasto fijo");
        return;
      }
      if (fixedFrequency === "annual" && fixedDueKind === "end_of_month") {
        alert("En gastos anuales indica un día concreto del mes");
        return;
      }
      if (
        fixedDurationKind === "until_date" &&
        fixedEndDate &&
        fixedEndDate < fixedStartDate
      ) {
        alert("La fecha final no puede ser anterior al inicio del gasto fijo");
        return;
      }
    }

    if (blockingDuplicateExpense) {
      alert(
        `Esta factura de proveedor ya está registrada como «${blockingDuplicateExpense.description}».`,
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
    const expenseDate =
      businessKind === "fixed" && !editingRecurringExpense
        ? fixedStartDate
        : date;
    const payload: Omit<Expense, "id" | "createdAt"> = {
      date: expenseDate,
      supplierId,
      supplierName: resolved.supplierName,
      description: description.trim(),
      amount,
      ivaPercent: totals.ivaPercent,
      deductibility:
        businessKind === "fixed" ? fixedDeductibility : undefined,
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

    if (businessKind === "fixed") {
      const recurringPayload = {
        supplierName: resolved.supplierName,
        description: description.trim(),
        amount,
        ivaPercent: totals.ivaPercent,
        deductibility: fixedDeductibility,
        category,
        paymentMethod,
        frequency: fixedFrequency,
        dueTiming: buildFixedDueTiming(),
        dueMonth:
          fixedFrequency === "annual" ? Number(fixedDueMonth) : undefined,
        duration: buildFixedDuration(),
        startDate: fixedStartDate,
        enabled: true,
        notes: notes || undefined,
      };
      const existingRecurringId = editingExpense?.recurringExpenseId;
      if (editingExpense && existingRecurringId) {
        updateExpense({
          ...editingExpense,
          ...payload,
          recurringExpenseId: existingRecurringId,
          recurringOccurrenceKey:
            editingExpense.recurringOccurrenceKey ??
            occurrenceKey(existingRecurringId, expenseDate),
        });
      } else if (editingExpense) {
        saveFixedExpenseWithRecurringTemplate(
          {
            ...editingExpense,
            ...payload,
          },
          recurringPayload,
        );
      } else if (providerSummaryUpgradeTarget) {
        saveFixedExpenseWithRecurringTemplate(
          mergeProviderSummaryWithOriginal(providerSummaryUpgradeTarget, payload),
          recurringPayload,
        );
      } else {
        saveFixedExpenseWithRecurringTemplate(payload, recurringPayload);
      }
    } else if (editingExpense) {
      updateExpense({
        ...editingExpense,
        ...payload,
      });
    } else if (providerSummaryUpgradeTarget) {
      updateExpense(
        mergeProviderSummaryWithOriginal(providerSummaryUpgradeTarget, payload),
      );
    } else {
      addExpense(payload);
    }

    await markInboxItemProcessed();

    setActiveScanReview(null);
    if (!editingExpense && pendingScans.length > 0) {
      const [next, ...rest] = pendingScans;
      setPendingScans(rest);
      fillFormFromScan(next);
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
        {!editingRequested && (
          <ExpenseScanCard
            onScanned={applyScanResult}
            onScanProgress={setScanProgress}
          />
        )}
        {editingRequested && !editingExpense && (
          <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
            No encuentro ese gasto en tus datos locales. Puedes volver al listado
            o guardar este formulario como gasto nuevo.
          </Card>
        )}
        {inboxLoadError && (
          <Card className="border-red-200 bg-red-50 text-sm font-semibold text-red-800">
            {inboxLoadError}
          </Card>
        )}
        {scanHint && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
            {scanHint}
          </p>
        )}
        {(activeScanReview || pendingScans.length > 0 || scanProgress) && (
          <Card className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Documentos escaneados
                </h2>
                <p className="text-sm text-slate-500">
                  Revisa solo los que tengan aviso. Los verdes están listos.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => void handleSaveReadyScans()}
                disabled={
                  ![
                    ...(activeScanReview && scanFormCollapsed
                      ? [activeScanReview]
                      : []),
                    ...pendingScans,
                  ].some((review) => scanReviewStatus(review) === "ready")
                }
              >
                Guardar todo lo listo
              </Button>
            </div>
            <div className="space-y-2">
              {[activeScanReview, ...pendingScans]
                .filter((review): review is PendingExpenseScan => Boolean(review))
                .map((review) => {
                  const status = scanReviewStatus(review);
                  const warningText = scanReviewWarning(review);
                  const noticeText = scanReviewNotice(review);
                  const batchCatalogNotice =
                    batchCatalogProductReasonForScanReview(review);
                  const productPreview =
                    scanReviewCatalogProductPreview(review);
                  const newCatalogProductLines =
                    newCatalogProductLinesForScanPayload(review.payload);
                  const canToggleCatalogProducts =
                    status !== "blocked" && newCatalogProductLines.length > 0;
                  const catalogProductsEnabled =
                    newCatalogProductLinesEnabledForScanPayload(review.payload);
                  const isActive = review.id === activeScanReview?.id;
                  const canSaveThisScan =
                    status === "ready" && (!isActive || scanFormCollapsed);
                  const icon =
                    status === "ready" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-700" />
                    ) : status === "review" ? (
                      <AlertTriangle className="h-5 w-5 text-amber-700" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-700" />
                    );
                  const statusText =
                    status === "ready"
                      ? "Listo"
                      : status === "review"
                        ? "Revisar"
                        : "No válido";
                  const statusClass =
                    status === "ready"
                      ? "bg-green-50 text-green-800"
                      : status === "review"
                        ? "bg-amber-50 text-amber-900"
                        : "bg-red-50 text-red-800";

                  return (
                    <div
                      key={review.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="mt-1">{icon}</div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">
                              {review.payload.expense.description}
                            </p>
                            <p className="text-sm text-slate-500">
                              {review.payload.supplier.name} ·{" "}
                              {formatMoney(review.payload.expense.amount)}
                              {review.fileName ? ` · ${review.fileName}` : ""}
                            </p>
                            {warningText ? (
                              <p
                                className={`mt-1 text-sm font-semibold ${
                                  status === "blocked"
                                    ? "text-red-700"
                                    : status === "ready"
                                      ? "text-green-700"
                                    : "text-amber-800"
                                }`}
                              >
                                {warningText}
                              </p>
                            ) : null}
                            {noticeText ? (
                              <p className="mt-1 text-sm font-medium text-sky-700">
                                {noticeText}
                              </p>
                            ) : null}
                            {batchCatalogNotice ? (
                              <p className="mt-1 text-sm font-semibold text-emerald-700">
                                {batchCatalogNotice}
                              </p>
                            ) : null}
                            {productPreview.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {productPreview.slice(0, 8).map((item) => {
                                  const stateLabel =
                                    item.state === "catalog"
                                      ? "En Productos"
                                      : item.state === "batch"
                                        ? "Misma tanda"
                                        : item.state === "new"
                                          ? "Se creará"
                                          : "No se añade";
                                  const stateClass =
                                    item.state === "catalog" ||
                                    item.state === "batch"
                                      ? "bg-green-50 text-green-800 ring-green-100"
                                      : item.state === "new"
                                        ? "bg-sky-50 text-sky-800 ring-sky-100"
                                        : "bg-slate-50 text-slate-600 ring-slate-100";

                                  return (
                                    <span
                                      key={item.key}
                                      className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${stateClass}`}
                                      title={`${item.description} · ${stateLabel}`}
                                    >
                                      {item.description} · {stateLabel}
                                    </span>
                                  );
                                })}
                                {productPreview.length > 8 ? (
                                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                                    y {productPreview.length - 8} más
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            {canToggleCatalogProducts ? (
                              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded"
                                  checked={catalogProductsEnabled}
                                  onChange={(event) =>
                                    setScanReviewCatalogProductSelection(
                                      review,
                                      event.target.checked,
                                    )
                                  }
                                />
                                Añadir estos artículos a Productos al guardar
                              </label>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}
                          >
                            {statusText}
                          </span>
                          {canSaveThisScan ? (
                            <button
                              type="button"
                              onClick={() => void handleSaveSingleScan(review)}
                              className="inline-flex items-center justify-center rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700"
                            >
                              Guardar esta
                            </button>
                          ) : null}
                          {status !== "blocked" && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isActive && !scanFormCollapsed) {
                                  collapseActiveScanReview();
                                  return;
                                }
                                openScanReview(review);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-blue-200 px-3 py-2 text-sm font-bold text-blue-700"
                            >
                              {isActive && !scanFormCollapsed
                                ? "Contraer"
                                : "Revisar"}
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeScanReview(review)}
                            className="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                            aria-label={`Quitar ${review.fileName ?? review.payload.expense.description}`}
                            title="Quitar de esta revisión"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {scanProgress ? (
                <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                  <span className="scan-progress-thinking">
                    Escaneando siguiente factura {scanProgress.current}/
                    {scanProgress.total}
                    {scanProgress.fileName ? ` · ${scanProgress.fileName}` : ""}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-1 inline-flex align-baseline text-blue-600"
                  >
                    <span className="scan-progress-dot">.</span>
                    <span className="scan-progress-dot scan-progress-dot-delay-1">
                      .
                    </span>
                    <span className="scan-progress-dot scan-progress-dot-delay-2">
                      .
                    </span>
                  </span>
                  <span className="sr-only">Procesando siguiente factura</span>
                </div>
              ) : null}
            </div>
          </Card>
        )}
        {duplicateExpense && (
          <p
            className={`rounded-xl border px-4 py-3 text-sm ${
              providerSummaryUpgradeTarget
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {providerSummaryUpgradeTarget ? (
              <>
                Esta factura ya estaba registrada desde un resumen de proveedor:{" "}
                <strong>{duplicateExpense.description}</strong>. Al guardar se
                completará con la factura original y no se duplicará.
              </>
            ) : (
              <>
                Esta factura de proveedor ya está guardada:{" "}
                <strong>{duplicateExpense.description}</strong>. Coincide con la
                factura {duplicateExpenseNumber}, guardada el{" "}
                {formatDate(duplicateExpense.date)}, con importe{" "}
                {formatMoney(duplicateExpense.amount)}
                {duplicateExpenseLines
                  ? ` y líneas como ${duplicateExpenseLines}`
                  : ""}
                . Está repetida y no se guardará de nuevo.
              </>
            )}
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
        {showExpenseForm && (
          <div ref={scanFormRef}>
            <Card className="space-y-5">
              {activeScanReview && !editingRequested ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={collapseActiveScanReview}
                    className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-700"
                  >
                    Contraer ficha y volver al listado
                  </button>
                </div>
              ) : null}
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
                    onClick={() => {
                      setBusinessKind(option.value);
                      if (option.value === "fixed" && !editingRecurringExpense) {
                        setFixedStartDate(date);
                      }
                    }}
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

          {businessKind === "fixed" && (
            <FormSection
              variant="fields"
              title="Configuración de gasto fijo"
              hint={
                editingRecurringExpense
                  ? "Este cargo ya viene de una regla recurrente. Aquí puedes corregir este gasto concreto; cambia la regla completa desde Gastos fijos."
                  : "Define cómo se repetirá. El gasto actual quedará guardado como primer cargo de la regla."
              }
            >
              {editingRecurringExpense ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold">
                      Gasto fijo ya vinculado a una regla
                    </p>
                    <p className="mt-1 text-blue-800">
                      Los cambios de importe o fechas futuras se gestionan desde
                      la pantalla de Gastos fijos para no tocar el histórico por
                      accidente.
                    </p>
                  </div>
                  <a
                    href={`/gastos/fijos?editar=${editingExpense?.recurringExpenseId}`}
                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
                  >
                    Abrir regla
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFixedDeductibility("deductible");
                        if (!vatExempt && ivaPercent === 0) {
                          setIvaPercent(defaultIva);
                        }
                      }}
                      aria-pressed={fixedDeductibility === "deductible"}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        fixedDeductibility === "deductible"
                          ? "border-blue-300 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <CalendarClock className="h-4 w-4" />
                        Gasto fijo normal
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Factura, ticket o recibo recurrente con IVA si
                        corresponde.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFixedDeductibility("non_deductible")}
                      aria-pressed={fixedDeductibility === "non_deductible"}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                        fixedDeductibility === "non_deductible"
                          ? "border-amber-300 bg-amber-50 text-amber-950"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        <CalendarClock className="h-4 w-4" />
                        Extra no desgravable
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        Control interno recurrente. Cuenta entero, sin IVA
                        deducible.
                      </span>
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Frecuencia">
                      <Select
                        value={fixedFrequency}
                        onChange={(event) => {
                          const nextFrequency = event.target
                            .value as RecurringExpenseFrequency;
                          setFixedFrequency(nextFrequency);
                          if (
                            nextFrequency === "annual" &&
                            fixedDueKind !== "day_of_month"
                          ) {
                            setFixedDueKind("day_of_month");
                          }
                        }}
                      >
                        <option value="monthly">Mensual</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="annual">Anual</option>
                      </Select>
                    </Field>
                    <Field label="Desde">
                      <Input
                        type="date"
                        value={fixedStartDate}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          setFixedStartDate(nextDate);
                          setDate(nextDate);
                        }}
                      />
                    </Field>
                    <Field label="Cuándo vence">
                      <Select
                        value={fixedDueKind}
                        onChange={(event) =>
                          setFixedDueKind(event.target.value as FixedDueKind)
                        }
                      >
                        <option value="start_of_month">Inicio de mes</option>
                        <option value="mid_of_month">Mitad de mes</option>
                        <option value="end_of_month">Final de mes</option>
                        <option value="day_of_month">Día concreto</option>
                      </Select>
                    </Field>
                    {fixedDueKind === "day_of_month" ||
                    fixedFrequency === "annual" ? (
                      <Field
                        label={
                          fixedFrequency === "annual"
                            ? "Mes y día"
                            : "Día del mes"
                        }
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {fixedFrequency === "annual" ? (
                            <Select
                              value={fixedDueMonth}
                              onChange={(event) =>
                                setFixedDueMonth(event.target.value)
                              }
                            >
                              {FIXED_MONTHS.map((month, index) => (
                                <option key={month} value={index + 1}>
                                  {month}
                                </option>
                              ))}
                            </Select>
                          ) : null}
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={fixedDueDay}
                            onChange={(event) =>
                              setFixedDueDay(event.target.value)
                            }
                            className={
                              fixedFrequency === "annual"
                                ? undefined
                                : "col-span-2"
                            }
                          />
                        </div>
                      </Field>
                    ) : (
                      <div className="hidden lg:block" />
                    )}
                    <Field label="Duración">
                      <Select
                        value={fixedDurationKind}
                        onChange={(event) =>
                          setFixedDurationKind(
                            event.target.value as RecurringDuration["kind"],
                          )
                        }
                      >
                        <option value="indefinite">Hasta que lo pares</option>
                        <option value="occurrences">Número de cargos</option>
                        <option value="until_date">Hasta una fecha</option>
                      </Select>
                    </Field>
                    {fixedDurationKind === "occurrences" ? (
                      <Field label="Cargos">
                        <Input
                          type="number"
                          min={1}
                          value={fixedOccurrenceCount}
                          onChange={(event) =>
                            setFixedOccurrenceCount(event.target.value)
                          }
                        />
                      </Field>
                    ) : null}
                    {fixedDurationKind === "until_date" ? (
                      <Field label="Hasta">
                        <Input
                          type="date"
                          value={fixedEndDate}
                          onChange={(event) =>
                            setFixedEndDate(event.target.value)
                          }
                        />
                      </Field>
                    ) : null}
                  </div>
                  <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Si más adelante cambia el importe, usa la opción de nuevo
                    importe desde una fecha en Gastos fijos. Así no se cambia
                    el histórico anterior.
                  </p>
                </div>
              )}
            </FormSection>
          )}

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

          {showWorkDocumentSection && (
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
          )}

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
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setDate(nextDate);
                    if (businessKind === "fixed" && !editingRecurringExpense) {
                      setFixedStartDate(nextDate);
                    }
                  }}
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
                ivaPercent={expenseVatExempt ? 0 : ivaPercent}
                vatExempt={expenseVatExempt}
              />
              {expenseVatExempt ? (
                <p className="text-sm text-slate-500 sm:col-span-2">
                  {businessKind === "fixed" &&
                  fixedDeductibility === "non_deductible"
                    ? "Gasto extra no desgravable: se guarda como control interno completo, sin IVA deducible."
                    : "Sin IVA deducible — tu perfil está marcado como exento de repercusión."}
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
            hint="Las líneas verdes ya coinciden con Productos. Las marcadas pueden crear o actualizar productos al guardar."
          >
            <div className="space-y-3">
              {purchaseLines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Si el escaneo detecta líneas, aparecerán aquí. También puedes
                  añadirlas a mano.
                </div>
              ) : (
                purchaseLines.map((line, index) => {
                  const lineInCatalog = purchaseLineHasCatalogProduct(
                    line,
                    productKeys,
                  );
                  const lineWillGoToCatalog = line.catalogProduct !== false;
                  const cardTone = lineInCatalog
                    ? "border-green-200 bg-green-50"
                    : lineWillGoToCatalog
                      ? "border-blue-200 bg-blue-50"
                      : "border-slate-100 bg-slate-50";
                  const checkboxTone = lineInCatalog
                    ? "border-green-200 bg-white text-green-800"
                    : lineWillGoToCatalog
                      ? "border-blue-200 bg-white text-blue-800"
                      : "border-slate-200 bg-white text-slate-700";

                  return (
                    <div
                      key={line.id}
                      className={`rounded-2xl border p-3 ${cardTone}`}
                    >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Línea {index + 1}
                        </p>
                        {lineInCatalog ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-green-800 ring-1 ring-green-200">
                            Ya está en Productos
                          </span>
                        ) : lineWillGoToCatalog ? (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-800 ring-1 ring-blue-200">
                            Se creará al guardar
                          </span>
                        ) : null}
                      </div>
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
                    <label
                      className={`mt-3 flex cursor-pointer flex-col gap-2 rounded-xl border px-3 py-2 text-sm ${checkboxTone}`}
                    >
                      <span className="flex items-center gap-2 font-bold">
                        <input
                          type="checkbox"
                          checked={lineWillGoToCatalog}
                          onChange={(e) =>
                            updatePurchaseLine(line.id, {
                              catalogProduct: e.target.checked,
                            })
                          }
                          className="h-5 w-5 rounded"
                        />
                        {lineInCatalog
                          ? "Actualizar producto desde esta línea al guardar"
                          : "Crear producto desde esta línea al guardar"}
                      </span>
                      <span className="text-xs font-bold">
                        {lineInCatalog
                          ? "Ya existe en Productos"
                          : lineWillGoToCatalog
                            ? "Sí, se llevará a Productos"
                            : "No se llevará a Productos"}
                      </span>
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      Nada se añade al catálogo solo por escanear. Debes revisar
                      la factura, dejar marcada esta opción y guardar. Desmarca
                      herramientas, gastos internos o servicios sueltos.
                    </p>
                    </div>
                  );
                })
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
                      Copiar al importe
                    </button>
                    <p className="text-xs text-slate-500">
                      Copia esa suma al importe del gasto.
                    </p>
                  </>
                )}
              </div>
            </div>
          </FormSection>
            </Card>
          </div>
        )}
        {showExpenseForm && (
          <Button
            fullWidth
            onClick={() => void handleSubmit()}
            disabled={Boolean(blockingDuplicateExpense)}
          >
            {blockingDuplicateExpense
              ? "Factura ya guardada"
              : providerSummaryUpgradeTarget
                ? "Completar factura original"
                : editingExpense
                ? "Guardar cambios"
                : pendingScans.length > 0
                  ? "Guardar y revisar siguiente"
                  : "Guardar gasto"}
          </Button>
        )}
      </div>
    </div>
  );
}
