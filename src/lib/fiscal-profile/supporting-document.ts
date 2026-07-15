export const SUPPORTING_DOCUMENT_CATALOG_VERSION =
  "fiscal-supporting-document-catalog.2026-07.v1" as const;

export const SUPPORTING_DOCUMENT_TYPES = [
  "RETA_CURRENT_STATUS_REPORT",
  "WORK_LIFE_REPORT",
  "SELF_EMPLOYED_ACTIVITY_REPORT",
  "INTRACOMMUNITY_OPERATOR_CERTIFICATE",
  "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
] as const;

export type SupportingDocumentType = (typeof SUPPORTING_DOCUMENT_TYPES)[number];

export interface SupportingDocumentStructure {
  documentType: SupportingDocumentType;
  label: string;
  authority: "AEAT" | "SEGURIDAD_SOCIAL";
  officialInformationUrl: string;
  requiredPhrases: readonly string[];
  requiredAnyPhraseGroups?: readonly (readonly string[])[];
  extractableFacts: readonly string[];
}

export const SUPPORTING_DOCUMENT_STRUCTURES = [
  {
    documentType: "RETA_CURRENT_STATUS_REPORT",
    label: "Informe de situación actual del trabajador",
    authority: "SEGURIDAD_SOCIAL",
    officialInformationUrl:
      "https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Informe%2Bde%2Bsituacion%2Blaboral%2Bactual",
    requiredPhrases: ["INFORME DE SITUACION ACTUAL DEL TRABAJADOR"],
    requiredAnyPhraseGroups: [
      ["TESORERIA GENERAL DE LA SEGURIDAD SOCIAL", "SEGURIDAD SOCIAL"],
    ],
    extractableFacts: [
      "currentSocialSecurityStatus",
      "currentRegimes",
      "statusDate",
    ],
  },
  {
    documentType: "WORK_LIFE_REPORT",
    label: "Informe de vida laboral",
    authority: "SEGURIDAD_SOCIAL",
    officialInformationUrl:
      "https://portal.seg-social.gob.es/wps/wcm/connect/importass/IMPORTASS_Contenidos/Categorias/Vida%2Blaboral%2Be%2Binformes/Informes%2Bsobre%2Btu%2Bsituacion%2Blaboral/Informe%2Bde%2Btu%2Bvida%2Blaboral",
    requiredPhrases: ["VIDA LABORAL"],
    requiredAnyPhraseGroups: [
      ["TESORERIA GENERAL DE LA SEGURIDAD SOCIAL", "SEGURIDAD SOCIAL"],
      [
        "FECHA DE ALTA",
        "SITUACIONES",
        "DIAS EN ALTA",
        "DIAS TOTALES DE ALTA",
      ],
    ],
    extractableFacts: [
      "socialSecurityPeriods",
      "retaPeriods",
      "startDates",
      "endDates",
    ],
  },
  {
    documentType: "SELF_EMPLOYED_ACTIVITY_REPORT",
    label: "Informe de actividades de trabajo autónomo",
    authority: "SEGURIDAD_SOCIAL",
    officialInformationUrl:
      "https://portal.seg-social.gob.es/wps/portal/importass/importass/Categorias/Vida%20laboral%20e%20informes/Informes%20sobre%20tu%20situacion%20laboral/Infor_Act_Autonomo",
    requiredPhrases: ["INFORME DE ACTIVIDADES DE TRABAJO AUTONOMO"],
    requiredAnyPhraseGroups: [
      ["TESORERIA GENERAL DE LA SEGURIDAD SOCIAL", "SEGURIDAD SOCIAL"],
      ["ACTIVIDAD PROFESIONAL", "ACTIVIDADES PROFESIONALES"],
    ],
    extractableFacts: [
      "currentSelfEmployedActivities",
      "activityCodes",
      "effectiveDates",
    ],
  },
  {
    documentType: "INTRACOMMUNITY_OPERATOR_CERTIFICATE",
    label: "Certificado de operador intracomunitario",
    authority: "AEAT",
    officialInformationUrl:
      "https://sede.agenciatributaria.gob.es/Sede/certificaciones/censales/certificados-trib_____ificados-tributarios-operadores-intracomunitarios/que-certifica.html",
    requiredPhrases: ["CERTIFICADO TRIBUTARIO"],
    requiredAnyPhraseGroups: [
      [
        "REGISTRO DE OPERADORES INTRACOMUNITARIOS",
        "OPERADORES INTRACOMUNITARIOS",
      ],
    ],
    extractableFacts: ["roiRegistration", "nifVat", "certificateDate"],
  },
  {
    documentType: "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE",
    label: "Certificado de exoneración de retención del arrendador",
    authority: "AEAT",
    officialInformationUrl:
      "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G325.shtml",
    requiredPhrases: ["CERTIFICADO TRIBUTARIO"],
    requiredAnyPhraseGroups: [
      [
        "EXONERACION DE RETENCION",
        "EXONERADO DE RETENCION",
        "EXONERACION DE LA OBLIGACION DE RETENER",
      ],
      ["ARRENDADOR", "ARRENDAMIENTO DE INMUEBLES"],
    ],
    extractableFacts: [
      "landlordWithholdingExemption",
      "iaeRegistration",
      "certificateDate",
    ],
  },
] as const satisfies readonly SupportingDocumentStructure[];

