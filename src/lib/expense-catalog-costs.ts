import {
  expensePurchaseLineIsEligibleForProductCatalog,
  findExpensePurchaseLinePriceAlerts,
  sanitizeExpensePurchaseLines,
} from "./expenses";
import {
  matchingPurchaseProducts,
  purchaseLinePrice,
} from "./purchase-price-matching";
import {
  currentPriceSource,
  isProductPriceSource,
  withPriceSourceSummary,
} from "./product-price-sources";
import type {
  Expense,
  ExpensePurchaseLine,
  Product,
  ProductPriceSource,
} from "./types";

type CostExpense = Pick<
  Expense,
  "date" | "amount" | "supplierId" | "supplierName" | "purchaseLines"
> &
  Partial<Pick<Expense, "id">>;
export interface ExpenseCatalogCostReview {
  lineId: string;
  productId?: string;
  productName?: string;
  previousCost?: number;
  proposedCost?: number;
  willUpdate: boolean;
  needsReview: boolean;
  canChoose: boolean;
  reason: string;
}
export function reviewExpenseCatalogCosts(input: {
  expense: CostExpense;
  products: Product[];
  expenses: Expense[];
}): ExpenseCatalogCostReview[] {
  const { expense, products, expenses } = input;
  const lines = sanitizeExpensePurchaseLines(expense.purchaseLines);
  const alerts = new Set(
    findExpensePurchaseLinePriceAlerts({
      currentLines: lines,
      currentExpenseAmount: expense.amount,
      currentExpenseDate: expense.date,
      products,
      expenses,
      supplierId: expense.supplierId,
      supplierName: expense.supplierName,
      excludeExpenseId: expense.id,
    }).map((a) => a.lineId),
  );
  const matches = lines.map((line) => ({
    line,
    products: matchingPurchaseProducts(line, expense, products),
  }));
  return matches.flatMap<ExpenseCatalogCostReview>(
    ({ line, products: found }) => {
      if (!expensePurchaseLineIsEligibleForProductCatalog(expense, line))
        return [];
      const base = {
        lineId: line.id,
        willUpdate: false,
        needsReview: false,
        canChoose: false,
        reason: "",
      };
      if (found.length === 0) {
        return matchingPurchaseProducts(line, expense, products, {
          ignoreUnit: true,
        }).length
          ? [
              {
                ...base,
                needsReview: true,
                reason:
                  "La unidad de compra no coincide con la ficha. Revisa las unidades antes de actualizar el coste.",
              },
            ]
          : [];
      }
      if (found.length !== 1)
        return [
          {
            ...base,
            needsReview: true,
            reason:
              "Hay varias fichas coincidentes. Se conserva su coste hasta identificar el producto.",
          },
        ];
      const product = found[0],
        price = purchaseLinePrice(line);
      const item = {
        ...base,
        productId: product.id,
        productName: product.name,
        previousCost: product.purchase?.netUnitCost ?? product.cost,
        proposedCost: price?.net,
      };
      if (!price || !price.consistent)
        return [
          {
            ...item,
            needsReview: true,
            reason:
              "El neto leído no coincide con tarifa y descuento. Revisa la línea; el coste anterior se conserva.",
          },
        ];
      if (product.priceSources?.some((source) => !isProductPriceSource(source)))
        return [
          {
            ...item,
            needsReview: true,
            reason:
              "La ficha contiene una fuente de precio pendiente de revisión. Se conserva su coste y todo su historial.",
          },
        ];
      if ((product.priceSources?.length ?? 0) >= 200)
        return [
          {
            ...item,
            needsReview: true,
            reason:
              "La ficha ya tiene 200 fuentes de precio. Conserva su historial antes de actualizar otro coste.",
          },
        ];
      const source = currentPriceSource(product);
      const latestDates = expenses
        .filter((e) => e.id !== expense.id && e.amount > 0)
        .flatMap((e) =>
          (e.purchaseLines ?? []).some(
            (l) =>
              expensePurchaseLineIsEligibleForProductCatalog(e, l) &&
              matchingPurchaseProducts(l, e, [product]).length === 1,
          )
            ? [e.date]
            : [],
        );
      const sourceDate =
        source?.documentDate ?? source?.recordedAt.slice(0, 10);
      if (sourceDate) latestDates.push(sourceDate);
      if (latestDates.some((d) => d > expense.date))
        return [
          {
            ...item,
            reason:
              "La factura es anterior a una referencia de precio más reciente. Se conserva el coste vigente.",
          },
        ];
      const others = matches.filter(
        (m) =>
          m.products.length === 1 &&
          m.products[0].id === product.id &&
          expensePurchaseLineIsEligibleForProductCatalog(expense, m.line),
      );
      const signatures = new Set(
        others.map((m) => JSON.stringify(purchaseLinePrice(m.line))),
      );
      const multiple = signatures.size > 1;
      const anotherChosen =
        multiple &&
        others.some(
          (m) => m.line.id !== line.id && m.line.updateCatalogCost === true,
        );
      const needsReview = alerts.has(line.id) || multiple;
      const willUpdate =
        line.updateCatalogCost === true ||
        (line.updateCatalogCost !== false && !needsReview && !anotherChosen);
      const reason =
        line.updateCatalogCost === false
          ? "Se guardará el gasto conservando el coste anterior."
          : multiple
            ? "El mismo producto aparece con distintos precios en esta factura. Elige como máximo una línea para actualizar su coste."
            : needsReview
              ? "Hay una variación de precio o descuento que conviene revisar. El coste anterior se conserva salvo que aceptes actualizarlo."
              : "Al guardar el gasto se actualizará el coste, conservando el PVP y los datos del producto.";
      return [{ ...item, needsReview, canChoose: true, willUpdate, reason }];
    },
  );
}

