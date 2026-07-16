import {
  AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  type AeatDocumentOfficialSourceIdV1,
} from "../knowledge/aeat-document-knowledge.v1";
import {
  FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3,
  type FiscalNotificationDocumentFamilyIdV3,
} from "../knowledge/document-families.v3";
import { BASE_EXTRACTOR_IDS_V1 } from "./extractor-contract.v1";
import {
  defineFamilyRecognitionRuleV2,
  type FamilyRecognitionRuleV2,
  type FamilyRuleAuthorityV2,
  type FamilyRuleConflictV2,
} from "./family-rule-contract.v2";

const AEAT_COMMON_TERRITORY_AUTHORITY_V2 = Object.freeze({
  authorityId: "AEAT_COMMON_TERRITORY",
  anchors: Object.freeze([
    Object.freeze({
      anchorId: "AEAT_AUTHORITY_LABEL",
      matchMode: "HEADER_TOKEN_SEQUENCE",
      literals: Object.freeze([
        "agencia tributaria",
        "agencia estatal de administración tributaria",
      ]),
    }),
    Object.freeze({
      anchorId: "AEAT_OFFICIAL_HOST",
      matchMode: "HOST_EXACT",
      literals: Object.freeze([
        "sede.agenciatributaria.gob.es",
        "www.agenciatributaria.es",
      ]),
    }),
  ]),
} as const satisfies FamilyRuleAuthorityV2);

const DEHU_GENERAL_STATE_AUTHORITY_V2 = Object.freeze({
  authorityId: "DEHU_GENERAL_STATE",
  anchors: Object.freeze([
    Object.freeze({
      anchorId: "DEHU_AUTHORITY_LABEL",
      matchMode: "HEADER_TOKEN_SEQUENCE",
      literals: Object.freeze([
        "dirección electrónica habilitada única",
        "dehú",
      ]),
    }),
    Object.freeze({
      anchorId: "DEHU_OFFICIAL_HOST",
      matchMode: "HOST_EXACT",
      literals: Object.freeze(["dehu.redsara.es"]),
    }),
  ]),
} as const satisfies FamilyRuleAuthorityV2);

const GOBIERNO_DE_ESPANA_CLAVE_AUTHORITY_V2 = Object.freeze({
  authorityId: "GOBIERNO_DE_ESPANA_CLAVE",
  anchors: Object.freeze([
    Object.freeze({
      anchorId: "CLAVE_AUTHORITY_LABEL",
      matchMode: "HEADER_TOKEN_SEQUENCE",
      literals: Object.freeze(["cl@ve", "gobierno de españa"]),
    }),
    Object.freeze({
      anchorId: "CLAVE_OFFICIAL_HOST",
      matchMode: "HOST_EXACT",
      literals: Object.freeze(["clave.gob.es"]),
    }),
  ]),
} as const satisfies FamilyRuleAuthorityV2);

const COMMON_FAMILY_RULE_CONFLICTS_V2 = Object.freeze([
  Object.freeze({
    conflictId: "CONFLICTING_AUTHORITY_TGSS",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: Object.freeze(["tesorería general de la seguridad social"]),
  }),
  Object.freeze({
    conflictId: "CONFLICTING_TERRITORY_FORAL",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: Object.freeze([
      "hacienda foral",
      "diputación foral",
      "hacienda tributaria de navarra",
    ]),
  }),
  Object.freeze({
    conflictId: "CONFLICTING_TERRITORY_CANARY",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: Object.freeze([
      "agencia tributaria canaria",
      "impuesto general indirecto canario",
      "igic",
    ]),
  }),
  Object.freeze({
    conflictId: "CONFLICTING_TERRITORY_REGIONAL",
    matchMode: "HEADER_TOKEN_SEQUENCE",
    literals: Object.freeze([
      "agencia tributaria de cataluña",
      "agència tributària de catalunya",
      "agencia tributaria de andalucía",
      "agencia tributaria de galicia",
      "axencia tributaria de galicia",
      "agència tributària de les illes balears",
      "agència tributària valenciana",
      "agencia tributaria de la región de murcia",
    ]),
  }),
  Object.freeze({
    conflictId: "CONFLICTING_TERRITORY_CEUTA_MELILLA",
    matchMode: "TOKEN_SEQUENCE",
    literals: Object.freeze(["ipsi"]),
  }),
  Object.freeze({
    conflictId: "CONFLICTING_NON_DOCUMENT_GUIDE",
    matchMode: "HEADER_LINE_PREFIX",
    literals: Object.freeze([
      "manual de usuario",
      "guía",
      "documento de ejemplo",
      "tutorial",
      "instrucciones para",
    ]),
  }),
] as const satisfies readonly FamilyRuleConflictV2[]);

const EMPTY_REQUIRED_ANCHORS_V2 = Object.freeze([]);

