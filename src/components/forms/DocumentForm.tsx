"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  ClientPicker,
  clientToFormValues,
  customerToClient,
} from "@/components/clients/ClientPicker";
import type { ClientFormValues } from "@/components/clients/ClientPicker";
import { findCustomerByClient } from "@/lib/customers";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useAppStore } from "@/context/AppStore";
import { documentTotals, formatMoney, todayISO } from "@/lib/calculations";
import { downloadDocumentPdf } from "@/lib/pdf";
import type { Document, DocumentType, LineItem, Customer } from "@/lib/types";

function emptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
    ivaPercent: 21,
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
  address: "",
};

interface DocumentFormProps {
  type: DocumentType;
  existing?: Document;
}

export function DocumentForm({ type, existing }: DocumentFormProps) {
  const router = useRouter();
  const { data, ready, addDocument, updateDocument, upsertCustomerForDocument } =
    useAppStore();
  const label = TYPE_LABELS[type];

  const [clientForm, setClientForm] = useState<ClientFormValues>(
    existing ? clientToFormValues(existing.client) : EMPTY_CLIENT,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!existing || !ready) return;
    const match = findCustomerByClient(data.customers, existing.client);
    if (match) setSelectedCustomerId(match.id);
  }, [existing, ready, data.customers]);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [status, setStatus] = useState<Document["status"]>(
    existing?.status ?? "borrador",
  );
  const [items, setItems] = useState<LineItem[]>(
    existing?.items.length ? existing.items : [emptyLine()],
  );

  const previewDoc: Document = {
    id: existing?.id ?? "preview",
    type,
    number: existing?.number ?? "BORRADOR",
    date,
    dueDate: dueDate || undefined,
    client: {
      firstName: clientForm.firstName,
      lastName: clientForm.lastName,
      name: `${clientForm.firstName} ${clientForm.lastName}`.trim(),
      nif: clientForm.nif || undefined,
      email: clientForm.email || undefined,
      phone: clientForm.phone || undefined,
      address: clientForm.address || undefined,
    },
    items,
    notes,
    status,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const totals = documentTotals(previewDoc);

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomerId(customer.id);
    setClientForm(clientToFormValues(customerToClient(customer)));
  }

  function handleClientFieldChange(
    field: keyof ClientFormValues,
    value: string,
  ) {
    setClientForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave(download = false) {
    if (items.every((i) => !i.description.trim())) {
      alert("Añade al menos un concepto");
      return;
    }

    const customerResult = upsertCustomerForDocument(
      {
        firstName: clientForm.firstName,
        lastName: clientForm.lastName,
        nif: clientForm.nif,
        email: clientForm.email,
        phone: clientForm.phone,
        address: clientForm.address,
      },
      selectedCustomerId,
    );

    if (!customerResult.ok) {
      alert(customerResult.error);
      return;
    }

    const payload = {
      type,
      date,
      dueDate: dueDate || undefined,
      client: customerResult.client,
      items: items.filter((i) => i.description.trim()),
      notes: notes || undefined,
      status,
    };

    let saved: Document;
    if (existing) {
      saved = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      updateDocument(saved);
    } else {
      saved = addDocument(payload);
    }

    if (download) downloadDocumentPdf(saved, data.profile);
    const paths = {
      factura: "facturas",
      presupuesto: "presupuestos",
      recibo: "recibos",
    };
    router.push(`/${paths[type]}`);
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
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Document["status"])
                }
              >
                <option value="borrador">Borrador</option>
                <option value="enviado">Enviado</option>
                <option value="pagado">Pagado</option>
                <option value="vencido">Vencido</option>
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
            onClick={() => setItems((prev) => [...prev, emptyLine()])}
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
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, {
                        quantity: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="Precio (sin IVA)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(item.id, {
                        unitPrice: Number(e.target.value),
                      })
                    }
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
      </Card>

      <Card>
        <Field label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condiciones de pago, garantía..."
          />
        </Field>
        <div className="mt-4 space-y-1 text-right text-slate-700">
          <p>Base: {formatMoney(totals.subtotal)}</p>
          <p>IVA: {formatMoney(totals.iva)}</p>
          <p className="text-xl font-bold text-blue-700">
            Total: {formatMoney(totals.total)}
          </p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button fullWidth onClick={() => handleSave(false)}>
          Guardar {label}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => handleSave(true)}>
          Guardar y descargar PDF
        </Button>
      </div>
    </div>
  );
}
