import { VERIFACTU_SOFTWARE } from "./constants";

/** Campos obligatorios art. 15 Orden HAC/1177/2024 (apartados a–l). */
export interface DeclarationMandatoryFields {
  /** a) Nombre del sistema informático */
  systemName: string;
  /** b) Código identificador del sistema informático */
  systemId: string;
  /** c) Identificador completo de la versión */
  systemVersion: string;
  /** d) Componentes y descripción */
  componentsDescription: string;
  /** e) Solo VERI*FACTU exclusivo */
  exclusiveVerifactu: boolean;
  /** f) Varios obligados tributarios */
  multiTaxpayerSupport: boolean;
  /** g) Tipos de firma (no VERI*FACTU) */
  signatureTypes: string;
  /** h) Productor */
  producerName: string;
  /** i) NIF productor */
  producerNif: string;
  /** j) Dirección postal productor */
  producerPostalAddress: string;
  /** k) Declaración de cumplimiento */
  complianceStatement: string;
  /** l) Fecha y lugar */
  signedAt: string;
  signedPlace: string;
}

export interface DeclarationRecommendedAnnex {
  contactEmail?: string;
  websiteUrl?: string;
  complianceNotes: string;
  additionalNotes?: string;
}

export interface DeclarationReviewDraft {
  publicationStatus: "draft_not_valid";
  modality: "VERI*FACTU";
  issuedAt: string;
  mandatory: DeclarationMandatoryFields;
  annex: DeclarationRecommendedAnnex;
  statementEs: string;
  /** @deprecated Usar mandatory.systemName */
  softwareName: string;
  /** @deprecated Usar mandatory.systemVersion */
  softwareVersion: string;
  /** @deprecated Usar mandatory.producerName */
  developerName: string;
  /** @deprecated Usar mandatory.producerNif */
  developerNif: string;
}