export const FISCAL_NOTIFICATION_FAMILY_RULES_V2 = Object.freeze([
  defineFamilyRecognitionRuleV2({
    familyId: "notification.delivery_attempt",
    extractorId: "notification-envelope",
    ruleId: "family-rule.notification.delivery_attempt.v2",
    canonicalTitle: "Intento, reenvío o carátula de notificación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_NOTIFICATION_DELIVERY_ATTEMPT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Intento, reenvío o carátula de notificación",
          "aviso de puesta a disposición",
          "intento de notificación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([
      AEAT_COMMON_TERRITORY_AUTHORITY_V2,
      DEHU_GENERAL_STATE_AUTHORITY_V2,
    ]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_NOTIFICATIONS",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "notification.publication_or_appearance",
    extractorId: "notification-envelope",
    ruleId: "family-rule.notification.publication_or_appearance.v2",
    canonicalTitle: "Publicación o comparecencia para notificación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_NOTIFICATION_PUBLICATION_OR_APPEARANCE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Publicación o comparecencia para notificación",
          "notificación por comparecencia",
          "anuncio de citación",
          "anuncio de notificación",
          "publicación en el tablón edictal único",
          "diligencia de publicación del anuncio de citación para notificación por comparecencia",
          "certificado de publicación en el boletín oficial del estado del anuncio de citación para notificación por comparecencia",
          "comunicación notificación por comparecencia",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([
      AEAT_COMMON_TERRITORY_AUTHORITY_V2,
      DEHU_GENERAL_STATE_AUTHORITY_V2,
    ]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_NOTIFICATIONS",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "notification.dehu_envelope",
    extractorId: "notification-envelope",
    ruleId: "family-rule.notification.dehu_envelope.v2",
    canonicalTitle: "Sobre, acuse o evidencia DEHú/Notific@",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_NOTIFICATION_DEHU_ENVELOPE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Sobre, acuse o evidencia DEHú/Notific@",
          "datos de la notificación",
          "carátula de notificación",
          "notificación electrónica",
          "acuse de recibo",
          "justificante de recepción",
          "certificación de notificación",
          "evidencia de entrega",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([
      AEAT_COMMON_TERRITORY_AUTHORITY_V2,
      DEHU_GENERAL_STATE_AUTHORITY_V2,
    ]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_NOTIFICATIONS",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "information.tax_data_report",
    extractorId: "informative-communication",
    ruleId: "family-rule.information.tax_data_report.v2",
    canonicalTitle: "Datos fiscales",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INFORMATION_TAX_DATA_REPORT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Datos fiscales",
          "Dades fiscals",
          "consulta de datos fiscales",
          "información fiscal para la declaración de la renta",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_RENTA",
      "IRPF_LAW",
      "IRPF_REG",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "information.regulatory_change",
    extractorId: "informative-communication",
    ruleId: "family-rule.information.regulatory_change.v2",
    canonicalTitle: "Comunicación informativa de cambio normativo o de canal",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INFORMATION_REGULATORY_CHANGE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Comunicación informativa de cambio normativo o de canal",
          "comunicación sobre cambios normativos tributarios",
          "aviso de cambio en el canal de notificación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "LPAC"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "information.model_filing_reminder",
    extractorId: "informative-communication",
    ruleId: "family-rule.information.model_filing_reminder.v2",
    canonicalTitle: "Recordatorio de obligación de presentar un modelo",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INFORMATION_MODEL_FILING_REMINDER",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Recordatorio de obligación de presentar un modelo",
          "recordatorio de presentación de declaración o autoliquidación",
          "aviso de próxima obligación de presentación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_RENTA", "LGT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "identity.clave_registration_receipt",
    extractorId: "identity-and-certificate",
    ruleId: "family-rule.identity.clave_registration_receipt.v2",
    canonicalTitle: "Justificante de alta en Cl@ve",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_IDENTITY_CLAVE_REGISTRATION_RECEIPT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Justificante de alta en Cl@ve",
          "justificante de registro en Cl@ve",
          "documento de alta en Cl@ve",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([GOBIERNO_DE_ESPANA_CLAVE_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "CLAVE_REGISTRATION", "LPAC"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "certificate.tax_compliance",
    extractorId: "identity-and-certificate",
    ruleId: "family-rule.certificate.tax_compliance.v2",
    canonicalTitle: "Certificado de estar al corriente",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_CERTIFICATE_TAX_COMPLIANCE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Certificado de estar al corriente",
          "certificado tributario de estar al corriente de las obligaciones tributarias",
          "certificado positivo de estar al corriente",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_CERTIFICATE_COMPLIANCE",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.tax_registration_resolution",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.tax_registration_resolution.v2",
    canonicalTitle: "Resolución censal o registral",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_TAX_REGISTRATION_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Resolución censal o registral",
          "acuerdo de alta en el registro de operadores intracomunitarios",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_CENSUS_RECTIFICATION",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "compliance.informal_missing_return_notice",
    extractorId: "requirement",
    ruleId: "family-rule.compliance.informal_missing_return_notice.v2",
    canonicalTitle: "Carta de aviso por declaraciones no registradas",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COMPLIANCE_INFORMAL_MISSING_RETURN_NOTICE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Carta de aviso por declaraciones no registradas",
          "carta de aviso",
          "carta informativa de declaraciones o autoliquidaciones no presentadas",
          "aviso de declaraciones no presentadas",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OMITTED_RETURNS",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "compliance.formal_filing_requirement",
    extractorId: "requirement",
    ruleId: "family-rule.compliance.formal_filing_requirement.v2",
    canonicalTitle: "Requerimiento formal de presentación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COMPLIANCE_FORMAL_FILING_REQUIREMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Requerimiento formal de presentación",
          "requerimiento de presentación de declaraciones o autoliquidaciones",
          "requerimiento por declaraciones o autoliquidaciones no presentadas",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OMITTED_RETURNS",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "compliance.document_request",
    extractorId: "requirement",
    ruleId: "family-rule.compliance.document_request.v2",
    canonicalTitle: "Requerimiento de documentación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COMPLIANCE_DOCUMENT_REQUEST",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Requerimiento de documentación",
          "requerimiento para aportar documentación",
          "requerimiento de aportación de documentación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_INFORMATION_REQUEST",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "compliance.individual_information_requirement",
    extractorId: "requirement",
    ruleId: "family-rule.compliance.individual_information_requirement.v2",
    canonicalTitle:
      "Requerimiento individual de información con trascendencia tributaria",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COMPLIANCE_INDIVIDUAL_INFORMATION_REQUIREMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Requerimiento individual de información con trascendencia tributaria",
          "requerimiento de información con trascendencia tributaria",
          "requerimiento individualizado de información tributaria",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_INFORMATION_REQUEST",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "assessment.procedure_start",
    extractorId: "assessment",
    ruleId: "family-rule.assessment.procedure_start.v2",
    canonicalTitle: "Inicio de verificación, comprobación o regularización",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_ASSESSMENT_PROCEDURE_START",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Inicio de verificación, comprobación o regularización",
          "comunicación de inicio de procedimiento de comprobación limitada",
          "comunicación de inicio de procedimiento de verificación de datos",
          "inicio de procedimiento de regularización",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_IRPF_CHECK",
      "AEAT_VAT_CHECK",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "assessment.allegations_and_proposal",
    extractorId: "assessment",
    ruleId: "family-rule.assessment.allegations_and_proposal.v2",
    canonicalTitle: "Trámite de alegaciones y propuesta de liquidación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_ASSESSMENT_ALLEGATIONS_AND_PROPOSAL",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Trámite de alegaciones y propuesta de liquidación",
          "notificación del trámite de alegaciones y propuesta de liquidación provisional",
          "propuesta de liquidación provisional",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_IRPF_CHECK",
      "AEAT_VAT_CHECK",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "assessment.final_provisional_assessment",
    extractorId: "assessment",
    ruleId: "family-rule.assessment.final_provisional_assessment.v2",
    canonicalTitle: "Resolución con liquidación provisional",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_ASSESSMENT_FINAL_PROVISIONAL_ASSESSMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Resolución con liquidación provisional",
          "notificación de resolución con liquidación provisional",
          "resolución con liquidación provisional",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_IRPF_CHECK",
      "AEAT_VAT_CHECK",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "assessment.no_adjustment_resolution",
    extractorId: "assessment",
    ruleId: "family-rule.assessment.no_adjustment_resolution.v2",
    canonicalTitle: "Terminación sin regularización o sin liquidación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_ASSESSMENT_NO_ADJUSTMENT_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Terminación sin regularización o sin liquidación",
          "resolución de terminación sin regularización",
          "acuerdo de terminación sin liquidación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_IRPF_CHECK",
      "AEAT_VAT_CHECK",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "assessment.value_check",
    extractorId: "assessment",
    ruleId: "family-rule.assessment.value_check.v2",
    canonicalTitle: "Comprobación administrativa de valores",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_ASSESSMENT_VALUE_CHECK",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Comprobación administrativa de valores",
          "propuesta de valoración administrativa",
          "acuerdo de comprobación de valores",
          "notificación de comprobación de valores",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_VALUE_CHECK",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "sanction.initiation_and_hearing",
    extractorId: "penalty",
    ruleId: "family-rule.sanction.initiation_and_hearing.v2",
    canonicalTitle: "Inicio de expediente sancionador y audiencia",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SANCTION_INITIATION_AND_HEARING",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Inicio de expediente sancionador y audiencia",
          "acuerdo de inicio del procedimiento sancionador",
          "notificación de inicio de expediente sancionador",
          "propuesta de imposición de sanción",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SANCTION",
      "LGT",
      "SANCTION_REG",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "sanction.resolution",
    extractorId: "penalty",
    ruleId: "family-rule.sanction.resolution.v2",
    canonicalTitle: "Resolución sancionadora",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SANCTION_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Resolución sancionadora",
          "acuerdo de imposición de sanción",
          "resolución del procedimiento sancionador",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SANCTION",
      "LGT",
      "SANCTION_REG",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "sanction.loss_of_reduction",
    extractorId: "penalty",
    ruleId: "family-rule.sanction.loss_of_reduction.v2",
    canonicalTitle: "Exigencia de reducción de sanción perdida",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SANCTION_LOSS_OF_REDUCTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Exigencia de reducción de sanción perdida",
          "acuerdo de exigencia de reducción practicada",
          "liquidación por pérdida de reducción de sanción",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SANCTION",
      "LGT",
      "SANCTION_REG",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_request_receipt",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_request_receipt.v2",
    canonicalTitle:
      "Solicitud o justificante de aplazamiento o fraccionamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_REQUEST_RECEIPT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Solicitud o justificante de aplazamiento o fraccionamiento",
          "justificante de solicitud de aplazamiento o fraccionamiento",
          "solicitud de aplazamiento o fraccionamiento de pago",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_DEFERRAL", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_substantiation_requirement",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_substantiation_requirement.v2",
    canonicalTitle: "Requerimiento de subsanación o garantía de aplazamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_SUBSTANTIATION_REQUIREMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Requerimiento de subsanación o garantía de aplazamiento",
          "requerimiento de subsanación de solicitud de aplazamiento",
          "requerimiento de aportación de garantía para aplazamiento",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_DEFERRAL", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_grant",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_grant.v2",
    canonicalTitle: "Concesión de aplazamiento o fraccionamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_GRANT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Concesión de aplazamiento o fraccionamiento",
          "concesión de aplazamiento o fraccionamiento",
          "concesión de aplazamiento fraccionamiento",
          "concesión del aplazamiento o fraccionamiento",
          "concesión del aplazamiento fraccionamiento",
          "acuerdo de concesión de aplazamiento",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_DEFERRAL", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_modification",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_modification.v2",
    canonicalTitle: "Modificación de aplazamiento o fraccionamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_MODIFICATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Modificación de aplazamiento o fraccionamiento",
          "acuerdo de modificación del aplazamiento o fraccionamiento",
          "resolución de modificación del calendario de pagos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_DEFERRAL", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_denial",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_denial.v2",
    canonicalTitle: "Denegación de aplazamiento o fraccionamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_DENIAL",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Denegación de aplazamiento o fraccionamiento",
          "denegación del aplazamiento/fraccionamiento de pago",
          "denegación del aplazamiento o fraccionamiento de pago",
          "denegación de aplazamiento/fraccionamiento de pago",
          "denegación de aplazamiento o fraccionamiento de pago",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_DEFERRAL",
      "LGT",
      "RGR",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_inadmissibility_or_archival",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_inadmissibility_or_archival.v2",
    canonicalTitle: "Inadmisión, desistimiento o archivo de aplazamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId:
          "FAMILY_TITLE_COLLECTION_DEFERRAL_INADMISSIBILITY_OR_ARCHIVAL",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Inadmisión, desistimiento o archivo de aplazamiento",
          "acuerdo de inadmisión de solicitud de aplazamiento",
          "acuerdo de archivo de solicitud de aplazamiento",
          "resolución de desistimiento del aplazamiento",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_DEFERRAL",
      "LGT",
      "RGR",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.deferral_breach",
    extractorId: "deferral",
    ruleId: "family-rule.collection.deferral_breach.v2",
    canonicalTitle: "Incumplimiento de aplazamiento o fraccionamiento",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_DEFERRAL_BREACH",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Incumplimiento de aplazamiento o fraccionamiento",
          "comunicación de incumplimiento de aplazamiento",
          "acuerdo de vencimiento anticipado del fraccionamiento",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_DEFERRAL",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.interest_assessment",
    extractorId: "payment-order",
    ruleId: "family-rule.collection.interest_assessment.v2",
    canonicalTitle: "Liquidación independiente de intereses de demora",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_INTEREST_ASSESSMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Liquidación independiente de intereses de demora",
          "liquidación de intereses de demora",
          "acuerdo de liquidación de intereses de demora",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_INTEREST_ASSESSMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.enforcement_order",
    extractorId: "payment-order",
    ruleId: "family-rule.collection.enforcement_order.v2",
    canonicalTitle: "Providencia de apremio",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_ENFORCEMENT_ORDER",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Providencia de apremio",
          "notificación de providencia de apremio",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_ENFORCEMENT", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.precautionary_measure",
    extractorId: "seizure",
    ruleId: "family-rule.collection.precautionary_measure.v2",
    canonicalTitle: "Medida cautelar de recaudación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_PRECAUTIONARY_MEASURE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Medida cautelar de recaudación",
          "acuerdo de adopción de medida cautelar",
          "diligencia de medida cautelar de recaudación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_PRECAUTIONARY",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.asset_sale",
    extractorId: "seizure",
    ruleId: "family-rule.collection.asset_sale.v2",
    canonicalTitle: "Enajenación o subasta de bienes",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_ASSET_SALE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Enajenación o subasta de bienes",
          "acuerdo de enajenación de bienes embargados",
          "anuncio de subasta de bienes embargados",
          "providencia de subasta",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_AUCTION", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.late_filing_surcharge",
    extractorId: "payment-order",
    ruleId: "family-rule.collection.late_filing_surcharge.v2",
    canonicalTitle: "Liquidación de recargo por presentación fuera de plazo",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_LATE_FILING_SURCHARGE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Liquidación de recargo por presentación fuera de plazo",
          "liquidación de recargo por declaración extemporánea sin requerimiento previo",
          "acuerdo de imposición de recargo por presentación fuera de plazo",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_LATE_SURCHARGE",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.external_debt",
    extractorId: "payment-order",
    ruleId: "family-rule.collection.external_debt.v2",
    canonicalTitle: "Deuda de otro organismo recaudada por la AEAT",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_EXTERNAL_DEBT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Deuda de otro organismo recaudada por la AEAT",
          "providencia de apremio de deuda de otro organismo",
          "notificación de deuda externa recaudada por la agencia tributaria",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_EXTERNAL_DEBT",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.offset_requested",
    extractorId: "compensation",
    ruleId: "family-rule.collection.offset_requested.v2",
    canonicalTitle: "Compensación a instancia del obligado",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_OFFSET_REQUESTED",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Compensación a instancia del obligado",
          "acuerdo de compensación a instancia del obligado al pago",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OFFSET_REQUESTED",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.offset_ex_officio",
    extractorId: "compensation",
    ruleId: "family-rule.collection.offset_ex_officio.v2",
    canonicalTitle: "Compensación de oficio",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_OFFSET_EX_OFFICIO",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Compensación de oficio",
          "acuerdo de compensación de oficio",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OFFSET_EX_OFFICIO",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.offset_resolution",
    extractorId: "compensation",
    ruleId: "family-rule.collection.offset_resolution.v2",
    canonicalTitle: "Resolución total, parcial o denegatoria de compensación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_OFFSET_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Resolución total, parcial o denegatoria de compensación",
          "acuerdo de resolución de compensación",
          "resolución de solicitud de compensación",
          "acuerdo de compensación parcial",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OFFSET_REQUESTED",
      "LGT",
      "RGR",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "collection.extinction_or_balance_notice",
    extractorId: "compensation",
    ruleId: "family-rule.collection.extinction_or_balance_notice.v2",
    canonicalTitle: "Comunicación de extinción, aplicación o saldo pendiente",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_COLLECTION_EXTINCTION_OR_BALANCE_NOTICE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Comunicación de extinción, aplicación o saldo pendiente",
          "comunicación de deuda extinguida",
          "comunicación de aplicación y saldo pendiente",
          "acuerdo de extinción de deuda",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_OFFSET_REQUESTED",
      "AEAT_OFFSET_EX_OFFICIO",
      "AEAT_PAYMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "refund.request_or_recognition",
    extractorId: "refund",
    ruleId: "family-rule.refund.request_or_recognition.v2",
    canonicalTitle: "Solicitud, propuesta o reconocimiento de devolución",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REFUND_REQUEST_OR_RECOGNITION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Solicitud, propuesta o reconocimiento de devolución",
          "acuerdo de reconocimiento de devolución",
          "propuesta de devolución",
          "solicitud de devolución de ingresos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_REFUND_TAX",
      "AEAT_REFUND_UNDUE",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "refund.payment_communication",
    extractorId: "refund",
    ruleId: "family-rule.refund.payment_communication.v2",
    canonicalTitle: "Comunicación de pago de devolución",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REFUND_PAYMENT_COMMUNICATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Comunicación de pago de devolución",
          "orden de pago de devolución",
          "comunicación de transferencia de devolución",
          "justificante de pago de devolución",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_REFUND_TAX",
      "AEAT_PAYMENT",
      "LGT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "refund.undue_payment",
    extractorId: "refund",
    ruleId: "family-rule.refund.undue_payment.v2",
    canonicalTitle: "Devolución de ingresos indebidos",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REFUND_UNDUE_PAYMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Devolución de ingresos indebidos",
          "resolución de devolución de ingresos indebidos",
          "acuerdo de devolución de ingreso indebido",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_REFUND_UNDUE",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "refund.withholding_or_offset",
    extractorId: "refund",
    ruleId: "family-rule.refund.withholding_or_offset.v2",
    canonicalTitle: "Retención, compensación o aplicación de una devolución",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REFUND_WITHHOLDING_OR_OFFSET",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Retención, compensación o aplicación de una devolución",
          "acuerdo de retención de devolución",
          "comunicación de compensación de devolución",
          "acuerdo de aplicación de devolución a deuda",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_REFUND_TAX",
      "AEAT_OFFSET_EX_OFFICIO",
      "AEAT_SEIZURE_TYPES",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "irpf.spouse_refund_suspension",
    extractorId: "refund",
    ruleId: "family-rule.irpf.spouse_refund_suspension.v2",
    canonicalTitle: "Suspensión de deuda IRPF mediante devolución del cónyuge",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_IRPF_SPOUSE_REFUND_SUSPENSION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Suspensión de deuda IRPF mediante devolución del cónyuge",
          "notificación del acuerdo de suspensión del ingreso (compensación entre cónyuges)",
          "notificació de l'acord de suspensió de l'ingrés (compensació entre cònjuges)",
          "acuerdo de suspensión por devolución del cónyuge",
          "solicitud de suspensión de deuda del IRPF con devolución del cónyuge",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SPOUSE_SUSPENSION",
      "IRPF_LAW",
      "IRPF_REG",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.guarantee_cost_reimbursement",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.guarantee_cost_reimbursement.v2",
    canonicalTitle: "Reembolso del coste de garantías",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_GUARANTEE_COST_REIMBURSEMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Reembolso del coste de garantías",
          "resolución de reembolso del coste de garantías",
          "acuerdo de devolución del coste de aval",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_GUARANTEE_COST",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "payment.payment_form",
    extractorId: "payment-order",
    ruleId: "family-rule.payment.payment_form.v2",
    canonicalTitle: "Carta o documento de pago",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_PAYMENT_PAYMENT_FORM",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Carta o documento de pago",
          "carta de pago",
          "documento de ingreso",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_PAYMENT",
      "AEAT_NRC",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "payment.receipt",
    extractorId: "payment-evidence",
    ruleId: "family-rule.payment.receipt.v2",
    canonicalTitle: "Justificante o recibo de pago",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_PAYMENT_RECEIPT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Justificante o recibo de pago",
          "justificante de pago",
          "justificante del pago",
          "justificante del ingreso",
          "justificante de ingreso",
          "recibo de pago",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_PAYMENT",
      "AEAT_NRC",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "payment.failed_or_reversed",
    extractorId: "payment-evidence",
    ruleId: "family-rule.payment.failed_or_reversed.v2",
    canonicalTitle: "Pago fallido, rechazado, anulado o devuelto",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_PAYMENT_FAILED_OR_REVERSED",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Pago fallido, rechazado, anulado o devuelto",
          "resultado del pago",
        ]),
      }),
    ]),
    requiredAnchors: Object.freeze([
      Object.freeze({
        anchorId: "PAYMENT_FAILURE_STATE",
        matchMode: "TOKEN_SEQUENCE",
        literals: Object.freeze([
          "pago rechazado",
          "operación rechazada",
          "pago anulado",
          "pago devuelto",
        ]),
      }),
    ]),
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_PAYMENT", "AEAT_NRC"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.bank_account",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.bank_account.v2",
    canonicalTitle: "Embargo de cuenta o depósito",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_BANK_ACCOUNT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de cuenta o depósito",
          "diligencia de embargo de cuentas bancarias",
          "diligencia de embargo de cuentas en entidades de crédito",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.movable_asset",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.movable_asset.v2",
    canonicalTitle: "Embargo de bien mueble",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_MOVABLE_ASSET",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de bien mueble",
          "diligencia de embargo de bienes muebles",
          "diligencia de embargo de vehículos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.real_estate",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.real_estate.v2",
    canonicalTitle: "Embargo de inmueble",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_REAL_ESTATE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de inmueble",
          "diligencia de embargo de bienes inmuebles",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.commercial_credits",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.commercial_credits.v2",
    canonicalTitle: "Embargo de créditos comerciales o arrendaticios",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_COMMERCIAL_CREDITS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de créditos comerciales o arrendaticios",
          "diligencia de embargo de créditos comerciales o arrendaticios",
          "diligencia de embargo de créditos comerciales",
          "diligencia de embargo de créditos arrendaticios",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
      "AEAT_INFORMATION_REQUEST",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.compliance_reiteration",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.compliance_reiteration.v2",
    canonicalTitle: "Reiteración de obligaciones de embargo de créditos",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_COMPLIANCE_REITERATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Reiteración de obligaciones de embargo de créditos",
          "requerimiento de cumplimiento de diligencia de embargo de créditos",
          "reiteración de diligencia de embargo de créditos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.release",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.release.v2",
    canonicalTitle: "Levantamiento de embargo",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_RELEASE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Levantamiento de embargo",
          "levantamiento de diligencia de embargo",
          "orden de levantamiento de embargo",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.wages_or_pensions",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.wages_or_pensions.v2",
    canonicalTitle: "Embargo de sueldos, salarios o pensiones",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_WAGES_OR_PENSIONS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de sueldos, salarios o pensiones",
          "diligencia de embargo de sueldos, salarios o pensiones",
          "diligencia de embargo de sueldos salarios o pensiones",
          "diligencia de embargo de sueldos y salarios",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.securities_or_financial_assets",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.securities_or_financial_assets.v2",
    canonicalTitle: "Embargo de valores u otros activos financieros",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_SECURITIES_OR_FINANCIAL_ASSETS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de valores u otros activos financieros",
          "diligencia de embargo de valores",
          "diligencia de embargo de activos financieros",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.cash_or_refund",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.cash_or_refund.v2",
    canonicalTitle:
      "Embargo de efectivo, devolución o crédito frente a la Administración",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_CASH_OR_REFUND",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de efectivo, devolución o crédito frente a la Administración",
          "diligencia de embargo de dinero efectivo devoluciones o créditos frente a la administración",
          "diligencia de embargo de devoluciones tributarias",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
      "AEAT_REFUND_TAX",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.tpv_receipts",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.tpv_receipts.v2",
    canonicalTitle: "Embargo de cobros mediante terminal de punto de venta",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_TPV_RECEIPTS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de cobros mediante terminal de punto de venta",
          "diligencia de embargo de cobros mediante terminal de punto de venta",
          "diligencia de embargo de tpv",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.business_income_or_rents",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.business_income_or_rents.v2",
    canonicalTitle: "Embargo de ingresos de actividad o rentas",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_BUSINESS_INCOME_OR_RENTS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Embargo de ingresos de actividad o rentas",
          "diligencia de embargo de ingresos de actividad",
          "diligencia de embargo de rentas y frutos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.third_party_response",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.third_party_response.v2",
    canonicalTitle: "Contestación de tercero a una diligencia de embargo",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_THIRD_PARTY_RESPONSE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Contestación de tercero a una diligencia de embargo",
          "justificante de contestación a diligencia de embargo",
          "contestación a diligencia de embargo",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "seizure.third_party_payment",
    extractorId: "seizure",
    ruleId: "family-rule.seizure.third_party_payment.v2",
    canonicalTitle: "Ingreso efectuado por receptor o tercero retenedor",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_SEIZURE_THIRD_PARTY_PAYMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Ingreso efectuado por receptor o tercero retenedor",
          "justificante de ingreso de diligencia de embargo",
          "ingreso efectuado por tercero retenedor",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SEIZURE_TYPES",
      "AEAT_SEIZURE_RESOURCES",
      "AEAT_ENFORCEMENT",
      "LGT",
      "RGR",
      "AEAT_PAYMENT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.recurso_reposicion",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.recurso_reposicion.v2",
    canonicalTitle: "Recurso de reposición",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_RECURSO_REPOSICION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Recurso de reposición",
          "escrito de interposición de recurso de reposición",
          "justificante de presentación de recurso de reposición",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_RECONSIDERATION",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.economic_administrative_claim",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.economic_administrative_claim.v2",
    canonicalTitle: "Reclamación económico-administrativa",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_ECONOMIC_ADMINISTRATIVE_CLAIM",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Reclamación económico-administrativa",
          "escrito de reclamación económico-administrativa",
          "justificante de interposición de reclamación económico-administrativa",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_ECON_ADMIN",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.suspension_request",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.suspension_request.v2",
    canonicalTitle: "Solicitud o justificante de suspensión",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_SUSPENSION_REQUEST",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Solicitud o justificante de suspensión",
          "solicitud de suspensión de la ejecución del acto",
          "justificante de solicitud de suspensión",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SUSPENSION",
      "LGT",
      "RGR",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.suspension_decision",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.suspension_decision.v2",
    canonicalTitle: "Acuerdo sobre la suspensión solicitada",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_SUSPENSION_DECISION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo sobre la suspensión solicitada",
          "acuerdo de concesión de suspensión",
          "acuerdo de denegación de suspensión",
          "resolución sobre solicitud de suspensión",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SUSPENSION",
      "LGT",
      "RGR",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.resolution",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.resolution.v2",
    canonicalTitle: "Resolución de recurso o reclamación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Resolución de recurso o reclamación",
          "resolución del recurso de reposición",
          "resolución de reclamación económico-administrativa",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_RECONSIDERATION",
      "AEAT_ECON_ADMIN",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.material_error",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.material_error.v2",
    canonicalTitle: "Rectificación de error material, de hecho o aritmético",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_MATERIAL_ERROR",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Rectificación de error material, de hecho o aritmético",
          "acuerdo de rectificación de error material",
          "resolución de rectificación de error aritmético",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_MATERIAL_ERROR",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.revocation",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.revocation.v2",
    canonicalTitle: "Procedimiento especial de revocación",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_REVOCATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Procedimiento especial de revocación",
          "acuerdo de inicio de procedimiento de revocación",
          "resolución del procedimiento de revocación",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SPECIAL_REVIEW",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.nullity",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.nullity.v2",
    canonicalTitle: "Revisión de acto nulo de pleno derecho",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_NULLITY",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Revisión de acto nulo de pleno derecho",
          "acuerdo de revisión de acto nulo de pleno derecho",
          "resolución de nulidad de pleno derecho",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SPECIAL_REVIEW",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.lesivity",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.lesivity.v2",
    canonicalTitle: "Declaración de lesividad de acto anulable",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_LESIVITY",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Declaración de lesividad de acto anulable",
          "acuerdo de declaración de lesividad",
          "resolución de declaración de lesividad",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_SPECIAL_REVIEW",
      "LGT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "review.third_party_claim",
    extractorId: "appeal-and-review",
    ruleId: "family-rule.review.third_party_claim.v2",
    canonicalTitle: "Tercería de dominio o de mejor derecho",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REVIEW_THIRD_PARTY_CLAIM",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Tercería de dominio o de mejor derecho",
          "escrito de tercería de dominio",
          "escrito de tercería de mejor derecho",
          "resolución de tercería",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_THIRD_PARTY_CLAIM",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "liability.proposal",
    extractorId: "liability",
    ruleId: "family-rule.liability.proposal.v2",
    canonicalTitle: "Propuesta y audiencia de declaración de responsabilidad",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_LIABILITY_PROPOSAL",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Propuesta y audiencia de declaración de responsabilidad",
          "propuesta de declaración de responsabilidad tributaria",
          "acuerdo de inicio y trámite de audiencia de responsabilidad",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_LIABILITY_SOLIDARY",
      "AEAT_LIABILITY_SUBSIDIARY",
      "AEAT_SUCCESSORS",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "liability.final_resolution",
    extractorId: "liability",
    ruleId: "family-rule.liability.final_resolution.v2",
    canonicalTitle: "Acuerdo final de declaración de responsabilidad",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_LIABILITY_FINAL_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo final de declaración de responsabilidad",
          "acuerdo de declaración de responsabilidad tributaria",
          "resolución de declaración de responsabilidad",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_LIABILITY_SOLIDARY",
      "AEAT_LIABILITY_SUBSIDIARY",
      "AEAT_SUCCESSORS",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "liability.solidary",
    extractorId: "liability",
    ruleId: "family-rule.liability.solidary.v2",
    canonicalTitle: "Declaración de responsabilidad solidaria",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_LIABILITY_SOLIDARY",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Declaración de responsabilidad solidaria",
          "acuerdo de declaración de responsabilidad solidaria",
          "derivación de responsabilidad solidaria",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_LIABILITY_SOLIDARY",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "liability.subsidiary",
    extractorId: "liability",
    ruleId: "family-rule.liability.subsidiary.v2",
    canonicalTitle: "Declaración de responsabilidad subsidiaria",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_LIABILITY_SUBSIDIARY",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Declaración de responsabilidad subsidiaria",
          "acuerdo de declaración de responsabilidad subsidiaria",
          "derivación de responsabilidad subsidiaria",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_LIABILITY_SUBSIDIARY",
      "LGT",
      "RGR",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "liability.successors",
    extractorId: "liability",
    ruleId: "family-rule.liability.successors.v2",
    canonicalTitle: "Recaudación frente a sucesores",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_LIABILITY_SUCCESSORS",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Recaudación frente a sucesores",
          "acuerdo de recaudación frente a sucesores",
          "requerimiento de pago a sucesores",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_SUCCESSORS", "LGT", "RGR"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.procedure",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.procedure.v2",
    canonicalTitle: "Procedimiento inspector",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_PROCEDURE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Procedimiento inspector",
          "comunicación de inicio de actuaciones inspectoras",
          "inicio de procedimiento inspector",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.communication",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.communication.v2",
    canonicalTitle: "Comunicación de inicio, alcance o ampliación inspectora",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_COMMUNICATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Comunicación de inicio, alcance o ampliación inspectora",
          "comunicación de inicio de actuaciones de comprobación e investigación",
          "comunicación de ampliación del alcance de las actuaciones inspectoras",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.diligence",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.diligence.v2",
    canonicalTitle: "Diligencia de actuaciones inspectoras",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_DILIGENCE",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Diligencia de actuaciones inspectoras",
          "diligencia de la inspección de los tributos",
          "diligencia de constancia de hechos",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.act_agreement",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.act_agreement.v2",
    canonicalTitle: "Acta con acuerdo",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_ACT_AGREEMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acta con acuerdo",
          "acta con acuerdo de la inspección de los tributos",
          "acta con acuerdo",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.act_conformity",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.act_conformity.v2",
    canonicalTitle: "Acta de conformidad",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_ACT_CONFORMITY",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acta de conformidad",
          "acta de conformidad",
          "acta de inspección en conformidad",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.act_disagreement",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.act_disagreement.v2",
    canonicalTitle: "Acta de disconformidad",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_ACT_DISAGREEMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acta de disconformidad",
          "acta de disconformidad",
          "acta de inspección en disconformidad",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze(["DOC_PRIMARY", "AEAT_INSPECTION", "LGT", "RGAT"]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "inspection.assessment",
    extractorId: "inspection",
    ruleId: "family-rule.inspection.assessment.v2",
    canonicalTitle: "Acuerdo o liquidación derivada de inspección",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_INSPECTION_ASSESSMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo o liquidación derivada de inspección",
          "acuerdo de liquidación derivado de actuaciones inspectoras",
          "liquidación resultante de acta de inspección",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_INSPECTION",
      "LGT",
      "RGAT",
      "RGREV",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.census_requirement",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.census_requirement.v2",
    canonicalTitle: "Requerimiento de comprobación o rectificación censal",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_CENSUS_REQUIREMENT",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Requerimiento de comprobación o rectificación censal",
          "requerimiento de rectificación censal",
          "requerimiento de comprobación censal",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_CENSUS_RECTIFICATION",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.census_proposal",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.census_proposal.v2",
    canonicalTitle: "Propuesta de rectificación censal y alegaciones",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_CENSUS_PROPOSAL",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Propuesta de rectificación censal y alegaciones",
          "propuesta de rectificación de oficio de la situación censal",
          "trámite de alegaciones a propuesta censal",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_CENSUS_RECTIFICATION",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.tax_domicile_resolution",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.tax_domicile_resolution.v2",
    canonicalTitle: "Acuerdo o resolución sobre domicilio fiscal",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_TAX_DOMICILE_RESOLUTION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo o resolución sobre domicilio fiscal",
          "acuerdo de rectificación del domicilio fiscal",
          "resolución del procedimiento de comprobación del domicilio fiscal",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_TAX_DOMICILE",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.nif_revocation",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.nif_revocation.v2",
    canonicalTitle: "Acuerdo de revocación del NIF",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_NIF_REVOCATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo de revocación del NIF",
          "acuerdo de revocación de número de identificación fiscal",
          "notificación de revocación del NIF",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_NIF_REVOCATION",
      "LGT",
      "RGAT",
    ]),
  }),
  defineFamilyRecognitionRuleV2({
    familyId: "registry.nif_rehabilitation",
    extractorId: "census-resolution",
    ruleId: "family-rule.registry.nif_rehabilitation.v2",
    canonicalTitle: "Acuerdo de rehabilitación del NIF",
    titleAnchors: Object.freeze([
      Object.freeze({
        anchorId: "FAMILY_TITLE_REGISTRY_NIF_REHABILITATION",
        matchMode: "LINE_PREFIX",
        literals: Object.freeze([
          "Acuerdo de rehabilitación del NIF",
          "acuerdo de rehabilitación de número de identificación fiscal",
          "resolución de rehabilitación del NIF",
        ]),
      }),
    ]),
    requiredAnchors: EMPTY_REQUIRED_ANCHORS_V2,
    allowedAuthorities: Object.freeze([AEAT_COMMON_TERRITORY_AUTHORITY_V2]),
    conflicts: COMMON_FAMILY_RULE_CONFLICTS_V2,
    sourceIds: Object.freeze([
      "DOC_PRIMARY",
      "AEAT_NIF_REHABILITATION",
      "LGT",
      "RGAT",
    ]),
  }),
] satisfies readonly FamilyRecognitionRuleV2[]);

