"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Plus, Trash2 } from "lucide-react";
import {
  ClientPicker,
  clientToFormValues,
} from "@/components/clients/ClientPicker";
import type { ClientFormValues } from "@/components/clients/ClientPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IvaPercentSelect } from "@/components/iva/IvaPercentSelect";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { NumericFieldInput } from "@/components/ui/NumericFieldInput";
import {
  formatAddressBlock,
  residenceTypeAllowsAddressExtra,
} from "@/lib/customer-address";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { useAppStore } from "@/context/AppStore";
import { useBilling } from "@/context/BillingContext";
import { formatMoney, todayISO } from "@/lib/calculations";
import {
  documentAmounts,
  isVatExempt,
  zeroIvaItems,
} from "@/lib/vat-regime";
import { validateDocumentEmission } from "@/lib/invoice-compliance";
import { attachIssuerSnapshot } from "@/lib/issuer-snapshot";
import { LineItemPriceFields } from "@/components/documents/LineItemPriceFields";
import { LineItemUnitSelect } from "@/components/documents/LineItemUnitSelect";
import { DocumentPaymentPicker } from "@/components/documents/DocumentPaymentPicker";
import { DocumentPhrasePicker } from "@/components/documents/DocumentPhrasePicker";
import { finishDocumentSave } from "@/lib/documents/save-feedback";
import { openDocumentPdfPreview } from "@/lib/pdf";
import {
  defaultPaymentMethodForType,
  normalizeDocumentPaymentMethods,
} from "@/lib/document-payment-methods";
import {
  normalizeDocumentUnits,
  normalizeLineItemUnits,
} from "@/lib/document-units";
import {
  areaQuantityFromDimensions,
  isAreaDocumentUnit,
} from "@/lib/area-calculation";
import { maybeCelebrateFirstRectificativa } from "@/lib/factu/milestones";
import { finalizeVerifactuDocument } from "@/lib/verifactu/finalize";
import {
  cloneItemsForCorreccion,
  itemsForAnulacion,
  rectificationTextDefaults,
  rectificationTypeLabel,
} from "@/lib/rectificativas";
import { lineItemFormTotal } from "@/lib/document-form-flow";
import type { Document, LineItem, RectificationType } from "@/lib/types";
import { RECTIFICATION_REASONS } from "@/lib/types";

interface RectificativaFormProps {
  original: Document;
}

interface LineAreaDraft {
  width: number;
  height: number;
}

