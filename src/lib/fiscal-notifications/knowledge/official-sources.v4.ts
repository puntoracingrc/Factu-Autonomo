import {
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3,
  type FiscalNotificationOfficialSourceIdV3,
  type FiscalNotificationOfficialSourceV3,
} from "./official-sources.v3";

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V4 =
  4 as const;
export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V4 =
  "fiscal-notification-official-sources.2026-07-15.v4" as const;

const PLAIN_LANGUAGE_SOURCE_SEEDS_V4 = [
  [
    "aeat.notification.electronic_faq",
    "Preguntas frecuentes sobre notificaciones electrónicas",
    "https://sede.agenciatributaria.gob.es/Sede/otros-servicios/notificaciones/notificaciones/preguntas-frecuentes.html",
  ],
  [
    "aeat.collection.enforcement_surcharges",
    "Tipos de recargos del período ejecutivo",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/apremios/tipos-recargos.html",
  ],
  [
    "aeat.collection.enforcement_nonpayment",
    "Qué pasa si no pago una deuda apremiada",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/apremios/que-pasa-si-no-pago-deuda.html",
  ],
  [
    "aeat.collection.enforcement_resources",
    "Recursos contra una providencia de apremio",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/apremios/recursos.html",
  ],
  [
    "aeat.collection.seizure_overview",
    "Embargos",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos.html",
  ],
] as const satisfies readonly (readonly [string, string, string])[];

export type FiscalNotificationPlainLanguageOfficialSourceIdV4 =
  (typeof PLAIN_LANGUAGE_SOURCE_SEEDS_V4)[number][0];
export type FiscalNotificationOfficialSourceIdV4 =
  | FiscalNotificationOfficialSourceIdV3
  | FiscalNotificationPlainLanguageOfficialSourceIdV4;

export interface FiscalNotificationOfficialSourceV4 {
  readonly schemaVersion: 4;
  readonly releaseId: typeof FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V4;
  readonly id: FiscalNotificationOfficialSourceIdV4;
  readonly title: string;
  readonly authority: "AEAT" | "BOE";
  readonly authorityLevel: "OFFICIAL_PRIMARY";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn: FiscalNotificationOfficialSourceV3["urlCheckedOn"] | "2026-07-15";
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
  readonly permitsGeneralPlainLanguageGuidance: true;
  readonly permitsDocumentSpecificInference: false;
  readonly permitsDeadlineCalculation: false;
}

function freezeSource(
  source: Omit<
    FiscalNotificationOfficialSourceV4,
    | "schemaVersion"
    | "releaseId"
    | "permitsCurrentRoiStatusInference"
    | "permitsViesStatusInference"
    | "permitsDocumentAgreementInterpretation"
    | "permitsGeneralPlainLanguageGuidance"
    | "permitsDocumentSpecificInference"
    | "permitsDeadlineCalculation"
  >,
): FiscalNotificationOfficialSourceV4 {
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V4,
    releaseId: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V4,
    ...source,
    permitsCurrentRoiStatusInference: false,
    permitsViesStatusInference: false,
    permitsDocumentAgreementInterpretation: false,
    permitsGeneralPlainLanguageGuidance: true,
    permitsDocumentSpecificInference: false,
    permitsDeadlineCalculation: false,
  });
}

const existingSources = FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V3.map((source) =>
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

const plainLanguageSources = PLAIN_LANGUAGE_SOURCE_SEEDS_V4.map(
  ([id, title, canonicalUrl]) =>
    freezeSource({
      id,
      title,
      authority: "AEAT",
      authorityLevel: "OFFICIAL_PRIMARY",
      sourceKind: "PROCEDURE_INFORMATION",
      canonicalUrl,
      urlCheckedOn: "2026-07-15",
      verificationStatus: "OFFICIAL_URL_VERIFIED",
      contentSha256: null,
      legalReviewStatus: "LEGAL_REVIEW_PENDING",
      usagePolicy: "CONTEXT_ONLY",
      permitsLegalRuleActivation: false,
      permitsTemplateActivation: false,
      retainedSourceContent: "NONE",
    }),
);

export const FISCAL_NOTIFICATION_PLAIN_LANGUAGE_OFFICIAL_SOURCE_IDS_V4 =
  Object.freeze(PLAIN_LANGUAGE_SOURCE_SEEDS_V4.map(([id]) => id));

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4 = Object.freeze([
  ...existingSources,
  ...plainLanguageSources,
]) satisfies readonly FiscalNotificationOfficialSourceV4[];

const sourceById = new Map(
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V4.map(
    (source) => [source.id, source] as const,
  ),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationOfficialSourceV4(
  id: unknown,
): FiscalNotificationOfficialSourceV4 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (sourceById.get(id as FiscalNotificationOfficialSourceIdV4) ?? null)
    : null;
}
