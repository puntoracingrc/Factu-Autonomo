"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  CalendarDays,
  Check,
  Edit3,
  Euro,
  Factory,
  FileText,
  GitMerge,
  PackageSearch,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import { normalizeDocumentUnitId } from "@/lib/document-units";
import {
  PRODUCT_ATTRIBUTE_SUGGESTIONS,
  addProductAttributeLine,
  productAttributesFromText,
  productAttributesToText,
} from "@/lib/product-attributes";
import {
  buildPurchaseProductSummaries,
  type PurchaseProductSummary,
} from "@/lib/purchase-products";
import {
  productSummaryToDocumentDraftLine,
  saveProductDocumentDraft,
} from "@/lib/product-document-draft";
import type { Product } from "@/lib/types";

const ALL = "__all__";
type ProductSort =
  | "newest"
  | "mostPurchases"
  | "leastPurchases"
  | "amountDesc"
  | "amountAsc"
  | "name";

const PRODUCT_SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "newest", label: "Última compra" },
  { value: "mostPurchases", label: "Más comprados" },
  { value: "leastPurchases", label: "Menos comprados" },
  { value: "amountDesc", label: "Mayor importe" },
  { value: "amountAsc", label: "Menor importe" },
  { value: "name", label: "Nombre" },
];

function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberToInput(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? "" : String(value);
}

