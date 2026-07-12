/**
 * Índice del manual de usuario (/ayuda).
 * Al cambiar flujos de la app, actualiza las secciones aquí registradas.
 * @see src/lib/manual/MAINTENANCE.md
 */
import type { ManualSection } from "../types";
import { isConsultorFiscalEnabled } from "@/lib/expense-deductibility/config";
import { clientesSection } from "./clientes";
import { consultorFiscalSection } from "./consultor-fiscal";
import { cuentaSection } from "./cuenta";
import { demoSection } from "./demo";
import { configuracionSection, proveedoresSection } from "./proveedores-ajustes";
import { facturasSection } from "./facturas";
import { gastosSection } from "./gastos";
import { importacionSection } from "./importacion";
import { impuestosSection } from "./impuestos";
import { inicioSection } from "./inicio";
import { productosSection } from "./productos";
import { presupuestosSection, recibosSection } from "./presupuestos-recibos";
import { primerosPasosSection } from "./primeros-pasos";
import { rentabilidadRealSection } from "./rentabilidad-real";

export function buildManualSections(
  consultorFiscalEnabled: boolean,
): ManualSection[] {
  return [
    primerosPasosSection,
    demoSection,
    inicioSection,
    clientesSection,
    facturasSection,
    presupuestosSection,
    recibosSection,
    gastosSection,
    productosSection,
    impuestosSection,
    ...(consultorFiscalEnabled ? [consultorFiscalSection] : []),
    proveedoresSection,
    cuentaSection,
    configuracionSection,
    importacionSection,
    rentabilidadRealSection,
  ].sort((a, b) => a.order - b.order);
}

export const manualSections = buildManualSections(
  isConsultorFiscalEnabled(),
);

export function getManualSection(slug: string): ManualSection | undefined {
  return manualSections.find((section) => section.slug === slug);
}

export function getManualSlugs(): string[] {
  return manualSections.map((section) => section.slug);
}
