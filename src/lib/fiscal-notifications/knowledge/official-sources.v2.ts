import type { FiscalNotificationOfficialSourceIdV1 } from "./official-sources.v1";

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V2 =
  2 as const;
export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V2 =
  "fiscal-notification-official-sources.2026-07-13.v2" as const;

const SOURCE_SEEDS_V2 = [
  [
    "aeat.collection.enforcement",
    "Procedimiento de apremio",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA19.shtml",
    "2026-07-12",
  ],
  [
    "aeat.collection.deferral",
    "Aplazamiento y fraccionamiento de deudas",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RB01.shtml",
    "2026-07-12",
  ],
  [
    "aeat.collection.offset.requested",
    "Compensaciones. Compensación a instancia",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC01.shtml",
    "2026-07-12",
  ],
  [
    "aeat.collection.offset.exofficio",
    "Compensaciones. Compensación de oficio",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RC02.shtml",
    "2026-07-12",
  ],
  [
    "aeat.assessment.irpf",
    "IRPF. Verificación de datos / Comprobación limitada",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G200.shtml",
    "2026-07-12",
  ],
  [
    "aeat.assessment.vat",
    "IVA. Verificación de datos / Comprobación limitada. Autoliquidaciones",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G202.shtml",
    "2026-07-12",
  ],
  [
    "aeat.sanction.general",
    "Procedimiento sancionador general de Gestión Tributaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ69.shtml",
    "2026-07-12",
  ],
  [
    "aeat.review.reconsideration",
    "Recurso de reposición contra actos de Gestión Tributaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ52.shtml",
    "2026-07-12",
  ],
  [
    "aeat.review.economic_administrative",
    "Reclamación económico-administrativa contra actos de Gestión Tributaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ53.shtml",
    "2026-07-12",
  ],
  [
    "aeat.refund.undue",
    "Devolución de ingresos indebidos",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA03.shtml",
    "2026-07-12",
  ],
  [
    "aeat.liability.solidary",
    "Procedimiento de declaración de responsabilidad solidaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG01.shtml",
    "2026-07-12",
  ],
  [
    "aeat.liability.subsidiary",
    "Procedimiento de declaración de responsabilidad subsidiaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG02.shtml",
    "2026-07-12",
  ],
  [
    "aeat.liability.successors",
    "Procedimiento de recaudación frente a los sucesores",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RG03.shtml",
    "2026-07-12",
  ],
  [
    "aeat.inspection.general",
    "Procedimiento inspector de comprobación e investigación",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/IZ01.shtml",
    "2026-07-12",
  ],
  [
    "aeat.certificate.compliance",
    "Certificados tributarios. Estar al corriente de obligaciones tributarias",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G304.shtml",
    "2026-07-12",
  ],
  [
    "aeat.collection.precautionary",
    "Recaudación. Medidas cautelares",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA09.shtml",
    "2026-07-12",
  ],
  [
    "aeat.collection.auction",
    "Enajenación de bienes embargados o aportados como garantía mediante subasta",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RF02.shtml",
    "2026-07-12",
  ],
  [
    "aeat.compliance.omitted_return",
    "Requerimiento por declaraciones o autoliquidaciones no presentadas",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G223.shtml",
    "2026-07-13",
  ],
  [
    "aeat.census.rectification",
    "Rectificación censal",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GC25.shtml",
    "2026-07-13",
  ],
  [
    "aeat.assessment.value_check",
    "Comprobaciones fiscales. Comprobación de valores",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ22.shtml",
    "2026-07-13",
  ],
  [
    "aeat.review.guarantee_cost",
    "Procedimiento de reembolso del coste de las garantías",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA04.shtml",
    "2026-07-13",
  ],
  [
    "aeat.review.material_error.collection",
    "Rectificación de errores de actos de Recaudación",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RH10.shtml",
    "2026-07-13",
  ],
  [
    "aeat.review.special_procedures",
    "Procedimientos especiales de revisión",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/recursos/procedimientos-especiales-revision.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.payment_and_receipts",
    "Pagar, aplazar y consultar deudas e ingresos realizados",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/pagar-aplazar-consultar/que-puedo-pagar-aplazar-consultar.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.deferral_management",
    "Gestión de aplazamientos y fraccionamientos",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/aplazamiento-fraccionamiento-deudas/gestion-aplazamientos-fraccionamientos.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.seizure_types",
    "Tipos de embargo",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/tipos-embargo.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.seizure_resources",
    "Recursos contra diligencias de embargo",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/embargos/recursos.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.third_party_claim",
    "Tercerías de dominio y de mejor derecho",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/recursos/terceria.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.external_debt",
    "Deudas de otros organismos cuya recaudación gestiona la AEAT",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/deudas-apremios-embargos-subastas/apremios/deudas-externas.html",
    "2026-07-13",
  ],
  [
    "aeat.collection.late_filing_surcharge",
    "Liquidación de recargos por presentación fuera de plazo",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ71.shtml",
    "2026-07-13",
  ],
  [
    "aeat.compliance.individual_information",
    "Requerimiento de información de Recaudación",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA10.shtml",
    "2026-07-13",
  ],
  [
    "aeat.collection.suspension",
    "Suspensión del procedimiento de recaudación",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RA02.shtml",
    "2026-07-13",
  ],
  [
    "aeat.census.tax_domicile",
    "Comprobación del domicilio fiscal",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G300.shtml",
    "2026-07-13",
  ],
  [
    "aeat.census.nif_revocation",
    "Revocación del NIF",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ76.shtml",
    "2026-07-13",
  ],
  [
    "aeat.census.nif_rehabilitation",
    "Rehabilitación del NIF",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ77.shtml",
    "2026-07-13",
  ],
  [
    "aeat.assessment.interest",
    "Liquidación de intereses de demora de Gestión Tributaria",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GZ88.shtml",
    "2026-07-13",
  ],
  [
    "aeat.seizure.bank_accounts",
    "Embargo de cuentas bancarias",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RE01.shtml",
    "2026-07-13",
  ],
  [
    "aeat.seizure.wages",
    "Embargo de sueldos, salarios y pensiones",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RE02.shtml",
    "2026-07-13",
  ],
  [
    "aeat.seizure.securities",
    "Embargo de valores",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RE04.shtml",
    "2026-07-13",
  ],
  [
    "aeat.seizure.credits",
    "Embargo de créditos, efectos y derechos realizables",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/RE05.shtml",
    "2026-07-13",
  ],
  [
    "aeat.payment.nrc_receipt",
    "Pago de autoliquidaciones con tarjeta o Bizum y justificante NRC",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/pago-impuestos-deudas-tasas-ayuda-tecnica/pago-autoliquidaciones-tarjeta.html",
    "2026-07-13",
  ],
  [
    "aeat.refund.corporate_tax",
    "Impuesto sobre Sociedades. Devolución derivada de la normativa del tributo",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G220.shtml",
    "2026-07-13",
  ],
  [
    "aeat.irpf.spouse_refund_suspension",
    "Suspensión del ingreso de deuda IRPF mediante devolución del cónyuge",
    "AEAT",
    "PROCEDURE_INFORMATION",
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c01-campana-declaracion-renta/pago-deuda-tributaria-irpf/procedimiento-suspension-ingreso-deuda-tributaria.html",
    "2026-07-13",
  ],
  [
    "boe.tax.general.law",
    "Ley 58/2003, General Tributaria",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186",
    "2026-07-13",
  ],
  [
    "boe.tax.management_inspection.regulation",
    "Real Decreto 1065/2007, gestión e inspección tributaria",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2007-15984",
    "2026-07-13",
  ],
  [
    "boe.tax.collection.regulation",
    "Real Decreto 939/2005, Reglamento General de Recaudación",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2005-14803",
    "2026-07-13",
  ],
  [
    "boe.tax.sanction.regulation",
    "Real Decreto 2063/2004, régimen sancionador tributario",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2004-18398",
    "2026-07-13",
  ],
  [
    "boe.tax.review.regulation",
    "Real Decreto 520/2005, revisión en vía administrativa",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2005-8662",
    "2026-07-13",
  ],
  [
    "boe.irpf.law",
    "Ley 35/2006, del Impuesto sobre la Renta de las Personas Físicas",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764",
    "2026-07-13",
  ],
  [
    "boe.irpf.regulation",
    "Real Decreto 439/2007, Reglamento del IRPF",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820",
    "2026-07-13",
  ],
  [
    "boe.common.administrative_procedure.law",
    "Ley 39/2015, del Procedimiento Administrativo Común",
    "BOE",
    "LEGAL_TEXT",
    "https://www.boe.es/buscar/act.php?id=BOE-A-2015-10565",
    "2026-07-13",
  ],
] as const satisfies readonly (readonly [
  FiscalNotificationOfficialSourceIdV1 | string,
  string,
  "AEAT" | "BOE",
  "PROCEDURE_INFORMATION" | "LEGAL_TEXT",
  string,
  "2026-07-12" | "2026-07-13",
])[];

