"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CalendarDays,
  Euro,
  Factory,
  PackageSearch,
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
} from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import { formatMoney, formatShortDate } from "@/lib/calculations";
import {
  buildPurchaseProductSummaries,
  type PurchaseProductSummary,
} from "@/lib/purchase-products";

const ALL = "__all__";

export default function ProductosPage() {
  const { data } = useAppStore();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState(ALL);
  const [supplier, setSupplier] = useState(ALL);

  const products = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.documents),
    [data.expenses, data.documents],
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
    return products.filter((product) => {
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
  }, [family, products, query, supplier]);

  const totals = useMemo(
    () => ({
      products: products.length,
      families: families.length,
      suppliers: suppliers.length,
      totalBase: products.reduce((sum, product) => sum + product.totalBase, 0),
    }),
    [families.length, products, suppliers.length],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Productos"
        subtitle="Materiales y servicios detectados en tus compras escaneadas."
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
          <Link
            href="/gastos/nuevo"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <ShoppingCart className="h-5 w-5" />
            Escanear compra
          </Link>
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
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
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
            </div>
          </Card>

          <p className="text-sm font-semibold text-slate-500">
            {filteredProducts.length} de {products.length} producto(s)
          </p>

          <div className="grid gap-4">
            {filteredProducts.map((product) => (
              <ProductCard key={product.key} product={product} />
            ))}
          </div>
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

function ProductCard({ product }: { product: PurchaseProductSummary }) {
  const margin =
    product.pvpLast && product.lastUnitPrice > 0
      ? ((product.pvpLast - product.lastUnitPrice) / product.pvpLast) * 100
      : null;

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              {product.family}
            </span>
            {product.unit ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {product.unit}
              </span>
            ) : null}
          </div>
          <h2 className="text-xl font-black text-slate-950">{product.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500">
            <CalendarDays className="h-4 w-4" />
            Última compra: {formatShortDate(product.lastPurchaseDate)}
          </p>
        </div>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Precio medio" value={formatMoney(product.averageUnitPrice)} />
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
        <Metric label="Total comprado" value={formatMoney(product.totalBase)} />
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
            PVP detectado
          </p>
          {product.pvpLast ? (
            <>
              <p className="mt-2 text-lg font-black text-emerald-950">
                {formatMoney(product.pvpLast)}
              </p>
              <p className="text-sm font-semibold text-emerald-800">
                {margin !== null
                  ? `Margen orientativo: ${Math.round(margin)}%`
                  : `${product.pvpCount} uso(s) en ventas`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-lg font-black text-slate-700">
                Sin PVP detectado
              </p>
              <p className="text-sm font-semibold text-slate-500">
                Aparecerá cuando lo uses en un documento de venta.
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
    </Card>
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
