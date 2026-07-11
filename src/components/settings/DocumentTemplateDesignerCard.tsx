"use client";

import { useId, useState } from "react";
import { Crown, Eye, Maximize2, Palette, Sparkles, X } from "lucide-react";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  DOCUMENT_TEMPLATE_ACCENTS,
  DOCUMENT_TEMPLATE_DENSITIES,
  DOCUMENT_TEMPLATE_FONTS,
  DOCUMENT_TEMPLATE_FONT_SIZES,
  DOCUMENT_TEMPLATE_STYLES,
  documentTemplateCssFont,
  documentTemplatePreviewFontSize,
  normalizeDocumentTemplate,
} from "@/lib/document-templates";
import type {
  DocumentTemplateAccent,
  DocumentTemplateDensity,
  DocumentTemplateFont,
  DocumentTemplateFontSize,
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
  const [largePreviewOpen, setLargePreviewOpen] = useState(false);
  const largePreviewTitleId = useId();
  const largePreviewDescriptionId = useId();
  const normalized = normalizeDocumentTemplate(settings);
  const accent =
    DOCUMENT_TEMPLATE_ACCENTS.find((item) => item.id === normalized.accent) ??
    DOCUMENT_TEMPLATE_ACCENTS[0];
  const styleLabel =
    DOCUMENT_TEMPLATE_STYLES.find((item) => item.id === normalized.style)
      ?.label ?? DOCUMENT_TEMPLATE_STYLES[0].label;
  const isClassic = normalized.style === "clasico";
  const isEditorial = normalized.style === "editorial";
  const isFuture = normalized.style === "futuro";
  const previewFontFamily = documentTemplateCssFont(normalized.font);
  const previewFontSizes = {
    body: documentTemplatePreviewFontSize(normalized.bodyFontSize, "body"),
    title: documentTemplatePreviewFontSize(normalized.titleFontSize, "title"),
    issuer: documentTemplatePreviewFontSize(normalized.issuerFontSize, "issuer"),
    total: documentTemplatePreviewFontSize(normalized.totalFontSize, "total"),
  };
  const previewRowHeight =
    normalized.density === "compacta"
      ? "h-3"
      : normalized.density === "amplia"
        ? "h-7"
        : "h-5";
  const lineRows = [
    {
      concept: "Soy un dato de relleno para que veas lo bonito que soy",
      qty: "1 ud",
      price: "450,00 €",
      total: "544,50 €",
    },
    {
      concept: "Diseño, montaje y ajuste fino de la cosa importante",
      qty: "2 h",
      price: "180,00 €",
      total: "435,60 €",
    },
    {
      concept: "Materiales varios con nombre elegante",
      qty: "3 ud",
      price: "63,88 €",
      total: "231,87 €",
    },
  ];

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
            <div className="grid gap-2 sm:grid-cols-2">
              {DOCUMENT_TEMPLATE_ACCENTS.map((item) => {
                const selected = normalized.accent === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      update({ accent: item.id as DocumentTemplateAccent })
                    }
                    className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                      selected
                        ? `${item.borderClass} ${item.textClass} bg-white`
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <span className={`h-4 w-4 rounded-full ${item.bgClass}`} />
                    <span className="min-w-0 leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900">Fuente</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DOCUMENT_TEMPLATE_FONTS.map((font) => {
                const selected = normalized.font === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    data-testid={`template-font-${font.id}`}
                    onClick={() =>
                      update({ font: font.id as DocumentTemplateFont })
                    }
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? `${accent.borderClass} bg-white shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    style={{ fontFamily: font.cssFamily }}
                  >
                    <span className="block text-sm font-bold text-slate-900">
                      {font.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {font.description}
                    </span>
                    <span className="mt-2 block text-sm text-slate-700">
                      Factura 2026 · 1.212,38 €
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">
              Tamaños de texto
            </p>
            {[
              ["bodyFontSize", "Texto general"],
              ["titleFontSize", "Títulos"],
              ["issuerFontSize", "Nombre empresa"],
              ["totalFontSize", "Total"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-semibold text-slate-700">
                  {label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {DOCUMENT_TEMPLATE_FONT_SIZES.map((size) => {
                    const selected =
                      normalized[key as keyof DocumentTemplateSettings] ===
                      size.id;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        data-testid={`template-size-${key}-${size.id}`}
                        onClick={() =>
                          update({
                            [key]: size.id as DocumentTemplateFontSize,
                          } as Partial<DocumentTemplateSettings>)
                        }
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                          selected
                            ? `${accent.borderClass} ${accent.textClass} bg-white`
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {size.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
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
            <button
              type="button"
              onClick={() => setLargePreviewOpen(true)}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 py-1 text-slate-600 hover:bg-white hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Ver grande
            </button>
          </div>
          <div
            className={`overflow-hidden rounded-md bg-white shadow-sm ${
              isFuture ? "ring-1 ring-slate-900/10" : ""
            }`}
            data-testid="template-mini-preview"
            style={{
              fontFamily: previewFontFamily,
              fontSize: `${Math.max(10, previewFontSizes.body - 4)}px`,
            }}
          >
            {isFuture ? (
              <div className={`${accent.bgClass} px-4 py-4 text-white`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase opacity-80">
                      Documento verificable
                    </p>
                    <p
                      className="mt-1 font-black"
                      style={{
                        fontSize: `${Math.max(20, previewFontSizes.title * 0.55)}px`,
                      }}
                    >
                      FACTURA
                    </p>
                  </div>
                  <div className="rounded-md bg-white/15 px-2 py-1 text-right text-[10px] font-semibold">
                    <p>F-2026-0042</p>
                    <p>23/06/2026</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className={`${
                isEditorial
                  ? "grid grid-cols-[4.5rem_1fr]"
                  : "block"
              }`}
            >
              {isEditorial ? (
                <div className={`${accent.bgClass} flex flex-col justify-between p-3 text-white`}>
                  <p className="text-[10px] font-bold uppercase leading-tight">
                    FACTURA
                  </p>
                  <p className="text-[9px] leading-tight opacity-80">
                    F-2026
                    <br />
                    0042
                  </p>
                </div>
              ) : null}

              <div className="space-y-4 p-4">
                {!isFuture ? (
                  <div
                    className={`flex items-start justify-between gap-4 ${
                      isClassic ? "border-b border-slate-100 pb-3" : ""
                    }`}
                  >
                    <div>
                      <p
                        className={`font-black ${accent.textClass}`}
                        style={{
                          fontSize: `${Math.max(18, previewFontSizes.title * 0.45)}px`,
                        }}
                      >
                        FACTURA
                      </p>
                      <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                        <p
                          className="font-semibold text-slate-800"
                          style={{
                            fontSize: `${Math.max(10, previewFontSizes.issuer - 4)}px`,
                          }}
                        >
                          Tu empresa
                        </p>
                        <p>NIF · Dirección · Ciudad</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">
                      {normalized.showLogo ? (
                        <div className="mb-2 ml-auto flex h-10 w-14 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[8px] font-black text-slate-500">
                          <span className="text-sm leading-none">🤖</span>
                          <span>LOGOBOT</span>
                        </div>
                      ) : null}
                      <p className="font-bold text-slate-900">Nº F-2026-0042</p>
                      <p>23/06/2026</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1 text-[10px] text-slate-500">
                      <p
                        className="font-semibold text-slate-900"
                        style={{
                          fontSize: `${Math.max(10, previewFontSizes.issuer - 4)}px`,
                        }}
                      >
                        Tu empresa
                      </p>
                      <p>NIF · Dirección · Ciudad</p>
                    </div>
                    {normalized.showLogo ? (
                      <div className="flex h-10 w-14 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[8px] font-black text-slate-500">
                        <span className="text-sm leading-none">🤖</span>
                        <span>LOGOBOT</span>
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="rounded-md border border-slate-200 bg-white p-2 text-center">
                  <p className="text-[10px] font-bold text-slate-900">
                    QR tributario no disponible
                  </p>
                  <p className="mx-auto mt-1 max-w-[9rem] text-[9px] leading-tight text-slate-500">
                    El servicio de registro está desactivado; la vista previa no
                    genera un QR ficticio.
                  </p>
                </div>

                <div
                  className={`${
                    isClassic
                      ? "rounded-md border border-slate-200 bg-slate-50 p-3"
                      : isEditorial
                        ? `border-l-4 ${accent.borderClass} bg-slate-50 p-3`
                        : "rounded-lg bg-slate-900 p-3 text-white"
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold ${
                      isFuture ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    Cliente
                  </p>
                  <p
                    className={`mt-1 text-sm font-bold ${
                      isFuture ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Cliente de ejemplo
                  </p>
                </div>

                <div className="space-y-1">
                  <div
                    className={`rounded ${
                      isClassic ? `h-5 ${accent.bgClass}` : "h-7 bg-slate-900"
                    }`}
                  />
                  <div className={`${previewRowHeight} rounded bg-slate-100`} />
                  <div
                    className={`${previewRowHeight} rounded ${
                      isFuture ? "bg-blue-50" : "bg-white ring-1 ring-slate-100"
                    }`}
                  />
                  <div className={`${previewRowHeight} rounded bg-slate-100`} />
                </div>

                <div className={isFuture ? "flex justify-between gap-3" : "flex justify-end"}>
                  {isFuture ? (
                    <div className="rounded-md border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-500">
                      Pago
                      <span className="block text-slate-900">Transferencia</span>
                    </div>
                  ) : null}
                  <div
                    className={`rounded-md px-4 py-2 font-black ${
                      isClassic
                        ? accent.textClass
                        : isEditorial
                          ? `${accent.bgClass} text-white`
                          : "bg-slate-900 text-white"
                    }`}
                    style={{
                      fontSize: `${Math.max(13, previewFontSizes.total * 0.62)}px`,
                    }}
                  >
                    TOTAL 1.210,00 €
                  </div>
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

      <Modal
        open={largePreviewOpen}
        onClose={() => setLargePreviewOpen(false)}
        titleId={largePreviewTitleId}
        descriptionId={largePreviewDescriptionId}
        overlayClassName="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-6"
        panelClassName="flex max-h-[calc(100vh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-slate-100 shadow-2xl supports-[height:100dvh]:max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-3rem)] sm:supports-[height:100dvh]:max-h-[calc(100dvh-3rem)]"
        testId="template-preview-modal"
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <h2
              id={largePreviewTitleId}
              className="text-sm font-bold text-slate-900"
            >
              Vista previa grande
            </h2>
            <p
              id={largePreviewDescriptionId}
              className="text-xs text-slate-500"
            >
              {styleLabel} · datos ficticios de ejemplo
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLargePreviewOpen(false)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            aria-label="Cerrar vista previa grande"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-5">
          <div
            className="mx-auto w-full max-w-[56rem] overflow-hidden rounded-lg bg-white shadow-2xl"
            data-testid="template-large-preview"
            style={{
              fontFamily: previewFontFamily,
              fontSize: `${previewFontSizes.body}px`,
            }}
          >
            <>
              {isFuture ? (
                <div className={`${accent.bgClass} p-4 text-white sm:p-8`}>
                  <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        Documento verificable
                      </p>
                      <h3
                        className="mt-3 font-black"
                        style={{ fontSize: `${previewFontSizes.title}px` }}
                      >
                        FACTURA
                      </h3>
                      <p className="mt-3 max-w-sm text-sm opacity-85">
                        Una plantilla pensada para verse clara en PDF, móvil y
                        papel, sin perder la parte fiscal.
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/15 p-4 text-right text-sm font-semibold">
                      <p>Nº F-2026-0042</p>
                      <p>Fecha 23/06/2026</p>
                      <p>Vence 07/07/2026</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div
                className={
                  isEditorial ? "grid md:grid-cols-[11rem_1fr]" : ""
                }
              >
                {isEditorial ? (
                  <aside className={`${accent.bgClass} flex flex-col justify-between gap-5 p-5 text-white md:p-6`}>
                    <div>
                      <p className="text-xs font-bold uppercase opacity-80">
                        Factura
                      </p>
                      <p className="mt-2 text-3xl font-black leading-none">
                        F-2026
                        <br />
                        0042
                      </p>
                    </div>
                    <div className="space-y-3 text-xs opacity-85">
                      <p>Tu Empresa del Futuro, S.L.</p>
                      <p>NIF B00000000</p>
                      <p>Calle Demo 42, Barcelona</p>
                    </div>
                  </aside>
                ) : null}

                <div className="space-y-6 p-4 sm:space-y-8 sm:p-8">
                  {!isFuture ? (
                    <header
                      className={`flex flex-col items-start justify-between gap-5 sm:flex-row sm:gap-8 ${
                        isClassic ? "border-b border-slate-200 pb-6" : ""
                      }`}
                    >
                      <div>
                        <p
                          className={`font-black ${accent.textClass}`}
                          style={{ fontSize: `${previewFontSizes.title}px` }}
                        >
                          FACTURA
                        </p>
                        <div
                          className={`mt-5 space-y-1 text-sm text-slate-600 ${
                            normalized.showIssuerBox
                              ? "rounded-lg bg-slate-50 p-4"
                              : ""
                          }`}
                        >
                          <p
                            className="font-bold text-slate-900"
                            style={{
                              fontSize: `${previewFontSizes.issuer}px`,
                            }}
                          >
                            Tu Empresa del Futuro, S.L.
                          </p>
                          <p>NIF B00000000</p>
                          <p>Calle Demo 42, 08000 Barcelona</p>
                          <p>hola@empresa-demo.test</p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        {normalized.showLogo ? (
                          <div className="mb-4 ml-auto flex h-16 w-24 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                            <span className="text-2xl leading-none">🤖</span>
                            <span>LOGOBOT</span>
                          </div>
                        ) : null}
                        <p className="font-bold text-slate-900">Nº F-2026-0042</p>
                        <p>Fecha: 23/06/2026</p>
                        <p>Vencimiento: 07/07/2026</p>
                      </div>
                    </header>
                  ) : (
                    <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center sm:gap-8">
                      <div className="space-y-1 text-sm text-slate-600">
                        <p
                          className="font-bold text-slate-900"
                          style={{ fontSize: `${previewFontSizes.issuer}px` }}
                        >
                          Tu Empresa del Futuro, S.L.
                        </p>
                        <p>NIF B00000000 · Calle Demo 42</p>
                        <p>08000 Barcelona · hola@empresa-demo.test</p>
                      </div>
                      {normalized.showLogo ? (
                        <div className="flex h-16 w-24 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
                          <span className="text-2xl leading-none">🤖</span>
                          <span>LOGOBOT</span>
                        </div>
                      ) : null}
                    </header>
                  )}

                  <section className="grid gap-4 md:grid-cols-[1fr_13rem]">
                    <div
                      className={
                        isFuture
                          ? "rounded-xl bg-slate-900 p-5 text-white"
                          : isEditorial
                            ? `border-l-4 ${accent.borderClass} bg-slate-50 p-5`
                            : "rounded-lg border border-slate-200 bg-slate-50 p-5"
                      }
                    >
                      <p
                        className={`text-xs font-bold uppercase ${
                          isFuture ? "text-white/60" : "text-slate-500"
                        }`}
                      >
                        Cliente
                      </p>
                      <p
                        className={`mt-2 text-xl font-black ${
                          isFuture ? "text-white" : "text-slate-900"
                        }`}
                      >
                        Cliente de Relleno Bonito, S.L.
                      </p>
                      <p className={isFuture ? "mt-2 text-sm text-white/75" : "mt-2 text-sm text-slate-600"}>
                        NIF B12345678 · Avenida de la Muestra 123 · Madrid
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                      <p className="text-sm font-bold text-slate-900">
                        QR tributario no disponible
                      </p>
                      <p className="mx-auto mt-2 max-w-[11rem] text-xs leading-tight text-slate-500">
                        El servicio de registro está desactivado; esta muestra no
                        genera ni reserva un QR.
                      </p>
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="overflow-x-auto">
                      <div className="min-w-[34rem]">
                        <div className={`${isClassic ? accent.bgClass : "bg-slate-900"} grid grid-cols-[minmax(0,1fr)_5rem_6rem_6rem] gap-3 px-4 py-3 text-xs font-bold uppercase text-white`}>
                          <span>Concepto</span>
                          <span>Cant.</span>
                          <span>Precio</span>
                          <span>Total</span>
                        </div>
                        {lineRows.map((row, index) => (
                          <div
                            key={row.concept}
                            className={`grid grid-cols-[minmax(0,1fr)_5rem_6rem_6rem] gap-3 px-4 text-sm ${
                              normalized.density === "compacta"
                                ? "py-2"
                                : normalized.density === "amplia"
                                  ? "py-5"
                                  : "py-3"
                            } ${index % 2 === 0 ? "bg-white" : "bg-slate-50"}`}
                          >
                            <span className="min-w-0 font-medium text-slate-900">
                              {row.concept}
                            </span>
                            <span className="text-slate-600">{row.qty}</span>
                            <span className="text-slate-600">{row.price}</span>
                            <span className="font-semibold text-slate-900">
                              {row.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    {normalized.showPaymentBox ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <p className="font-bold text-slate-900">Forma de pago</p>
                        <p className="mt-1">Transferencia bancaria</p>
                        <p>IBAN ES00 0000 0000 0000 0000</p>
                      </div>
                    ) : (
                      <div />
                    )}
                    <div
                      className={`min-w-[15rem] rounded-lg p-4 text-right ${
                        isClassic
                          ? "border border-slate-200 bg-slate-50 text-slate-900"
                          : isEditorial
                            ? `${accent.bgClass} text-white`
                            : "bg-slate-900 text-white"
                      }`}
                    >
                      <div className="space-y-1 text-sm">
                        <p className="flex justify-between gap-6 opacity-80">
                          <span>Base imponible</span>
                          <strong>1.001,97 €</strong>
                        </p>
                        <p className="flex justify-between gap-6 opacity-80">
                          <span>IVA 21%</span>
                          <strong>210,41 €</strong>
                        </p>
                      </div>
                      <p
                        className="mt-3 border-t border-current/20 pt-3 font-black"
                        style={{ fontSize: `${previewFontSizes.total}px` }}
                      >
                        Total 1.212,38 €
                      </p>
                    </div>
                  </section>

                  <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    Soy una nota de relleno para comprobar el aire del documento,
                    los márgenes y ese toque de “esto ya parece una factura de
                    una app seria”.
                  </p>
                </div>
              </div>
            </>
          </div>
        </div>
      </Modal>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="El diseñador de plantillas es una función Pro."
      />
    </Card>
  );
}
