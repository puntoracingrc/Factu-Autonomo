import type {
  DocumentTemplateAccent,
  DocumentTemplateDensity,
  DocumentTemplateFont,
  DocumentTemplateFontSize,
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

export const DOCUMENT_TEMPLATE_FONTS: Array<{
  id: DocumentTemplateFont;
  label: string;
  description: string;
  cssFamily: string;
  pdfFamily: "helvetica" | "times" | "courier";
}> = [
  {
    id: "moderna",
    label: "Moderna",
    description: "Actual, clara y muy legible en pantalla.",
    cssFamily:
      'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    pdfFamily: "helvetica",
  },
  {
    id: "limpia",
    label: "Limpia",
    description: "Neutra, directa y típica de documento profesional.",
    cssFamily: "Arial, Helvetica, sans-serif",
    pdfFamily: "helvetica",
  },
  {
    id: "clasica",
    label: "Clásica",
    description: "Más tradicional, con aire de papel y gestoría.",
    cssFamily: 'Georgia, "Times New Roman", Times, serif',
    pdfFamily: "times",
  },
  {
    id: "tecnica",
    label: "Técnica",
    description: "Monoespaciada, útil para importes y detalle ordenado.",
    cssFamily: '"Courier New", Courier, monospace',
    pdfFamily: "courier",
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

export const DOCUMENT_TEMPLATE_FONT_SIZES: Array<{
  id: DocumentTemplateFontSize;
  label: string;
}> = [
  { id: "pequena", label: "Pequeño" },
  { id: "normal", label: "Normal" },
  { id: "grande", label: "Grande" },
];

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateSettings = {
  style: "clasico",
  font: "moderna",
  accent: "azul",
  density: "normal",
  bodyFontSize: "normal",
  titleFontSize: "normal",
  issuerFontSize: "normal",
  totalFontSize: "normal",
  showLogo: true,
  showIssuerBox: false,
  showPaymentBox: true,
};

const STYLE_IDS = new Set(DOCUMENT_TEMPLATE_STYLES.map((item) => item.id));
const ACCENT_IDS = new Set(DOCUMENT_TEMPLATE_ACCENTS.map((item) => item.id));
const FONT_IDS = new Set(DOCUMENT_TEMPLATE_FONTS.map((item) => item.id));
const DENSITY_IDS = new Set(DOCUMENT_TEMPLATE_DENSITIES.map((item) => item.id));
const FONT_SIZE_IDS = new Set(
  DOCUMENT_TEMPLATE_FONT_SIZES.map((item) => item.id),
);

function normalizeFontSize(
  size: DocumentTemplateFontSize | undefined,
): DocumentTemplateFontSize {
  return size && FONT_SIZE_IDS.has(size)
    ? size
    : DEFAULT_DOCUMENT_TEMPLATE.bodyFontSize;
}

export function normalizeDocumentTemplate(
  input?: Partial<DocumentTemplateSettings> | null,
): DocumentTemplateSettings {
  return {
    style:
      input?.style && STYLE_IDS.has(input.style)
        ? input.style
        : DEFAULT_DOCUMENT_TEMPLATE.style,
    font:
      input?.font && FONT_IDS.has(input.font)
        ? input.font
        : DEFAULT_DOCUMENT_TEMPLATE.font,
    accent:
      input?.accent && ACCENT_IDS.has(input.accent)
        ? input.accent
        : DEFAULT_DOCUMENT_TEMPLATE.accent,
    density:
      input?.density && DENSITY_IDS.has(input.density)
        ? input.density
        : DEFAULT_DOCUMENT_TEMPLATE.density,
    bodyFontSize: normalizeFontSize(input?.bodyFontSize),
    titleFontSize: normalizeFontSize(input?.titleFontSize),
    issuerFontSize: normalizeFontSize(input?.issuerFontSize),
    totalFontSize: normalizeFontSize(input?.totalFontSize),
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

export function documentTemplateCssFont(font: DocumentTemplateFont): string {
  return (
    DOCUMENT_TEMPLATE_FONTS.find((item) => item.id === font)?.cssFamily ??
    DOCUMENT_TEMPLATE_FONTS[0].cssFamily
  );
}

export function documentTemplatePdfFont(
  font: DocumentTemplateFont,
): "helvetica" | "times" | "courier" {
  return (
    DOCUMENT_TEMPLATE_FONTS.find((item) => item.id === font)?.pdfFamily ??
    DOCUMENT_TEMPLATE_FONTS[0].pdfFamily
  );
}

export function documentTemplatePreviewFontSize(
  size: DocumentTemplateFontSize,
  kind: "body" | "title" | "issuer" | "total",
): number {
  const sizes = {
    body: { pequena: 13, normal: 15, grande: 17 },
    title: { pequena: 32, normal: 40, grande: 48 },
    issuer: { pequena: 13, normal: 15, grande: 17 },
    total: { pequena: 18, normal: 22, grande: 26 },
  };
  return sizes[kind][size];
}

export function documentTemplatePdfFontSize(
  size: DocumentTemplateFontSize,
  kind: "body" | "title" | "issuer" | "total",
): number {
  const sizes = {
    body: { pequena: 8.2, normal: 9.2, grande: 10.2 },
    title: { pequena: 17, normal: 20, grande: 23 },
    issuer: { pequena: 9, normal: 10, grande: 11.5 },
    total: { pequena: 11, normal: 12.5, grande: 14 },
  };
  return sizes[kind][size];
}
