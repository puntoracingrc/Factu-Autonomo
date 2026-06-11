"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { filterSuppliers } from "@/lib/suppliers";
import type { Supplier } from "@/lib/types";

interface SupplierListSearchProps {
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  onSelectSupplier: (supplier: Supplier | null) => void;
}

export function SupplierListSearch({
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
}: SupplierListSearchProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => (search.trim() ? filterSuppliers(suppliers, search) : []),
    [suppliers, search],
  );

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  useEffect(() => {
    if (!selectedSupplierId) return;
    const selected = suppliers.find((supplier) => supplier.id === selectedSupplierId);
    if (selected) {
      setSearch(selected.name);
    }
  }, [selectedSupplierId, suppliers]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applySupplier(supplier: Supplier) {
    onSelectSupplier(supplier);
    setSearch(supplier.name);
    setOpen(false);
  }

  function clearSelection() {
    onSelectSupplier(null);
    setSearch("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === "Enter" && results.length === 1) {
        event.preventDefault();
        applySupplier(results[0]);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((value) => Math.min(value + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((value) => Math.max(value - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      applySupplier(results[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative mb-4" ref={containerRef}>
      <Field
        label="Buscar proveedor"
        hint="Escribe nombre o NIF y elige en la lista"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
              if (selectedSupplierId) onSelectSupplier(null);
            }}
            onFocus={() => search.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: Leroy Merlin, B12345678..."
            className="pl-10"
          />
          {selectedSupplierId && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Quitar filtro"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </Field>

      {open && search.trim() && !selectedSupplierId && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              No hay proveedores que coincidan
            </li>
          ) : (
            results.map((supplier, index) => (
              <li key={supplier.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySupplier(supplier)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    index === highlight
                      ? "bg-blue-50 text-blue-900"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                  <p className="text-sm text-slate-500">
                    {[supplier.nif, supplier.phone, supplier.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
