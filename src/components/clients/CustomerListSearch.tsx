"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Field, Input } from "@/components/ui/Field";
import { filterCustomers, getCustomerDisplayName } from "@/lib/customers";
import {
  getComboboxOptionId,
  resolveComboboxKeyboardAction,
} from "@/lib/combobox-navigation";
import type { Customer } from "@/lib/types";

interface CustomerListSearchProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export function CustomerListSearch({
  customers,
  selectedCustomerId,
  onSelectCustomer,
}: CustomerListSearchProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxId = useId();
  const listboxId = `customer-search-listbox-${comboboxId}`;

  const results = useMemo(
    () => (search.trim() ? filterCustomers(customers, search) : []),
    [customers, search],
  );

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  useEffect(() => {
    if (!selectedCustomerId) return;
    const selected = customers.find((customer) => customer.id === selectedCustomerId);
    if (selected) {
      setSearch(getCustomerDisplayName(selected));
    }
  }, [selectedCustomerId, customers]);

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

  function applyCustomer(customer: Customer) {
    onSelectCustomer(customer);
    setSearch(getCustomerDisplayName(customer));
    setOpen(false);
  }

  function clearSelection() {
    onSelectCustomer(null);
    setSearch("");
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const popupVisible =
      open && Boolean(search.trim()) && selectedCustomerId === null;
    const action = resolveComboboxKeyboardAction({
      key: event.key,
      itemCount: selectedCustomerId === null ? results.length : 0,
      highlightedIndex: highlight,
      open: popupVisible,
    });
    if (action.type === "none") return;

    event.preventDefault();
    if (action.type === "close") {
      setOpen(false);
    } else if (action.type === "highlight") {
      setOpen(true);
      setHighlight(action.index);
    } else {
      const customer = results[action.index];
      if (customer) applyCustomer(customer);
    }
  }

  const popupOpen =
    open && Boolean(search.trim()) && selectedCustomerId === null;
  const activeIndex =
    results.length > 0 ? Math.min(highlight, results.length - 1) : -1;

  useEffect(() => {
    if (!popupOpen || activeIndex < 0) return;
    document
      .getElementById(getComboboxOptionId(listboxId, results[activeIndex].id))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, popupOpen, results]);

  return (
    <div className="relative" ref={containerRef}>
      <Field
        label="Buscar cliente"
        hint="Escribe nombre, apellidos o NIF y elige en la lista"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={popupOpen}
            aria-controls={listboxId}
            aria-activedescendant={
              popupOpen && activeIndex >= 0
                ? getComboboxOptionId(listboxId, results[activeIndex].id)
                : undefined
            }
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpen(true);
              if (selectedCustomerId) onSelectCustomer(null);
            }}
            onFocus={() => search.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: García, María, 46402457A..."
            className="pl-10"
          />
          {selectedCustomerId && (
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

      {popupOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Clientes encontrados"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {results.length === 0 ? (
            <li
              role="status"
              className="px-4 py-3 text-sm text-slate-500"
            >
              No hay clientes que coincidan
            </li>
          ) : (
            results.map((customer, index) => (
              <li key={customer.id} role="presentation">
                <button
                  id={getComboboxOptionId(listboxId, customer.id)}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => applyCustomer(customer)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    index === activeIndex
                      ? "bg-blue-50 text-blue-900"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">
                    {getCustomerDisplayName(customer)}
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
  );
}
