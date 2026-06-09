"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import {
  customerToClient,
  filterCustomers,
  sortCustomersByName,
} from "@/lib/customers";
import type { Client, Customer } from "@/lib/types";

interface ClientPickerProps {
  values: Client;
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearSelection: () => void;
  onChange: (field: keyof Client, value: string) => void;
}

export function ClientPicker({
  values,
  selectedCustomerId,
  onSelectCustomer,
  onClearSelection,
  onChange,
}: ClientPickerProps) {
  const { data } = useAppStore();
  const sorted = useMemo(
    () => sortCustomersByName(data.customers),
    [data.customers],
  );

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(
    () => (search.trim() ? filterCustomers(data.customers, search) : []),
    [data.customers, search],
  );

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyCustomer(customer: Customer) {
    onSelectCustomer(customer);
    setSearch(customer.name);
    setOpen(false);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Enter" && results.length === 1) {
        e.preventDefault();
        applyCustomer(results[0]);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      applyCustomer(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleDropdownChange(customerId: string) {
    if (!customerId) {
      onClearSelection();
      return;
    }
    const customer = data.customers.find((c) => c.id === customerId);
    if (customer) {
      applyCustomer(customer);
    }
  }

  function handleFieldChange(field: keyof Client, value: string) {
    if (selectedCustomerId) onClearSelection();
    onChange(field, value);
  }

  const selectedCustomer = selectedCustomerId
    ? data.customers.find((c) => c.id === selectedCustomerId)
    : null;

  return (
    <div className="space-y-4">
      {sorted.length > 0 ? (
        <>
          <Field
            label="Elegir cliente de la lista"
            hint="Ordenados alfabéticamente"
          >
            <Select
              value={selectedCustomerId ?? ""}
              onChange={(e) => handleDropdownChange(e.target.value)}
            >
              <option value="">— Selecciona un cliente —</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.nif ? ` (${c.nif})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <div className="relative" ref={containerRef}>
            <Field
              label="O buscar por nombre, NIF, teléfono..."
              hint="Escribe y pulsa Intro para rellenar los datos"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOpen(true);
                    if (selectedCustomerId) onClearSelection();
                  }}
                  onFocus={() => search.trim() && setOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Ej: María, 12345678A, 600..."
                  className="pl-10"
                />
              </div>
            </Field>

            {open && search.trim() && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                {results.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-slate-500">
                    No hay clientes que coincidan
                  </li>
                ) : (
                  results.map((customer, index) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyCustomer(customer)}
                        className={`w-full px-4 py-3 text-left transition-colors ${
                          index === highlight
                            ? "bg-blue-50 text-blue-900"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-semibold text-slate-900">
                          {customer.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {[customer.nif, customer.phone, customer.email]
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

          {selectedCustomer && (
            <p className="rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
              Cliente seleccionado: {selectedCustomer.name}
            </p>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">
            Aún no tienes clientes guardados.
          </p>
          <Link
            href="/clientes"
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            <UserPlus className="h-4 w-4" />
            Crear primer cliente
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre o empresa *">
          <Input
            value={values.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            placeholder="Ej: María López"
          />
        </Field>
        <Field label="NIF / CIF">
          <Input
            value={values.nif ?? ""}
            onChange={(e) => handleFieldChange("nif", e.target.value)}
            placeholder="12345678A"
          />
        </Field>
        <Field label="Teléfono">
          <Input
            value={values.phone ?? ""}
            onChange={(e) => handleFieldChange("phone", e.target.value)}
            placeholder="600 000 000"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={values.email ?? ""}
            onChange={(e) => handleFieldChange("email", e.target.value)}
            placeholder="cliente@email.com"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Dirección" hint="Opcional">
            <Input
              value={values.address ?? ""}
              onChange={(e) => handleFieldChange("address", e.target.value)}
              placeholder="Calle, número, ciudad"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

// Re-export helper for forms that need full customer address
export { customerToClient };
