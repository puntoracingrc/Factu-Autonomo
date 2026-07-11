"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import {
  CustomerAiAutofill,
  type CustomerAiAutofillValues,
} from "@/components/clients/CustomerAiAutofill";
import { StreetTypeSelect } from "@/components/clients/StreetTypeSelect";
import { GoogleAddressAutocomplete } from "@/components/places/GoogleAddressAutocomplete";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { useAppStore } from "@/context/AppStore";
import {
  clientAddressToFormFields,
  RESIDENCE_TYPES,
  residenceTypeAllowsAddressExtra,
} from "@/lib/customer-address";
import {
  CUSTOMER_TYPE_LABELS,
  customerToClient,
  filterCustomers,
  getCustomerDisplayName,
  normalizeCustomerType,
  sortCustomers,
} from "@/lib/customers";
import {
  getComboboxOptionId,
  resolveComboboxKeyboardAction,
} from "@/lib/combobox-navigation";
import type { GooglePlaceAddressSuggestion } from "@/lib/google-places";
import type {
  AddressResidenceType,
  Client,
  Customer,
  CustomerType,
} from "@/lib/types";

export interface ClientFormValues {
  customerType: CustomerType;
  firstName: string;
  lastName: string;
  contactName: string;
  nif: string;
  email: string;
  phone: string;
  streetType: string;
  residenceType: AddressResidenceType;
  address: string;
  addressExtra: string;
  city: string;
  postalCode: string;
  notes: string;
}

interface ClientPickerProps {
  values: ClientFormValues;
  selectedCustomerId: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onClearSelection: () => void;
  onChange: <K extends keyof ClientFormValues>(
    field: K,
    value: ClientFormValues[K],
  ) => void;
  requireInvoiceFields?: boolean;
}

