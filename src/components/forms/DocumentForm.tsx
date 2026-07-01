"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PackageCheck, Plus, Trash2 } from "lucide-react";
import {
  ClientPicker,
  clientToFormValues,
} from "@/components/clients/ClientPicker";
import type { ClientFormValues } from "@/components/clients/ClientPicker";
import { formatAddressBlock } from "@/lib/customer-address";
import { customerToFormValues, findCustomerByClient } from "@/lib/customers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney, formatShortDate, todayISO } from "@/lib/calculations";
import {
  isVatExempt,
  zeroIvaItems,
} from "@/lib/vat-regime";
import {
  documentFormAmounts,
  documentFormItemsForSave,
  firstDocumentFormLineIssue,
  lineItemFormTotal,
  sanitizeDocumentFormItems,
} from "@/lib/document-form-flow";
import { DocumentPaymentPicker } from "@/components/documents/DocumentPaymentPicker";
import { DocumentPhrasePicker } from "@/components/documents/DocumentPhrasePicker";
import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
import { defaultPhraseForType, normalizeDocumentPhrases } from "@/lib/document-phrases";
import {
  defaultPaymentMethodForType,
  normalizeDocumentPaymentMethods,
} from "@/lib/document-payment-methods";
import {
  normalizeDocumentUnits,
  normalizeLineItemUnits,
} from "@/lib/document-units";
import { LineItemPriceFields } from "@/components/documents/LineItemPriceFields";
import { LineItemUnitSelect } from "@/components/documents/LineItemUnitSelect";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import { businessProfileMissingDocumentLabels } from "@/lib/business-profile";
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { finishDocumentSave } from "@/lib/documents/save-feedback";
import { openDocumentPdfPreview } from "@/lib/pdf";
import { defaultQuoteDueDate } from "@/lib/quote-validity";
import { maybeCelebrateFirstInvoice } from "@/lib/factu/milestones";
import { finalizeVerifactuDocument } from "@/lib/verifactu/finalize";
import { DocumentIntegrityError } from "@/lib/document-integrity";
import { buildPurchaseProductSummaries } from "@/lib/purchase-products";
import {
  applyDocumentProductToLine,
  buildDocumentProductSuggestionIndex,
  DOCUMENT_PRODUCT_MARKUPS,
  documentProductSaleUnitPriceInfo,
  priceWithDocumentProductMarkup,
  searchDocumentProductSuggestions,
  type DocumentProductSalePriceSource,
} from "@/lib/document-product-suggestions";
import { consumeProductDocumentDraft } from "@/lib/product-document-draft";
import type { Document, DocumentType, LineItem, Customer } from "@/lib/types";

function emptyLine(defaultIva: number, defaultUnit: string): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: defaultUnit,
    unitPrice: 0,
    ivaPercent: defaultIva,
  };
}

const TYPE_LABELS: Record<DocumentType, string> = {
  factura: "factura",
  presupuesto: "presupuesto",
  recibo: "recibo",
};

const TYPE_ARTICLES: Record<DocumentType, string> = {
  factura: "esta",
  presupuesto: "este",
  recibo: "este",
};

