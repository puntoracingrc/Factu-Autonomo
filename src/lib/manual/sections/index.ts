/**
 * Índice del manual de usuario (/ayuda).
 * Al cambiar flujos de la app, actualiza las secciones aquí registradas.
 * @see src/lib/manual/MAINTENANCE.md
 */
import type { ManualSection } from "../types";
import { clientesSection } from "./clientes";
import { cuentaSection } from "./cuenta";
import { configuracionSection, proveedoresSection } from "./proveedores-ajustes";
import { facturasSection } from "./facturas";
import { gastosSection } from "./gastos";
import { importacionSection } from "./importacion";
import { impuestosSection } from "./impuestos";
import { inicioSection } from "./inicio";
import { presupuestosSection, recibosSection } from "./presupuestos-recibos";
import { primerosPasosSection } from "./primeros-pasos";

export const manualSections: ManualSection[] = [
  primerosPasosSection,
  inicioSection,
  clientesSection,
  facturasSection,
  presupuestosSection,
  recibosSection,
  gastosSection,
  impuestosSection,
  proveedoresSection,
  cuentaSection,
  configuracionSection,
  importacionSection,
].sort((a, b) => a.order - b.order);

export function getManualSection(slug: string): ManualSection | undefined {
  return manualSections.find((section) => section.slug === slug);
}

export function getManualSlugs(): string[] {
  return manualSections.map((section) => section.slug);
}
