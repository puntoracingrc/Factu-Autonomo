export type RentabilidadRealDocumentAnalysisMode =
  | "simple_document"
  | "fixed_price_work"
  | "hours_project"
  | "installation_with_materials"
  | "service_visit"
  | "retainer"
  | "unknown";

export type RentabilidadRealDocumentAnalysisModeFilter =
  | "all"
  | RentabilidadRealDocumentAnalysisMode;

export type RentabilidadRealDocumentAnalysisModesById = Record<
  string,
  RentabilidadRealDocumentAnalysisMode
>;

export const RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODES: RentabilidadRealDocumentAnalysisMode[] =
  [
    "simple_document",
    "fixed_price_work",
    "hours_project",
    "installation_with_materials",
    "service_visit",
    "retainer",
    "unknown",
  ];

export const RENTABILIDAD_REAL_DOCUMENT_ANALYSIS_MODE_LABELS: Record<
  RentabilidadRealDocumentAnalysisMode,
  string
> = {
  simple_document: "Documento simple",
  fixed_price_work: "Obra/trabajo",
  hours_project: "Horas/proyecto",
  installation_with_materials: "Instalacion con materiales",
  service_visit: "Visita/servicio",
  retainer: "Iguala/mantenimiento",
  unknown: "No definido",
};
