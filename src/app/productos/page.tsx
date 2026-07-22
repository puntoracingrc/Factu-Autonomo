"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveRestore,
  Boxes,
  CalendarDays,
  Check,
  CheckSquare2,
  Copy,
  Edit3,
  Factory,
  FileText,
  GitMerge,
  MoreHorizontal,
  PackageSearch,
  Plus,
  Save,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { ResponsiveEntityPanel } from "@/components/ui/ResponsiveEntityPanel";
import { TimelineMonthDivider } from "@/components/ui/TimelineMonthDivider";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  DOCUMENT_UNIT_CATALOG,
  normalizeDocumentUnitId,
  unitShortLabel,
} from "@/lib/document-units";
import {
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
  addProductAttributeLine,
  productAttributesFromText,
  productAttributesToText,
} from "@/lib/product-attributes";
import {
  buildPurchaseProductSummaries,
  purchaseProductKey,
  type PurchaseProductSummary,
} from "@/lib/purchase-products";
import {
  calculatePurchaseNetUnitCost,
  purchaseNetUnitCostInputFromFields,
} from "@/lib/product-costs";
import {
  clearDocumentProductPickRequest,
  getDocumentProductPickRequest,
  productSummaryToPickedLine,
  productSummaryToDocumentDraftLine,
  saveDocumentProductPickedLine,
  saveProductDocumentDraft,
  type DocumentProductPickRequest,
} from "@/lib/product-document-draft";
import type { Product } from "@/lib/types";

const ALL = "__all__";
const NO_SUBFAMILY = "__no_subfamily__";
const CUSTOM_FAMILY = "__custom_family__";
const UNCATEGORIZED_FAMILY = "Sin familia";
const FAMILY_MARKER_KEY_PREFIX = "__family__-";
const SUBFAMILY_MARKER_KEY_PREFIX = "__subfamily__-";
type SubfamilyEntry = {
  family: string;
  name: string;
};
type ProductSort =
  | "newest"
  | "mostPurchases"
  | "leastPurchases"
  | "amountDesc"
  | "amountAsc"
  | "name";
type ProductCatalogView =
  | "all"
  | "unclassified"
  | "missing-sale-price"
  | "hidden";

const PRODUCT_CATALOG_VIEWS: Array<{
  value: ProductCatalogView;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "unclassified", label: "Por clasificar" },
  { value: "missing-sale-price", label: "Sin precio" },
  { value: "hidden", label: "Ocultos" },
];

const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "Última compra" },
  { value: "mostPurchases", label: "Más cantidad comprada" },
  { value: "leastPurchases", label: "Menos cantidad comprada" },
  { value: "amountDesc", label: "Mayor importe" },
  { value: "amountAsc", label: "Menor importe" },
  { value: "name", label: "Nombre" },
];

function productQuantityUnit(product: PurchaseProductSummary): string {
  const rawUnit = product.purchaseUnit ?? product.unit ?? product.saleUnit ?? "";
  return unitShortLabel(normalizeDocumentUnitId(rawUnit) ?? rawUnit);
}

function productQuantityLabel(product: PurchaseProductSummary): string {
  const unit = productQuantityUnit(product);
  return `${product.totalQuantity.toLocaleString("es-ES")} ${unit}`.trim();
}

function productDisplayName(product: PurchaseProductSummary): string {
  return product.saleDescription?.trim() || product.name;
}

function productFamilyDisplayName(family: string): string {
  return family.trim() === UNCATEGORIZED_FAMILY ? "Por clasificar" : family;
}

function productHasSalePrice(product: PurchaseProductSummary): boolean {
  return Boolean(product.saleUnitPrice && product.saleUnitPrice > 0);
}

function productCostValue(
  product: PurchaseProductSummary,
): number | undefined {
  if (product.purchaseNetUnitCost && product.purchaseNetUnitCost > 0) {
    return product.purchaseNetUnitCost;
  }
  if (product.purchaseCount > 0 && product.lastUnitPrice > 0) {
    return product.lastUnitPrice;
  }
  return undefined;
}

function productMatchesCatalogView(
  product: PurchaseProductSummary,
  view: ProductCatalogView,
): boolean {
  if (view === "unclassified") {
    return !product.family.trim() || product.family === UNCATEGORIZED_FAMILY;
  }
  if (view === "missing-sale-price") return !productHasSalePrice(product);
  return view !== "hidden";
}

function defaultSubfamilyForFamily(): string {
  return ALL;
}

function isFamilyMarker(product: Product): boolean {
  return product.hidden === true && product.key.startsWith(FAMILY_MARKER_KEY_PREFIX);
}

function isSubfamilyMarker(product: Product): boolean {
  return (
    product.hidden === true && product.key.startsWith(SUBFAMILY_MARKER_KEY_PREFIX)
  );
}

function productHasCustomDisplayName(product: PurchaseProductSummary): boolean {
  return Boolean(
    product.saleDescription?.trim() &&
      product.saleDescription.trim() !== product.name.trim(),
  );
}

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberToInput(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? "" : String(value);
}

function productMatchesDocumentPickRequest(
  product: PurchaseProductSummary,
  request: DocumentProductPickRequest | null,
): boolean {
  if (!request) return false;
  return Boolean(
    (request.productId && product.productId === request.productId) ||
    (request.productKey && product.key === request.productKey),
  );
}