export function ClientPicker({
  values,
  selectedCustomerId,
  onSelectCustomer,
  onClearSelection,
  onChange,
  requireInvoiceFields = false,
}: ClientPickerProps) {
  const { data } = useAppStore();
  const sorted = useMemo(
    () => sortCustomers(data.customers, [], "reciente", "desc").slice(0, 10),
    [data.customers],
  );

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const comboboxId = useId();
  const listboxId = `client-picker-listbox-${comboboxId}`;

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
    const action = resolveComboboxKeyboardAction({
      key: e.key,
      itemCount: results.length,
      highlightedIndex: highlight,
      open,
    });
    if (action.type === "none") return;

    e.preventDefault();
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

  function handleDropdownChange(customerId: string) {
    if (!customerId) {
      onClearSelection();
      return;
    }
    const customer = data.customers.find((c) => c.id === customerId);
    if (customer) applyCustomer(customer);
  }

  function handleFieldChange<K extends keyof ClientFormValues>(
    field: K,
    value: ClientFormValues[K],
  ) {
    onChange(field, value);
  }

  function handleAiApply(values: Partial<CustomerAiAutofillValues>) {
    const fields: Array<keyof ClientFormValues> = [
      "customerType",
      "firstName",
      "lastName",
      "contactName",
      "nif",
      "email",
      "phone",
      "streetType",
      "residenceType",
      "address",
      "addressExtra",
      "city",
      "postalCode",
      "notes",
    ];

    for (const field of fields) {
      const value = values[field];
      if (value) onChange(field, value as ClientFormValues[typeof field]);
    }
  }

  function handleAddressSuggestion(suggestion: GooglePlaceAddressSuggestion) {
    if (suggestion.streetType) onChange("streetType", suggestion.streetType);
    if (suggestion.streetLine || suggestion.address) {
      onChange("address", suggestion.streetLine || suggestion.address);
    }
    if (suggestion.postalCode) onChange("postalCode", suggestion.postalCode);
    if (suggestion.city) onChange("city", suggestion.city);
  }

  const selectedCustomer = selectedCustomerId
    ? data.customers.find((c) => c.id === selectedCustomerId)
    : null;
  const customerType = normalizeCustomerType(values.customerType);
  const isCompany = customerType === "company";
  const requiredMark = requireInvoiceFields ? " *" : "";
  const nameLabel = isCompany ? "Razón social" : "Nombre";
  const namePlaceholder = isCompany ? "Ej: Persianas Almar S.L." : "Ej: María";
  const nifLabel = isCompany ? "CIF" : "NIF / CIF";
  const showAddressExtra = residenceTypeAllowsAddressExtra(values.residenceType);
  const popupOpen = open && Boolean(search.trim());
  const activeIndex =
    results.length > 0 ? Math.min(highlight, results.length - 1) : -1;

  useEffect(() => {
    if (!popupOpen || activeIndex < 0) return;
    document
      .getElementById(getComboboxOptionId(listboxId, results[activeIndex].id))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, popupOpen, results]);

  return (
    <div className="space-y-5">
      {sorted.length > 0 ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(14rem,0.9fr)_minmax(18rem,1.4fr)]">
            <Field label="Clientes recientes">
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
              <Field label="Buscar cliente">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <Input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={popupOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={
                      popupOpen && activeIndex >= 0
                        ? getComboboxOptionId(
                            listboxId,
                            results[activeIndex].id,
                          )
                        : undefined
                    }
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setOpen(true);
                      if (selectedCustomerId) onClearSelection();
                    }}
                    onFocus={() => search.trim() && setOpen(true)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Nombre, apellidos o NIF"
                    className="pl-10"
                  />
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
                      Sin resultados
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
                          onMouseDown={(e) => e.preventDefault()}
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
          </div>

          {selectedCustomer && (
            <p className="mt-3 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-800">
              Cliente seleccionado: {getCustomerDisplayName(selectedCustomer)}.
              Los cambios de la ficha se guardarán en este cliente.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-600">
            Aún no tienes clientes guardados. Puedes crearlos aquí abajo o en la
            sección Clientes.
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
        hint={
          selectedCustomer
            ? "Estás editando la ficha del cliente seleccionado para este documento."
            : "Si es nuevo, se guardará al crear el documento."
        }
        className="p-3 sm:p-4"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="xl:col-span-2">
            <Field label="Tipo">
              <Select
                value={customerType}
                onChange={(e) =>
                  handleFieldChange(
                    "customerType",
                    e.target.value as CustomerType,
                  )
                }
              >
                <option value="person">{CUSTOMER_TYPE_LABELS.person}</option>
                <option value="company">{CUSTOMER_TYPE_LABELS.company}</option>
              </Select>
            </Field>
          </div>
          <div className="xl:col-span-3">
            <Field label={`${nameLabel}${requiredMark}`}>
              <Input
                value={values.firstName}
                onChange={(e) => handleFieldChange("firstName", e.target.value)}
                placeholder={namePlaceholder}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-3">
            <Field label={isCompany ? "Persona de contacto" : "Apellidos"}>
              <Input
                value={isCompany ? values.contactName : values.lastName}
                onChange={(e) =>
                  handleFieldChange(
                    isCompany ? "contactName" : "lastName",
                    e.target.value,
                  )
                }
                placeholder={isCompany ? "Ej: Laura Gómez" : "Ej: López García"}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label={`${nifLabel}${requiredMark}`}>
              <Input
                value={values.nif}
                onChange={(e) => handleFieldChange("nif", e.target.value)}
                placeholder="12345678A"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Teléfono">
              <Input
                value={values.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="600 000 000"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Email">
              <Input
                type="email"
                value={values.email}
                onChange={(e) => handleFieldChange("email", e.target.value)}
                placeholder="cliente@email.com"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Tipo de vía">
              <StreetTypeSelect
                value={values.streetType}
                onChange={(streetType) =>
                  handleFieldChange("streetType", streetType)
                }
              />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-5">
            <Field label={`Nombre de vía y número${requiredMark}`}>
              <GoogleAddressAutocomplete
                value={values.address}
                onChange={(value) => handleFieldChange("address", value)}
                onAddressSelected={handleAddressSuggestion}
                enabled={Boolean(data.profile.googlePlaces?.enabled)}
                displayStreetLineOnly
                placeholder="Ej: Valencia 546 7/1"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-2">
            <Field label="Tipo de inmueble">
              <Select
                value={values.residenceType}
                onChange={(e) =>
                  handleFieldChange(
                    "residenceType",
                    e.target.value as AddressResidenceType,
                  )
                }
              >
                {RESIDENCE_TYPES.map((type) => (
                  <option key={type.id || "blank"} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {showAddressExtra && (
            <div className="xl:col-span-2">
              <Field label="Piso / puerta / local">
                <Input
                  value={values.addressExtra}
                  onChange={(e) =>
                    handleFieldChange("addressExtra", e.target.value)
                  }
                  placeholder="Ej: 2º 2ª"
                  autoComplete="new-password"
                />
              </Field>
            </div>
          )}
          <div className="xl:col-span-2">
            <Field label={`Código postal${requiredMark}`}>
              <Input
                value={values.postalCode}
                onChange={(e) =>
                  handleFieldChange("postalCode", e.target.value)
                }
                placeholder="08017"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="xl:col-span-3">
            <Field label={`Ciudad${requiredMark}`}>
              <Input
                value={values.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
                placeholder="Barcelona"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="md:col-span-2 xl:col-span-12">
            <Field label="Notas del cliente">
              <Textarea
                value={values.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
                placeholder="Datos internos de la ficha del cliente..."
                className="min-h-20"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>
      </FormSection>
    </div>
  );
}

export function clientToFormValues(client: Client): ClientFormValues {
  const {
    streetType,
    streetLine,
    addressExtra,
    residenceType,
    city,
    postalCode,
  } =
    clientAddressToFormFields(client);
  const customerType = normalizeCustomerType(client.customerType);
  const name = client.name ?? "";
  const nameParts = name.split(" ");

  return {
    customerType,
    firstName:
      client.firstName ?? (customerType === "company" ? name : nameParts[0]) ?? "",
    lastName:
      customerType === "company"
        ? ""
        : (client.lastName ?? nameParts.slice(1).join(" ") ?? ""),
    contactName: client.contactName ?? "",
    nif: client.nif ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    streetType,
    residenceType,
    address: streetLine,
    addressExtra,
    city,
    postalCode,
    notes: "",
  };
}

export { customerToClient };