export type FiscalNotificationOfficialSourceIdV2 =
  (typeof SOURCE_SEEDS_V2)[number][0];

export interface FiscalNotificationOfficialSourceV2 {
  readonly schemaVersion: 2;
  readonly releaseId: typeof FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V2;
  readonly id: FiscalNotificationOfficialSourceIdV2;
  readonly title: string;
  readonly authority: "AEAT" | "BOE";
  readonly authorityLevel: "OFFICIAL_PRIMARY";
  readonly sourceKind: "PROCEDURE_INFORMATION" | "LEGAL_TEXT";
  readonly canonicalUrl: string;
  readonly urlCheckedOn: "2026-07-12" | "2026-07-13";
  readonly verificationStatus: "OFFICIAL_URL_VERIFIED";
  readonly contentSha256: null;
  readonly legalReviewStatus: "LEGAL_REVIEW_PENDING";
  readonly usagePolicy: "CONTEXT_ONLY";
  readonly permitsLegalRuleActivation: false;
  readonly permitsTemplateActivation: false;
  readonly retainedSourceContent: "NONE";
}

export const FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2 = Object.freeze(
  SOURCE_SEEDS_V2.map(
    ([id, title, authority, sourceKind, canonicalUrl, urlCheckedOn]) =>
      Object.freeze({
        schemaVersion: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_SCHEMA_VERSION_V2,
        releaseId: FISCAL_NOTIFICATION_OFFICIAL_SOURCES_RELEASE_ID_V2,
        id,
        title,
        authority,
        authorityLevel: "OFFICIAL_PRIMARY" as const,
        sourceKind,
        canonicalUrl,
        urlCheckedOn,
        verificationStatus: "OFFICIAL_URL_VERIFIED" as const,
        contentSha256: null,
        legalReviewStatus: "LEGAL_REVIEW_PENDING" as const,
        usagePolicy: "CONTEXT_ONLY" as const,
        permitsLegalRuleActivation: false as const,
        permitsTemplateActivation: false as const,
        retainedSourceContent: "NONE" as const,
      }),
  ),
) satisfies readonly FiscalNotificationOfficialSourceV2[];

const sourceById = new Map(
  FISCAL_NOTIFICATION_OFFICIAL_SOURCES_V2.map((source) => [
    source.id,
    source,
  ] as const),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFiscalNotificationOfficialSourceV2(
  id: unknown,
): FiscalNotificationOfficialSourceV2 | null {
  return typeof id === "string" &&
    id.length > 0 &&
    id.length <= 160 &&
    !CONTROL_CHARACTER_PATTERN.test(id)
    ? (sourceById.get(id as FiscalNotificationOfficialSourceIdV2) ?? null)
    : null;
}
