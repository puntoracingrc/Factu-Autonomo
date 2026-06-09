"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  ClientPicker,
  clientToFormValues,
} from "@/components/clients/ClientPicker";
import type { ClientFormValues } from "@/components/clients/ClientPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { documentTotals, formatMoney, todayISO } from "@/lib/calculations";
import { downloadDocumentPdf } from "@/lib/pdf";
import {
  cloneItemsForCorreccion,
  itemsForAnulacion,
  rectificationTypeLabel,
} from "@/lib/rectificativas";
import type { Document, LineItem, RectificationType } from "@/lib/types";
import { RECTIFICATION_REASONS } from "@/lib/types";

interface RectificativaFormProps {
  original: Document;
}

export function RectificativaForm({ original }: RectificativaFormProps) {
  const router = useRouter();
  const { data, addRectificativa } = useAppStore();

  const [rectType, setRectType] = useState<RectificationType>("anulacion");
  const [reason, setReason] = useState<string>(RECTIFICATION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [clientForm, setClientForm] = useState<ClientFormValues>(
    clientToFormValues(original.client),
  );
  const [items, setItems] = useState<LineItem[]>(
    itemsForAnulacion(original.items),
  );

  function handleTypeChange(type: RectificationType) {
    setRectType(type);
    setItems(
      type === "anulacion"
        ? itemsForAnulacion(original.items)
        : cloneItemsForCorreccion(original.items),
    );
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  const previewTotals = documentTotals({ items });
  const finalReason =
    reason === "Otros motivos" ? customReason.trim() : reason;

  function handleSave(download = false) {
    if (!finalReason) {
      alert("Indica el motivo de la rectificación");
      return;
    }
    if (items.every((i) => !i.description.trim())) {
      alert("Añade al menos un concepto");
      return;
    }

    const saved = addRectificativa(original.id, {
      date,
      client: {
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        name: `${clientForm.firstName} ${clientForm.lastName}`.trim(),
        nif: clientForm.nif || undefined,
        email: clientForm.email || undefined,
        phone: clientForm.phone || undefined,
        address: clientForm.address || undefined,
      },
      items: items.filter((i) => i.description.trim()),
      notes: notes || undefined,
      status: "enviado",
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
      return;
    }

    if (download) downloadDocumentPdf(saved, data.profile);
    router.push("/facturas");
  }

  return (
    <div className="space-y-5">
      <Card className="border-amber-200 bg-amber-50">
        <p className="font-semibold text-amber-900">Factura original</p>
        <p className="mt-1 text-amber-800">
          {original.number} · {original.client.name} ·{" "}
          {formatMoney(documentTotals(original).total)}
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
            <p className="font-bold text-slate-900">Corrección de importes</p>
            <p className="mt-1 text-sm text-slate-600">
              Corrige cantidades o conceptos con los valores correctos.
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
                    unitPrice: 0,
                    ivaPercent: 21,
                  },
                ])
              }
              className="flex items-center gap-1 text-sm font-semibold text-blue-600"
            >
              <Plus className="h-4 w-4" /> Añadir línea
            </button>
          )}
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
                {rectType === "correccion" && items.length > 1 && (
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
                    disabled={rectType === "anulacion"}
                  />
                </Field>
                <Field label="Cantidad">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Number(e.target.value),
                      })
                    }
                    disabled={rectType === "anulacion"}
                  />
                </Field>
                <Field label="Precio (sin IVA)">
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitPrice: Number(e.target.value),
                      })
                    }
                    disabled={rectType === "anulacion"}
                  />
                </Field>
                <Field label="IVA %">
                  <Select
                    value={item.ivaPercent}
                    onChange={(e) =>
                      updateItem(item.id, {
                        ivaPercent: Number(e.target.value),
                      })
                    }
                    disabled={rectType === "anulacion"}
                  >
                    <option value={0}>0%</option>
                    <option value={4}>4%</option>
                    <option value={10}>10%</option>
                    <option value={21}>21%</option>
                  </Select>
                </Field>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 text-right text-slate-700">
          <p>Base: {formatMoney(previewTotals.subtotal)}</p>
          <p>IVA: {formatMoney(previewTotals.iva)}</p>
          <p className="text-xl font-bold text-blue-700">
            Total: {formatMoney(previewTotals.total)}
          </p>
        </div>
      </Card>

      <Card>
        <Field label="Notas adicionales">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Información complementaria para la rectificativa..."
          />
        </Field>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button fullWidth onClick={() => handleSave(false)}>
          Guardar factura rectificativa
        </Button>
        <Button variant="secondary" fullWidth onClick={() => handleSave(true)}>
          Guardar y descargar PDF
        </Button>
      </div>
    </div>
  );
}