export function RectificativaForm({ original }: RectificativaFormProps) {
  const router = useRouter();
  const { data, addRectificativa, registerVerifactuForDocument } = useAppStore();
  const {
    billingEnabled,
    checkCanCreateDocument,
    isPro,
    recordDocumentCreated,
  } = useBilling();
  const pdfOptions = { freePlanBranding: billingEnabled && !isPro };
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [saveAction, setSaveAction] = useState<
    "idle" | "draft" | "save" | "save-pdf"
  >("idle");
  const [previewLoading, setPreviewLoading] = useState(false);
  const saving = saveAction !== "idle";
  const vatExempt = isVatExempt(data.profile);
  const defaultIva = vatExempt ? 0 : (data.profile.iva?.defaultRate ?? 21);
  const unitsSettings = normalizeDocumentUnits(data.profile.documentUnits);
  const defaultUnit = unitsSettings.defaultUnitId;

  const [rectType, setRectType] = useState<RectificationType>("anulacion");
  const [reason, setReason] = useState<string>(RECTIFICATION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState(todayISO());
  const initialTextDefaults = rectificationTextDefaults(original);
  const [notes, setNotes] = useState(initialTextDefaults.notes);
  const [paymentTerms, setPaymentTerms] = useState(
    initialTextDefaults.paymentTerms,
  );
  const [clientForm, setClientForm] = useState<ClientFormValues>(
    clientToFormValues(original.client),
  );
  const [items, setItems] = useState<LineItem[]>(() =>
    normalizeLineItemUnits(itemsForAnulacion(original.items), unitsSettings),
  );
  const [lineAreaDrafts, setLineAreaDrafts] = useState<
    Record<string, LineAreaDraft>
  >({});

  useEffect(() => {
    const method = defaultPaymentMethodForType(
      normalizeDocumentPaymentMethods(data.profile.documentPaymentMethods),
      "factura",
    );
    if (method) {
      const defaults = rectificationTextDefaults(original, method.text);
      setPaymentTerms((current) => current || defaults.paymentTerms);
    }
  }, [data.profile.documentPaymentMethods, original]);

  function handleTypeChange(type: RectificationType) {
    setRectType(type);
    setItems(
      normalizeLineItemUnits(
        type === "anulacion"
          ? itemsForAnulacion(original.items)
          : cloneItemsForCorreccion(original.items),
        unitsSettings,
      ),
    );
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function handleLineAreaDraftChange(id: string, patch: Partial<LineAreaDraft>) {
    const nextDraft = {
      ...(lineAreaDrafts[id] ?? { width: 0, height: 0 }),
      ...patch,
    };
    const quantity = areaQuantityFromDimensions(nextDraft);
    setLineAreaDrafts((current) => {
      return { ...current, [id]: nextDraft };
    });
    if (quantity > 0) updateItem(id, { quantity, unit: "m2" });
  }

  const previewTotals = documentAmounts({ items }, vatExempt);
  const finalReason =
    reason === "Otros motivos" ? customReason.trim() : reason;

  function rectificativaItemsForSave(): LineItem[] {
    return normalizeLineItemUnits(
      (vatExempt ? zeroIvaItems(items) : items).filter((i) =>
        i.description.trim(),
      ),
      unitsSettings,
    );
  }

  function rectificativaClient() {
    return {
      firstName: clientForm.firstName,
      lastName: clientForm.lastName,
      name: `${clientForm.firstName} ${clientForm.lastName}`.trim(),
      nif: clientForm.nif || undefined,
      email: clientForm.email || undefined,
      phone: clientForm.phone || undefined,
      streetType: clientForm.streetType || undefined,
      residenceType: clientForm.residenceType,
      addressExtra: residenceTypeAllowsAddressExtra(clientForm.residenceType)
        ? clientForm.addressExtra || undefined
        : undefined,
      address:
        formatAddressBlock({
          streetType: clientForm.streetType,
          address: clientForm.address,
          residenceType: clientForm.residenceType,
          addressExtra: clientForm.addressExtra,
          postalCode: clientForm.postalCode,
          city: clientForm.city,
        }) ||
        clientForm.address ||
        undefined,
    };
  }

  function buildRectificativaDraft(status: Document["status"]): Document {
    const now = new Date().toISOString();
    return {
      id: "preview-rectificativa",
      type: "factura",
      number: "BORRADOR",
      date,
      client: rectificativaClient(),
      customerId: original.customerId,
      items: rectificativaItemsForSave(),
      notes: notes || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      status,
      sourceQuoteDocumentId: original.sourceQuoteDocumentId,
      sourceQuoteNumber: original.sourceQuoteNumber,
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: finalReason,
        type: rectType,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  function validateRectificativaBasics(): boolean {
    if (!finalReason) {
      alert("Indica el motivo de la rectificación");
      return false;
    }
    if (items.every((i) => !i.description.trim())) {
      alert("Añade al menos un concepto");
      return false;
    }
    return true;
  }

  async function handlePreview() {
    if (saving || previewLoading) return;
    if (!validateRectificativaBasics()) return;

    setPreviewLoading(true);
    try {
      const doc = attachIssuerSnapshot(
        buildRectificativaDraft("borrador"),
        data.profile,
      );
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
    statusOverride: Document["status"] = "enviado",
  ) {
    if (saving) return;
    if (!validateRectificativaBasics()) return;

    const isDraft = statusOverride === "borrador";
    setSaveAction(isDraft ? "draft" : download ? "save-pdf" : "save");

    const gate = checkCanCreateDocument(data.customers.length);
    if (!gate.allowed) {
      setUpgradeReason(gate.reason);
      setUpgradeOpen(true);
      setSaveAction("idle");
      return;
    }

    if (!isDraft) {
      const emissionCheck = validateDocumentEmission(
        {
          type: "factura",
          status: statusOverride,
          client: {
            name: `${clientForm.firstName} ${clientForm.lastName}`.trim(),
          },
          items,
        },
        data.profile,
        "factura",
      );
      if (!emissionCheck.ok) {
        alert(emissionCheck.message);
        setSaveAction("idle");
        return;
      }
    }

    let saved = addRectificativa(original.id, {
      date,
      client: rectificativaClient(),
      customerId: original.customerId,
      items: rectificativaItemsForSave(),
      notes: notes || undefined,
      paymentTerms: paymentTerms.trim() || undefined,
      status: statusOverride,
      sourceQuoteDocumentId: original.sourceQuoteDocumentId,
      sourceQuoteNumber: original.sourceQuoteNumber,
      rectification: {
        originalDocumentId: original.id,
        originalNumber: original.number,
        originalDate: original.date,
        reason: finalReason,
        type: rectType,
      },
    });

    if (!saved) {
      alert("No se pudo crear la factura rectificativa");
      setSaveAction("idle");
      return;
    }

    recordDocumentCreated();

    if (isDraft) {
      setSaveAction("idle");
      await finishDocumentSave({
        type: "factura",
        number: saved.number,
        router,
      });
      return;
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

    maybeCelebrateFirstRectificativa(data.documents, saved);
    setSaveAction("idle");
    await finishDocumentSave({
      type: "factura",
      number: saved.number,
      router,
      download: download
        ? { doc: saved, profile: data.profile, pdfOptions }
        : undefined,
    });
  }

  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50">
        <p className="font-semibold text-amber-900">Factura original</p>
        <p className="mt-1 text-amber-800">
          {original.number} · {original.client.name} ·{" "}
          {formatMoney(documentAmounts(original, vatExempt).total)}
        </p>
        <p className="mt-2 text-sm text-amber-700">
          La factura original no se borra. Quedará marcada como rectificada o
          anulada según el tipo que elijas.
        </p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Tipo de rectificación
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleTypeChange("anulacion")}
            className={`rounded-2xl border-2 p-4 text-left ${
              rectType === "anulacion"
                ? "border-red-500 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <p className="font-bold text-slate-900">Anulación total</p>
            <p className="mt-1 text-sm text-slate-600">
              Anula por completo la factura original con importes negativos.
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("correccion")}
            className={`rounded-2xl border-2 p-4 text-left ${
              rectType === "correccion"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <p className="font-bold text-slate-900">Corrección de datos</p>
            <p className="mt-1 text-sm text-slate-600">
              Corrige datos, cantidades o conceptos con los valores correctos.
            </p>
          </button>
        </div>

        <Field label="Motivo *">
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {RECTIFICATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        {reason === "Otros motivos" && (
          <Field label="Describe el motivo">
            <Textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
            />
          </Field>
        )}
        <Field label="Fecha de la rectificativa">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Cliente</h2>
        <ClientPicker
          values={clientForm}
          selectedCustomerId={null}
          onSelectCustomer={() => {}}
          onClearSelection={() => {}}
          onChange={(field, value) =>
            setClientForm((prev) => ({ ...prev, [field]: value }))
          }
        />
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Conceptos ({rectificationTypeLabel(rectType)})
          </h2>
          {rectType === "correccion" && (
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    id: crypto.randomUUID(),
                    description: "",
                    quantity: 1,
                    unit: defaultUnit,
                    unitPrice: 0,
                    ivaPercent: defaultIva,
                  },
                ])
              }
              className="flex items-center gap-1 text-sm font-semibold text-blue-600"
            >
              <Plus className="h-4 w-4" /> Añadir línea
            </button>
          )}
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
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
                    Trabajo, material o concepto rectificado
                  </p>
                </div>
                {rectType === "correccion" && items.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((i) => i.id !== item.id))
                    }
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
                        updateItem(item.id, { description: e.target.value })
                      }
                      disabled={rectType === "anulacion"}
                    />
                  </Field>
                </div>
                <Field label="Cant.">
                  <NumericFieldInput
                    value={item.quantity}
                    onChange={(quantity) =>
                      updateItem(item.id, { quantity })
                    }
                    disabled={rectType === "anulacion"}
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
                  disabled={rectType === "anulacion"}
                />
                {!vatExempt && (
                  <Field label="IVA">
                    <IvaPercentSelect
                      value={item.ivaPercent}
                      onChange={(ivaPercent) =>
                        updateItem(item.id, { ivaPercent })
                      }
                      disabled={rectType === "anulacion"}
                    />
                  </Field>
                )}
              </div>
              {isAreaDocumentUnit(item.unit) ? (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
                  <p className="text-sm font-black text-blue-950">Calcular m²</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <Field label="Alto (m)">
                      <NumericFieldInput
                        value={lineAreaDrafts[item.id]?.height ?? 0}
                        onChange={(height) =>
                          handleLineAreaDraftChange(item.id, { height })
                        }
                        disabled={rectType === "anulacion"}
                      />
                    </Field>
                    <Field label="Ancho (m)">
                      <NumericFieldInput
                        value={lineAreaDrafts[item.id]?.width ?? 0}
                        onChange={(width) =>
                          handleLineAreaDraftChange(item.id, { width })
                        }
                        disabled={rectType === "anulacion"}
                      />
                    </Field>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-blue-800">
                    Alto x ancho en metros. La cantidad de la línea se actualiza sola.
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex justify-end border-t border-slate-200/70 pt-3">
                <p className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-100">
                  Total línea: {formatMoney(lineItemFormTotal(item, vatExempt))}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-right text-slate-700">
          {!vatExempt && <p>Base: {formatMoney(previewTotals.subtotal)}</p>}
          {!vatExempt && <p>IVA: {formatMoney(previewTotals.iva)}</p>}
          <p className="text-xl font-bold text-blue-700">
            Total: {formatMoney(previewTotals.total)}
          </p>
        </div>
      </Card>

      <Card className="space-y-4">
        <DocumentPaymentPicker
          documentType="factura"
          settings={data.profile.documentPaymentMethods}
          value={paymentTerms}
          onChange={setPaymentTerms}
        />
        <DocumentPhrasePicker
          documentType="factura"
          settings={data.profile.documentPhrases}
          onSelect={setNotes}
        />
        <Field label="Notas adicionales">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información complementaria para la rectificativa..."
          />
        </Field>
      </Card>

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
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSave(false, "borrador")}
            disabled={saving || previewLoading}
          >
            {saveAction === "draft" ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Button
            fullWidth
            onClick={() => void handleSave(false, "enviado")}
            disabled={saving || previewLoading}
          >
            {saveAction === "save" ? "Guardando…" : "Emitir rectificativa"}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => void handleSave(true, "enviado")}
            disabled={saving || previewLoading}
          >
            {saveAction === "save-pdf"
              ? "Guardando y preparando PDF…"
              : "Emitir y descargar PDF"}
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
