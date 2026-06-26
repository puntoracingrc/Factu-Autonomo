import type { OfficialFieldMapping } from "./types";

const DESIGN_ARTIFACT = "AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0";
const HASH_ARTIFACT = "AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2";
const SCHEMA_ARTIFACT = "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0";

export const OFFICIAL_FIELD_MAPPINGS = [
  {
    internalPath: "issuerReference",
    officialPath: "RegistroAlta/IDFactura/IDEmisorFactura",
    recordKind: "registro_alta",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "blocked_until_official_synthetic_nif",
    mappingStatus: "blocked",
    notes:
      "Official path verified, but current value is an internal reference, not a safe official example NIF.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "invoiceReference",
    officialPath: "RegistroAlta/IDFactura/NumSerieFactura",
    recordKind: "registro_alta",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "direct_synthetic_reference_blocked",
    mappingStatus: "blocked",
    notes:
      "Official path verified; current value is intentionally internal and not an official synthetic series.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "issueDateCandidate",
    officialPath: "RegistroAlta/IDFactura/FechaExpedicionFactura",
    recordKind: "registro_alta",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "date_format_pending_design_contract",
    mappingStatus: "pending",
    notes: "Official path verified; final format is pending executable schema validation.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "amountMinorCandidate",
    officialPath: "RegistroAlta/ImporteTotal",
    recordKind: "registro_alta",
    artifactId: DESIGN_ARTIFACT,
    requiredness: "required",
    transformation: "minor_units_to_decimal_pending",
    mappingStatus: "pending",
    notes:
      "Official field is present in design/hash references; decimal rendering remains pending.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "previousCandidateHash",
    officialPath: "RegistroAlta/Encadenamiento/RegistroAnterior/Huella",
    recordKind: "registro_alta",
    artifactId: HASH_ARTIFACT,
    requiredness: "conditional",
    transformation: "candidate_hash_to_official_hash_blocked",
    mappingStatus: "blocked",
    notes:
      "Candidate hash is explicitly not an official fingerprint and cannot be mapped forward.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "issuerReference",
    officialPath: "RegistroAnulacion/IDFactura/IDEmisorFacturaAnulada",
    recordKind: "registro_anulacion",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "blocked_until_official_synthetic_nif",
    mappingStatus: "blocked",
    notes:
      "Official path verified, but current value is an internal reference, not a safe official example NIF.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "invoiceReference",
    officialPath: "RegistroAnulacion/IDFactura/NumSerieFacturaAnulada",
    recordKind: "registro_anulacion",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "direct_synthetic_reference_blocked",
    mappingStatus: "blocked",
    notes:
      "Official path verified; current value is intentionally internal and not an official synthetic series.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "issueDateCandidate",
    officialPath: "RegistroAnulacion/IDFactura/FechaExpedicionFacturaAnulada",
    recordKind: "registro_anulacion",
    artifactId: HASH_ARTIFACT,
    requiredness: "required",
    transformation: "date_format_pending_design_contract",
    mappingStatus: "pending",
    notes: "Official path verified; final format is pending executable schema validation.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "previousCandidateHash",
    officialPath: "RegistroAnulacion/Encadenamiento/RegistroAnterior/Huella",
    recordKind: "registro_anulacion",
    artifactId: HASH_ARTIFACT,
    requiredness: "conditional",
    transformation: "candidate_hash_to_official_hash_blocked",
    mappingStatus: "blocked",
    notes:
      "Candidate hash is explicitly not an official fingerprint and cannot be mapped forward.",
    evidenceReference: "hash-spec-v0.1.2-page-5",
  },
  {
    internalPath: "syntheticOnly",
    officialPath: "TypeScriptWrapper.syntheticOnly",
    recordKind: "registro_alta",
    artifactId: SCHEMA_ARTIFACT,
    requiredness: "required",
    transformation: "wrapper_only_not_xml",
    mappingStatus: "not_applicable",
    notes: "Safety marker remains outside official XML structures.",
    evidenceReference: "phase2b7-red-line",
  },
] as const satisfies readonly OfficialFieldMapping[];

export function officialMappingsForRecordKind(recordKind: OfficialFieldMapping["recordKind"]) {
  return OFFICIAL_FIELD_MAPPINGS.filter(
    (mapping) => mapping.recordKind === recordKind,
  );
}
