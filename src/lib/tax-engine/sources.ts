import type { OfficialSource } from "./types";

const RETRIEVED_AT = "2026-07-12";

export const OFFICIAL_SOURCES = {
  IRPF_MAINTENANCE: {
    id: "boe-lirpf-30-2-5-c",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 35/2006 del Impuesto sobre la Renta de las Personas Físicas",
    legalReference: "Artículo 30.2.5.ª.c)",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a30",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2018-01-01",
    notes:
      "Exige relación con la actividad, establecimiento de restauración u hostelería, pago electrónico y límites reglamentarios.",
    verificationStatus: "VERIFIED",
  },
  IRPF_MAINTENANCE_LIMITS: {
    id: "boe-rirpf-9-a-3",
    authority: "BOE",
    sourceType: "REGULATION",
    title: "Reglamento del Impuesto sobre la Renta de las Personas Físicas",
    legalReference: "Artículo 9.A.3.a)",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a9",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2007-04-01",
    notes:
      "Fija los límites diarios de manutención en España y extranjero, con o sin pernoctación.",
    verificationStatus: "VERIFIED",
  },
  CLIENT_ATTENTION_LIMIT: {
    id: "boe-lis-15-e",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 27/2014 del Impuesto sobre Sociedades",
    legalReference: "Artículo 15.e)",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2014-12328#a15",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2015-01-01",
    notes:
      "Límite conjunto del 1 % del importe neto de la cifra de negocios para atenciones a clientes o proveedores; aplicable en estimación directa por remisión del artículo 28 LIRPF.",
    verificationStatus: "VERIFIED",
  },
  IRPF_ESTIMATION_REFERENCE: {
    id: "boe-lirpf-28-1",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 35/2006 del Impuesto sobre la Renta de las Personas Físicas",
    legalReference: "Artículo 28.1",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2006-20764#a28",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2007-01-01",
    notes:
      "Remite con carácter general a las normas del Impuesto sobre Sociedades para calcular el rendimiento neto de actividades económicas.",
    verificationStatus: "VERIFIED",
  },
  IRPF_VEHICLE_AFFECTATION: {
    id: "boe-rirpf-22",
    authority: "BOE",
    sourceType: "REGULATION",
    title: "Reglamento del Impuesto sobre la Renta de las Personas Físicas",
    legalReference: "Artículo 22, especialmente apartados 2 a 4",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2007-6820#a22",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2007-04-01",
    notes:
      "Regula la afectación de elementos a la actividad y las excepciones tasadas para determinados vehículos.",
    verificationStatus: "VERIFIED",
  },
  VAT_VEHICLE_AFFECTATION: {
    id: "boe-liva-95-three-four",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 37/1992 del Impuesto sobre el Valor Añadido",
    legalReference: "Artículo 95.Tres y Cuatro",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a95",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "1998-01-01",
    notes:
      "Presunción del 50 % para turismos, 100 % para categorías enumeradas y extensión a combustible, aparcamiento, peajes y reparaciones.",
    verificationStatus: "VERIFIED",
  },
  VAT_EXCLUSIONS: {
    id: "boe-liva-96",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 37/1992 del Impuesto sobre el Valor Añadido",
    legalReference: "Artículo 96.Uno.5.º y 6.º",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a96",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "1993-01-01",
    notes:
      "Excluye el IVA de atenciones a clientes y condiciona viajes, hostelería y restauración a su deducibilidad en imposición directa.",
    verificationStatus: "VERIFIED",
  },
  VAT_DOCUMENTATION: {
    id: "boe-liva-97",
    authority: "BOE",
    sourceType: "LAW",
    title: "Ley 37/1992 del Impuesto sobre el Valor Añadido",
    legalReference: "Artículo 97",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740#a97",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "1993-01-01",
    notes:
      "Exige documento justificativo válido y cuota expresamente consignada para ejercitar la deducción.",
    verificationStatus: "VERIFIED",
  },
  SIMPLIFIED_INVOICE: {
    id: "boe-invoicing-regulation-7",
    authority: "BOE",
    sourceType: "REGULATION",
    title: "Reglamento por el que se regulan las obligaciones de facturación",
    legalReference: "Artículo 7.2 del Real Decreto 1619/2012",
    officialUrl:
      "https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696#a7",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2013-01-01",
    notes:
      "Para justificar la deducción, la factura simplificada debe incorporar NIF y domicilio del destinatario y la cuota separada cuando este lo exija.",
    verificationStatus: "VERIFIED",
  },
  DGT_MAINTENANCE_CORRELATION: {
    id: "dgt-v1184-22",
    authority: "DGT",
    sourceType: "BINDING_RULING",
    title: "Consulta vinculante V1184-22",
    legalReference: "V1184-22, de 26 de mayo de 2022",
    officialUrl:
      "https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V1184-22",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: "2022-05-26",
    notes:
      "Desarrolla correlación con ingresos, imputación, registro y justificación de los gastos de manutención.",
    verificationStatus: "VERIFIED",
  },
  DGT_VEHICLE_RUNNING_COSTS: {
    id: "dgt-v1611-24",
    authority: "DGT",
    sourceType: "BINDING_RULING",
    title: "Consulta vinculante V1611-24",
    legalReference: "V1611-24",
    officialUrl:
      "https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V1611-24",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: null,
    notes:
      "Exige analizar la afectación y la prueba de combustible, peajes, mantenimiento y demás gastos concretos.",
    verificationStatus: "PENDING_VERIFICATION",
  },
  DGT_VEHICLE_MARKING: {
    id: "dgt-v2119-25",
    authority: "DGT",
    sourceType: "BINDING_RULING",
    title: "Consulta vinculante V2119-25",
    legalReference: "V2119-25",
    officialUrl:
      "https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2119-25",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: null,
    notes:
      "La rotulación y otros indicios no acreditan automáticamente el uso profesional exclusivo.",
    verificationStatus: "PENDING_VERIFICATION",
  },
  DGT_CLIENT_MEAL_ALLOWANCE: {
    id: "dgt-v2119-20",
    authority: "DGT",
    sourceType: "BINDING_RULING",
    title: "Consulta vinculante V2119-20",
    legalReference: "V2119-20",
    officialUrl:
      "https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2119-20",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: null,
    notes:
      "Forma parte de la doctrina que debe revisar el asesor al diferenciar restauración correlacionada y atención gratuita a clientes.",
    verificationStatus: "PENDING_VERIFICATION",
  },
  DGT_CLIENT_GIFT_EXCLUSION: {
    id: "dgt-v2683-21",
    authority: "DGT",
    sourceType: "BINDING_RULING",
    title: "Consulta vinculante V2683-21",
    legalReference: "V2683-21",
    officialUrl:
      "https://petete.tributos.hacienda.gob.es/consultas/?num_consulta=V2683-21",
    retrievedAt: RETRIEVED_AT,
    effectiveFrom: null,
    notes:
      "Trata la exclusión de IVA de atenciones gratuitas y evidencia la necesidad de una política jurídica revisada para comidas con clientes.",
    verificationStatus: "PENDING_VERIFICATION",
  },
} as const satisfies Record<string, OfficialSource>;

export const MEAL_OFFICIAL_SOURCES: readonly OfficialSource[] = [
  OFFICIAL_SOURCES.IRPF_MAINTENANCE,
  OFFICIAL_SOURCES.IRPF_MAINTENANCE_LIMITS,
  OFFICIAL_SOURCES.IRPF_ESTIMATION_REFERENCE,
  OFFICIAL_SOURCES.CLIENT_ATTENTION_LIMIT,
  OFFICIAL_SOURCES.VAT_EXCLUSIONS,
  OFFICIAL_SOURCES.VAT_DOCUMENTATION,
  OFFICIAL_SOURCES.SIMPLIFIED_INVOICE,
  OFFICIAL_SOURCES.DGT_MAINTENANCE_CORRELATION,
];

export const VEHICLE_OFFICIAL_SOURCES: readonly OfficialSource[] = [
  OFFICIAL_SOURCES.IRPF_VEHICLE_AFFECTATION,
  OFFICIAL_SOURCES.VAT_VEHICLE_AFFECTATION,
  OFFICIAL_SOURCES.VAT_DOCUMENTATION,
  OFFICIAL_SOURCES.SIMPLIFIED_INVOICE,
];
