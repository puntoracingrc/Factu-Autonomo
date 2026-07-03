"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import {
  CustomerAiAutofill,
  type CustomerAiAutofillValues,
} from "@/components/clients/CustomerAiAutofill";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import { clientAddressToFormFields } from "@/lib/customer-address";
import {
  customerToClient,
  filterCustomers,
  getCustomerDisplayName,
  sortCustomers,
} from "@/lib/customers";
import type { Client, Customer } from "@/lib/types";

export interface ClientFormValues {
  firstName: string;
  lastName: string;
  nif: string;
  email: string;
  phone: string;
  streetType: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
}

interface ClientPickerProps {
  values: ClientFormValues;
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearSelection: () => void;
  onChange: (field: keyof ClientFormValues, value: string) => void;
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
    () => sortCustomers(data.customers, [], "reciente", "desc"),
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
    setSearch(getCustomerDisplayName(customer));
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
    if (customer) applyCustomer(customer);
  }

  function handleFieldChange(field: keyof ClientFormValues, value: string) {
    if (selectedCustomerId) onClearSelection();
    onChange(field, value);
  }

  function handleAiApply(values: Partial<CustomerAiAutofillValues>) {
    if (selectedCustomerId) onClearSelection();
    const fields: Array<keyof ClientFormValues> = [
      "firstName",
      "lastName",
      "nif",
      "email",
      "phone",
      "streetType",
      "address",
      "city",
      "postalCode",
      "notes",
    ];

    for (const field of fields) {
      const value = values[field];
      if (value) onChange(field, value);
    }
  }

  const selectedCustomer = selectedCustomerId
    ? data.customers.find((c) => c.id === selectedCustomerId)
    : null;

  return (
    <div className="space-y-5">
      {sorted.length > 0 ? (
        <FormSection
          variant="search"
          title="Buscar o elegir cliente"
          hint="Lista de clientes recientes o búsqueda por nombre, apellidos o NIF."
        >
          <Field
            label="Lista de clientes"
            hint="Últimos añadidos primero"
          >
            <Select
              value={selectedCustomerId ?? ""}
              onChange={(e) => handleDropdownChange(e.target.value)}
            >
              <option value="">— Selecciona un cliente —</option>
              {sorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCustomerDisplayName(c)}
                  {c.nif ? ` (${c.nif})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <div className="relative" ref={containerRef}>
            <Field
              label="Búsqueda rápida"
              hint="Escribe y pulsa Intro para rellenar la ficha"
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
                  placeholder="Ej: García, Ana, 12345678A..."
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

          {selectedCustomer && (
            <p className="rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
              Cliente seleccionado: {getCustomerDisplayName(selectedCustomer)}
            </p>
          )}
        </FormSection>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">
            Aún no tienes clientes guardados. Puedes crearlos aquí abajo o en
            la sección Clientes.
          </p>
          <Link
            href="/clientes"
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            <UserPlus className="h-4 w-4" />
            Ir a Clientes
          </Link>
        </div>
      )}

      <CustomerAiAutofill onApply={handleAiApply} />

      <FormSection
        variant="fields"
        title="Ficha del cliente"
        hint="Si es un cliente nuevo, se guardará al crear el documento. Los apellidos son opcionales."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <Input
              value={values.firstName}
              onChange={(e) => handleFieldChange("firstName", e.target.value)}
              placeholder="Ej: María"
            />
          </Field>
          <Field label="Apellidos" hint="Opcional">
            <Input
              value={values.lastName}
              onChange={(e) => handleFieldChange("lastName", e.target.value)}
              placeholder="Ej: López García"
            />
          </Field>
          <Field label="NIF / CIF">
            <Input
              value={values.nif}
              onChange={(e) => handleFieldChange("nif", e.target.value)}
              placeholder="12345678A"
            />
          </Field>
          <Field
            label="Teléfono"
            hint="El teléfono se usará para WhatsApp si está informado."
          >
            <Input
              value={values.phone}
              onChange={(e) => handleFieldChange("phone", e.target.value)}
              placeholder="600 000 000"
            />
          </Field>
          <Field
            label="Email"
            hint="Se usará para activar el envío por email en documentos guardados."
          >
            <Input
              type="email"
              value={values.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              placeholder="cliente@email.com"
            />
          </Field>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[minmax(0,12rem)_1fr]">
            <Field label="Tipo de vía" hint="Opcional">
              <StreetTypeSelect
                value={values.streetType}
                onChange={(streetType) => handleFieldChange("streetType", streetType)}
              />
            </Field>
            <Field
              label="Nombre de vía y número"
              hint="Sin C/, Avda. ni otros prefijos"
            >
              <Input
                value={values.address}
                onChange={(e) => handleFieldChange("address", e.target.value)}
                placeholder="Ej: Valencia 546 7/1"
              />
            </Field>
          </div>
          <Field label="Código postal">
            <Input
              value={values.postalCode}
              onChange={(e) => handleFieldChange("postalCode", e.target.value)}
              placeholder="08017"
            />
          </Field>
          <Field label="Ciudad">
            <Input
              value={values.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              placeholder="Barcelona"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notas del cliente">
              <Textarea
                value={values.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Datos internos de la ficha del cliente..."
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

export function clientToFormValues(client: Client): ClientFormValues {
  const { streetType, streetLine } = clientAddressToFormFields(client);

  return {
    firstName: client.firstName ?? client.name?.split(" ")[0] ?? "",
    lastName:
      client.lastName ??
      client.name?.split(" ").slice(1).join(" ") ??
      "",
    nif: client.nif ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    streetType,
    address: streetLine,
    city: "",
    postalCode: "",
    notes: "",
  };
}

export { customerToClient };
