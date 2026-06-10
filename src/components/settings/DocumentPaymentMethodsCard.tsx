"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import {
  addDocumentPaymentMethod,
  clearDefaultDocumentPaymentMethod,
  DOCUMENT_PAYMENT_TYPE_LABELS,
  paymentMethodsForType,
  removeDocumentPaymentMethod,
  setDefaultDocumentPaymentMethod,
  updateDocumentPaymentMethod,
} from "@/lib/document-payment-methods";
import type { DocumentPaymentMethodsSettings, DocumentType } from "@/lib/types";

const DOCUMENT_TYPES: DocumentType[] = ["factura", "presupuesto", "recibo"];

interface DocumentPaymentMethodsCardProps {
  settings: DocumentPaymentMethodsSettings;
  onChange: (settings: DocumentPaymentMethodsSettings) => void;
}

export function DocumentPaymentMethodsCard({
  settings,
  onChange,
}: DocumentPaymentMethodsCardProps) {
  return (
    <Card className="mb-6 space-y-5">
      <div>
        <h2 className="font-bold text-slate-900">Formas de pago</h2>
        <p className="mt-1 text-sm text-slate-600">
          Configura textos como transferencia, efectivo o Bizum. Al crear una
          factura o presupuesto podrás elegirlos o editarlos.
        </p>
      </div>

      {DOCUMENT_TYPES.map((type) => {
        const methods = paymentMethodsForType(settings, type);
        const defaultId = settings.defaultMethodId[type];

        return (
          <div
            key={type}
            className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">
                {DOCUMENT_PAYMENT_TYPE_LABELS[type]}
              </h3>
              <button
                type="button"
                onClick={() => onChange(addDocumentPaymentMethod(settings, type))}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Añadir forma de pago
              </button>
            </div>

            {methods.length === 0 ? (
              <p className="text-sm text-slate-500">
                Sin formas de pago guardadas para{" "}
                {DOCUMENT_PAYMENT_TYPE_LABELS[type].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-3">
                {methods.map((method) => {
                  const isDefault = defaultId === method.id;
                  return (
                    <div
                      key={method.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <Input
                        value={method.text}
                        onChange={(e) =>
                          onChange(
                            updateDocumentPaymentMethod(
                              settings,
                              method.id,
                              e.target.value,
                            ),
                          )
                        }
                        placeholder="Ej: Pago por Bizum al 600 000 000"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onChange(
                              isDefault
                                ? clearDefaultDocumentPaymentMethod(settings, type)
                                : setDefaultDocumentPaymentMethod(
                                    settings,
                                    type,
                                    method.id,
                                  ),
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                            isDefault
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isDefault ? "fill-current" : ""
                            }`}
                          />
                          {isDefault ? "Predeterminada" : "Marcar predeterminada"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("¿Borrar esta forma de pago?")) {
                              onChange(
                                removeDocumentPaymentMethod(settings, method.id),
                              );
                            }
                          }}
                          className="rounded-lg bg-red-50 p-2 text-red-600"
                          aria-label="Borrar forma de pago"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
