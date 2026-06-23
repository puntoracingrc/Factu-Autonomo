import type {
  DocumentTemplateAccent,
  DocumentTemplateDensity,
  DocumentTemplateSettings,
  DocumentTemplateStyle,
} from "./types";

export const DOCUMENT_TEMPLATE_STYLES: Array<{
  id: DocumentTemplateStyle;
  label: string;
  description: string;
}> = [
  {
    id: "clasico",
    label: "Clásico limpio",
    description: "Sobrio, claro y parecido al formato actual.",
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Más marca, bloques laterales y lectura rápida.",
  },
  {
    id: "futuro",
    label: "2050",
    description: "Cabecera potente, color inteligente y totales protagonistas.",
  },
];

export const DOCUMENT_TEMPLATE_ACCENTS: Array<{
  id: DocumentTemplateAccent;
  label: string;
  rgb: [number, number, number];
  textClass: string;
  bgClass: string;
  borderClass: string;
}> = [
  {
    id: "azul",
    label: "Azul eléctrico",
    rgb: [37, 99, 235],
    textClass: "text-blue-700",
    bgClass: "bg-blue-600",
    borderClass: "border-blue-300",
  },
  {
    id: "esmeralda",
    label: "Esmeralda",
    rgb: [5, 150, 105],
    textClass: "text-emerald-700",
    bgClass: "bg-emerald-600",
    borderClass: "border-emerald-300",
  },
  {
    id: "carbon",
    label: "Carbón",
    rgb: [15, 23, 42],
    textClass: "text-slate-900",
    bgClass: "bg-slate-900",
    borderClass: "border-slate-300",
  },
  {
    id: "coral",
    label: "Coral",
    rgb: [225, 83, 64],
    textClass: "text-red-700",
    bgClass: "bg-red-500",
    borderClass: "border-red-300",
  },
];

export const DOCUMENT_TEMPLATE_DENSITIES: Array<{
  id: DocumentTemplateDensity;
  label: string;
  rowPadding: number;
}> = [
  { id: "compacta", label: "Compacta", rowPadding: 1.4 },
  { id: "normal", label: "Normal", rowPadding: 2.4 },
  { id: "amplia", label: "Amplia", rowPadding: 3.6 },
];

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateSettings = {
  style: "clasico",
  accent: "azul",
  density: "normal",
  showLogo: true,
  showIssuerBox: false,
  showPaymentBox: true,
};

const STYLE_IDS = new Set(DOCUMENT_TEMPLATE_STYLES.map((item) => item.id));
const ACCENT_IDS = new Set(DOCUMENT_TEMPLATE_ACCENTS.map((item) => item.id));
const DENSITY_IDS = new Set(DOCUMENT_TEMPLATE_DENSITIES.map((item) => item.id));

export function normalizeDocumentTemplate(
  input?: Partial<DocumentTemplateSettings> | null,
): DocumentTemplateSettings {
  return {
    style:
      input?.style && STYLE_IDS.has(input.style)
        ? input.style
        : DEFAULT_DOCUMENT_TEMPLATE.style,
    accent:
      input?.accent && ACCENT_IDS.has(input.accent)
        ? input.accent
        : DEFAULT_DOCUMENT_TEMPLATE.accent,
    density:
      input?.density && DENSITY_IDS.has(input.density)
        ? input.density
        : DEFAULT_DOCUMENT_TEMPLATE.density,
    showLogo: input?.showLogo ?? DEFAULT_DOCUMENT_TEMPLATE.showLogo,
    showIssuerBox: input?.showIssuerBox ?? DEFAULT_DOCUMENT_TEMPLATE.showIssuerBox,
    showPaymentBox: input?.showPaymentBox ?? DEFAULT_DOCUMENT_TEMPLATE.showPaymentBox,
  };
}

export function documentTemplateAccentRgb(
  accent: DocumentTemplateAccent,
): [number, number, number] {
  return (
    DOCUMENT_TEMPLATE_ACCENTS.find((item) => item.id === accent)?.rgb ??
    DOCUMENT_TEMPLATE_ACCENTS[0].rgb
  );
}

export function documentTemplateDensityPadding(
  density: DocumentTemplateDensity,
): number {
  return (
    DOCUMENT_TEMPLATE_DENSITIES.find((item) => item.id === density)
      ?.rowPadding ?? DOCUMENT_TEMPLATE_DENSITIES[1].rowPadding
  );
}
