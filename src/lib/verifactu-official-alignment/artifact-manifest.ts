import type { OfficialArtifactManifestEntry } from "./types";

export const PHASE2B7_GLOBAL_MARKER =
  "PHASE2B7A_E_OFFICIAL_ARTIFACT_ALIGNMENT_LOCAL_VALIDATION_V1";

export const PHASE2B7F_K_GLOBAL_MARKER =
  "PHASE2B7F_K_OFFLINE_XSD_VALIDATION_GATE_V1";

export const OFFICIAL_ARTIFACT_CONSULTED_AT = "2026-06-26";

export const OFFICIAL_ARTIFACT_MANIFEST = [
  {
    artifactId: "AEAT_VERIFACTU_RECORD_DESIGN_XLSX_V1_0",
    url: "https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/DsRegistroVeriFactu.xlsx",
    domain: "www.agenciatributaria.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "v1.0",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sha256:
      "40ce191aa1def6e44a5f1e86d7ece727258745b34e3fe4d6abe1468252dac2ca",
    status: "verified",
    usage: "field_mapping_reference",
    localFixturePath: null,
    notes:
      "Official design spreadsheet identified and checksummed; not committed.",
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
    url: "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroLR.xsd",
    domain: "prewww2.aeat.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "tikeV1.0",
    contentType: "not-provided-by-server",
    sha256:
      "cbdac8d427cc5ab5d77ca48974cab0f35d6bb819c4c66db361681e3710aeba36",
    status: "verified",
    usage: "schema_reference_not_committed",
    localFixturePath: null,
    notes:
      "Official static XSD linked by AEAT developers; checksum recorded, not committed.",
  },
  {
    artifactId: "AEAT_VERIFACTU_SUMINISTRO_INFORMACION_XSD_TIKE_V1_0",
    url: "https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/SuministroInformacion.xsd",
    domain: "prewww2.aeat.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "tikeV1.0",
    contentType: "not-provided-by-server",
    sha256:
      "ee4c1655175644de44c4c25055ffeb8e5f4bb4bc3834ce8254d4222ef18c8aa1",
    status: "verified",
    usage: "schema_reference_not_committed",
    localFixturePath: null,
    notes:
      "Official common types XSD linked by AEAT developers; checksum recorded, not committed.",
  },
  {
    artifactId: "AEAT_VERIFACTU_HASH_SPEC_PDF_V0_1_2",
    url: "https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf",
    domain: "www.agenciatributaria.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "0.1.2",
    contentType: "application/pdf",
    sha256:
      "f4334c254bb875b417247b54315199f89d75a8c4814dfd1e86efec562653d7de",
    status: "verified",
    usage: "hash_reference_only",
    localFixturePath: null,
    notes: "Official hash specification identified and checksummed; not committed.",
  },
  {
    artifactId: "AEAT_VERIFACTU_VALIDATIONS_ERRORS_PDF_V1_2_2",
    url: "https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Validaciones_Errores_Veri-Factu.pdf",
    domain: "www.agenciatributaria.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "1.2.2",
    contentType: "application/pdf",
    sha256:
      "426eb926fc098a36a163f66ca5f40d9e0847ca23300bbe5008979832d3513440",
    status: "verified",
    usage: "validation_reference_only",
    localFixturePath: null,
    notes:
      "Official validations/errors document identified and checksummed; not committed.",
  },
  {
    artifactId: "AEAT_VERIFACTU_SERVICE_SPEC_PDF_V1_0_3",
    url: "https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_Descripcion_SWeb.pdf",
    domain: "sede.agenciatributaria.gob.es",
    consultedAt: OFFICIAL_ARTIFACT_CONSULTED_AT,
    version: "1.0.3",
    contentType: "application/pdf",
    sha256:
      "b3570f6a308ce98a5f52001a0dc427310ad6cf7bccd60a9ee98720a59e553c02",
    status: "verified",
    usage: "technical_reference_only",
    localFixturePath: null,
    notes:
      "Official service specification identified and checksummed; not committed.",
  },
] as const satisfies readonly OfficialArtifactManifestEntry[];

export const OFFICIAL_ARTIFACT_GATE = {
  marker: PHASE2B7_GLOBAL_MARKER,
  xsdFound: true,
  exactNamespaceFound: true,
  artifactVersionsFound: true,
  artifactsCommitted: false,
  safeOfflineXsdValidatorFound: false,
  status: "blocked",
  blocker: "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
} as const;

export const OFFICIAL_OFFLINE_XSD_FIXTURE_GATE = {
  marker: PHASE2B7F_K_GLOBAL_MARKER,
  xsdFound: true,
  exactNamespaceFound: true,
  exactRootFound: true,
  officialSchemaPageAccessible: true,
  xsdFixturesCommitted: false,
  xsdDownloadWithoutClientCertificateVerified: false,
  safeOfflineXsdValidatorSelected: false,
  safeOfficialSyntheticDataAvailable: false,
  status: "blocked",
  blockers: [
    "BLOCKED_XSD_NOT_COMMITTED",
    "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
    "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
  ],
} as const;

export function findOfficialArtifact(
  artifactId: string,
): OfficialArtifactManifestEntry | undefined {
  return OFFICIAL_ARTIFACT_MANIFEST.find(
    (artifact) => artifact.artifactId === artifactId,
  );
}