export interface SupportingDocumentCandidate {
  catalogVersion: typeof SUPPORTING_DOCUMENT_CATALOG_VERSION;
  documentType: SupportingDocumentType | "UNKNOWN";
  status: "RESOLVED" | "REVIEW_REQUIRED" | "BLOCKED";
  retaDuringYear?: "YES";
  roiRegistered?: "YES" | "NO";
  landlordWithholdingExemption?: "YES" | "NO";
  warnings: string[];
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function matchesStructure(
  value: string,
  structure: SupportingDocumentStructure,
): boolean {
  const aeatAuthority = value.includes(
    "AGENCIA ESTATAL DE ADMINISTRACION TRIBUTARIA",
  );
  const socialSecurityAuthority =
    value.includes("TESORERIA GENERAL DE LA SEGURIDAD SOCIAL") ||
    value.includes("SEGURIDAD SOCIAL");
  const authorityMatches =
    structure.authority === "AEAT" ? aeatAuthority : socialSecurityAuthority;

  if (
    authorityMatches &&
    structure.documentType === "INTRACOMMUNITY_OPERATOR_CERTIFICATE" &&
    (/(?:CERTIFICADO|CERTIFICACION) DE OPERADOR INTRACOMUNITARIO/.test(
      value,
    ) ||
      (value.includes("SITUACION EN ROI") && value.includes("NIF-IVA")))
  ) {
    return true;
  }
  if (
    authorityMatches &&
    structure.documentType ===
      "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE" &&
    (value.includes("CERTIFICADO DE EXONERACION DE RETENCION DEL ARRENDADOR") ||
      value.includes("CERT-ARREND") ||
      (value.includes("CERTIFICACION DE EXONERACION") &&
        value.includes("ARRENDAMIENTO DE INMUEBLES")))
  ) {
    return true;
  }
  if (
    authorityMatches &&
    structure.documentType === "RETA_CURRENT_STATUS_REPORT" &&
    (value.includes("TGSS-ACTUAL") ||
      (value.includes("SITUACION LABORAL ACTUAL") &&
        value.includes("DATOS DE AFILIACION") &&
        mentionsReta(value)))
  ) {
    return true;
  }
  if (
    authorityMatches &&
    structure.documentType === "SELF_EMPLOYED_ACTIVITY_REPORT" &&
    ((value.includes("INFORME DE ACTIVIDADES DE TRABAJO AUTONOMO") &&
      value.includes("ACTIVIDADES COMUNICADAS")) ||
      value.includes("TGSS-ACT-AUT") ||
      value.includes("ACTIVIDADES COMUNICADAS EN TRABAJO AUTONOMO"))
  ) {
    return true;
  }
  if (!structure.requiredPhrases.every((phrase) => value.includes(phrase))) {
    return false;
  }
  return (structure.requiredAnyPhraseGroups ?? []).every((group) =>
    group.some((phrase) => value.includes(phrase)),
  );
}

function mentionsReta(value: string): boolean {
  return (
    /REGIMEN ESPECIAL.{0,80}(?:CUENTA PROPIA|AUTONOM)/.test(value) ||
    /(?:CUENTA PROPIA|AUTONOM).{0,80}REGIMEN ESPECIAL/.test(value) ||
    value.includes("RETA")
  );
}

function currentRetaIsActive(value: string): boolean {
  return (
    mentionsReta(value) &&
    /(?:SITUACION(?: ACTUAL)?|ESTADO)\s*[:.\-]?\s*(?:DE\s+)?ALTA\b|(?:SITUACION(?:ES)?(?: ACTUAL(?:ES)?)?|ESTADO)\s*[:.\-]?\s*(?:DE\s+)?(?:[^\n]{0,80}\b)?RETA\s+ALTA\b|\bRETA\s+ALTA\b|\bEN SITUACION DE ALTA\b/.test(
      value,
    )
  );
}

function positiveRoiCertificate(value: string): boolean {
  return /(?:SE ENCUENTRA|FIGURA|CONSTA).{0,80}(?:INCLUIDO|INSCRITO|ALTA).{0,100}(?:REGISTRO DE OPERADORES INTRACOMUNITARIOS|ROI)|(?:REGISTRO DE OPERADORES INTRACOMUNITARIOS|SITUACION EN ROI|ROI).{0,100}(?:INCLUIDO|INSCRITO|ALTA)/.test(
    value,
  );
}

function negativeRoiCertificate(value: string): boolean {
  return /(?:REGISTRO DE OPERADORES INTRACOMUNITARIOS|SITUACION EN ROI|ROI).{0,80}(?:NO INSCRITO|NO INCLUIDO|BAJA ACTUAL)/.test(
    value,
  );
}

function positiveLandlordExemption(value: string): boolean {
  return /(?:SE ENCUENTRA|FIGURA|CONSTA|ACREDITA).{0,100}(?:EXONERAD|EXENT).{0,100}(?:RETENCION|RETENER)|(?:EXONERACION DE RETENCION|EXONERACION|EXENTO).{0,100}(?:ACREDITADA|OBLIGACION DE RETENER|RETENCION)/.test(
    value,
  );
}

function negativeLandlordExemption(value: string): boolean {
  return /(?:EXONERACION DE RETENCION|EXONERACION).{0,80}(?:NO ACREDITADA|NO CONSTA|DENEGADA)/.test(
    value,
  );
}

function hasExplicitSelfEmployedActivity(value: string): boolean {
  if (/SIN ACTIVIDADES ACTUALES|ACTIVIDADES COMUNICADAS\s*[:.\-]?\s*0\b/.test(value)) {
    return false;
  }
  return (
    /ACTIVIDADES COMUNICADAS\s*[:.\-]?\s*[1-9]\d*\b/.test(value) ||
    /\b\d{4}\s+[A-Z][A-Z ]{4,}\s+\d{1,2}[/.\-]\d{1,2}[/.\-]20\d{2}\s+ACTIVA\b/.test(
      value,
    )
  );
}

export function parseSupportingDocumentText(
  text: string,
): SupportingDocumentCandidate {
  const value = normalize(text.slice(0, 250_000));
  const structure = SUPPORTING_DOCUMENT_STRUCTURES.find((item) =>
    matchesStructure(value, item),
  );
  if (!structure) {
    return {
      catalogVersion: SUPPORTING_DOCUMENT_CATALOG_VERSION,
      documentType: "UNKNOWN",
      status: "BLOCKED",
      warnings: [
        "El archivo no coincide con ningún informe o certificado del catálogo cerrado.",
      ],
    };
  }

  const facts: Omit<
    SupportingDocumentCandidate,
    "catalogVersion" | "documentType" | "status" | "warnings"
  > = {};
  if (structure.documentType === "WORK_LIFE_REPORT" && mentionsReta(value)) {
    facts.retaDuringYear = "YES";
  }
  if (
    structure.documentType === "RETA_CURRENT_STATUS_REPORT" &&
    currentRetaIsActive(value)
  ) {
    facts.retaDuringYear = "YES";
  }
  if (
    structure.documentType === "SELF_EMPLOYED_ACTIVITY_REPORT" &&
    hasExplicitSelfEmployedActivity(value)
  ) {
    facts.retaDuringYear = "YES";
  }
  if (
    structure.documentType === "INTRACOMMUNITY_OPERATOR_CERTIFICATE" &&
    positiveRoiCertificate(value)
  ) {
    facts.roiRegistered = "YES";
  } else if (
    structure.documentType === "INTRACOMMUNITY_OPERATOR_CERTIFICATE" &&
    negativeRoiCertificate(value)
  ) {
    facts.roiRegistered = "NO";
  }
  if (
    structure.documentType === "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE" &&
    positiveLandlordExemption(value)
  ) {
    facts.landlordWithholdingExemption = "YES";
  } else if (
    structure.documentType ===
      "LANDLORD_WITHHOLDING_EXEMPTION_CERTIFICATE" &&
    negativeLandlordExemption(value)
  ) {
    facts.landlordWithholdingExemption = "NO";
  }
  const hasFact = Object.keys(facts).length > 0;

  return {
    catalogVersion: SUPPORTING_DOCUMENT_CATALOG_VERSION,
    documentType: structure.documentType,
    status: hasFact ? "RESOLVED" : "REVIEW_REQUIRED",
    ...facts,
    warnings: [
      hasFact
        ? "Se ha leído un dato compatible con el cuestionario; revísalo y confírmalo antes de aplicarlo."
        : "Se reconoce el tipo de documento, pero no un dato positivo suficientemente claro para contestar automáticamente.",
    ],
  };
}