function assertFamilyRuleRegistryIntegrityV2(): void {
  if (FISCAL_NOTIFICATION_FAMILY_RULES_V2.length !== 87) {
    throw new Error("INVALID_FAMILY_RULE_REGISTRY_V2:count");
  }
  const familyIds = new Set<FiscalNotificationDocumentFamilyIdV3>();
  const ruleIds = new Set<string>();
  const extractorIds = new Set<string>();
  const validSourceIds = new Set<AeatDocumentOfficialSourceIdV1>(
    AEAT_DOCUMENT_OFFICIAL_SOURCE_IDS_V1,
  );
  for (const rule of FISCAL_NOTIFICATION_FAMILY_RULES_V2) {
    if (familyIds.has(rule.familyId)) {
      throw new Error("INVALID_FAMILY_RULE_REGISTRY_V2:duplicate-family");
    }
    if (ruleIds.has(rule.ruleId)) {
      throw new Error("INVALID_FAMILY_RULE_REGISTRY_V2:duplicate-rule");
    }
    if (!rule.sourceIds.every((sourceId) => validSourceIds.has(sourceId))) {
      throw new Error("INVALID_FAMILY_RULE_REGISTRY_V2:source");
    }
    familyIds.add(rule.familyId);
    ruleIds.add(rule.ruleId);
    extractorIds.add(rule.extractorId);
  }
  if (
    FISCAL_NOTIFICATION_DOCUMENT_FAMILY_IDS_V3.some(
      (familyId) => !familyIds.has(familyId),
    ) ||
    BASE_EXTRACTOR_IDS_V1.some(
      (extractorId) => !extractorIds.has(extractorId),
    ) ||
    extractorIds.size !== BASE_EXTRACTOR_IDS_V1.length
  ) {
    throw new Error("INVALID_FAMILY_RULE_REGISTRY_V2:coverage");
  }
}

assertFamilyRuleRegistryIntegrityV2();

const ruleByFamilyId = new Map(
  FISCAL_NOTIFICATION_FAMILY_RULES_V2.map(
    (rule) => [rule.familyId, rule] as const,
  ),
);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;

export function resolveFamilyRuleV2(
  familyId: unknown,
): FamilyRecognitionRuleV2 | null {
  return typeof familyId === "string" &&
    familyId.length > 0 &&
    familyId.length <= 160 &&
    familyId.trim() === familyId &&
    !CONTROL_CHARACTER_PATTERN.test(familyId)
    ? (ruleByFamilyId.get(familyId as FiscalNotificationDocumentFamilyIdV3) ??
        null)
    : null;
}