function sourceHash(value: string): string {
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(i);
  }
  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}
function sourceContent(source: ProductPriceSource): string {
  return JSON.stringify(
    Object.entries(source)
      .filter(([key, value]) => key !== "recordedAt" && value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}
function invoiceSource(
  expense: Expense,
  line: ExpensePurchaseLine,
  product: Product,
  now: string,
): ProductPriceSource {
  const price = purchaseLinePrice(line)!;
  const values = {
    kind:
      expense.purchaseDocument?.invoiceNumber ||
      expense.businessKind === "purchase_invoice"
        ? ("supplier_invoice" as const)
        : ("other" as const),
    supplierName: expense.supplierName,
    supplierReference:
      line.supplierReference ?? product.purchase?.supplierReference,
    unit: product.purchase?.unit ?? product.unit ?? line.unit ?? "ud",
    listPrice: price.list,
    discountPercent: line.discountPercent,
    netUnitCost: price.net,
    ivaPercent: line.ivaPercent ?? expense.ivaPercent,
    expenseId: expense.id,
    lineId: line.id,
    documentName: expense.purchaseDocument?.invoiceNumber
      ? "Factura de proveedor"
      : "Compra registrada",
    documentNumber: expense.purchaseDocument?.invoiceNumber,
    documentDate: expense.purchaseDocument?.issueDate ?? expense.date,
    sourceSha256: expense.originalArchive?.sourceSha256,
    note: "Coste adoptado al guardar esta compra. El precio de venta y los datos comerciales de la ficha se conservan.",
  };
  const id = `purchase-invoice:${sourceHash(JSON.stringify(values))}`;
  const source = { ...values, id, recordedAt: now };
  if (!isProductPriceSource(source))
    throw Error(
      "No se pudo conservar la procedencia del nuevo coste. Revisa los datos de la factura.",
    );
  return source;
}
/** Called only inside an explicit durable expense save; never on load or sync. */
export function productsWithExpenseCosts(input: {
  expense: Expense;
  products: Product[];
  expenses: Expense[];
  now: string;
}): Product[] {
  const reviews = reviewExpenseCatalogCosts(input);
  const chosen = new Map<string, ExpensePurchaseLine>();
  for (const review of reviews.filter((r) => r.willUpdate && r.productId)) {
    const line = input.expense.purchaseLines!.find(
      (l) => l.id === review.lineId,
    )!;
    const previous = chosen.get(review.productId!);
    if (
      previous &&
      JSON.stringify(purchaseLinePrice(previous)) !==
        JSON.stringify(purchaseLinePrice(line))
    )
      throw Error(
        "Elige una sola línea de precio por producto, o conserva el coste anterior.",
      );
    if (!previous) chosen.set(review.productId!, line);
  }
  return input.products.map((product) => {
    const line = chosen.get(product.id);
    if (!line) return product;
    const source = invoiceSource(input.expense, line, product, input.now);
    const history = product.priceSources ?? [];
    if (history.some((s) => !isProductPriceSource(s)))
      throw Error(
        "La ficha contiene una fuente de precio pendiente de revisión. Puedes guardar conservando su coste.",
      );
    const existing = history.find((s) => s.id === source.id);
    if (existing && sourceContent(existing) !== sourceContent(source))
      throw Error(
        "Dos fuentes de precio comparten identidad pero no contenido. Se conserva el coste anterior.",
      );
    if (!existing && history.length >= 200)
      throw Error(
        "La ficha ya tiene 200 fuentes de precio. Conserva su historial antes de actualizar otro coste.",
      );
    const purchase = {
      ...product.purchase,
      unit: source.unit,
      listPrice: source.listPrice,
      discountPercent: source.discountPercent,
      netUnitCost: source.netUnitCost,
      ivaPercent: source.ivaPercent,
      supplierId:
        input.expense.supplierId ??
        product.purchase?.supplierId ??
        product.supplierId,
      supplierName: input.expense.supplierName,
      supplierReference: source.supplierReference,
    };
    const next = withPriceSourceSummary({
      ...product,
      cost: source.netUnitCost,
      pvp: source.listPrice,
      purchase,
      priceSources: existing ? history : [...history, source],
      purchasePriceSourceId: source.id,
      updatedAt: input.now,
    });
    // Re-saving an unchanged invoice must not create another product version.
    return existing &&
      JSON.stringify({ ...next, updatedAt: product.updatedAt }) ===
        JSON.stringify(product)
      ? product
      : next;
  });
}