export default function ProductosPage() {
  const router = useRouter();
  const { data, addProduct, updateProduct, deleteProduct, mergeProducts } =
    useAppStore();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState(ALL);
  const [supplier, setSupplier] = useState(ALL);
  const [sort, setSort] = useState<ProductSort>("newest");
  const [visibleCount, setVisibleCount] = useState(30);
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);

  const products = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.products),
    [data.expenses, data.products],
  );

  const families = useMemo(
    () => [...new Set(products.map((product) => product.family))].sort(),
    [products],
  );

  const suppliers = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.usualSupplier?.supplierName)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, "es")),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          product.name,
          product.family,
          product.usualSupplier?.supplierName,
          product.suppliers.map((entry) => entry.supplierName).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesFamily = family === ALL || product.family === family;
      const matchesSupplier =
        supplier === ALL || product.usualSupplier?.supplierName === supplier;

      return matchesQuery && matchesFamily && matchesSupplier;
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "mostPurchases":
          return b.purchaseCount - a.purchaseCount || b.totalBase - a.totalBase;
        case "leastPurchases":
          return a.purchaseCount - b.purchaseCount || a.totalBase - b.totalBase;
        case "amountDesc":
          return b.totalBase - a.totalBase || b.purchaseCount - a.purchaseCount;
        case "amountAsc":
          return a.totalBase - b.totalBase || a.purchaseCount - b.purchaseCount;
        case "name":
          return a.name.localeCompare(b.name, "es");
        case "newest":
        default:
          return b.lastPurchaseDate.localeCompare(a.lastPurchaseDate);
      }
    });
  }, [family, products, query, sort, supplier]);

  const totals = useMemo(
    () => ({
      products: products.length,
      families: families.length,
      suppliers: suppliers.length,
      totalBase: products.reduce((sum, product) => sum + product.totalBase, 0),
    }),
    [families.length, products, suppliers.length],
  );
  const visibleProducts = filteredProducts.slice(0, visibleCount);
  const selectedProducts = useMemo(
    () =>
      selectedProductKeys
        .map((key) => products.find((product) => product.key === key))
        .filter((product): product is PurchaseProductSummary => Boolean(product)),
    [products, selectedProductKeys],
  );

  useEffect(() => {
    setVisibleCount(30);
  }, [family, query, sort, supplier]);

  function toggleProductForDraft(product: PurchaseProductSummary) {
    setSelectedProductKeys((current) =>
      current.includes(product.key)
        ? current.filter((key) => key !== product.key)
        : [...current, product.key],
    );
  }

  function openDocumentFromSelected(documentType: "factura" | "presupuesto" | "recibo") {
    if (selectedProducts.length === 0) return;
    const lines = selectedProducts.map((product) =>
      productSummaryToDocumentDraftLine(product, data.profile.iva?.defaultRate ?? 21),
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

  function productFromSummary(product: PurchaseProductSummary): Omit<
    Product,
    "id" | "createdAt" | "updatedAt"
  > {
    return {
      key: product.key,
      aliases: product.aliases,
      sku: product.sku,
      externalId: product.externalId,
      name: product.name,
      family: product.family,
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

  function saveProductPatch(
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

  function handleMergeProducts(
    keep: PurchaseProductSummary,
    removeKey: string,
  ) {
    const remove = products.find((product) => product.key === removeKey);
    if (!remove) return;

    const keepProduct = saveProductPatch(keep, {
      aliases: [...new Set([...(keep.aliases ?? []), remove.key, ...remove.aliases])],
      source: keep.source === "manual" ? "manual" : "detected",
    });
    if (remove.productId) {
      mergeProducts(keepProduct.id, [remove.productId]);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Productos"
        subtitle="Materiales y servicios detectados en tus compras escaneadas."
        action={
          <Link
            href="/productos/nuevo"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Plus className="h-5 w-5" />
            Nuevo producto
          </Link>
        }
      />

      {products.length === 0 ? (
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
                Escanea facturas de proveedor con líneas de compra y aparecerán aquí.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
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
          <Card className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryTile label="Productos" value={totals.products.toString()} icon={Boxes} />
              <SummaryTile label="Familias" value={totals.families.toString()} icon={Tag} />
              <SummaryTile label="Proveedores" value={totals.suppliers.toString()} icon={Factory} />
              <SummaryTile label="Comprado" value={formatMoney(totals.totalBase)} icon={Euro} />
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
              <label className="space-y-1.5">
                <span className="text-sm font-bold text-slate-700">Buscar</span>
                <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Producto, familia o proveedor..."
                    className="w-full bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>
              <FilterSelect
                label="Familia"
                value={family}
                onChange={setFamily}
                options={families}
                allLabel="Todas"
              />
              <FilterSelect
                label="Proveedor"
                value={supplier}
                onChange={setSupplier}
                options={suppliers}
                allLabel="Todos"
              />
              <label className="space-y-1.5">
                <span className="text-sm font-bold text-slate-700">Ordenar</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as ProductSort)}
                  className="h-[3.125rem] w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {PRODUCT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          <datalist id="product-family-options">
            {families.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>

          <p className="text-sm font-semibold text-slate-500">
            {filteredProducts.length} de {products.length} producto(s)
          </p>

          {selectedProducts.length > 0 ? (
            <Card className="sticky bottom-24 z-20 border-blue-100 bg-white/95 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {selectedProducts.length} producto(s) preparados
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    Se insertarán como líneas editables. Si falta PVP, verás aviso
                    en el documento.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
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
                    onClick={() => setSelectedProductKeys([])}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    Vaciar
                  </button>
                </div>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.key}
                product={product}
                allProducts={products}
                selected={selectedProductKeys.includes(product.key)}
                onToggleSelected={() => toggleProductForDraft(product)}
                onSave={(patch) => saveProductPatch(product, patch)}
                onDelete={deleteProduct}
                onMerge={(removeKey) => handleMergeProducts(product, removeKey)}
              />
            ))}
          </div>
          {visibleProducts.length < filteredProducts.length ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 30)}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-200 bg-white px-5 text-base font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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

function SummaryTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  allLabel: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[3.125rem] w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductCard({
  product,
  allProducts,
  selected,
  onToggleSelected,
  onSave,
  onDelete,
  onMerge,
}: {
  product: PurchaseProductSummary;
  allProducts: PurchaseProductSummary[];
  selected: boolean;
  onToggleSelected: () => void;
  onSave: (patch: Partial<Product>) => void;
  onDelete: (id: string) => void;
  onMerge: (removeKey: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [sku, setSku] = useState(product.sku ?? "");
  const [name, setName] = useState(product.name);
  const [family, setFamily] = useState(product.family);
  const [saleDescription, setSaleDescription] = useState(
    product.saleDescription ?? "",
  );
  const [saleUnit, setSaleUnit] = useState(product.saleUnit ?? product.unit ?? "");
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
  const lastDiscount =
    product.lastPvp > 0
      ? ((product.lastPvp - product.lastUnitPrice) / product.lastPvp) * 100
      : product.lastDiscountPercent;
  const mergeOptions = allProducts
    .filter((item) => item.key !== product.key)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const filteredMergeOptions = mergeOptions.filter((item) => {
    const term = mergeSearch.trim().toLowerCase();
    if (!term) return true;
    return [item.name, item.family, item.usualSupplier?.supplierName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  function saveEdits() {
    const parsedSalePrice = parseOptionalNumber(salePrice);
    const parsedSaleIva = parseOptionalNumber(saleIvaPercent);
    const parsedPurchaseListPrice = parseOptionalNumber(purchaseListPrice);
    const parsedPurchaseDiscount = parseOptionalNumber(purchaseDiscountPercent);
    const parsedPurchaseCost =
      parseOptionalNumber(purchaseNetUnitCost) ??
      (parsedPurchaseListPrice !== undefined && parsedPurchaseDiscount !== undefined
        ? parsedPurchaseListPrice * (1 - parsedPurchaseDiscount / 100)
        : undefined);
    const manualSaleUnit = normalizeDocumentUnitId(saleUnit) ?? saleUnit.trim();
    const normalizedSaleUnit =
      calculationKind === "area"
        ? "m2"
        : manualSaleUnit || product.unit || "ud";
    const manualPurchaseUnit =
      normalizeDocumentUnitId(purchaseUnit) ?? purchaseUnit.trim();
    const normalizedPurchaseUnit = manualPurchaseUnit || normalizedSaleUnit;
    onSave({
      sku: sku.trim() || undefined,
      name: name.trim() || product.name,
      family: family.trim() || "Sin familia",
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
    setIsEditing(false);
  }

  function mergeSelectedProduct() {
    if (!mergeKey) return;
    onMerge(mergeKey);
    setMergeKey("");
    setMergeSearch("");
  }

  function deleteCatalogProduct() {
    if (!product.productId) return;
    const message =
      product.purchaseCount > 0
        ? "¿Quitar los ajustes guardados de este producto? Las compras seguirán estando guardadas."
        : "¿Eliminar este producto?";
    if (confirm(message)) {
      onDelete(product.productId);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              {product.family}
            </span>
            {product.sku ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {product.sku}
              </span>
            ) : null}
            {product.unit ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {product.unit}
              </span>
            ) : null}
            {product.calculation?.kind === "area" ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                alto x ancho
              </span>
            ) : null}
          </div>
          <h2 className="text-xl font-black text-slate-950">{product.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Última compra: {formatShortDate(product.lastPurchaseDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onToggleSelected}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              selected
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
            }`}
          >
            {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {selected ? "Añadido" : "Añadir"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSku(product.sku ?? "");
              setName(product.name);
              setFamily(product.family);
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
                  (product.purchaseDiscountPercent ??
                    product.lastDiscountPercent) ||
                    undefined,
                ),
              );
              setPurchaseNetUnitCost(
                numberToInput(
                  (product.purchaseNetUnitCost ?? product.lastUnitPrice) ||
                    undefined,
                ),
              );
              setSupplierReference(product.purchaseSupplierReference ?? "");
              setAttributesText(productAttributesToText(product.attributes));
              setNotes(product.notes ?? "");
              setCalculationKind(product.calculation?.kind ?? "none");
              setIsEditing((value) => !value);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 text-sm font-black text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            <Edit3 className="h-4 w-4" />
            Editar
          </button>
          {product.productId ? (
            <button
              type="button"
              onClick={deleteCatalogProduct}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
              aria-label={
                product.purchaseCount > 0
                  ? "Quitar ajustes guardados"
                  : "Eliminar producto"
              }
              title={
                product.purchaseCount > 0
                  ? "Quitar ajustes guardados"
                  : "Eliminar producto"
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Último coste
            </p>
            <p className="text-2xl font-black text-slate-950">
              {formatMoney(product.lastUnitPrice)}
            </p>
            <p className="text-xs font-semibold text-slate-500">sin IVA</p>
          </div>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
          <div className="grid gap-3 lg:grid-cols-[0.5fr_1.4fr_1fr_0.7fr]">
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Código
              </span>
              <input
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Producto
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Familia
              </span>
              <input
                list="product-family-options"
                value={family}
                onChange={(event) => setFamily(event.target.value)}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
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
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.45fr_0.6fr_0.45fr]">
            <EditInput
              label="Venta: descripción"
              value={saleDescription}
              onChange={setSaleDescription}
              placeholder={product.name}
            />
            <EditInput label="Unidad venta" value={saleUnit} onChange={setSaleUnit} />
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
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.45fr_0.6fr_0.45fr_0.6fr]">
            <EditInput
              label="Compra: descripción"
              value={purchaseDescription}
              onChange={setPurchaseDescription}
            />
            <EditInput
              label="Ref. proveedor"
              value={supplierReference}
              onChange={setSupplierReference}
            />
            <EditInput
              label="Unidad compra"
              value={purchaseUnit}
              onChange={setPurchaseUnit}
            />
            <EditInput
              label="Tarifa proveedor"
              value={purchaseListPrice}
              onChange={setPurchaseListPrice}
              inputMode="decimal"
            />
            <EditInput
              label="Dto. %"
              value={purchaseDiscountPercent}
              onChange={setPurchaseDiscountPercent}
              inputMode="decimal"
            />
            <EditInput
              label="Coste real"
              value={purchaseNetUnitCost}
              onChange={setPurchaseNetUnitCost}
              inputMode="decimal"
            />
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-600">
              Atributos
            </span>
            <textarea
              value={attributesText}
              onChange={(event) => setAttributesText(event.target.value)}
              placeholder={"Talla: L\nColor: Blanco\nMaterial: aluminio\nMetro lineal: barras de 6 m"}
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-2 flex flex-wrap gap-2">
              {PRODUCT_ATTRIBUTE_SUGGESTIONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setAttributesText((current) =>
                      addProductAttributeLine(current, label),
                    )
                  }
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  {label}
                </button>
              ))}
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
          <button
            type="button"
            onClick={saveEdits}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
          <p className="mt-2 text-sm font-semibold text-blue-900">
            Estos datos se recordarán para futuros escaneos del mismo producto.
          </p>
        </div>
      ) : null}

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
        <Metric
          label="Precio venta"
          value={
            product.saleUnitPrice
              ? formatMoney(product.saleUnitPrice)
              : "Sin precio"
          }
        />
        <Metric label="Coste medio" value={formatMoney(product.averageUnitPrice)} />
        <Metric
          label="Descuento habitual"
          value={`${product.averageDiscountPercent.toLocaleString("es-ES")}%`}
        />
        <Metric
          label="Volumen"
          value={`${product.totalQuantity.toLocaleString("es-ES")} ${
            product.unit ?? ""
          }`.trim()}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-3">
          <p className="flex items-center gap-2 text-sm font-black text-slate-800">
            <Factory className="h-4 w-4 text-blue-600" />
            Proveedor habitual
          </p>
          <p className="mt-2 text-lg font-black text-slate-950">
            {product.usualSupplier?.supplierName ?? "Sin proveedor"}
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
                  {item.name}
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
    </Card>
  );
}

function EditInput({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "decimal";
}) {
  return (
    <label className="space-y-1.5">
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
