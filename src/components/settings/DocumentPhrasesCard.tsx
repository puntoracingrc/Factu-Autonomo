"use client";

import { Plus, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import {
  addDocumentPhrase,
  clearDefaultDocumentPhrase,
  DOCUMENT_PHRASE_TYPE_LABELS,
  phrasesForType,
  removeDocumentPhrase,
  setDefaultDocumentPhrase,
  updateDocumentPhrase,
} from "@/lib/document-phrases";
import type { DocumentPhrasesSettings, DocumentType } from "@/lib/types";

const DOCUMENT_TYPES: DocumentType[] = ["factura", "presupuesto", "recibo"];

interface DocumentPhrasesCardProps {
  settings: DocumentPhrasesSettings;
  onChange: (settings: DocumentPhrasesSettings) => void;
}

export function DocumentPhrasesCard({
  settings,
  onChange,
}: DocumentPhrasesCardProps) {
  return (
    <Card className="mb-6 space-y-5 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <h2 className="font-bold text-slate-900 dark:text-slate-50">
          Condiciones de venta
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Guarda condiciones habituales de entrega, garantía o validez. Al
          crear facturas, presupuestos o recibos podrás elegir una o usar la
          predeterminada sin ocupar el campo de notas.
        </p>
      </div>

      {DOCUMENT_TYPES.map((type) => {
        const phrases = phrasesForType(settings, type);
        const defaultId = settings.defaultPhraseId[type];

        return (
          <div
            key={type}
            className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/70"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-50">
                {DOCUMENT_PHRASE_TYPE_LABELS[type]}
              </h3>
              <button
                type="button"
                onClick={() => onChange(addDocumentPhrase(settings, type))}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Añadir condición
              </button>
            </div>

            {phrases.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sin condiciones guardadas para {DOCUMENT_PHRASE_TYPE_LABELS[type].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-3">
                {phrases.map((phrase) => {
                  const isDefault = defaultId === phrase.id;
                  return (
                    <div
                      key={phrase.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <Textarea
                        value={phrase.text}
                        onChange={(e) =>
                          onChange(
                            updateDocumentPhrase(
                              settings,
                              phrase.id,
                              e.target.value,
                            ),
                          )
                        }
                        placeholder={
                          type === "presupuesto"
                            ? "Ej: Pago del 50% por anticipado, resto al finalizar la instalación."
                            : "Ej: Pago a 30 días. Gracias por su confianza."
                        }
                        rows={3}
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onChange(
                              isDefault
                                ? clearDefaultDocumentPhrase(settings, type)
                                : setDefaultDocumentPhrase(
                                    settings,
                                    type,
                                    phrase.id,
                                  ),
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                            isDefault
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-100"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
                            if (
                              confirm("¿Borrar esta condición guardada?")
                            ) {
                              onChange(removeDocumentPhrase(settings, phrase.id));
                            }
                          }}
                          className="rounded-lg bg-red-50 p-2 text-red-600"
                          aria-label="Borrar condición"
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

      <p className="text-xs text-slate-500 dark:text-slate-400">
        La condición predeterminada se rellena sola al crear un documento
        nuevo. Las notas permanecen vacías para cualquier información extra.
      </p>
    </Card>
  );
}
