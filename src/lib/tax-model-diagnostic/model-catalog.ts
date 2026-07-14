import type { TaxModelNumber } from "./contracts";

export type TaxModelCategory =
  | "CENSUS"
  | "PERSONAL_INCOME"
  | "VAT"
  | "WITHHOLDING"
  | "INFORMATION"
  | "CORPORATE"
  | "NON_RESIDENT"
  | "PERSONAL_SUPPLEMENTARY";

export interface TaxModelCatalogEntry {
  modelNumber: TaxModelNumber;
  name: string;
  category: TaxModelCategory;
  canonicalPath?: string;
}

export const TAX_MODEL_CATALOG: readonly TaxModelCatalogEntry[] = [
  { modelNumber: "035", name: "Alta o modificación en OSS/IOSS", category: "CENSUS" },
  { modelNumber: "036", name: "Declaración censal", category: "CENSUS", canonicalPath: "/consultor-fiscal/modelos/036" },
  { modelNumber: "100", name: "Declaración anual del IRPF", category: "PERSONAL_INCOME", canonicalPath: "/consultor-fiscal/modelos/100" },
  { modelNumber: "111", name: "Retenciones de trabajo y actividades económicas", category: "WITHHOLDING", canonicalPath: "/consultor-fiscal/modelos/111" },
  { modelNumber: "115", name: "Retenciones por alquiler de inmuebles urbanos", category: "WITHHOLDING", canonicalPath: "/consultor-fiscal/modelos/115" },
  { modelNumber: "123", name: "Retenciones de determinados rendimientos del capital", category: "WITHHOLDING", canonicalPath: "/consultor-fiscal/modelos/123" },
  { modelNumber: "130", name: "Pago fraccionado IRPF en estimación directa", category: "PERSONAL_INCOME", canonicalPath: "/consultor-fiscal/modelos/130" },
  { modelNumber: "131", name: "Pago fraccionado IRPF en estimación objetiva", category: "PERSONAL_INCOME", canonicalPath: "/consultor-fiscal/modelos/131" },
  { modelNumber: "180", name: "Resumen anual de retenciones por alquiler", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/180" },
  { modelNumber: "184", name: "Entidades en régimen de atribución de rentas", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/184" },
  { modelNumber: "190", name: "Resumen anual de retenciones de trabajo y actividades", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/190" },
  { modelNumber: "193", name: "Resumen anual de determinados rendimientos del capital", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/193" },
  { modelNumber: "200", name: "Impuesto sobre Sociedades", category: "CORPORATE", canonicalPath: "/consultor-fiscal/modelos/200" },
  { modelNumber: "202", name: "Pago fraccionado del Impuesto sobre Sociedades", category: "CORPORATE", canonicalPath: "/consultor-fiscal/modelos/202" },
  { modelNumber: "216", name: "Retenciones de rentas de no residentes", category: "NON_RESIDENT", canonicalPath: "/consultor-fiscal/modelos/216" },
  { modelNumber: "296", name: "Resumen anual de rentas de no residentes", category: "NON_RESIDENT", canonicalPath: "/consultor-fiscal/modelos/296" },
  { modelNumber: "303", name: "Autoliquidación periódica de IVA", category: "VAT", canonicalPath: "/consultor-fiscal/modelos/303" },
  { modelNumber: "308", name: "Solicitud de devolución de IVA en supuestos específicos", category: "VAT", canonicalPath: "/consultor-fiscal/modelos/308" },
  { modelNumber: "309", name: "Autoliquidación no periódica de IVA", category: "VAT", canonicalPath: "/consultor-fiscal/modelos/309" },
  { modelNumber: "341", name: "Reintegro de compensaciones agrarias", category: "VAT", canonicalPath: "/consultor-fiscal/modelos/341" },
  { modelNumber: "347", name: "Operaciones con terceras personas", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/347" },
  { modelNumber: "349", name: "Operaciones intracomunitarias", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/349" },
  { modelNumber: "369", name: "Declaración de IVA OSS/IOSS", category: "VAT", canonicalPath: "/consultor-fiscal/modelos/369" },
  { modelNumber: "390", name: "Resumen anual de IVA", category: "INFORMATION", canonicalPath: "/consultor-fiscal/modelos/390" },
  { modelNumber: "714", name: "Impuesto sobre el Patrimonio", category: "PERSONAL_SUPPLEMENTARY" },
  { modelNumber: "720", name: "Bienes y derechos en el extranjero", category: "PERSONAL_SUPPLEMENTARY" },
  { modelNumber: "721", name: "Monedas virtuales en el extranjero", category: "PERSONAL_SUPPLEMENTARY" },
] as const;

const CATALOG_BY_NUMBER = new Map(
  TAX_MODEL_CATALOG.map((entry) => [entry.modelNumber, entry]),
);

export function getTaxModelCatalogEntry(
  modelNumber: TaxModelNumber,
): TaxModelCatalogEntry {
  const entry = CATALOG_BY_NUMBER.get(modelNumber);
  if (!entry) throw new Error(`Modelo tributario no catalogado: ${modelNumber}`);
  return entry;
}
