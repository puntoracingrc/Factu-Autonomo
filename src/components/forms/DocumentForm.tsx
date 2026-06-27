"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Trash2 } from "lucide-react";
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
import { formatMoney, todayISO } from "@/lib/calculations";
import {
  documentAmounts,
  isVatExempt,
  zeroIvaItems,
} from "@/lib/vat-regime";
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
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { finishDocumentSave } from "@/lib/documents/save-feedback";
import { openDocumentPdfPreview } from "@/lib/pdf";
import { maybeCelebrateFirstInvoice } from "@/lib/factu/milestones";
import { finalizeVerifactuDocument } from "@/lib/verifactu/finalize";
import { DocumentIntegrityError } from "@/lib/document-integrity";
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
  const { checkCanCreateDocument, recordDocumentCreated } = useBilling();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [saveAction, setSaveAction] = useState<"idle" | "save" | "save-pdf">(
    "idle",
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const saving = saveAction !== "idle";
  const label = TYPE_LABELS[type];

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
    dueDate: dueDate || undefined,
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
    items,
    notes,
    paymentTerms: paymentTerms || undefined,
    status,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const totals = documentAmounts(previewDoc, vatExempt);

  const shareDoc: Document | null = existing
    ? {
        ...previewDoc,
        id: existing.id,
        number: existing.number,
        createdAt: existing.createdAt,
      }
    : null;

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomerId(customer.id);
    setClientForm(customerToFormValues(customer));
  }

  function handleClientFieldChange(
    field: keyof ClientFormValues,
    value: string,
  ) {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePreview() {
    if (saving || previewLoading) return;

    if (items.every((i) => !i.description.trim())) {
      alert("Añade al menos un concepto para la vista previa");
      return;
    }

    setPreviewLoading(true);
    try {
      const doc = attachIssuerSnapshot(previewDoc, data.profile);
      await openDocumentPdfPreview(doc, data.profile);
    } catch (error) {
      alert(
        error instanceof Error && error.message === "popup_blocked"
          ? "Permite ventanas emergentes para ver la vista previa, o usa «Guardar y descargar PDF»."
          : "No se pudo generar la vista previa del PDF.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleSave(download = false) {
    if (saving) return;

    if (items.every((i) => !i.description.trim())) {
      alert("Añade al menos un concepto");
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
      alert(customerResult.error);
      setSaveAction("idle");
      return;
    }

    const resolvedStatus =
      type === "presupuesto" && status === "pagado" ? "aceptado" : status;

    const payload = {
      type,
      date,
      dueDate: dueDate || undefined,
      customerId: customerResult.customerId,
      client: customerResult.client,
      items: normalizeLineItemUnits(
        (vatExempt ? zeroIvaItems(items) : items).filter((i) =>
          i.description.trim(),
        ),
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
      alert(emissionCheck.message);
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
        alert(
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
      alert(
        error instanceof Error
          ? `No se pudo completar el registro tributario: ${error.message}`
          : "No se pudo completar el registro tributario. El documento está guardado; prueba desde el listado.",
      );
      return;
    }

    maybeCelebrateFirstInvoice(data.documents, saved);
    setSaveAction("idle");
    await finishDocumentSave({
      type,
      number: saved.number,
      router,
      download: download ? { doc: saved, profile: data.profile } : undefined,
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
                  <option value="aceptado">Aceptado</option>
                ) : (
                  <option value="pagado">Cobrado</option>
                )}
                {type === "factura" && <option value="vencido">Vencido</option>}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Conceptos</h2>
          <button
            type="button"
            onClick={() =>
              setItems((prev) => [...prev, emptyLine(defaultIva, defaultUnit)])
            }
            className="flex items-center gap-1 text-sm font-semibold text-blue-600"
          >
            <Plus className="h-4 w-4" /> Añadir línea
          </button>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">
                  Línea {index + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.id !== item.id))
                    }
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Descripción">
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateItem(item.id, { description: e.target.value })
                    }
                    placeholder="Ej: Reparación fontanería"
                  />
                </Field>
                <Field label="Cantidad">
                  <NumericFieldInput
                    value={item.quantity}
                    onChange={(quantity) =>
                      updateItem(item.id, { quantity })
                    }
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
                    updateItem(item.id, { unitPrice })
                  }
                />
                {!vatExempt && (
                  <Field label="IVA %">
                    <IvaPercentSelect
                      value={item.ivaPercent}
                      onChange={(ivaPercent) =>
                        updateItem(item.id, { ivaPercent })
                      }
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
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
              Comparte este {label} por email o WhatsApp. Guarda antes si has
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

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => void handlePreview()}
          disabled={saving || previewLoading}
        >
          <Eye className="h-5 w-5" />
          {previewLoading ? "Generando vista previa…" : "Vista previa PDF"}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button fullWidth onClick={() => void handleSave(false)} disabled={saving || previewLoading}>
            {saveAction === "save" ? "Guardando…" : `Guardar ${label}`}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSave(true)}
            disabled={saving || previewLoading}
          >
            {saveAction === "save-pdf"
              ? "Guardando y preparando PDF…"
              : "Guardar y descargar PDF"}
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