const EMPTY_CLIENT: ClientFormValues = {
  firstName: "",
  lastName: "",
  nif: "",
  email: "",
  phone: "",
  streetType: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

interface LineProductPricingState {
  basePrice: number;
  markupPercent: number;
  priceSource: DocumentProductSalePriceSource;
  productName: string;
}

function removeLineProductPricing(
  state: Record<string, LineProductPricingState>,
  id: string,
): Record<string, LineProductPricingState> {
  const next = { ...state };
  delete next[id];
  return next;
}

interface DocumentFormProps {
  type: DocumentType;
  existing?: Document;
  initialCustomerId?: string | null;
}

export function DocumentForm({ type, existing, initialCustomerId }: DocumentFormProps) {
  const router = useRouter();
  const {
    data,
    ready,
    addDocument,
    updateDocument,
    upsertCustomerForDocument,
    registerVerifactuForDocument,
  } = useAppStore();
  const {
    billingEnabled,
    checkCanCreateDocument,
    isPro,
    recordDocumentCreated,
  } = useBilling();
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [saveAction, setSaveAction] = useState<"idle" | "save" | "save-pdf">(
    "idle",
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const saving = saveAction !== "idle";
  const label = TYPE_LABELS[type];
  const article = TYPE_ARTICLES[type];
  const missingIssuerLabels = businessProfileMissingDocumentLabels(data.profile);

  const [clientForm, setClientForm] = useState<ClientFormValues>(
    existing ? clientToFormValues(existing.client) : EMPTY_CLIENT,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const initialCustomerApplied = useRef(false);

  useEffect(() => {
    if (!existing || !ready) return;
    if (existing.customerId) {
      const byId = data.customers.find((customer) => customer.id === existing.customerId);
      if (byId) {
        setSelectedCustomerId(byId.id);
        return;
      }
    }
    const match = findCustomerByClient(data.customers, existing.client);
    if (match) setSelectedCustomerId(match.id);
  }, [existing, ready, data.customers]);

  useEffect(() => {
    if (existing || !ready || !initialCustomerId || initialCustomerApplied.current) {
      return;
    }
    const customer = data.customers.find((item) => item.id === initialCustomerId);
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    setClientForm(customerToFormValues(customer));
    initialCustomerApplied.current = true;
  }, [existing, ready, initialCustomerId, data.customers]);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const automaticQuoteDueDate =
    type === "presupuesto" && !existing
      ? defaultQuoteDueDate(date, data.profile)
      : "";
  const effectiveDueDate =
    type === "presupuesto" && !existing ? automaticQuoteDueDate : dueDate;
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const defaultNotesApplied = useRef(Boolean(existing?.notes));
  const [paymentTerms, setPaymentTerms] = useState(existing?.paymentTerms ?? "");
  const defaultPaymentApplied = useRef(Boolean(existing?.paymentTerms));
  const [status, setStatus] = useState<Document["status"]>(
    existing?.status ?? "borrador",
  );
  const vatExempt = isVatExempt(data.profile);
  const defaultIva = vatExempt ? 0 : (data.profile.iva?.defaultRate ?? 21);
  const unitsSettings = useMemo(
    () => normalizeDocumentUnits(data.profile.documentUnits),
    [data.profile.documentUnits],
  );
  const defaultUnit = unitsSettings.defaultUnitId;

  const [items, setItems] = useState<LineItem[]>(() => {
    const baseItems = existing?.items.length
      ? vatExempt
        ? zeroIvaItems(existing.items)
        : existing.items
      : [emptyLine(defaultIva, defaultUnit)];
    return normalizeLineItemUnits(baseItems, unitsSettings);
  });
  const safeItems = useMemo(
    () => sanitizeDocumentFormItems(items, vatExempt),
    [items, vatExempt],
  );
  const productSummaries = useMemo(
    () => buildPurchaseProductSummaries(data.expenses, data.products),
    [data.expenses, data.products],
  );
  const productSuggestionIndex = useMemo(
    () => buildDocumentProductSuggestionIndex(productSummaries),
    [productSummaries],
  );
  const [focusedProductLineId, setFocusedProductLineId] = useState<string | null>(
    null,
  );
  const [lineProductPricing, setLineProductPricing] = useState<
    Record<string, LineProductPricingState>
  >({});
  const productDocumentDraftApplied = useRef(false);

  useEffect(() => {
    if (existing || productDocumentDraftApplied.current) return;
    const draft = consumeProductDocumentDraft();
    productDocumentDraftApplied.current = true;
    if (!draft || draft.documentType !== type) return;

    const draftItems = draft.lines.map((draftLine) => ({
      id: crypto.randomUUID(),
      ...draftLine.line,
      ivaPercent: vatExempt ? 0 : draftLine.line.ivaPercent,
    }));
    setItems(normalizeLineItemUnits(draftItems, unitsSettings));
    setLineProductPricing(
      Object.fromEntries(
        draftItems.map((item, index) => [
          item.id,
          {
            basePrice: draft.lines[index].basePrice,
            markupPercent: 0,
            priceSource: draft.lines[index].priceSource,
            productName: draft.lines[index].productName,
          },
        ]),
      ),
    );
  }, [existing, type, unitsSettings, vatExempt]);

  useEffect(() => {
    if (!vatExempt) return;
    setItems((prev) => zeroIvaItems(prev));
  }, [vatExempt]);

  useEffect(() => {
    setItems((prev) => normalizeLineItemUnits(prev, unitsSettings));
  }, [unitsSettings]);

  useEffect(() => {
    if (existing || defaultNotesApplied.current) return;
    const phrase = defaultPhraseForType(
      normalizeDocumentPhrases(data.profile.documentPhrases),
      type,
    );
    if (!phrase) return;
    setNotes(phrase.text);
    defaultNotesApplied.current = true;
  }, [existing, type, data.profile.documentPhrases]);

  useEffect(() => {
    if (existing || defaultPaymentApplied.current) return;
    const method = defaultPaymentMethodForType(
      normalizeDocumentPaymentMethods(data.profile.documentPaymentMethods),
      type,
    );
    if (!method) return;
    setPaymentTerms(method.text);
    defaultPaymentApplied.current = true;
  }, [existing, type, data.profile.documentPaymentMethods]);

  const previewDoc: Document = {
    id: existing?.id ?? "preview",
    type,
    number: existing?.number ?? "BORRADOR",
    date,
    dueDate: effectiveDueDate || undefined,
    customerId: selectedCustomerId ?? existing?.customerId,
    client: {
      firstName: clientForm.firstName,
      lastName: clientForm.lastName,
      name: `${clientForm.firstName} ${clientForm.lastName}`.trim(),
      nif: clientForm.nif || undefined,
      email: clientForm.email || undefined,
      phone: clientForm.phone || undefined,
      streetType: clientForm.streetType || undefined,
      address:
        formatAddressBlock({
          streetType: clientForm.streetType,
          address: clientForm.address,
          postalCode: clientForm.postalCode,
          city: clientForm.city,
        }) ||
        clientForm.address ||
        undefined,
    },
    items: safeItems,
    notes,
    paymentTerms: paymentTerms || undefined,
    status,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const totals = documentFormAmounts(items, vatExempt);
  const isDraftStatus = status === "borrador";
  const previewButtonLabel =
    type === "factura" && isDraftStatus ? "Vista previa borrador" : "Vista previa PDF";
  const downloadStatusOverride: Document["status"] | undefined =
    type === "factura" && !existing ? "enviado" : undefined;
  const downloadButtonLabel =
    type === "factura" && (!existing || !isDraftStatus)
      ? "Emitir y descargar PDF"
      : isDraftStatus
        ? "Guardar borrador y descargar PDF"
        : "Guardar y descargar PDF";

  const shareDoc: Document | null = existing
    ? {
        ...previewDoc,
        id: existing.id,
        number: existing.number,
        createdAt: existing.createdAt,
      }
    : null;

  function updateItem(id: string, patch: Partial<LineItem>) {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function handleLineDescriptionChange(id: string, description: string) {
    updateItem(id, { description });
    setFocusedProductLineId(id);
    setLineProductPricing((prev) => {
      const current = prev[id];
      if (!current || description.trim() === current.productName) return prev;
      return removeLineProductPricing(prev, id);
    });
  }

  function handleSelectProductForLine(
    item: LineItem,
    product: (typeof productSummaries)[number],
  ) {
    const applied = applyDocumentProductToLine(product, item, {
      defaultIva,
      vatExempt,
    });
    updateItem(item.id, applied.line);
    setLineProductPricing((prev) => ({
      ...prev,
      [item.id]: {
        basePrice: applied.basePrice,
        markupPercent: 0,
        priceSource: applied.priceSource,
        productName: product.name,
      },
    }));
    setFocusedProductLineId(null);
  }

  function handleLineUnitPriceChange(id: string, unitPrice: number) {
    updateItem(id, { unitPrice });
    setLineProductPricing((prev) => {
      const current = prev[id];
      if (!current) return prev;
      return {
        ...prev,
        [id]: {
          ...current,
          markupPercent: -1,
        },
      };
    });
  }

  function handleLineMarkupChange(id: string, markupPercent: number) {
    const current = lineProductPricing[id];
    if (!current || markupPercent < 0) return;
    setLineProductPricing((prev) => ({
      ...prev,
      [id]: {
        ...current,
        markupPercent,
      },
    }));
    updateItem(id, {
      unitPrice: priceWithDocumentProductMarkup(current.basePrice, markupPercent),
    });
  }

  function handleSelectCustomer(customer: Customer) {
    setFormError(null);
    setSelectedCustomerId(customer.id);
    setClientForm(customerToFormValues(customer));
  }

  function handleClientFieldChange(
    field: keyof ClientFormValues,
    value: string,
  ) {
    setFormError(null);
    setClientForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePreview() {
    if (saving || previewLoading) return;

    const lineIssue = firstDocumentFormLineIssue(items);
    if (lineIssue) {
      setFormError(`${lineIssue} Revisa las líneas antes de abrir el PDF.`);
      return;
    }

    setPreviewLoading(true);
    try {
      const doc = attachIssuerSnapshot(previewDoc, data.profile);
      await openDocumentPdfPreview(doc, data.profile, pdfOptions);
    } catch (error) {
      alert(
        error instanceof Error && error.message === "popup_blocked"
          ? "Permite ventanas emergentes para ver la vista previa, o usa la descarga del PDF."
          : "No se pudo generar la vista previa del PDF.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave(
    download = false,
    statusOverride?: Document["status"],
  ) {
    if (saving) return;

    const lineIssue = firstDocumentFormLineIssue(items);
    if (lineIssue) {
      setFormError(lineIssue);
      return;
    }

    setSaveAction(download ? "save-pdf" : "save");

    if (!existing) {
      const gate = checkCanCreateDocument(data.customers.length);
      if (!gate.allowed) {
        setUpgradeReason(gate.reason);
        setUpgradeOpen(true);
        setSaveAction("idle");
        return;
      }
    }

    const customerResult = upsertCustomerForDocument(
      {
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        nif: clientForm.nif,
        email: clientForm.email,
        phone: clientForm.phone,
        streetType: clientForm.streetType,
        address: clientForm.address,
        city: clientForm.city,
        postalCode: clientForm.postalCode,
        notes: clientForm.notes,
      },
      selectedCustomerId,
    );

    if (!customerResult.ok) {
      setFormError(customerResult.error);
      setSaveAction("idle");
      return;
    }

    const requestedStatus = statusOverride ?? status;
    const resolvedStatus =
      type === "presupuesto" && requestedStatus === "pagado"
        ? "aceptado"
        : requestedStatus;

    const payload = {
      type,
      date,
      dueDate: effectiveDueDate || undefined,
      customerId: customerResult.customerId,
      client: customerResult.client,
      items: normalizeLineItemUnits(
        documentFormItemsForSave(items, vatExempt),
        unitsSettings,
      ),
      notes: notes || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      status: resolvedStatus,
    };

    const emissionCheck = validateDocumentEmission(
      { ...payload, type },
      data.profile,
      type,
    );
    if (!emissionCheck.ok) {
      setFormError(emissionCheck.message ?? "Revisa los datos del documento.");
      setSaveAction("idle");
      return;
    }

    let saved: Document;
    if (existing) {
      saved = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      try {
        saved = updateDocument(saved);
      } catch (error) {
        setSaveAction("idle");
        setFormError(
          error instanceof DocumentIntegrityError
            ? error.message
            : "No se pudo guardar el documento.",
        );
        return;
      }
    } else {
      saved = addDocument(payload);
      recordDocumentCreated();
    }

    saved = attachIssuerSnapshot(saved, data.profile);

    try {
      saved = await finalizeVerifactuDocument({
        doc: saved,
        profile: data.profile,
        chain: data.verifactuChain,
        registerLocal: registerVerifactuForDocument,
      });
    } catch (error) {
      setSaveAction("idle");
      setFormError(
        error instanceof Error
          ? `No se pudo completar el registro tributario: ${error.message}`
          : "No se pudo completar el registro tributario. El documento está guardado; prueba desde el listado.",
      );
      return;
    }

    maybeCelebrateFirstInvoice(data.documents, saved);
    setFormError(null);
    setSaveAction("idle");
    await finishDocumentSave({
      type,
      number: saved.number,
      router,
      download: download
        ? { doc: saved, profile: data.profile, pdfOptions }
        : undefined,
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          Datos del cliente
        </h2>
        <ClientPicker
          values={clientForm}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={handleSelectCustomer}
          onClearSelection={() => setSelectedCustomerId(null)}
          onChange={handleClientFieldChange}
        />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Fechas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          {type === "factura" && (
            <Field label="Fecha de vencimiento">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          )}
          {type === "presupuesto" && effectiveDueDate && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Válido hasta: </span>
              {formatShortDate(effectiveDueDate)}
            </div>
          )}
          {existing && (
            <Field label="Estado">
              <Select
                value={type === "presupuesto" && status === "pagado" ? "aceptado" : status}
                onChange={(e) =>
                  setStatus(e.target.value as Document["status"])
                }
              >
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                {type === "presupuesto" ? (
                  <>
                    <option value="aceptado">Aceptado</option>
                  </>
                ) : (
                  <option value="pagado">Cobrado</option>
                )}
                {type === "factura" && <option value="vencido">Vencido</option>}
              </Select>
              {type === "presupuesto" && status !== "borrador" && (
                <span className="text-xs text-amber-700">
                  Estado comercial local. No crea firma ni portal de cliente.
                </span>
              )}
              {type === "factura" && status !== "borrador" && (
                <span className="text-xs text-amber-700">
                  Al guardar, la factura se emitirá, tendrá número definitivo y
                  quedará bloqueada.
                </span>
              )}
              {type === "factura" &&
                status !== "borrador" &&
                missingIssuerLabels.length > 0 && (
                  <span className="text-xs text-red-600">
                    Revisa en Ajustes: {missingIssuerLabels.join(", ")}. El NIF
                    no se valida con AEAT desde la app.
                  </span>
                )}
            </Field>
          )}
          {!existing && type === "factura" && (
            <p className="text-sm text-slate-500 sm:col-span-2">
              El borrador no reserva número fiscal. Al emitir se asignan número
              y fecha definitivos y, si corresponde, se genera el QR tributario.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Conceptos</h2>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setItems((prev) => [...prev, emptyLine(defaultIva, defaultUnit)]);
            }}
            className="flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            <Plus className="h-4 w-4" /> Añadir línea
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => {
            const suggestions =
              focusedProductLineId === item.id
                ? searchDocumentProductSuggestions(
                    productSuggestionIndex,
                    item.description,
                  )
                : [];
            const productPricing = lineProductPricing[item.id];

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4"
              >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Línea {index + 1}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Trabajo, material o concepto facturado
                  </p>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setItems((prev) => prev.filter((i) => i.id !== item.id));
                      setLineProductPricing((prev) =>
                        removeLineProductPricing(prev, item.id),
                      );
                    }}
                    aria-label={`Eliminar línea ${index + 1}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(16rem,1fr)_5rem_5rem] lg:grid-cols-[minmax(18rem,1fr)_4.75rem_4.75rem_7.5rem_7.5rem_7rem] lg:items-start">
                <div className="col-span-2 md:col-span-1">
                  <Field label="Descripción">
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        handleLineDescriptionChange(item.id, e.target.value)
                      }
                      onFocus={() => setFocusedProductLineId(item.id)}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setFocusedProductLineId((current) =>
                            current === item.id ? null : current,
                          );
                        }, 120);
                      }}
                      placeholder="Ej: Reparación fontanería"
                    />
                  </Field>
                  {suggestions.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                      <div className="border-b border-blue-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                        Productos detectados
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {suggestions.map((product) => {
                          const price = documentProductSaleUnitPriceInfo(product);
                          return (
                            <button
                              key={product.key}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleSelectProductForLine(item, product)}
                              className="flex w-full flex-col gap-1 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500"
                            >
                              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <PackageCheck className="h-4 w-4 text-blue-600" />
                                {product.name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {product.family}
                                {product.usualSupplier
                                  ? ` · ${product.usualSupplier.supplierName}`
                                  : ""}
                              </span>
                              <span
                                className={`text-xs font-bold ${
                                  price.source === "pvp"
                                    ? "text-emerald-700"
                                    : "text-amber-800"
                                }`}
                              >
                                {price.unitPrice > 0
                                  ? `${formatMoney(price.unitPrice)} ${
                                      price.source === "pvp" ? "PVP" : "coste, no PVP"
                                    }`
                                  : "Sin precio"}
                              </span>
                              {price.source !== "pvp" && (
                                <span className="rounded-xl bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                                  Aviso: no hay PVP detectado. Revisa el precio de venta.
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <Field label="Cant.">
                  <NumericFieldInput
                    value={item.quantity}
                    onChange={(quantity) => updateItem(item.id, { quantity })}
                  />
                </Field>
                <Field label="Unidad">
                  <LineItemUnitSelect
                    settings={data.profile.documentUnits}
                    value={item.unit ?? defaultUnit}
                    onChange={(unit) => updateItem(item.id, { unit })}
                  />
                </Field>
                <LineItemPriceFields
                  unitPrice={item.unitPrice}
                  ivaPercent={item.ivaPercent}
                  vatExempt={vatExempt}
                  onUnitPriceChange={(unitPrice) =>
                    handleLineUnitPriceChange(item.id, unitPrice)
                  }
                />
                {!vatExempt && (
                  <Field label="IVA">
                    <IvaPercentSelect
                      value={item.ivaPercent}
                      onChange={(ivaPercent) =>
                        updateItem(item.id, { ivaPercent })
                      }
                    />
                  </Field>
                )}
              </div>
              {productPricing && (
                <div
                  className={`mt-3 rounded-2xl border p-3 ${
                    productPricing.priceSource === "pvp"
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-end">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">
                        {productPricing.productName}
                      </p>
                      <p className="text-xs font-semibold text-slate-600">
                        Base: {formatMoney(productPricing.basePrice)}{" "}
                        {productPricing.priceSource === "pvp"
                          ? "PVP sin IVA"
                          : "coste sin IVA, no PVP"}
                      </p>
                      {productPricing.priceSource !== "pvp" && (
                        <p className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
                          Aviso: este producto no tiene PVP detectado. La app ha
                          rellenado el coste conocido solo como referencia; cambia
                          el precio antes de emitir si vas a venderlo con margen.
                        </p>
                      )}
                      {productPricing.markupPercent === -1 && (
                        <p className="text-xs font-semibold text-blue-700">
                          Precio ajustado manualmente.
                        </p>
                      )}
                    </div>
                    <Field label="Incremento">
                      <Select
                        value={String(productPricing.markupPercent)}
                        onChange={(event) =>
                          handleLineMarkupChange(item.id, Number(event.target.value))
                        }
                      >
                        <option value="-1">Manual</option>
                        {DOCUMENT_PRODUCT_MARKUPS.map((markup) => (
                          <option key={markup} value={markup}>
                            +{markup}%
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              )}
              <div className="mt-3 flex justify-end border-t border-slate-200/70 pt-3">
                <p className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-100">
                  Total línea: {formatMoney(lineItemFormTotal(item, vatExempt))}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-4">
        <DocumentPaymentPicker
          documentType={type}
          settings={data.profile.documentPaymentMethods}
          value={paymentTerms}
          onChange={setPaymentTerms}
        />
        <DocumentPhrasePicker
          documentType={type}
          settings={data.profile.documentPhrases}
          onSelect={setNotes}
        />
        <Field label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condiciones de pago, garantía..."
          />
        </Field>
        <div className="mt-4 space-y-1 text-right text-slate-700">
          {!vatExempt && <p>Base: {formatMoney(totals.subtotal)}</p>}
          {!vatExempt && <p>IVA: {formatMoney(totals.iva)}</p>}
          <p className="text-xl font-bold text-blue-700">
            Total: {formatMoney(totals.total)}
          </p>
          {vatExempt && (
            <p className="text-xs text-slate-500">Sin IVA (exento de repercusión)</p>
          )}
        </div>
      </Card>

      {shareDoc && (
        <Card className="space-y-3">
          <div>
            <p className="font-semibold text-slate-900">Enviar al cliente</p>
            <p className="mt-1 text-sm text-slate-500">
              Comparte {article} {label} por email o WhatsApp. Guarda antes si has
              hecho cambios.
            </p>
          </div>
          <div className="action-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 sm:pb-0">
            <DocumentPdfShareActions
              doc={shareDoc}
              profile={data.profile}
              showPreview={false}
            />
          </div>
        </Card>
      )}

      {formError && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
        >
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void handlePreview()}
          disabled={saving || previewLoading}
        >
          <Eye className="h-5 w-5" />
          {previewLoading ? "Generando vista previa…" : previewButtonLabel}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button fullWidth onClick={() => void handleSave(false)} disabled={saving || previewLoading}>
            {saveAction === "save"
              ? "Guardando…"
              : isDraftStatus
                ? "Guardar borrador"
                : type === "factura"
                  ? "Emitir factura"
                  : `Guardar ${label}`}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSave(true, downloadStatusOverride)}
            disabled={saving || previewLoading}
          >
            {saveAction === "save-pdf"
              ? "Guardando y preparando PDF…"
              : downloadButtonLabel}
          </Button>
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />
    </div>
  );
}
