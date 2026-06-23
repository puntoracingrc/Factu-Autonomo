"use client";

import { useState } from "react";
import { Crown, Eye, Palette, Sparkles } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DOCUMENT_TEMPLATE_ACCENTS,
  DOCUMENT_TEMPLATE_DENSITIES,
  DOCUMENT_TEMPLATE_STYLES,
  normalizeDocumentTemplate,
} from "@/lib/document-templates";
import type {
  DocumentTemplateAccent,
  DocumentTemplateDensity,
  DocumentTemplateSettings,
  DocumentTemplateStyle,
} from "@/lib/types";

interface DocumentTemplateDesignerCardProps {
  settings: DocumentTemplateSettings;
  locked: boolean;
  onChange: (settings: DocumentTemplateSettings) => void;
}

export function DocumentTemplateDesignerCard({
  settings,
  locked,
  onChange,
}: DocumentTemplateDesignerCardProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const normalized = normalizeDocumentTemplate(settings);
  const accent =
    DOCUMENT_TEMPLATE_ACCENTS.find((item) => item.id === normalized.accent) ??
    DOCUMENT_TEMPLATE_ACCENTS[0];
  const styleLabel =
    DOCUMENT_TEMPLATE_STYLES.find((item) => item.id === normalized.style)
      ?.label ?? DOCUMENT_TEMPLATE_STYLES[0].label;

  function update(next: Partial<DocumentTemplateSettings>) {
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    onChange(normalizeDocumentTemplate({ ...normalized, ...next }));
  }

  return (
    <Card className="mb-6 space-y-5 border-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900">
                Diseñador de plantillas
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                <Crown className="h-3.5 w-3.5" />
                Pro
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Cambia el aspecto de facturas, presupuestos y recibos sin tocar
              los datos legales del documento.
            </p>
          </div>
        </div>

        {locked ? (
          <Button variant="secondary" onClick={() => setUpgradeOpen(true)}>
            <Crown className="h-4 w-4" />
            Activar Pro
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div
          className={`space-y-5 ${locked ? "pointer-events-none opacity-55" : ""}`}
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Estilo</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {DOCUMENT_TEMPLATE_STYLES.map((style) => {
                const selected = normalized.style === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      update({ style: style.id as DocumentTemplateStyle })
                    }
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? `${accent.borderClass} bg-slate-50 shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-sm font-bold text-slate-900">
                      {style.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {style.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Color de marca</p>
            <div className="flex flex-wrap gap-2">
              {DOCUMENT_TEMPLATE_ACCENTS.map((item) => {
                const selected = normalized.accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      update({ accent: item.id as DocumentTemplateAccent })
                    }
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                      selected
                        ? `${item.borderClass} ${item.textClass} bg-white`
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${item.bgClass}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Densidad</p>
              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TEMPLATE_DENSITIES.map((density) => (
                  <button
                    key={density.id}
                    type="button"
                    onClick={() =>
                      update({ density: density.id as DocumentTemplateDensity })
                    }
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      normalized.density === density.id
                        ? `${accent.borderClass} ${accent.textClass} bg-white`
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    {density.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Bloques</p>
              {[
                ["showLogo", "Mostrar logo"],
                ["showIssuerBox", "Caja para emisor"],
                ["showPaymentBox", "Caja de forma de pago"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(
                      normalized[key as keyof DocumentTemplateSettings],
                    )}
                    onChange={(event) =>
                      update({
                        [key]: event.target.checked,
                      } as Partial<DocumentTemplateSettings>)
                    }
                    className="h-4 w-4 rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              Vista previa
            </span>
            <span>{styleLabel}</span>
          </div>
          <div className="overflow-hidden rounded-md bg-white shadow-sm">
            <div
              className={`h-10 ${accent.bgClass} ${
                normalized.style === "clasico" ? "hidden" : "block"
              }`}
            />
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={`text-lg font-black ${accent.textClass}`}>
                    FACTURA
                  </p>
                  <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-800">Tu empresa</p>
                    <p>NIF · Dirección · Ciudad</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <p className="font-bold text-slate-900">Nº F-2026-0042</p>
                  <p>23/06/2026</p>
                </div>
              </div>

              <div className={`rounded-md p-3 ${accent.borderClass} border bg-slate-50`}>
                <p className="text-[10px] font-semibold text-slate-500">
                  Cliente
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Cliente de ejemplo
                </p>
              </div>

              <div className="space-y-1">
                <div className={`h-6 rounded ${accent.bgClass}`} />
                <div className="h-5 rounded bg-slate-100" />
                <div className="h-5 rounded bg-white ring-1 ring-slate-100" />
                <div className="h-5 rounded bg-slate-100" />
              </div>

              <div className="flex justify-end">
                <div className={`rounded-md px-4 py-2 text-sm font-black ${
                  normalized.style === "clasico"
                    ? accent.textClass
                    : `${accent.bgClass} text-white`
                }`}>
                  TOTAL 1.210,00 €
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            La vista previa es orientativa; el PDF final conserva numeración,
            datos fiscales, VeriFactu y líneas reales.
          </p>
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="El diseñador de plantillas es una función Pro."
      />
    </Card>
  );
}
