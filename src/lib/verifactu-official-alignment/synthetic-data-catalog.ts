import type { OfficialSafeSyntheticDataCatalogEntry } from "./types";

export const PHASE2B7H_SYNTHETIC_DATA_CATALOG_MARKER =
  "PHASE2B7H_OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG_V1";

export const OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG = [
  {
    requirementId: "alta_issuer_tax_identifier",
    recordKind: "registro_alta",
    relatedOfficialPath: "RegistroAlta/IDFactura/IDEmisorFactura",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "No complete official safe example NIF was approved for XML generation.",
  },
  {
    requirementId: "alta_invoice_identifier",
    recordKind: "registro_alta",
    relatedOfficialPath: "RegistroAlta/IDFactura/NumSerieFactura",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "No complete official safe example invoice series was approved for XML generation.",
  },
  {
    requirementId: "alta_issue_date",
    recordKind: "registro_alta",
    relatedOfficialPath: "RegistroAlta/IDFactura/FechaExpedicionFactura",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "The date value remains blocked until a complete official synthetic case is approved.",
  },
  {
    requirementId: "alta_total_amount",
    recordKind: "registro_alta",
    relatedOfficialPath: "RegistroAlta/ImporteTotal",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "The amount value remains blocked until the official schema and a complete safe case are available offline.",
  },
  {
    requirementId: "anulacion_issuer_tax_identifier",
    recordKind: "registro_anulacion",
    relatedOfficialPath: "RegistroAnulacion/IDFactura/IDEmisorFacturaAnulada",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "No complete official safe example cancellation issuer identifier was approved for XML generation.",
  },
  {
    requirementId: "anulacion_invoice_identifier",
    recordKind: "registro_anulacion",
    relatedOfficialPath: "RegistroAnulacion/IDFactura/NumSerieFacturaAnulada",
    syntheticOnly: true,
    source: "blocked",
    usableForXml: false,
    value: null,
    reason:
      "No complete official safe example cancelled invoice series was approved for XML generation.",
  },
] as const satisfies readonly OfficialSafeSyntheticDataCatalogEntry[];

export const OFFICIAL_SAFE_SYNTHETIC_DATA_GATE = {
  marker: PHASE2B7H_SYNTHETIC_DATA_CATALOG_MARKER,
  status: "blocked",
  syntheticOnly: true,
  usableForXml: false,
  completeAltaCaseAvailable: false,
  completeAnulacionCaseAvailable: false,
  blocker: "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
} as const;

export function officialSafeSyntheticDataForXml(): readonly OfficialSafeSyntheticDataCatalogEntry[] {
  return OFFICIAL_SAFE_SYNTHETIC_DATA_CATALOG.filter((entry) => entry.usableForXml);
}
