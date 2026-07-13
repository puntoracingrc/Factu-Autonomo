export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V1 =
  1 as const;
export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V1 =
  "fiscal-notification-official-sources.2026-07-12.v1" as const;

const SOURCE_SEEDS = [
  [
    "aeat.collection.enforcement",
    "Procedimiento de apremio",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml",
  ],
  [
    "aeat.collection.deferral",
    "Aplazamiento y fraccionamiento de deudas",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RB01.shtml",
  ],
  [
    "aeat.collection.offset.requested",
    "Compensaciones. Compensación a instancia",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC01.shtml",
  ],
  [
    "aeat.collection.offset.exofficio",
    "Compensaciones. Compensación de oficio",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC02.shtml",
  ],
  [
    "aeat.assessment.irpf",
    "IRPF. Verificación de datos / Comprobación limitada",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml",
  ],
  [
    "aeat.assessment.vat",
    "IVA. Verificación de datos / Comprobación limitada. Autoliquidaciones",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G202.shtml",
  ],
  [
    "aeat.sanction.general",
    "Procedimiento sancionador general de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ69.shtml",
  ],
  [
    "aeat.review.reconsideration",
    "Recurso de reposición contra actos de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ52.shtml",
  ],
  [
    "aeat.review.economic_administrative",
    "Reclamación económico-administrativa contra actos de Gestión Tributaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ53.shtml",
  ],
  [
    "aeat.refund.undue",
    "Devolución de ingresos indebidos",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA03.shtml",
  ],
  [
    "aeat.liability.solidary",
    "Procedimiento de declaración de responsabilidad solidaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG01.shtml",
  ],
  [
    "aeat.liability.subsidiary",
    "Procedimiento de declaración de responsabilidad subsidiaria",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG02.shtml",
  ],
  [
    "aeat.liability.successors",
    "Procedimiento de recaudación frente a los sucesores",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG03.shtml",
  ],
  [
    "aeat.inspection.general",
    "Procedimiento inspector de comprobación e investigación",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/IZ01.shtml",
  ],
  [
    "aeat.certificate.compliance",
    "Certificados tributarios. Estar al corriente de obligaciones tributarias",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
  ],
  [
    "aeat.collection.precautionary",
    "Recaudación. Medidas cautelares",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA09.shtml",
  ],
  [
    "aeat.collection.auction",
    "Enajenación de bienes embargados o aportados como garantía mediante subasta",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RF02.shtml",
  ],
] as const;

export type FiscalNotificationOfficialSourceIdV1 =
  (typeof SOURCE_SEEDS)[number][0];

export interface FiscalNotificationOfficialSourceV1 {
  readonly schemaVersion: 1;
  readonly releaseId: typeof FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V1;
  readonly id: FiscalNotificationOfficialSourceIdV1;
  readonly title: string;
  readonly authority: "AEAT";
  readonly authorityLevel: "OFFICIAL_PRIMARY";
  readonly sourceKind: "PROCEDURE_INFORMATION";
  readonly canonicalUrl: string;
  readonly urlCheckedOn: "2026-07-12";
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly contentSha256: null;
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "PROCEDURE_CONTEXT_ONLY";
  readonly permitsLegalRuleActivation: false;
  readonly permitsTemplateActivation: false;
  readonly retainedSourceContent: "NONE";
}

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1 = Object.freeze(
  SOURCE_SEEDS.map(([id, title, canonicalUrl]) =>
    Object.freeze({
      schemaVersion: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V1,
      releaseId: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V1,
      id,
      title,
      authority: "AEAT" as const,
      authorityLevel: "OFFICIAL_PRIMARY" as const,
      sourceKind: "PROCEDURE_INFORMATION" as const,
      canonicalUrl,
      urlCheckedOn: "2026-07-12" as const,
      verificationStatus: "OFFICIAL_URL_VERIFIED" as const,
      contentSha256: null,
      legalReviewStatus: "LEGAL_REVIEW_PENDING" as const,
      usagePolicy: "PROCEDURE_CONTEXT_ONLY" as const,
      permitsLegalRuleActivation: false as const,
      permitsTemplateActivation: false as const,
      retainedSourceContent: "NONE" as const,
    }),
  ),
) satisfies readonly FiscalNotificationOfficialSourceV1[];

const sourceById = new Map(
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V1.map((source) => [
    source.id,
    source,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationOfficialSourceV1(
  id: unknown,
): FiscalNotificationOfficialSourceV1 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (sourceById.get(id as FiscalNotificationOfficialSourceIdV1) ?? null)
    : null;
}
