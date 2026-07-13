import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2,
  type FiscalNotificationOfficialSourceIdV2,
  type FiscalNotificationOfficialSourceV2,
} from "./official-sources.v2";

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V3 =
  3 as const;
export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V3 =
  "fiscal-notification-official-sources.2026-07-13.v3" as const;

const ROI_SOURCE_SEEDS_V3 = [
  [
    "aeat.census.roi.registry_information",
    "Registro de operadores intracomunitarios",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/quien-debe-estar-censado/registro-operadores-intracomunitarios.html",
  ],
  [
    "aeat.census.roi.registration_faq",
    "Solicitud de alta o baja en el Registro de Operadores Intracomunitarios",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/censos-nif-domicilio-fiscal/tramites-censales-relacionados-empresarios-profesionales-retenedores/preguntas-frecuentes-modelos-036-037/modificaciones-censales/solicitud-alta-baja-registro-operadores-intracomunitarios.html",
  ],
] as const satisfies readonly (readonly [
  string,
  string,
  "AEAT" | "BOE",
  "PROCEDURE_INFORMATION" | "LEGAL_TEXT",
  string,
])[];

export type FiscalNotificationRoiOfficialSourceIdV3 =
  (typeof ROI_SOURCE_SEEDS_V3)[number][0];
export type FiscalNotificationOfficialSourceIdV3 =
  | FiscalNotificationOfficialSourceIdV2
  | FiscalNotificationRoiOfficialSourceIdV3;

export interface FiscalNotificationOfficialSourceV3 {
  readonly schemaVersion: 3;
  readonly releaseId: typeof FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V3;
  readonly id: FiscalNotificationOfficialSourceIdV3;
  readonly title: string;
  readonly authority: "AEAT" | "BOE";
  readonly authorityLevel: "OFFICIAL_PRIMARY";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn: FiscalNotificationOfficialSourceV2["urlCheckedOn"];
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly contentSha256: null;
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "CONTEXT_ONLY";
  readonly permitsLegalRuleActivation: false;
  readonly permitsTemplateActivation: false;
  readonly retainedSourceContent: "NONE";
  readonly permitsCurrentRoiStatusInference: false;
  readonly permitsViesStatusInference: false;
  readonly permitsDocumentAgreementInterpretation: false;
}

function freezeSource(
  source: Omit<
    FiscalNotificationOfficialSourceV3,
    | "schemaVersion"
    | "releaseId"
    | "permitsCurrentRoiStatusInference"
    | "permitsViesStatusInference"
    | "permitsDocumentAgreementInterpretation"
  >,
): FiscalNotificationOfficialSourceV3 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V3,
    releaseId: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V3,
    ...source,
    permitsCurrentRoiStatusInference: false,
    permitsViesStatusInference: false,
    permitsDocumentAgreementInterpretation: false,
  });
}

const existingSources = FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.map((source) =>
  freezeSource({
    id: source.id,
    title: source.title,
    authority: source.authority,
    authorityLevel: source.authorityLevel,
    sourceKind: source.sourceKind,
    canonicalUrl: source.canonicalUrl,
    urlCheckedOn: source.urlCheckedOn,
    verificationStatus: source.verificationStatus,
    contentSha256: source.contentSha256,
    legalReviewStatus: source.legalReviewStatus,
    usagePolicy: source.usagePolicy,
    permitsLegalRuleActivation: source.permitsLegalRuleActivation,
    permitsTemplateActivation: source.permitsTemplateActivation,
    retainedSourceContent: source.retainedSourceContent,
  }),
);

export const FISCAL_NOTIFICATION_ROI_OFFICIAL_SOURCE_IDS_V3 = Object.freeze(
  ROI_SOURCE_SEEDS_V3.map(([id]) => id),
);

const roiSources = ROI_SOURCE_SEEDS_V3.map(
  ([id, title, authority, sourceKind, canonicalUrl]) =>
    freezeSource({
      id,
      title,
      authority,
      authorityLevel: "OFFICIAL_PRIMARY",
      sourceKind,
      canonicalUrl,
      urlCheckedOn: "2026-07-13",
      verificationStatus: "OFFICIAL_URL_VERIFIED",
      contentSha256: null,
      legalReviewStatus: "LEGAL_REVIEW_PENDING",
      usagePolicy: "CONTEXT_ONLY",
      permitsLegalRuleActivation: false,
      permitsTemplateActivation: false,
      retainedSourceContent: "NONE",
    }),
);

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3 = Object.freeze([
  ...existingSources,
  ...roiSources,
]) satisfies readonly FiscalNotificationOfficialSourceV3[];

const sourceById = new Map(
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.map(
    (source) => [source.id, source] as const,
  ),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationOfficialSourceV3(
  id: unknown,
): FiscalNotificationOfficialSourceV3 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (sourceById.get(id as FiscalNotificationOfficialSourceIdV3) ?? null)
    : null;
}