function formatSpanishDate(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildComponentsDescription(): string {
  return [
    "Componentes software: aplicación web (Next.js/React), API en servidor Node.js,",
    "generación de PDF, módulo Veri*Factu (huella SHA-256 v0.1.2, QR tributario, XML de registro),",
    "almacenamiento local del navegador y sincronización opcional en Supabase.",
    "Componentes hardware: equipos del usuario final (PC, tablet o móvil) y servidores",
    "del proveedor de hosting (Vercel u equivalente).",
    "Funcionalidades principales: facturas, presupuestos, recibos, facturas rectificativas,",
    "registro encadenado, QR verificable AEAT, exportación PDF y gestión de clientes/gastos.",
  ].join(" ");
}

function buildComplianceStatement(version: string): string {
  return (
    `La persona o entidad productora del sistema informático declara que dicho sistema ` +
    `informático, en la versión ${version}, cumple con lo dispuesto en el artículo 29.2.j) ` +
    `de la Ley 58/2003, de 17 de diciembre, General Tributaria, en el Reglamento que ` +
    `establece los requisitos que deben adoptar los sistemas y programas informáticos o ` +
    `electrónicos que soporten los procesos de facturación de empresarios y profesionales, ` +
    `y la estandarización de formatos de los registros de facturación, aprobado por el ` +
    `Real Decreto 1007/2023, de 5 de diciembre, en la Orden HAC/1177/2024, de 17 de octubre, ` +
    `y en la sede electrónica de la Agencia Estatal de Administración Tributaria para todo ` +
    `aquello que complete las especificaciones de dicha orden.`
  );
}

function buildComplianceAnnexNotes(): string {
  return [
    "Huella de registros según especificación AEAT v0.1.2 (vectores oficiales validados en tests).",
    "QR tributario conforme a especificación AEAT (validación en prewww2 / www2).",
    "Encadenamiento de registros de facturación de alta; rectificativas como alta (F1/R1/R4).",
    "Verificación in situ en Ajustes → Veri*Factu (productor, NIF, software, versión).",
    "Remisión a AEAT: transporte SOAP/mTLS preparado; por defecto funciona en modo simulado sin enviar datos a AEAT.",
    "El envío real requiere certificado .p12/.pfx, variables de servidor y prueba oficial en entorno AEAT test.",
    "Comprobación de cadena de huellas bajo demanda en Ajustes → Veri*Factu.",
    "Pendiente: registro de eventos completo, validación XSD estricta y aceptación oficial de pruebas AEAT.",
  ].join(" ");
}

export function buildDeclarationMandatoryFields(
  date = new Date(),
): DeclarationMandatoryFields {
  const s = VERIFACTU_SOFTWARE;
  const signedPlace = `${s.developerCity}, ${s.developerCountry}`;

  return {
    systemName: s.softwareName,
    systemId: s.softwareId,
    systemVersion: s.softwareVersion,
    componentsDescription: buildComponentsDescription(),
    exclusiveVerifactu: false,
    multiTaxpayerSupport: true,
    signatureTypes:
      "No aplicable: el sistema opera en modalidad VERI*FACTU. La integridad e inalterabilidad " +
      "de los registros de facturación se garantizan mediante huella encadenada SHA-256 conforme " +
      "a la especificación publicada por la AEAT (v0.1.2), sin firma electrónica adicional en registros.",
    producerName: s.developerName,
    producerNif: s.developerNif,
    producerPostalAddress: `${s.developerAddress}, ${s.developerCity}, ${s.developerCountry}`,
    complianceStatement: buildComplianceStatement(s.softwareVersion),
    signedAt: formatSpanishDate(date),
    signedPlace,
  };
}

export function buildDeclarationStatementEs(
  fields: DeclarationMandatoryFields,
  annex: DeclarationRecommendedAnnex,
): string {
  const lines = [
    "BORRADOR TÉCNICO — NO VÁLIDO",
    "",
    "DECLARACIÓN RESPONSABLE DEL SISTEMA INFORMÁTICO DE FACTURACIÓN",
    "",
    `a) Nombre del sistema informático: ${fields.systemName}`,
    `b) Código identificador del sistema informático: ${fields.systemId}`,
    `c) Identificador completo de la versión: ${fields.systemVersion}`,
    `d) Componentes, hardware y software: ${fields.componentsDescription}`,
    `e) Funcionamiento exclusivo como «VERI*FACTU»: ${fields.exclusiveVerifactu ? "Sí" : "No"}`,
    `f) Uso por varios obligados tributarios o facturación de terceros: ${
      fields.multiTaxpayerSupport
        ? "Sí, mediante cuentas independientes; cada cuenta gestiona un único obligado tributario."
        : "No"
    }`,
    `g) Tipos de firma (si no es VERI*FACTU): ${fields.signatureTypes}`,
    `h) Nombre o razón social del productor: ${fields.producerName}`,
    `i) NIF del productor: ${fields.producerNif}`,
    `j) Dirección postal del productor: ${fields.producerPostalAddress}`,
    `k) Declaración de cumplimiento: ${fields.complianceStatement}`,
    `l) Fecha y lugar: ${fields.signedAt} — ${fields.signedPlace}`,
  ];

  const annexLines = [
    "",
    "ANEXO (información recomendada)",
  ];

  if (annex.contactEmail) {
    annexLines.push(`Contacto: ${annex.contactEmail}`);
  }
  if (annex.websiteUrl) {
    annexLines.push(`Sitio web: ${annex.websiteUrl}`);
  }
  annexLines.push(`Notas de cumplimiento técnico: ${annex.complianceNotes}`);
  if (annex.additionalNotes) {
    annexLines.push(`Información adicional: ${annex.additionalNotes}`);
  }

  return [...lines, ...annexLines].join("\n");
}

/**
 * Borrador exclusivamente interno para revisión técnica y jurídica.
 * No debe servirse desde rutas públicas ni presentarse como certificación.
 */
export function buildDeclarationReviewDraft(
  date = new Date(),
): DeclarationReviewDraft {
  const mandatory = buildDeclarationMandatoryFields(date);
  const annex: DeclarationRecommendedAnnex = {
    contactEmail: VERIFACTU_SOFTWARE.developerEmail || undefined,
    websiteUrl: VERIFACTU_SOFTWARE.developerUrl || undefined,
    complianceNotes: buildComplianceAnnexNotes(),
    additionalNotes:
      "Borrador técnico generado automáticamente para revisión interna.",
  };

  return {
    publicationStatus: "draft_not_valid",
    modality: "VERI*FACTU",
    issuedAt: date.toISOString().slice(0, 10),
    mandatory,
    annex,
    statementEs: buildDeclarationStatementEs(mandatory, annex),
    softwareName: mandatory.systemName,
    softwareVersion: mandatory.systemVersion,
    developerName: mandatory.producerName,
    developerNif: mandatory.producerNif,
  };
}