export default function ProductosPage() {
  const router = useRouter();
  const {
    data,
    addProduct,
    updateProduct,
    renameProductFamily: renameProductFamilyInStore,
    deleteProduct,
    mergeProducts,
  } = useAppStore();
  const { checkCanAddProduct } = useBilling();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState(ALL);
  const [subfamily, setSubfamily] = useState(ALL);
  const [supplier, setSupplier] = useState(ALL);
  const [sort, setSort] = useState<ProductSort>("newest");
  const [catalogView, setCatalogView] = useState<ProductCatalogView>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [familyFormOpen, setFamilyFormOpen] = useState(false);
  const [familyDraft, setFamilyDraft] = useState("");
  const [familyRenameOpen, setFamilyRenameOpen] = useState(false);
  const [familyRenameFrom, setFamilyRenameFrom] = useState("");
  const [familyRenameTo, setFamilyRenameTo] = useState("");
  const [subfamilyFormOpen, setSubfamilyFormOpen] = useState(false);
  const [subfamilyDraft, setSubfamilyDraft] = useState("");
  const [subfamilyRenameOpen, setSubfamilyRenameOpen] = useState(false);
  const [subfamilyRenameFrom, setSubfamilyRenameFrom] = useState("");
  const [subfamilyRenameTo, setSubfamilyRenameTo] = useState("");
  const [bulkFamilyDraft, setBulkFamilyDraft] = useState("");
  const [bulkSubfamilyDraft, setBulkSubfamilyDraft] = useState("");
  const [familyStructureOpen, setFamilyStructureOpen] = useState(false);
  const [supplierStructureOpen, setSupplierStructureOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<
    "new" | "rename" | "mobile" | null
  >(null);
  const [familyNotice, setFamilyNotice] = useState<string | null>(null);
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const [documentPickRequest, setDocumentPickRequest] =
    useState<DocumentProductPickRequest | null>(null);
  const [editingProductKey, setEditingProductKey] = useState<string | null>(null);
  const productActionsRef = useRef<HTMLDivElement | null>(null);

  const products = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.products),
    [data.expenses, data.products],
  );
  const hiddenProducts = useMemo(
    () =>
      data.products.filter(
        (product) =>
          product.hidden &&
          !isFamilyMarker(product) &&
          !isSubfamilyMarker(product),
      ),
    [data.products],
  );

  const families = useMemo(
    () =>
      [
        ...new Set(
          [
            ...products.map((product) => product.family),
            ...data.products.map((product) => product.family),
          ]
            .map((familyName) => familyName.trim())
            .filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [data.products, products],
  );

  const subfamilyEntries = useMemo<SubfamilyEntry[]>(
    () => {
      const entries = [
        ...products.map((product) => ({
          family: product.family,
          name: product.subfamily,
        })),
        ...data.products.map((product) => ({
          family: product.family,
          name: product.subfamily,
        })),
      ];
      const unique = new Map<string, SubfamilyEntry>();
      for (const entry of entries) {
        const familyName = entry.family.trim() || "Sin familia";
        const subfamilyName = entry.name?.trim();
        if (!subfamilyName) continue;
        unique.set(
          `${familyName.toLocaleLowerCase("es")}:::${subfamilyName.toLocaleLowerCase("es")}`,
          {
            family: familyName,
            name: subfamilyName,
          },
        );
      }
      return [...unique.values()].sort(
        (a, b) =>
          a.family.localeCompare(b.family, "es") ||
          a.name.localeCompare(b.name, "es"),
      );
    },
    [data.products, products],
  );

  const selectedFamilySubfamilies = useMemo(
    () =>
      family === ALL
        ? []
        : subfamilyEntries
            .filter((entry) => entry.family === family)
            .map((entry) => entry.name),
    [family, subfamilyEntries],
  );

  const familyStructure = useMemo(() => {
    const byFamily = new Map<
      string,
      {
        family: string;
        directCount: number;
        totalCount: number;
        subfamilies: Map<string, number>;
      }
    >();
    const ensureFamily = (familyName: string) => {
      const normalizedFamily = familyName.trim() || "Sin familia";
      const existing = byFamily.get(normalizedFamily);
      if (existing) return existing;
      const created = {
        family: normalizedFamily,
        directCount: 0,
        totalCount: 0,
        subfamilies: new Map<string, number>(),
      };
      byFamily.set(normalizedFamily, created);
      return created;
    };

    for (const familyName of families) {
      ensureFamily(familyName);
    }
    for (const entry of subfamilyEntries) {
      ensureFamily(entry.family).subfamilies.set(entry.name, 0);
    }
    for (const product of products) {
      const entry = ensureFamily(product.family);
      const productSubfamily = product.subfamily?.trim();
      entry.totalCount += 1;
      if (!productSubfamily) {
        entry.directCount += 1;
        continue;
      }
      entry.subfamilies.set(
        productSubfamily,
        (entry.subfamilies.get(productSubfamily) ?? 0) + 1,
      );
    }

    return [...byFamily.values()]
      .map((entry) => ({
        family: entry.family,
        directCount: entry.directCount,
        totalCount: entry.totalCount,
        subfamilies: [...entry.subfamilies.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      }))
      .sort((a, b) => a.family.localeCompare(b.family, "es"));
  }, [families, products, subfamilyEntries]);

  const suppliers = useMemo(
    () =>
      [
        ...new Set(
          [
            ...products.map(
              (product) => product.usualSupplier?.supplierName,
            ),
            ...hiddenProducts.map(
              (product) =>
                product.purchase?.supplierName ?? product.supplierName,
            ),
          ]
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [hiddenProducts, products],
  );

  const supplierStructure = useMemo(
    () =>
      suppliers
        .map((supplierName) => {
          const supplierProducts = products.filter(
            (product) => product.usualSupplier?.supplierName === supplierName,
          );
          return {
            name: supplierName,
            count: supplierProducts.length,
            totalBase: supplierProducts.reduce(
              (sum, product) => sum + product.totalBase,
              0,
            ),
          };
        })
        .sort(
          (a, b) =>
            b.totalBase - a.totalBase || a.name.localeCompare(b.name, "es"),
        ),
    [products, suppliers],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          productDisplayName(product),
          product.name,
          product.saleDescription,
          product.purchaseDescription,
          product.family,
          product.subfamily,
          product.usualSupplier?.supplierName,
          product.suppliers.map((entry) => entry.supplierName).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFamily = family === ALL || product.family === family;
      const matchesSubfamily =
        subfamily === ALL ||
        (subfamily === NO_SUBFAMILY
          ? !product.subfamily
          : product.subfamily === subfamily);
      const matchesSupplier =
        supplier === ALL || product.usualSupplier?.supplierName === supplier;
      const matchesView = productMatchesCatalogView(product, catalogView);

      return (
        matchesView &&
        matchesQuery &&
        matchesFamily &&
        matchesSubfamily &&
        matchesSupplier
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "mostPurchases":
          return b.totalQuantity - a.totalQuantity || b.totalBase - a.totalBase;
        case "leastPurchases":
          return a.totalQuantity - b.totalQuantity || a.totalBase - b.totalBase;
        case "amountDesc":
          return b.totalBase - a.totalBase || b.totalQuantity - a.totalQuantity;
        case "amountAsc":
          return a.totalBase - b.totalBase || a.totalQuantity - b.totalQuantity;
        case "name":
          return productDisplayName(a).localeCompare(
            productDisplayName(b),
            "es",
          );
        case "newest":
        default:
          if (a.purchaseCount === 0 && b.purchaseCount > 0) return 1;
          if (b.purchaseCount === 0 && a.purchaseCount > 0) return -1;
          if (a.purchaseCount === 0 && b.purchaseCount === 0) {
            return productDisplayName(a).localeCompare(
              productDisplayName(b),
              "es",
            );
          }
          return b.lastPurchaseDate.localeCompare(a.lastPurchaseDate);
      }
    });
  }, [catalogView, family, products, query, sort, subfamily, supplier]);

  const filteredHiddenProducts = useMemo(() => {
    if (catalogView !== "hidden") return [];
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return hiddenProducts
      .filter((product) => {
        const hiddenSupplier =
          product.purchase?.supplierName ?? product.supplierName;
        const matchesQuery =
          !normalizedQuery ||
          [
            product.sales?.description,
            product.name,
            product.family,
            product.subfamily,
            hiddenSupplier,
            product.sku,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("es")
            .includes(normalizedQuery);
        const matchesFamily = family === ALL || product.family === family;
        const matchesSubfamily =
          subfamily === ALL ||
          (subfamily === NO_SUBFAMILY
            ? !product.subfamily
            : product.subfamily === subfamily);
        const matchesSupplier =
          supplier === ALL || hiddenSupplier === supplier;
        return (
          matchesQuery &&
          matchesFamily &&
          matchesSubfamily &&
          matchesSupplier
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "es")
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }, [
    catalogView,
    family,
    hiddenProducts,
    query,
    sort,
    subfamily,
    supplier,
  ]);

  const totals = useMemo(
    () => ({
      products: products.length,
      families: families.filter(
        (familyName) => familyName !== UNCATEGORIZED_FAMILY,
      ).length,
      suppliers: suppliers.length,
      totalBase: products.reduce((sum, product) => sum + product.totalBase, 0),
    }),
    [families, products, suppliers.length],
  );
  const catalogViewCounts = useMemo(
    () => ({
      all: products.length,
      unclassified: products.filter((product) =>
        productMatchesCatalogView(product, "unclassified"),
      ).length,
      "missing-sale-price": products.filter((product) =>
        productMatchesCatalogView(product, "missing-sale-price"),
      ).length,
      hidden: hiddenProducts.length,
    }),
    [hiddenProducts.length, products],
  );
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const visibleHiddenProducts = filteredHiddenProducts.slice(0, visibleCount);
  const visibleProductGroups = useMemo(() => {
    if (sort !== "mostPurchases" && sort !== "leastPurchases") {
      return [{ key: "all", title: null, products: visibleProducts }];
    }
    const groups: Array<{
      key: string;
      title: string;
      products: PurchaseProductSummary[];
    }> = [];
    for (const product of visibleProducts) {
      const key = `${product.totalQuantity}:${productQuantityUnit(product).toLowerCase()}`;
      const current = groups[groups.length - 1];
      if (current?.key === key) {
        current.products.push(product);
        continue;
      }
      groups.push({
        key,
        title: productQuantityLabel(product),
        products: [product],
      });
    }
    return groups;
  }, [sort, visibleProducts]);
  const selectedProducts = useMemo(
    () =>
      selectedProductKeys
        .map((key) => products.find((product) => product.key === key))
        .filter((product): product is PurchaseProductSummary =>
          Boolean(product),
        ),
    [products, selectedProductKeys],
  );
  const activeFilterCount =
    Number(family !== ALL) +
    Number(subfamily !== ALL) +
    Number(supplier !== ALL) +
    Number(sort !== "newest");
  const currentResultCount =
    catalogView === "hidden"
      ? filteredHiddenProducts.length
      : filteredProducts.length;

  const bulkSubfamilyOptions = useMemo(() => {
    const selectedFamilies = [
      ...new Set(selectedProducts.map((product) => product.family)),
    ];
    if (selectedFamilies.length === 1) {
      return subfamilyEntries
        .filter((entry) => entry.family === selectedFamilies[0])
        .map((entry) => entry.name);
    }
    return [];
  }, [selectedProducts, subfamilyEntries]);

  useEffect(() => {
    setVisibleCount(30);
  }, [catalogView, family, query, sort, subfamily, supplier]);

  useEffect(() => {
    setSelectedProductKeys([]);
    setSelectionMode(false);
  }, [catalogView]);

  useEffect(() => {
    if (family === ALL) {
      if (subfamily !== ALL) setSubfamily(ALL);
      return;
    }
    if (subfamily === ALL) return;
    if (selectedFamilySubfamilies.includes(subfamily)) return;
    setSubfamily(ALL);
  }, [family, selectedFamilySubfamilies, subfamily]);

  useEffect(() => {
    setDocumentPickRequest(getDocumentProductPickRequest());
  }, []);

  useEffect(() => {
    if (!actionMenuOpen) return;

    function closeMenuOnOutsideClick(event: PointerEvent) {
      if (
        productActionsRef.current &&
        event.target instanceof Node &&
        productActionsRef.current.contains(event.target)
      ) {
        return;
      }
      setActionMenuOpen(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActionMenuOpen(null);
    }

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    document.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      document.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [actionMenuOpen]);

  useEffect(() => {
    if (!documentPickRequest) return;
    const targetProduct =
      documentPickRequest.mode === "edit" &&
      (documentPickRequest.productId || documentPickRequest.productKey)
        ? products.find((product) =>
            productMatchesDocumentPickRequest(product, documentPickRequest),
          )
        : undefined;
    const searchTerm =
      (targetProduct ? productDisplayName(targetProduct) : undefined) ??
      documentPickRequest.prefill?.description?.trim() ??
      documentPickRequest.prefill?.name?.trim();
    if (!searchTerm) return;
    setQuery(searchTerm);
    setCatalogView("all");
    setFamily(ALL);
    setSubfamily(ALL);
    setSupplier(ALL);
    setSort("name");
  }, [documentPickRequest, products]);

  function toggleProductForDraft(product: PurchaseProductSummary) {
    setSelectedProductKeys((current) =>
      current.includes(product.key)
        ? current.filter((key) => key !== product.key)
        : [...current, product.key],
    );
  }

  function applyCatalogView(view: ProductCatalogView) {
    setCatalogView(view);
    setVisibleCount(30);
  }

  function clearCatalogFilters() {
    setFamily(ALL);
    setSubfamily(ALL);
    setSupplier(ALL);
    setSort("newest");
  }

  function restoreHiddenProduct(product: Product) {
    updateProduct({ ...product, hidden: false });
  }

  function selectVisibleProducts() {
    setSelectedProductKeys((current) => [
      ...new Set([
        ...current,
        ...visibleProducts.map((product) => product.key),
      ]),
    ]);
  }

  function clearSelectedProducts() {
    setSelectedProductKeys([]);
    setBulkFamilyDraft("");
    setBulkSubfamilyDraft("");
  }

  function openDocumentFromSelected(
    documentType: "factura" | "presupuesto" | "recibo",
  ) {
    if (selectedProducts.length === 0) return;
    const lines = selectedProducts.map((product) =>
      productSummaryToDocumentDraftLine(
        product,
        data.profile.iva?.defaultRate ?? 21,
      ),
    );
    if (!saveProductDocumentDraft(documentType, lines)) {
      alert("No se pudo preparar el documento. Inténtalo de nuevo.");
      return;
    }
    const route =
      documentType === "factura"
        ? "/facturas/nuevo"
        : documentType === "presupuesto"
          ? "/presupuestos/nuevo"
          : "/recibos/nuevo";
    router.push(`${route}?desde=productos`);
  }

  function handlePickProductForDocument(product: PurchaseProductSummary) {
    if (!documentPickRequest) return;
    const pickedLine = productSummaryToPickedLine(
      product,
      documentPickRequest,
      data.profile.iva?.defaultRate ?? 21,
    );
    if (!saveDocumentProductPickedLine(pickedLine)) {
      alert("No se pudo llevar el producto al documento. Inténtalo de nuevo.");
      return;
    }
    clearDocumentProductPickRequest();
    router.push(documentPickRequest.returnPath);
  }

  function handlePickSavedProductForDocument(savedProduct: Product) {
    if (!documentPickRequest) return;
    const catalogProducts = data.products.some(
      (product) => product.id === savedProduct.id,
    )
      ? data.products.map((product) =>
          product.id === savedProduct.id ? savedProduct : product,
        )
      : [...data.products, savedProduct];
    const savedSummary = buildPurchaseProductSummaries(
      data.expenses,
      catalogProducts,
    ).find(
      (product) =>
        product.productId === savedProduct.id ||
        product.key === savedProduct.key,
    );
    if (!savedSummary) {
      alert("El producto se ha guardado, pero no se pudo llevar al documento.");
      return;
    }
    handlePickProductForDocument(savedSummary);
  }

  function cancelDocumentPick() {
    if (!documentPickRequest) return;
    clearDocumentProductPickRequest();
    router.push(documentPickRequest.returnPath);
  }

  function productFromSummary(
    product: PurchaseProductSummary,
  ): Omit<Product, "id" | "createdAt" | "updatedAt"> {
    return {
      key: product.key,
      aliases: product.aliases,
      sku: product.sku,
      externalId: product.externalId,
      name: product.name,
      family: product.family,
      subfamily: product.subfamily,
      unit: product.saleUnit ?? product.unit,
      supplierId: product.usualSupplier?.supplierId,
      supplierName: product.usualSupplier?.supplierName,
      pvp: (product.purchaseListPrice ?? product.lastPvp) || undefined,
      cost: (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
      ivaPercent: product.saleIvaPercent ?? product.ivaPercent,
      sales: {
        enabled: true,
        description: product.saleDescription,
        unit: product.saleUnit ?? product.unit,
        unitPrice: product.saleUnitPrice,
        ivaPercent: product.saleIvaPercent ?? product.ivaPercent,
      },
      purchase: {
        enabled: true,
        description: product.purchaseDescription,
        unit: product.purchaseUnit ?? product.unit,
        listPrice: (product.purchaseListPrice ?? product.lastPvp) || undefined,
        discountPercent:
          (product.purchaseDiscountPercent ?? product.lastDiscountPercent) ||
          undefined,
        netUnitCost:
          (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
        ivaPercent: product.ivaPercent,
        supplierId: product.usualSupplier?.supplierId,
        supplierName: product.usualSupplier?.supplierName,
        supplierReference: product.purchaseSupplierReference,
        purchaseToSaleFactor: product.purchaseToSaleFactor,
      },
      calculation: product.calculation,
      attributes: product.attributes,
      notes: product.notes,
      source: product.source,
    };
  }

  function catalogProductCount(): number {
    return data.products.filter((product) => !product.hidden).length;
  }

  function canAddCatalogProduct(): boolean {
    const limit = checkCanAddProduct(catalogProductCount());
    if (limit.allowed) return true;
    alert(limit.reason ?? "No puedes añadir más productos con tu plan actual.");
    return false;
  }

  function saveProductPatch(
    product: PurchaseProductSummary,
    patch: Partial<Product>,
  ): Product | null {
    const existing = product.productId
      ? data.products.find((entry) => entry.id === product.productId)
      : data.products.find((entry) => entry.key === product.key);
    if (existing) {
      const updated = { ...existing, ...patch };
      updateProduct(updated);
      return updated;
    }
    if (!canAddCatalogProduct()) return null;
    return addProduct({ ...productFromSummary(product), ...patch });
  }

  function saveProductStructurePatch(
    product: PurchaseProductSummary,
    patch: Partial<Product>,
  ): Product {
    const existing = product.productId
      ? data.products.find((entry) => entry.id === product.productId)
      : data.products.find((entry) => entry.key === product.key);
    if (existing) {
      const updated = { ...existing, ...patch };
      updateProduct(updated);
      return updated;
    }
    return addProduct({ ...productFromSummary(product), ...patch });
  }

  function catalogProductForSummary(
    product: PurchaseProductSummary,
  ): Product | undefined {
    if (product.productId) {
      return data.products.find((entry) => entry.id === product.productId);
    }
    return data.products.find((entry) => entry.key === product.key);
  }

  function saveProductFamily(
    product: PurchaseProductSummary,
    targetFamily: string,
  ): Product | null {
    const normalizedFamily = targetFamily.trim() || "Sin familia";
    const existing = catalogProductForSummary(product);
    if (existing) {
      const updated = {
        ...existing,
        family: normalizedFamily,
        source: "manual" as const,
        hidden: false,
      };
      updateProduct(updated);
      return updated;
    }
    if (!canAddCatalogProduct()) return null;
    return addProduct({
      ...productFromSummary(product),
      family: normalizedFamily,
      source: "manual",
    });
  }

  function saveProductSubfamily(
    product: PurchaseProductSummary,
    targetSubfamily: string,
  ): Product | null {
    const normalizedSubfamily = targetSubfamily.trim() || undefined;
    const existing = catalogProductForSummary(product);
    if (existing) {
      const updated = {
        ...existing,
        subfamily: normalizedSubfamily,
        source: "manual" as const,
        hidden: false,
      };
      updateProduct(updated);
      return updated;
    }
    if (!canAddCatalogProduct()) return null;
    return addProduct({
      ...productFromSummary(product),
      subfamily: normalizedSubfamily,
      source: "manual",
    });
  }

  function assignSelectedFamily() {
    const targetFamily = bulkFamilyDraft.trim();
    if (!targetFamily) {
      setFamilyNotice("Elige o escribe la familia de destino.");
      return;
    }
    if (selectedProducts.length === 0) return;

    let savedCount = 0;
    for (const product of selectedProducts) {
      if (saveProductFamily(product, targetFamily)) savedCount += 1;
    }
    if (savedCount === 0) return;

    setFamily(targetFamily);
    setSupplier(ALL);
    setSelectedProductKeys([]);
    setBulkFamilyDraft("");
    setFamilyNotice(
      `${savedCount} producto(s) movido(s) a "${targetFamily}". La próxima lectura del mismo producto recordará esta familia.`,
    );
  }

  function assignSelectedSubfamily() {
    const selectedFamilies = [
      ...new Set(selectedProducts.map((product) => product.family)),
    ];
    if (selectedFamilies.length !== 1) {
      setFamilyNotice(
        "Selecciona productos de una sola familia para moverlos a una subfamilia.",
      );
      return;
    }
    const targetSubfamily = bulkSubfamilyDraft.trim();
    if (!targetSubfamily) {
      setFamilyNotice("Elige o escribe la subfamilia de destino.");
      return;
    }
    if (selectedProducts.length === 0) return;

    let savedCount = 0;
    for (const product of selectedProducts) {
      if (saveProductSubfamily(product, targetSubfamily)) savedCount += 1;
    }
    if (savedCount === 0) return;

    setSubfamily(targetSubfamily);
    setSupplier(ALL);
    setSelectedProductKeys([]);
    setBulkSubfamilyDraft("");
    setFamilyNotice(
      `${savedCount} producto(s) movido(s) a "${selectedFamilies[0]} / ${targetSubfamily}". La próxima lectura del mismo producto recordará esta subfamilia.`,
    );
  }

  function renameFamily() {
    const sourceFamily = familyRenameFrom.trim();
    const targetFamily = familyRenameTo.trim();
    if (!sourceFamily) {
      setFamilyNotice("Elige la familia que quieres renombrar.");
      return;
    }
    if (!targetFamily) {
      setFamilyNotice("Escribe el nuevo nombre de la familia.");
      return;
    }
    if (sourceFamily === targetFamily) {
      setFamilyRenameOpen(false);
      setFamilyNotice("La familia ya tenía ese nombre.");
      return;
    }

    const newCatalogProducts = products.filter(
      (product) =>
        product.family === sourceFamily && !catalogProductForSummary(product),
    ).length;
    if (newCatalogProducts > 0) {
      const limit = checkCanAddProduct(
        catalogProductCount() + newCatalogProducts - 1,
      );
      if (!limit.allowed) {
        setFamilyNotice(
          limit.reason ??
            "No puedes guardar el aprendizaje de todos los productos de esta familia con tu plan actual.",
        );
        return;
      }
    }

    const result = renameProductFamilyInStore(sourceFamily, targetFamily);
    if (!result.ok) {
      setFamilyNotice(result.error);
      return;
    }

    if (family === sourceFamily) setFamily(targetFamily);
    setFamilyRenameFrom("");
    setFamilyRenameTo("");
    setFamilyRenameOpen(false);
    setFamilyNotice(
      `Familia "${sourceFamily}" renombrada a "${targetFamily}" en ${result.productCount} producto(s).${
        result.ruleMigrated
          ? " La regla de margen se ha conservado con el nuevo nombre."
          : ""
      }`,
    );
  }

  function renameSubfamily() {
    if (family === ALL) {
      setFamilyNotice("Elige primero una familia para renombrar su subfamilia.");
      return;
    }
    const sourceSubfamily = subfamilyRenameFrom.trim();
    const targetSubfamily = subfamilyRenameTo.trim();
    if (!sourceSubfamily) {
      setFamilyNotice("Elige la subfamilia que quieres renombrar.");
      return;
    }
    if (!targetSubfamily) {
      setFamilyNotice("Escribe el nuevo nombre de la subfamilia.");
      return;
    }
    if (sourceSubfamily === targetSubfamily) {
      setSubfamilyRenameOpen(false);
      setFamilyNotice("La subfamilia ya tenía ese nombre.");
      return;
    }

    const affectedProducts = products.filter(
      (product) =>
        product.family === family && product.subfamily === sourceSubfamily,
    );
    let savedCount = 0;
    for (const product of affectedProducts) {
      if (saveProductSubfamily(product, targetSubfamily)) savedCount += 1;
    }

    for (const product of data.products) {
      if (
        product.family !== family ||
        product.subfamily !== sourceSubfamily ||
        !product.hidden
      ) {
        continue;
      }
      updateProduct({
        ...product,
        subfamily: targetSubfamily,
        name: product.name.startsWith("Subfamilia:")
          ? `Subfamilia: ${targetSubfamily}`
          : product.name,
      });
    }

    if (subfamily === sourceSubfamily) setSubfamily(targetSubfamily);
    setSubfamilyRenameFrom("");
    setSubfamilyRenameTo("");
    setSubfamilyRenameOpen(false);
    setFamilyNotice(
      `Subfamilia "${sourceSubfamily}" renombrada a "${targetSubfamily}" en ${savedCount} producto(s).`,
    );
  }

  function deleteFamilyFromStructure(sourceFamily: string) {
    if (!sourceFamily || sourceFamily === UNCATEGORIZED_FAMILY) return;

    const structureEntry = familyStructure.find(
      (entry) => entry.family === sourceFamily,
    );
    const productCount = structureEntry?.totalCount ?? 0;
    const subfamilyCount = structureEntry?.subfamilies.length ?? 0;
    const productCopy =
      productCount === 1
        ? "El producto incluido pasará a Sin familia."
        : productCount > 1
          ? `Los ${productCount} productos incluidos pasarán a Sin familia.`
          : "La familia se quitará de la estructura.";
    const subfamilyCopy =
      subfamilyCount > 0
        ? " También se quitarán sus subfamilias."
        : "";

    if (
      !confirm(
        `¿Borrar la familia "${sourceFamily}"?\n\n${productCopy}${subfamilyCopy}\n\nNo se borrará ningún producto.`,
      )
    ) {
      return;
    }

    const handledProductIds = new Set<string>();
    let movedCount = 0;
    for (const product of products) {
      if (product.family !== sourceFamily) continue;
      const updated = saveProductStructurePatch(product, {
        family: UNCATEGORIZED_FAMILY,
        subfamily: undefined,
        source: "manual",
      });
      handledProductIds.add(updated.id);
      movedCount += 1;
    }

    for (const product of data.products) {
      if (handledProductIds.has(product.id) || product.family !== sourceFamily) {
        continue;
      }
      if (isFamilyMarker(product) || isSubfamilyMarker(product)) {
        deleteProduct(product.id);
        continue;
      }
      updateProduct({
        ...product,
        family: UNCATEGORIZED_FAMILY,
        subfamily: undefined,
        source: "manual",
      });
      movedCount += 1;
    }

    if (family === sourceFamily) {
      setFamily(ALL);
      setSubfamily(ALL);
    }
    setSelectedProductKeys([]);
    setFamilyNotice(
      `Familia "${sourceFamily}" borrada. ${movedCount} producto(s) quedan ahora sin familia.`,
    );
  }

  function deleteSubfamilyFromStructure(
    sourceFamily: string,
    sourceSubfamily: string,
  ) {
    if (!sourceFamily || !sourceSubfamily) return;

    const structureEntry = familyStructure.find(
      (entry) => entry.family === sourceFamily,
    );
    const productCount =
      structureEntry?.subfamilies.find((entry) => entry.name === sourceSubfamily)
        ?.count ?? 0;
    const productCopy =
      productCount === 1
        ? `El producto incluido seguirá en "${sourceFamily}", sin subfamilia.`
        : productCount > 1
          ? `Los ${productCount} productos incluidos seguirán en "${sourceFamily}", sin subfamilia.`
          : "La subfamilia se quitará de la estructura.";

    if (
      !confirm(
        `¿Borrar la subfamilia "${sourceSubfamily}"?\n\n${productCopy}\n\nNo se borrará ningún producto.`,
      )
    ) {
      return;
    }

    const handledProductIds = new Set<string>();
    let movedCount = 0;
    for (const product of products) {
      if (
        product.family !== sourceFamily ||
        product.subfamily !== sourceSubfamily
      ) {
        continue;
      }
      const updated = saveProductStructurePatch(product, {
        subfamily: undefined,
        source: "manual",
      });
      handledProductIds.add(updated.id);
      movedCount += 1;
    }

    for (const product of data.products) {
      if (
        handledProductIds.has(product.id) ||
        product.family !== sourceFamily ||
        product.subfamily !== sourceSubfamily
      ) {
        continue;
      }
      if (isSubfamilyMarker(product)) {
        deleteProduct(product.id);
        continue;
      }
      updateProduct({
        ...product,
        subfamily: undefined,
        source: "manual",
      });
      movedCount += 1;
    }

    if (family === sourceFamily && subfamily === sourceSubfamily) {
      setSubfamily(ALL);
    }
    setSelectedProductKeys([]);
    setFamilyNotice(
      `Subfamilia "${sourceSubfamily}" borrada. ${movedCount} producto(s) quedan en "${sourceFamily}", sin subfamilia.`,
    );
  }

  function handleMergeProducts(
    keep: PurchaseProductSummary,
    removeKey: string,
  ) {
    const remove = products.find((product) => product.key === removeKey);
    if (!remove) return;

    const keepProduct = saveProductPatch(keep, {
      aliases: [
        ...new Set([...(keep.aliases ?? []), remove.key, ...remove.aliases]),
      ],
      source: keep.source === "manual" ? "manual" : "detected",
    });
    if (!keepProduct) return;
    if (remove.productId) {
      mergeProducts(keepProduct.id, [remove.productId]);
    }
  }

  function uniqueDuplicateProductParts(product: PurchaseProductSummary): {
    key: string;
    name: string;
  } {
    const existingKeys = new Set(data.products.map((entry) => entry.key));
    const existingNames = new Set(
      data.products.map((entry) => entry.name.trim().toLowerCase()),
    );

    for (let copyNumber = 1; copyNumber < 100; copyNumber += 1) {
      const suffix = copyNumber === 1 ? "copia" : `copia ${copyNumber}`;
      const name = `${product.name} ${suffix}`;
      const key = purchaseProductKey(
        `copia ${String(copyNumber).padStart(2, "0")} ${product.key}`,
      );
      if (!existingKeys.has(key) && !existingNames.has(name.toLowerCase())) {
        return { key, name };
      }
    }

    const fallback = Date.now().toString();
    return {
      key: purchaseProductKey(`copia ${fallback} ${product.key}`),
      name: `${product.name} copia`,
    };
  }

  function duplicateProduct(product: PurchaseProductSummary) {
    if (!canAddCatalogProduct()) return;
    const duplicate = uniqueDuplicateProductParts(product);
    const created = addProduct({
      ...productFromSummary(product),
      key: duplicate.key,
      aliases: [],
      name: duplicate.name,
      source: "manual",
    });
    setQuery("");
    setFamily(ALL);
    setSubfamily(ALL);
    setSupplier(ALL);
    setSort("newest");
    setVisibleCount((current) => Math.max(current, 30));
    setEditingProductKey(created.key);
  }

  function removeProduct(product: PurchaseProductSummary) {
    const existing = product.productId
      ? data.products.find((entry) => entry.id === product.productId)
      : undefined;

    if (existing && product.purchaseCount === 0) {
      if (confirm("¿Eliminar este producto?")) {
        deleteProduct(existing.id);
        setSelectedProductKeys((current) =>
          current.filter((key) => key !== product.key),
        );
      }
      return;
    }

    const message =
      "¿Ocultar este producto de la lista? Las compras registradas seguirán guardadas.";
    if (!confirm(message)) return;

    if (existing) {
      updateProduct({ ...existing, hidden: true });
    } else {
      addProduct({
        ...productFromSummary(product),
        hidden: true,
        source: "detected",
      });
    }
    setSelectedProductKeys((current) =>
      current.filter((key) => key !== product.key),
    );
  }

  function createFamily() {
    const name = familyDraft.trim();
    if (!name) {
      setFamilyNotice("Escribe el nombre de la familia.");
      return;
    }
    const existing = families.find(
      (item) => item.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
    );
    if (existing) {
      setFamilyDraft("");
      setFamily(ALL);
      setFamilyFormOpen(false);
      setFamilyNotice(`La familia "${existing}" ya existía.`);
      return;
    }

    addProduct({
      key: `__family__-${purchaseProductKey(name)}`,
      aliases: [],
      name: `Familia: ${name}`,
      family: name,
      unit: "ud",
      hidden: true,
      source: "manual",
      notes: "Marcador interno para recordar una familia creada a mano.",
    });
    setFamilyDraft("");
    setFamily(ALL);
    setFamilyFormOpen(false);
    setFamilyNotice(`Familia "${name}" creada. Ya puedes usarla en productos.`);
  }

  function createSubfamily() {
    if (family === ALL) {
      setFamilyNotice("Elige primero la familia donde irá esta subfamilia.");
      return;
    }
    const name = subfamilyDraft.trim();
    if (!name) {
      setFamilyNotice("Escribe el nombre de la subfamilia.");
      return;
    }
    const existing = subfamilyEntries.find(
      (item) =>
        item.family === family &&
        item.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
    );
    if (existing) {
      setSubfamilyDraft("");
      setSubfamily(existing.name);
      setSubfamilyFormOpen(false);
      setFamilyNotice(
        `La subfamilia "${existing.name}" ya existía dentro de "${family}".`,
      );
      return;
    }

    const familyScope = family;
    addProduct({
      key: `__subfamily__-${purchaseProductKey(`${familyScope} ${name}`)}`,
      aliases: [],
      name: `Subfamilia: ${name}`,
      family: familyScope,
      subfamily: name,
      unit: "ud",
      hidden: true,
      source: "manual",
      notes: "Marcador interno para recordar una subfamilia creada a mano.",
    });
    setSubfamilyDraft("");
    setSubfamily(name);
    setSubfamilyFormOpen(false);
    setFamilyNotice(
      `Subfamilia "${name}" creada dentro de "${familyScope}". Ya puedes usarla en productos.`,
    );
  }

  function applyFamilyStructureFilter(
    targetFamily: string,
    targetSubfamily: string,
  ) {
    setQuery("");
    setFamily(targetFamily);
    setSubfamily(targetSubfamily);
    setSupplier(ALL);
  }

  function applySupplierStructureFilter(targetSupplier: string) {
    setQuery("");
    setFamily(ALL);
    setSubfamily(ALL);
    setSupplier(targetSupplier);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Productos"
        subtitle="Catálogo aprendido de tus compras y productos habituales."
        action={
          <div
            ref={productActionsRef}
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-row"
          >
            <div className="relative sm:hidden">
              <button
                type="button"
                onClick={() =>
                  setActionMenuOpen((current) =>
                    current === "mobile" ? null : "mobile",
                  )
                }
                aria-expanded={actionMenuOpen === "mobile"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Organizar
              </button>
              {actionMenuOpen === "mobile" ? (
                <div className="absolute left-0 z-30 mt-2 grid min-w-60 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setFamilyStructureOpen((current) => !current);
                      setSupplierStructureOpen(false);
                      setActionMenuOpen(null);
                      setFamilyFormOpen(false);
                      setFamilyRenameOpen(false);
                      setSubfamilyFormOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Boxes className="h-4 w-4" />
                    {familyStructureOpen ? "Ocultar estructura" : "Ver estructura"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setFamilyFormOpen((current) => !current);
                      setFamilyRenameOpen(false);
                      setSubfamilyFormOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva familia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setSubfamilyFormOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setFamilyRenameOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva subfamilia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setFamilyRenameOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setSubfamilyFormOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Renombrar familia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setSubfamilyRenameOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setFamilyRenameOpen(false);
                      setSubfamilyFormOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Renombrar subfamilia
                  </button>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setFamilyStructureOpen((current) => !current);
                setSupplierStructureOpen(false);
                setActionMenuOpen(null);
                setFamilyFormOpen(false);
                setFamilyRenameOpen(false);
                setSubfamilyFormOpen(false);
                setSubfamilyRenameOpen(false);
                setFamilyNotice(null);
              }}
              className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex"
            >
              <Boxes className="h-5 w-5" />
              {familyStructureOpen ? "Ocultar estructura" : "Ver estructura"}
            </button>
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() =>
                  setActionMenuOpen((current) =>
                    current === "new" ? null : "new",
                  )
                }
                aria-expanded={actionMenuOpen === "new"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <Tag className="h-5 w-5" />
                Nuevo
              </button>
              {actionMenuOpen === "new" ? (
                <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setFamilyFormOpen((current) => !current);
                      setFamilyRenameOpen(false);
                      setSubfamilyFormOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="rounded-xl px-3 py-2 text-left text-sm font-black text-slate-800 transition-colors hover:bg-blue-50"
                  >
                    Familia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setSubfamilyFormOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setFamilyRenameOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="rounded-xl px-3 py-2 text-left text-sm font-black text-slate-800 transition-colors hover:bg-blue-50"
                  >
                    Subfamilia
                  </button>
                </div>
              ) : null}
            </div>
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() =>
                  setActionMenuOpen((current) =>
                    current === "rename" ? null : "rename",
                  )
                }
                aria-expanded={actionMenuOpen === "rename"}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <Edit3 className="h-5 w-5" />
                Renombrar
              </button>
              {actionMenuOpen === "rename" ? (
                <div className="absolute right-0 z-30 mt-2 grid min-w-56 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setFamilyRenameOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setSubfamilyFormOpen(false);
                      setSubfamilyRenameOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="rounded-xl px-3 py-2 text-left text-sm font-black text-slate-800 transition-colors hover:bg-blue-50"
                  >
                    Familia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionMenuOpen(null);
                      setSubfamilyRenameOpen((current) => !current);
                      setFamilyFormOpen(false);
                      setFamilyRenameOpen(false);
                      setSubfamilyFormOpen(false);
                      setFamilyNotice(null);
                    }}
                    className="rounded-xl px-3 py-2 text-left text-sm font-black text-slate-800 transition-colors hover:bg-blue-50"
                  >
                    Subfamilia
                  </button>
                </div>
              ) : null}
            </div>
            <Link
              href="/productos/nuevo"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:rounded-2xl sm:px-5 sm:text-base sm:font-semibold"
            >
              <Plus className="h-5 w-5" />
              {documentPickRequest ? "Crear producto" : "Nuevo producto"}
            </Link>
          </div>
        }
      />

      {familyNotice ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"
        >
          {familyNotice}
        </div>
      ) : null}

      {familyStructureOpen ? (
        <Card className="space-y-3 border-blue-100 bg-white">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Familias y subfamilias
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Pulsa una familia para verla completa o una subfamilia para afinar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFamily(ALL);
                setSubfamily(ALL);
                setQuery("");
                setSupplier(ALL);
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Ver todo
            </button>
          </div>
          <div className="max-h-[56vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60">
            {familyStructure.map((entry) => (
              <section
                key={entry.family}
                className="grid gap-2 border-b border-slate-200 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(180px,240px)_1fr]"
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      applyFamilyStructureFilter(entry.family, ALL)
                    }
                    className={`min-w-0 flex-1 rounded-xl px-2 py-1 text-left transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      family === entry.family && subfamily === ALL
                        ? "bg-blue-50 text-blue-800"
                        : "text-slate-950"
                    }`}
                  >
                    <span className="block truncate text-base font-black">
                      {entry.family}
                    </span>
                    <span className="mt-0.5 block text-xs font-bold text-slate-500">
                      {entry.totalCount} productos ·{" "}
                      {entry.subfamilies.length} subfamilias
                    </span>
                  </button>
                  {entry.family !== UNCATEGORIZED_FAMILY ? (
                    <button
                      type="button"
                      onClick={() => deleteFamilyFromStructure(entry.family)}
                      aria-label={`Borrar familia ${entry.family}`}
                      title="Borrar familia"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {entry.subfamilies.map((item) => (
                    <span
                      key={`${entry.family}-${item.name}`}
                      className={`inline-flex min-h-8 items-center justify-center rounded-full px-3 text-xs font-black transition-colors ${
                        family === entry.family && subfamily === item.name
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          applyFamilyStructureFilter(entry.family, item.name)
                        }
                        className="min-h-8 rounded-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                      >
                        {item.name}
                        <span className="ml-1 text-current opacity-80">
                          {item.count}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          deleteSubfamilyFromStructure(entry.family, item.name)
                        }
                        aria-label={`Borrar subfamilia ${item.name}`}
                        title="Borrar subfamilia"
                        className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                  {entry.totalCount === 0 && entry.subfamilies.length === 0 ? (
                    <span className="inline-flex min-h-8 items-center rounded-full bg-white px-3 text-xs font-black text-slate-400">
                      Sin productos
                    </span>
                  ) : null}
                </div>
              </section>
            ))}
          </div>
        </Card>
      ) : null}

      {supplierStructureOpen ? (
        <Card className="space-y-4 border-blue-100 bg-white">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Proveedores
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Pulsa un proveedor para ver sus productos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSupplier(ALL);
                setQuery("");
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Ver todos
            </button>
          </div>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {supplierStructure.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => applySupplierStructureFilter(entry.name)}
                className="flex min-h-24 flex-col items-start justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                <span className="text-base font-black text-slate-950">
                  {entry.name}
                </span>
                <span className="text-sm font-semibold text-slate-500">
                  {entry.count} producto(s) · {formatMoney(entry.totalBase)}
                </span>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      {familyFormOpen ? (
        <Card className="border-blue-100 bg-blue-50/70">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              createFamily();
            }}
          >
            <label className="space-y-1.5">
              <span className="text-sm font-black text-slate-800">
                Nombre de la familia
              </span>
              <input
                value={familyDraft}
                onChange={(event) => {
                  setFamilyDraft(event.target.value);
                  setFamilyNotice(null);
                }}
                placeholder="Ej: Motores y electrónica"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Crear familia
            </button>
            <button
              type="button"
              onClick={() => {
                setFamilyFormOpen(false);
                setFamilyDraft("");
                setFamilyNotice(null);
              }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancelar
            </button>
          </form>
        </Card>
      ) : null}

      {familyRenameOpen ? (
        <Card className="border-blue-100 bg-blue-50/70">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              renameFamily();
            }}
          >
            <FilterSelect
              label="Familia actual"
              value={familyRenameFrom || ALL}
              onChange={(value) => {
                const nextValue = value === ALL ? "" : value;
                setFamilyRenameFrom(nextValue);
                setFamilyRenameTo(nextValue);
                setFamilyNotice(null);
              }}
              options={families}
              allLabel="Elige familia"
            />
            <label className="space-y-1.5">
              <span className="text-sm font-black text-slate-800">
                Nuevo nombre
              </span>
              <input
                value={familyRenameTo}
                onChange={(event) => {
                  setFamilyRenameTo(event.target.value);
                  setFamilyNotice(null);
                }}
                placeholder="Ej: Accesorios de persiana"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Guardar nombre
            </button>
            <button
              type="button"
              onClick={() => {
                setFamilyRenameOpen(false);
                setFamilyRenameFrom("");
                setFamilyRenameTo("");
                setFamilyNotice(null);
              }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancelar
            </button>
          </form>
          <p className="mt-3 text-sm font-semibold text-blue-900">
            Al renombrar, el catálogo recordará el nuevo nombre para productos ya
            detectados con esa familia.
          </p>
        </Card>
      ) : null}

      {subfamilyFormOpen ? (
        <Card className="border-blue-100 bg-blue-50/70">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              createSubfamily();
            }}
          >
            <FilterSelect
              label="Dentro de la familia"
              value={family}
              onChange={(value) => {
                setFamily(value);
                setSubfamily(defaultSubfamilyForFamily());
                setFamilyNotice(null);
              }}
              options={families}
              allLabel="Elige familia"
            />
            <label className="space-y-1.5">
              <span className="text-sm font-black text-slate-800">
                Nombre de la subfamilia
              </span>
              <input
                value={subfamilyDraft}
                onChange={(event) => {
                  setSubfamilyDraft(event.target.value);
                  setFamilyNotice(null);
                }}
                placeholder="Ej: Ejes, motores, lamas..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Crear subfamilia
            </button>
            <button
              type="button"
              onClick={() => {
                setSubfamilyFormOpen(false);
                setSubfamilyDraft("");
                setFamilyNotice(null);
              }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancelar
            </button>
          </form>
          <p className="mt-3 text-sm font-semibold text-blue-900">
            Una subfamilia siempre vive dentro de una familia, como una carpeta
            dentro de otra.
          </p>
        </Card>
      ) : null}

      {subfamilyRenameOpen ? (
        <Card className="border-blue-100 bg-blue-50/70">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto_auto] lg:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              renameSubfamily();
            }}
          >
            <FilterSelect
              label="Familia"
              value={family}
              onChange={(value) => {
                setFamily(value);
                setSubfamily(defaultSubfamilyForFamily());
                setSubfamilyRenameFrom("");
                setSubfamilyRenameTo("");
                setFamilyNotice(null);
              }}
              options={families}
              allLabel="Elige familia"
            />
            <FilterSelect
              label="Subfamilia actual"
              value={subfamilyRenameFrom || ALL}
              onChange={(value) => {
                const nextValue = value === ALL ? "" : value;
                setSubfamilyRenameFrom(nextValue);
                setSubfamilyRenameTo(nextValue);
                setFamilyNotice(null);
              }}
              options={selectedFamilySubfamilies}
              allLabel={
                family === ALL ? "Elige familia primero" : "Elige subfamilia"
              }
            />
            <label className="space-y-1.5">
              <span className="text-sm font-black text-slate-800">
                Nuevo nombre
              </span>
              <input
                value={subfamilyRenameTo}
                onChange={(event) => {
                  setSubfamilyRenameTo(event.target.value);
                  setFamilyNotice(null);
                }}
                placeholder="Ej: Accesorios de persiana"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Guardar nombre
            </button>
            <button
              type="button"
              onClick={() => {
                setSubfamilyRenameOpen(false);
                setSubfamilyRenameFrom("");
                setSubfamilyRenameTo("");
                setFamilyNotice(null);
              }}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancelar
            </button>
          </form>
        </Card>
      ) : null}

      {products.length === 0 && hiddenProducts.length === 0 ? (
        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Aún no hay productos detectados
              </h2>
              <p className="mt-1 text-slate-500">
                Escanea facturas de proveedor con líneas de compra y aparecerán
                aquí.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setFamilyFormOpen(true);
                setSubfamilyFormOpen(false);
                setFamilyNotice(null);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-base font-bold text-blue-700 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              <Tag className="h-5 w-5" />
              Nueva familia
            </button>
            <Link
              href="/productos/nuevo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 sm:w-auto"
            >
              <Plus className="h-5 w-5" />
              Nuevo producto
            </Link>
            <Link
              href="/gastos/nuevo"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-4 py-3 text-base font-bold text-blue-700 transition-colors hover:bg-blue-50 sm:w-auto"
            >
              <ShoppingCart className="h-5 w-5" />
              Escanear compra
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {documentPickRequest ? (
            <Card className="border-blue-100 bg-blue-50/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-blue-950">
                    Elige un producto para la línea del documento
                  </p>
                  <p className="mt-1 text-sm font-semibold text-blue-800">
                    Al seleccionarlo volverás al documento con la línea rellena.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cancelDocumentPick}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Volver sin elegir
                </button>
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden p-0">
            <div className="flex gap-px overflow-x-auto border-b border-slate-100 bg-slate-100">
              <CatalogMetric label="Productos" value={totals.products.toString()} />
              <CatalogMetric
                label="Familias"
                value={totals.families.toString()}
                onClick={() => {
                  setFamilyStructureOpen(true);
                  setSupplierStructureOpen(false);
                }}
              />
              <CatalogMetric
                label="Proveedores"
                value={totals.suppliers.toString()}
                onClick={() => {
                  setSupplierStructureOpen(true);
                  setFamilyStructureOpen(false);
                }}
              />
              <CatalogMetric
                label="Comprado"
                value={formatMoney(totals.totalBase)}
              />
            </div>

            {!documentPickRequest ? (
              <div
                role="tablist"
                aria-label="Vistas del catálogo"
                className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2"
              >
                {PRODUCT_CATALOG_VIEWS.map((view) => (
                  <button
                    key={view.value}
                    type="button"
                    role="tab"
                    aria-selected={catalogView === view.value}
                    onClick={() => applyCatalogView(view.value)}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      catalogView === view.value
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    {view.label}
                    <span
                      className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs ${
                        catalogView === view.value
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {catalogViewCounts[view.value]}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                  <span className="sr-only">Buscar productos</span>
                  <Search className="h-5 w-5 shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar producto, familia o proveedor"
                    className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label="Borrar búsqueda"
                      title="Borrar búsqueda"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </label>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((current) => !current)}
                  aria-expanded={filtersOpen}
                  className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    filtersOpen || activeFilterCount > 0
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                </button>
              </div>

              {activeFilterCount > 0 ? (
                <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
                  {family !== ALL ? (
                    <ActiveFilterChip
                      label={productFamilyDisplayName(family)}
                      onRemove={() => {
                        setFamily(ALL);
                        setSubfamily(ALL);
                      }}
                    />
                  ) : null}
                  {subfamily !== ALL ? (
                    <ActiveFilterChip
                      label={
                        subfamily === NO_SUBFAMILY
                          ? "Sin subfamilia"
                          : subfamily
                      }
                      onRemove={() => setSubfamily(ALL)}
                    />
                  ) : null}
                  {supplier !== ALL ? (
                    <ActiveFilterChip
                      label={supplier}
                      onRemove={() => setSupplier(ALL)}
                    />
                  ) : null}
                  {sort !== "newest" ? (
                    <ActiveFilterChip
                      label={`Orden: ${
                        PRODUCT_SORT_OPTIONS.find(
                          (option) => option.value === sort,
                        )?.label ?? sort
                      }`}
                      onRemove={() => setSort("newest")}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={clearCatalogFilters}
                    className="inline-flex min-h-9 items-center gap-1.5 px-2 text-xs font-black text-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                </div>
              ) : null}

              {filtersOpen ? (
                <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-4">
                  <FilterSelect
                    label="Familia"
                    value={family}
                    onChange={(value) => {
                      setFamily(value);
                      setSubfamily(defaultSubfamilyForFamily());
                    }}
                    options={families}
                    allLabel="Todas"
                    optionLabel={productFamilyDisplayName}
                  />
                  <FilterSelect
                    label="Subfamilia"
                    value={subfamily}
                    onChange={setSubfamily}
                    options={selectedFamilySubfamilies}
                    allLabel={
                      family === ALL ? "Elige familia primero" : "Todas"
                    }
                  />
                  <FilterSelect
                    label="Proveedor"
                    value={supplier}
                    onChange={setSupplier}
                    options={suppliers}
                    allLabel="Todos"
                  />
                  <label className="space-y-1.5">
                    <span className="text-sm font-bold text-slate-700">
                      Ordenar
                    </span>
                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(event.target.value as ProductSort)
                      }
                      className="h-[3.125rem] w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {PRODUCT_SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              {currentResultCount} producto(s)
            </p>
            {!documentPickRequest &&
            catalogView !== "hidden" &&
            visibleProducts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectionMode ? (
                  <button
                    type="button"
                    onClick={selectVisibleProducts}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Seleccionar visibles
                  </button>
                ) : null}
                {selectionMode && selectedProducts.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelectedProducts}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Quitar selección
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    if (selectionMode) clearSelectedProducts();
                    setSelectionMode(!selectionMode);
                  }}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    selectionMode
                      ? "border-slate-200 bg-slate-100 text-slate-700"
                      : "border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  {selectionMode ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <CheckSquare2 className="h-4 w-4" />
                  )}
                  {selectionMode ? "Salir" : "Seleccionar"}
                </button>
              </div>
            ) : null}
          </div>

          {!documentPickRequest && selectedProducts.length > 0 ? (
            <Card className="fixed bottom-24 left-4 right-4 z-40 max-h-[75vh] overflow-y-auto border-blue-100 bg-white/95 shadow-2xl backdrop-blur lg:bottom-6 lg:left-auto lg:right-6 lg:w-[min(52rem,calc(100vw-22rem))]">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {selectedProducts.length} producto(s) seleccionado(s)
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    Muévelos de familia o úsalos en un documento.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <ProductFamilySelect
                    label="Mover a familia"
                    value={bulkFamilyDraft}
                    onChange={(value) => {
                      setBulkFamilyDraft(value);
                      setFamilyNotice(null);
                    }}
                    options={families}
                  />
                  <button
                    type="button"
                    onClick={assignSelectedFamily}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:self-end"
                  >
                    Aplicar
                  </button>
                  <p className="text-xs font-semibold text-blue-900 sm:col-span-2">
                    Esto enseña al catálogo para próximos escaneos del mismo
                    producto. No cambia la factura de proveedor original.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] xl:col-span-2">
                  <ProductFamilySelect
                    label="Mover a subfamilia"
                    value={bulkSubfamilyDraft}
                    onChange={(value) => {
                      setBulkSubfamilyDraft(value);
                      setFamilyNotice(null);
                    }}
                    options={bulkSubfamilyOptions}
                    emptyLabel="Sin subfamilia"
                    customLabel="Otra subfamilia..."
                    customPlaceholder="Escribe la subfamilia"
                  />
                  <button
                    type="button"
                    onClick={assignSelectedSubfamily}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:self-end"
                  >
                    Aplicar subfamilia
                  </button>
                  <p className="text-xs font-semibold text-blue-900 sm:col-span-2">
                    La subfamilia ayuda a separar un nivel más: por ejemplo,
                    motores, ejes, guías o lamas dentro de una familia.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-4 xl:col-span-2">
                  <button
                    type="button"
                    onClick={() => openDocumentFromSelected("factura")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    <FileText className="h-4 w-4" />
                    Factura
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocumentFromSelected("presupuesto")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Presupuesto
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocumentFromSelected("recibo")}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Recibo
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedProducts}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </Card>
          ) : null}

          {currentResultCount === 0 ? (
            <Card className="flex flex-col items-start gap-3 border-dashed border-slate-200 bg-slate-50/70">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                <PackageSearch className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {catalogView === "hidden"
                    ? "No hay productos ocultos"
                    : "No hay productos en esta vista"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {query || activeFilterCount > 0
                    ? "Prueba a quitar la búsqueda o alguno de los filtros."
                    : "Los productos aparecerán aquí cuando cumplan este estado."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  clearCatalogFilters();
                  if (catalogView !== "all") applyCatalogView("all");
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Ver todos
              </button>
            </Card>
          ) : catalogView === "hidden" ? (
            <div className="grid gap-3">
              {visibleHiddenProducts.map((product) => (
                <HiddenProductRow
                  key={product.id}
                  product={product}
                  onRestore={() => restoreHiddenProduct(product)}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleProductGroups.map((group) => (
                <div key={group.key} className="grid gap-3">
                  {group.title ? (
                    <TimelineMonthDivider label={group.title} />
                  ) : null}
                  {group.products.map((product) => {
                    const targetFromDocument =
                      productMatchesDocumentPickRequest(
                        product,
                        documentPickRequest,
                      );
                    return (
                      <ProductCard
                        key={product.key}
                        product={product}
                        allProducts={products}
                        familyOptions={families}
                        subfamilyEntries={subfamilyEntries}
                        selected={selectedProductKeys.includes(product.key)}
                        selectionMode={selectionMode}
                        pickMode={Boolean(documentPickRequest)}
                        editMode={
                          documentPickRequest?.mode === "edit" &&
                          targetFromDocument
                        }
                        startOpen={
                          (documentPickRequest?.mode === "edit" &&
                            targetFromDocument) ||
                          editingProductKey === product.key
                        }
                        autoEdit={editingProductKey === product.key}
                        onToggleSelected={() => toggleProductForDraft(product)}
                        onPickForDocument={() =>
                          handlePickProductForDocument(product)
                        }
                        onPickSavedProduct={handlePickSavedProductForDocument}
                        onSave={(patch) => saveProductPatch(product, patch)}
                        onDuplicate={() => duplicateProduct(product)}
                        onRemove={() => removeProduct(product)}
                        onAutoEditConsumed={() => setEditingProductKey(null)}
                        onMerge={(removeKey) =>
                          handleMergeProducts(product, removeKey)
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          {(catalogView === "hidden"
            ? visibleHiddenProducts.length < filteredHiddenProducts.length
            : visibleProducts.length < filteredProducts.length) ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 30)}
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-200 bg-white px-5 text-base font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Cargar 30 más
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CatalogMetric({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="block text-xs font-bold text-slate-500">{label}</span>
      <span className="mt-1 block truncate text-lg font-black text-slate-950">
        {value}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="min-w-32 flex-1 bg-white p-4 text-left transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="min-w-32 flex-1 bg-white p-4">{content}</div>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      title={`Quitar filtro ${label}`}
    >
      <span className="truncate">{label}</span>
      <X className="h-3.5 w-3.5 shrink-0" />
    </button>
  );
}

function HiddenProductRow({
  product,
  onRestore,
}: {
  product: Product;
  onRestore: () => void;
}) {
  const supplierName =
    product.purchase?.supplierName ?? product.supplierName;
  return (
    <Card className="p-0">
      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate text-xs font-black text-blue-700">
              {productFamilyDisplayName(product.family)}
              {product.subfamily ? ` / ${product.subfamily}` : ""}
            </span>
            <span className="text-xs font-bold text-slate-400">
              {product.source === "manual" ? "Alta manual" : "Detectado"}
            </span>
          </div>
          <p className="mt-1 truncate text-base font-black text-slate-950">
            {product.sales?.description?.trim() || product.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
            {supplierName ? <span>Proveedor: {supplierName}</span> : null}
            <span>
              Actualizado {formatShortDate(product.updatedAt.slice(0, 10))}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <ArchiveRestore className="h-4 w-4" />
          Restaurar
        </button>
      </div>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  extraOptions = [],
  optionLabel = (option) => option,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
  extraOptions?: Array<{ value: string; label: string }>;
  optionLabel?: (option: string) => string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[3.125rem] w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value={ALL}>{allLabel}</option>
        {extraOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductCard({
  product,
  allProducts,
  familyOptions,
  subfamilyEntries,
  selected,
  selectionMode,
  pickMode,
  editMode,
  startOpen,
  autoEdit,
  onToggleSelected,
  onPickForDocument,
  onPickSavedProduct,
  onSave,
  onDuplicate,
  onRemove,
  onAutoEditConsumed,
  onMerge,
}: {
  product: PurchaseProductSummary;
  allProducts: PurchaseProductSummary[];
  familyOptions: string[];
  subfamilyEntries: SubfamilyEntry[];
  selected: boolean;
  selectionMode: boolean;
  pickMode: boolean;
  editMode: boolean;
  startOpen: boolean;
  autoEdit: boolean;
  onToggleSelected: () => void;
  onPickForDocument: () => void;
  onPickSavedProduct?: (product: Product) => void;
  onSave: (patch: Partial<Product>) => Product | null;
  onDuplicate: () => void;
  onRemove: () => void;
  onAutoEditConsumed: () => void;
  onMerge: (removeKey: string) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [sku, setSku] = useState(product.sku ?? "");
  const [name, setName] = useState(product.name);
  const [family, setFamily] = useState(product.family);
  const [productSubfamily, setProductSubfamily] = useState(
    product.subfamily ?? "",
  );
  const [saleDescription, setSaleDescription] = useState(
    product.saleDescription ?? "",
  );
  const [saleUnit, setSaleUnit] = useState(
    product.saleUnit ?? product.unit ?? "",
  );
  const [salePrice, setSalePrice] = useState(
    numberToInput(product.saleUnitPrice),
  );
  const [saleIvaPercent, setSaleIvaPercent] = useState(
    numberToInput(product.saleIvaPercent ?? product.ivaPercent),
  );
  const [purchaseDescription, setPurchaseDescription] = useState(
    product.purchaseDescription ?? "",
  );
  const [purchaseUnit, setPurchaseUnit] = useState(
    product.purchaseUnit ?? product.unit ?? "",
  );
  const [purchaseListPrice, setPurchaseListPrice] = useState(
    numberToInput((product.purchaseListPrice ?? product.lastPvp) || undefined),
  );
  const [purchaseDiscountPercent, setPurchaseDiscountPercent] = useState(
    numberToInput(
      (product.purchaseDiscountPercent ?? product.lastDiscountPercent) ||
        undefined,
    ),
  );
  const [purchaseNetUnitCost, setPurchaseNetUnitCost] = useState(
    numberToInput(
      (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
    ),
  );
  const [purchaseCostManual, setPurchaseCostManual] = useState(false);
  const [supplierReference, setSupplierReference] = useState(
    product.purchaseSupplierReference ?? "",
  );
  const [calculationKind, setCalculationKind] = useState(
    product.calculation?.kind ?? "none",
  );
  const [attributesText, setAttributesText] = useState(
    productAttributesToText(product.attributes),
  );
  const [notes, setNotes] = useState(product.notes ?? "");
  const [mergeKey, setMergeKey] = useState("");
  const [mergeSearch, setMergeSearch] = useState("");
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const lastDiscount =
    product.lastPvp > 0
      ? ((product.lastPvp - product.lastUnitPrice) / product.lastPvp) * 100
      : product.lastDiscountPercent;
  const mergeOptions = allProducts
    .filter((item) => item.key !== product.key)
    .sort((a, b) =>
      productDisplayName(a).localeCompare(productDisplayName(b), "es"),
    );
  const filteredMergeOptions = mergeOptions.filter((item) => {
    const term = mergeSearch.trim().toLowerCase();
    if (!term) return true;
    return [
      productDisplayName(item),
      item.name,
      item.family,
      item.subfamily,
      item.usualSupplier?.supplierName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });
  const productSubfamilyOptions = useMemo(
    () =>
      subfamilyEntries
        .filter((entry) => entry.family === family)
        .map((entry) => entry.name),
    [family, subfamilyEntries],
  );

  const normalizedDisplayUnit = normalizeDocumentUnitId(
    product.saleUnit ?? product.unit,
  );
  const displayUnit = unitShortLabel(
    normalizedDisplayUnit ?? product.saleUnit ?? product.unit ?? "",
  );
  const displayName = productDisplayName(product);
  const hasCustomDisplayName = productHasCustomDisplayName(product);
  const salePriceLabel = productHasSalePrice(product)
    ? formatMoney(product.saleUnitPrice ?? 0)
    : "Sin precio de venta";
  const costValue = productCostValue(product);
  const costLabel = costValue
    ? formatMoney(costValue)
    : "Sin coste informado";
  const supplierLabel = product.usualSupplier?.supplierName ?? "Sin proveedor";
  const volumeLabel =
    product.purchaseCount > 0
      ? productQuantityLabel(product)
      : product.source === "manual"
        ? "Alta manual"
        : "Detectado";
  const purchaseDateLabel =
    product.purchaseCount > 0
      ? formatShortDate(product.lastPurchaseDate)
      : "Sin compras registradas";

  const resetPanelForm = useCallback(() => {
    setSku(product.sku ?? "");
    setName(product.name);
    setFamily(product.family);
    setProductSubfamily(product.subfamily ?? "");
    setSaleDescription(product.saleDescription ?? "");
    setSaleUnit(product.saleUnit ?? product.unit ?? "");
    setSalePrice(numberToInput(product.saleUnitPrice));
    setSaleIvaPercent(
      numberToInput(product.saleIvaPercent ?? product.ivaPercent),
    );
    setPurchaseDescription(product.purchaseDescription ?? "");
    setPurchaseUnit(product.purchaseUnit ?? product.unit ?? "");
    setPurchaseListPrice(
      numberToInput(
        (product.purchaseListPrice ?? product.lastPvp) || undefined,
      ),
    );
    setPurchaseDiscountPercent(
      numberToInput(
        (product.purchaseDiscountPercent ?? product.lastDiscountPercent) ||
          undefined,
      ),
    );
    setPurchaseNetUnitCost(
      numberToInput(
        (product.purchaseNetUnitCost ?? product.lastUnitPrice) || undefined,
      ),
    );
    setPurchaseCostManual(false);
    setSupplierReference(product.purchaseSupplierReference ?? "");
    setAttributesText(productAttributesToText(product.attributes));
    setNotes(product.notes ?? "");
    setCalculationKind(product.calculation?.kind ?? "none");
    setMergeKey("");
    setMergeSearch("");
  }, [product]);

  function openPanel() {
    resetPanelForm();
    setActionsOpen(false);
    setPanelOpen(true);
  }

  function handlePurchaseListPriceChange(value: string) {
    setPurchaseListPrice(value);
    if (!purchaseCostManual) {
      setPurchaseNetUnitCost(
        purchaseNetUnitCostInputFromFields(
          value,
          purchaseDiscountPercent,
          parseOptionalNumber,
        ),
      );
    }
  }

  function handlePurchaseDiscountChange(value: string) {
    setPurchaseDiscountPercent(value);
    if (!purchaseCostManual) {
      setPurchaseNetUnitCost(
        purchaseNetUnitCostInputFromFields(
          purchaseListPrice,
          value,
          parseOptionalNumber,
        ),
      );
    }
  }

  function handlePurchaseNetCostChange(value: string) {
    const manual = value.trim().length > 0;
    setPurchaseCostManual(manual);
    setPurchaseNetUnitCost(
      manual
        ? value
        : purchaseNetUnitCostInputFromFields(
            purchaseListPrice,
            purchaseDiscountPercent,
            parseOptionalNumber,
          ),
    );
  }

  useEffect(() => {
    if (!startOpen) return;
    setPanelOpen(true);
  }, [startOpen]);

  useEffect(() => {
    if (!autoEdit) return;
    resetPanelForm();
    setPanelOpen(true);
    onAutoEditConsumed();
  }, [autoEdit, onAutoEditConsumed, resetPanelForm]);

  useEffect(() => {
    if (!actionsOpen) return;

    function closeActionsOnOutsideClick(event: PointerEvent) {
      if (
        actionsRef.current &&
        event.target instanceof Node &&
        actionsRef.current.contains(event.target)
      ) {
        return;
      }
      setActionsOpen(false);
    }

    function closeActionsOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActionsOpen(false);
    }

    document.addEventListener("pointerdown", closeActionsOnOutsideClick);
    document.addEventListener("keydown", closeActionsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeActionsOnOutsideClick);
      document.removeEventListener("keydown", closeActionsOnEscape);
    };
  }, [actionsOpen]);

  function saveEdits() {
    const parsedSalePrice = parseOptionalNumber(salePrice);
    const parsedSaleIva = parseOptionalNumber(saleIvaPercent);
    const parsedPurchaseListPrice = parseOptionalNumber(purchaseListPrice);
    const parsedPurchaseDiscount = parseOptionalNumber(purchaseDiscountPercent);
    const parsedPurchaseCost =
      parseOptionalNumber(purchaseNetUnitCost) ??
      calculatePurchaseNetUnitCost(
        parsedPurchaseListPrice,
        parsedPurchaseDiscount,
      );
    const manualSaleUnit = normalizeDocumentUnitId(saleUnit) ?? saleUnit.trim();
    const normalizedSaleUnit =
      calculationKind === "area"
        ? "m2"
        : manualSaleUnit || product.unit || "ud";
    const manualPurchaseUnit =
      normalizeDocumentUnitId(purchaseUnit) ?? purchaseUnit.trim();
    const normalizedPurchaseUnit = manualPurchaseUnit || normalizedSaleUnit;
    const savedProduct = onSave({
      sku: sku.trim() || undefined,
      name: name.trim() || product.name,
      family: family.trim() || "Sin familia",
      subfamily: productSubfamily.trim() || undefined,
      unit: normalizedSaleUnit,
      pvp: parsedPurchaseListPrice,
      cost: parsedPurchaseCost,
      ivaPercent: parsedSaleIva ?? product.ivaPercent,
      sales: {
        enabled: true,
        description: saleDescription.trim() || undefined,
        unit: normalizedSaleUnit,
        unitPrice: parsedSalePrice,
        ivaPercent: parsedSaleIva,
      },
      purchase: {
        enabled: true,
        description: purchaseDescription.trim() || undefined,
        unit: normalizedPurchaseUnit,
        listPrice: parsedPurchaseListPrice,
        discountPercent: parsedPurchaseDiscount,
        netUnitCost: parsedPurchaseCost,
        ivaPercent: product.ivaPercent,
        supplierId: product.usualSupplier?.supplierId,
        supplierName: product.usualSupplier?.supplierName,
        supplierReference: supplierReference.trim() || undefined,
      },
      calculation:
        calculationKind === "area"
          ? {
              kind: "area",
              unit: normalizedSaleUnit,
              roundingDecimals: product.calculation?.roundingDecimals ?? 2,
            }
          : undefined,
      attributes: productAttributesFromText(attributesText),
      notes: notes.trim() || undefined,
      source: product.source,
    });
    if (!savedProduct) return;
    setPanelOpen(false);
    if (pickMode) {
      onPickSavedProduct?.(savedProduct);
    }
  }

  function mergeSelectedProduct() {
    if (!mergeKey) return;
    onMerge(mergeKey);
    setMergeKey("");
    setMergeSearch("");
  }

  const addedAttributeLabels = new Set(
    productAttributesFromText(attributesText).map((attribute) =>
      attribute.label.trim().toLocaleLowerCase("es"),
    ),
  );
  return (
    <>
      <Card
        className={`p-0 transition-colors ${
          selected
            ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200"
            : ""
        }`}
      >
        <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.32fr)_auto] lg:items-center">
          <button
            type="button"
            onClick={pickMode && !editMode ? onPickForDocument : openPanel}
            className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="max-w-full truncate rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700 lg:max-w-44">
                  {productFamilyDisplayName(product.family)}
                </span>
                {product.subfamily ? (
                  <span className="max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-indigo-700 lg:max-w-44">
                    {product.subfamily}
                  </span>
                ) : null}
                {product.sku ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {product.sku}
                  </span>
                ) : null}
                {displayUnit ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">
                    {displayUnit}
                  </span>
                ) : null}
                {product.calculation?.kind === "area" ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    alto x ancho
                  </span>
                ) : null}
                {selected ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                    Seleccionado
                  </span>
                ) : null}
              </div>
              <span className="text-base font-black leading-tight text-slate-950 lg:text-lg">
                {displayName}
              </span>
              {product.usualSupplier?.supplierName ? (
                <span className="text-xs font-semibold text-slate-500">
                  Proveedor: {supplierLabel}
                </span>
              ) : null}
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{purchaseDateLabel}</span>
              </p>
            </div>
          </button>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <CompactValue label="Coste neto" value={costLabel} />
            <CompactValue label="Precio de venta" value={salePriceLabel} />
          </div>
          <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
            <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-800">
              {volumeLabel}
            </span>
            <div className="flex gap-2">
              {!editMode && (pickMode || selectionMode) ? (
                <button
                  type="button"
                  onClick={pickMode ? onPickForDocument : onToggleSelected}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    pickMode
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : selected
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
                  }`}
                  aria-label={
                    pickMode
                      ? "Usar producto en el documento"
                      : selected
                        ? "Quitar producto de la selección"
                        : "Seleccionar producto"
                  }
                  title={
                    pickMode
                      ? "Usar en esta línea del documento"
                      : selected
                        ? "Quitar de la selección"
                        : "Seleccionar producto"
                  }
                >
                  {pickMode || selected ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openPanel}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-200 bg-white text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                aria-label="Editar producto"
                title="Editar producto"
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <div ref={actionsRef} className="relative">
                <button
                  type="button"
                  onClick={() => setActionsOpen((current) => !current)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  aria-label="Más acciones del producto"
                  title="Más acciones"
                  aria-expanded={actionsOpen}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {actionsOpen ? (
                  <div className="absolute right-0 z-30 mt-2 grid min-w-48 gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        onDuplicate();
                      }}
                      className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionsOpen(false);
                        onRemove();
                      }}
                      className="flex min-h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-bold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                      {product.purchaseCount > 0 ? "Ocultar" : "Eliminar"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <ResponsiveEntityPanel
        open={panelOpen}
        title={displayName}
        subtitle={
          hasCustomDisplayName
            ? `Detectado como: ${product.name}`
            : "Detalle, reglas de cálculo y aprendizaje de este producto."
        }
        icon={PackageSearch}
        onClose={() => setPanelOpen(false)}
      >
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              {productFamilyDisplayName(product.family)}
            </span>
            {product.subfamily ? (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-700">
                {product.subfamily}
              </span>
            ) : null}
            {product.sku ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {product.sku}
              </span>
            ) : null}
            {displayUnit ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                {displayUnit}
              </span>
            ) : null}
            {product.calculation?.kind === "area" ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                alto x ancho
              </span>
            ) : null}
          </div>
          <EditorSection title="Datos básicos">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.45fr)_minmax(0,1fr)]">
              <EditInput label="Código" value={sku} onChange={setSku} />
              <EditInput
                label="Producto detectado / proveedor"
                value={name}
                onChange={setName}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)]">
              <ProductFamilySelect
                label="Familia"
                value={family}
                onChange={(value) => {
                  setFamily(value);
                  const nextFamilySubfamilies = subfamilyEntries
                    .filter((entry) => entry.family === value)
                    .map((entry) => entry.name);
                  if (
                    productSubfamily &&
                    !nextFamilySubfamilies.includes(productSubfamily)
                  ) {
                    setProductSubfamily("");
                  }
                }}
                options={familyOptions}
              />
              <ProductFamilySelect
                label="Subfamilia"
                value={productSubfamily}
                onChange={setProductSubfamily}
                options={productSubfamilyOptions}
                emptyLabel="Sin subfamilia"
                customLabel="Otra subfamilia..."
                customPlaceholder="Escribe la subfamilia"
              />
              <label className="space-y-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                  Cálculo
                </span>
                <select
                  value={calculationKind}
                  onChange={(event) =>
                    setCalculationKind(() => {
                      const value = event.target.value as "none" | "area";
                      if (value === "area") setSaleUnit("m2");
                      return value;
                    })
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="none">Cantidad directa</option>
                  <option value="area">Alto x ancho</option>
                </select>
                {calculationKind === "area" ? (
                  <span className="mt-1 block text-xs font-semibold text-blue-800">
                    Venta en m² con calculadora alto x ancho en documentos.
                  </span>
                ) : null}
              </label>
            </div>
          </EditorSection>

          <EditorSection title="Venta">
            <div className="grid gap-3 sm:grid-cols-2">
              <EditInput
                label="Nombre visible / venta"
                value={saleDescription}
                onChange={setSaleDescription}
                placeholder={product.name}
                className="sm:col-span-2"
              />
              <ProductUnitSelect
                label="Unidad venta"
                value={saleUnit}
                onChange={setSaleUnit}
              />
              <EditInput
                label="Precio venta"
                value={salePrice}
                onChange={setSalePrice}
                inputMode="decimal"
              />
              <EditInput
                label="IVA %"
                value={saleIvaPercent}
                onChange={setSaleIvaPercent}
                inputMode="decimal"
              />
            </div>
          </EditorSection>

          <EditorSection title="Compra">
            <div className="grid gap-3 sm:grid-cols-2">
              <EditInput
                label="Compra: descripción"
                value={purchaseDescription}
                onChange={setPurchaseDescription}
                className="sm:col-span-2"
              />
              <EditInput
                label="Ref. proveedor"
                value={supplierReference}
                onChange={setSupplierReference}
              />
              <ProductUnitSelect
                label="Unidad compra"
                value={purchaseUnit}
                onChange={setPurchaseUnit}
              />
              <EditInput
                label="Tarifa proveedor"
                value={purchaseListPrice}
                onChange={handlePurchaseListPriceChange}
                inputMode="decimal"
              />
              <EditInput
                label="Dto. %"
                value={purchaseDiscountPercent}
                onChange={handlePurchaseDiscountChange}
                inputMode="decimal"
              />
              <EditInput
                label="Coste real"
                value={purchaseNetUnitCost}
                onChange={handlePurchaseNetCostChange}
                inputMode="decimal"
              />
            </div>
          </EditorSection>

          <EditorSection title="Aprendizaje del producto">
            <label className="block space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Atributos
              </span>
              <textarea
                value={attributesText}
                onChange={(event) => setAttributesText(event.target.value)}
                placeholder={
                  "Talla: L\nColor: Blanco\nMaterial: aluminio\nMetro lineal: barras de 6 m"
                }
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="mt-2 flex flex-wrap gap-2">
                {PRODUCT_ATTRIBUTE_SUGGESTIONS.map((label) => {
                  const added = addedAttributeLabels.has(
                    label.toLocaleLowerCase("es"),
                  );
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setAttributesText((current) =>
                          addProductAttributeLine(current, label),
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors ${
                        added
                          ? "bg-blue-50 text-blue-700 ring-blue-200"
                          : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                      }`}
                      aria-pressed={added}
                    >
                      {added ? <Check className="mr-1 inline h-3 w-3" /> : null}
                      {label}
                    </button>
                  );
                })}
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Regla interna / notas
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej: Medir alto x ancho en metros. Revisar color, lama y cajón antes de enviar."
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={saveEdits}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto"
              >
                <Save className="h-4 w-4" />
                {pickMode ? "Guardar y volver" : "Guardar y cerrar"}
              </button>
              <p className="text-sm font-semibold text-blue-900">
                Se recordará para próximos escaneos.
              </p>
            </div>
          </EditorSection>

          {product.attributes && product.attributes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {product.attributes.map((attribute) => (
                <span
                  key={attribute.key}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {attribute.label}: {attribute.value}
                  {attribute.unit ? ` ${attribute.unit}` : ""}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Precio venta" value={salePriceLabel} />
            <Metric
              label="Coste medio"
              value={formatMoney(product.averageUnitPrice)}
            />
            <Metric
              label="Descuento habitual"
              value={`${product.averageDiscountPercent.toLocaleString("es-ES")}%`}
            />
            <Metric label="Volumen" value={volumeLabel} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-3">
              <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                <Factory className="h-4 w-4 text-blue-600" />
                Proveedor habitual
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {supplierLabel}
              </p>
              <p className="text-sm font-semibold text-slate-500">
                {product.purchaseCount} compra(s) registradas
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="flex items-center gap-2 text-sm font-black text-emerald-900">
                <TrendingUp className="h-4 w-4" />
                PVP proveedor
              </p>
              {product.lastPvp > 0 ? (
                <>
                  <p className="mt-2 text-lg font-black text-emerald-950">
                    {formatMoney(product.lastPvp)}
                  </p>
                  <p className="text-sm font-semibold text-emerald-800">
                    Tarifa antes de descuento. Último dto.:{" "}
                    {Math.round(lastDiscount).toLocaleString("es-ES")}%
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-black text-slate-700">
                    Sin PVP claro
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    Aparecerá cuando la línea de compra traiga precio de tarifa.
                  </p>
                </>
              )}
            </div>
          </div>

          {product.suppliers.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {product.suppliers.slice(0, 4).map((supplier) => (
                <span
                  key={`${product.key}-${supplier.supplierName}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                >
                  {supplier.supplierName}: {formatMoney(supplier.totalBase)}
                </span>
              ))}
            </div>
          ) : null}

          {mergeOptions.length > 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-3">
              <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                <GitMerge className="h-4 w-4 text-blue-600" />
                Unificar producto
              </p>
              <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="relative">
                  <span className="sr-only">Buscar producto duplicado</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={mergeSearch}
                    onChange={(event) => {
                      setMergeSearch(event.target.value);
                      setMergeKey("");
                    }}
                    placeholder="Buscar duplicado..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 pl-10 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <select
                  value={mergeKey}
                  onChange={(event) => setMergeKey(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Elige producto duplicado...</option>
                  {filteredMergeOptions.map((item) => (
                    <option key={item.key} value={item.key}>
                      {productDisplayName(item)}
                      {productHasCustomDisplayName(item)
                        ? ` · ${item.name}`
                        : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={mergeSelectedProduct}
                  disabled={!mergeKey}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <GitMerge className="h-4 w-4" />
                  Unificar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </ResponsiveEntityPanel>
    </>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function ProductFamilySelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = "Sin familia",
  customLabel = "Otra familia...",
  customPlaceholder = "Escribe la familia",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  emptyLabel?: string;
  customLabel?: string;
  customPlaceholder?: string;
}) {
  const [customMode, setCustomMode] = useState(false);
  const normalizedOptions = useMemo(
    () =>
      [...new Set(options.map((option) => option.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [options],
  );
  const trimmedValue = value.trim();
  const matchesOption = normalizedOptions.includes(trimmedValue);
  const isCustom = customMode || (!!trimmedValue && !matchesOption);
  const selectValue = isCustom ? CUSTOM_FAMILY : trimmedValue;

  return (
    <div className="space-y-2">
      <label className="space-y-1.5">
        <span className="text-xs font-black uppercase tracking-wide text-slate-600">
          {label}
        </span>
        <select
          value={selectValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === CUSTOM_FAMILY) {
              setCustomMode(true);
              onChange("");
              return;
            }
            setCustomMode(false);
            onChange(nextValue);
          }}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">{emptyLabel}</option>
          {normalizedOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={CUSTOM_FAMILY}>{customLabel}</option>
        </select>
      </label>
      {isCustom ? (
        <label className="block">
          <span className="sr-only">{customLabel}</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={customPlaceholder}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      ) : null}
    </div>
  );
}

function ProductUnitSelect({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const trimmedValue = value.trim();
  const currentUnitId = normalizeDocumentUnitId(trimmedValue) ?? trimmedValue;
  const currentIsCatalog = DOCUMENT_UNIT_CATALOG.some(
    (unit) => unit.id === currentUnitId,
  );
  const options =
    currentUnitId && !currentIsCatalog
      ? [
          {
            id: currentUnitId,
            label: `${trimmedValue} (detectada)`,
            shortLabel: trimmedValue,
          },
          ...DOCUMENT_UNIT_CATALOG,
        ]
      : DOCUMENT_UNIT_CATALOG;

  return (
    <label className={`space-y-1.5 ${className}`.trim()}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <select
        value={currentUnitId}
        onChange={(event) =>
          onChange(
            normalizeDocumentUnitId(event.target.value) ?? event.target.value,
          )
        }
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="">Sin unidad</option>
        {options.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.shortLabel} - {unit.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function EditInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 ${className}`.trim()}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function CompactValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <p className="truncate text-[0.68rem] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="truncate text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
