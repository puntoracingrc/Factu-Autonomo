import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  createPublicAeatBatch18StandardFaqV1 as faq,
  definePublicAeatBatch18ModelV1 as model,
  definePublicAeatBatch18SourceV1 as source,
} from "./batch-18.release-helper.v1";

export const PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_RELEASE_ID_V1 =
  "public-aeat-official-batch-18-financial-iae-vat-798-952.2026-07-14.v1" as const;

function official(value: PublicAeatOfficialContentSourceV1) {
  return source(value);
}

const INDEX = official({
  id: "aeat.models.index.2026-07-08",
  authority: "AEAT",
  kind: "OFFICIAL_MODEL_INDEX",
  title: "Presentar y consultar declaraciones por modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

function procedure(
  code: string,
  procedureCode: string,
  updated: string,
  hashes: readonly [string, string],
) {
  return [
    official({
      id: `aeat.model-${code}.procedure-home.2026-07-14`,
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: `Modelo ${code} · página oficial`,
      canonicalUrl: `https://sede.agenciatributaria.gob.es/Sede/procedimientoini/${procedureCode}.shtml`,
      officialUpdatedOn: updated,
      capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
      sourceSha256: hashes[0],
      verificationStatus: "SOURCE_HASH_CAPTURED",
    }),
    official({
      id: `aeat.model-${code}.procedure-record.2026-07-14`,
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: `Modelo ${code} · ficha del procedimiento`,
      canonicalUrl: `https://sede.agenciatributaria.gob.es/Sede/procedimientos/${procedureCode}.shtml`,
      officialUpdatedOn: updated,
      capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
      sourceSha256: hashes[1],
      verificationStatus: "SOURCE_HASH_CAPTURED",
    }),
  ] as const;
}

const [M798_HOME, M798_RECORD] = procedure("798", "GC58", "2026-06-09", [
  "d0d5f2b6c6d94c4258d4780afcf6db2e2489702bfcb14340f8ab54804d5bd7a1",
  "8c02010d2c55f685f56b17b842d8f6c79f4f274e1b353d6e7d93f88aa93990de",
]);
const LAW_38_2022 = official({
  id: "boe.law-38-2022.model-798.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 38/2022, de 27 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-22684",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "5aeec1bf821a14e88f07178b6a116386af68708f3563d30bff0ad45ed245516a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HFP_94_2023 = official({
  id: "boe.order-hfp-94-2023.model-798.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/94/2023, de 2 de febrero",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2023-2924",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "8169385704a3d24b9d0bb0e60cb2a3a72c4e659f68d788fd1de42de44f5cbb6a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const [IAE_HOME, IAE_RECORD] = procedure("840-848", "G323", "2026-07-10", [
  "ae3f31aa9f50c3bb784e7d82442cb61241de6d82bbed9d7f2837b7fd9c68e52b",
  "49c180f243be0fcb704392f8da5884e53f2da2f8ee343b9da4cece85b35aee95",
]);
const ORDER_HAC_2572_2003 = official({
  id: "boe.order-hac-2572-2003.model-840.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/2572/2003, de 10 de septiembre",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2003-17538",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "99327cf612c63294e2939e704296e27d19a9b720500c829ef1b8724bace8e983",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_HAC_85_2003 = official({
  id: "boe.order-hac-85-2003.model-848.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/85/2003, de 23 de enero",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2003-1787",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "26968deb9c30eefcd7f557d35c2296e6ceb070cd759958b7c352473ce888cea6",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const [M952_HOME, M952_RECORD] = procedure("952", "G416", "2026-06-09", [
  "7618fd24a3e8577102cc5b529bc1010a808b3c4e39397916d9d3d4f678337a6d",
  "cc201612c05f279769789345db316173770d799d9d19e4f91fc73e73f3d29e86",
]);
const RIVA = official({
  id: "boe.riva.model-952.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Reglamento del Impuesto sobre el Valor Añadido · artículo 24",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-1992-28925",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "508b9b03c93c7957372526da34d91da3924c84ca59a780dc8912e557f09f0f7d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

const M798_IDS = [
  INDEX.id,
  M798_HOME.id,
  M798_RECORD.id,
  LAW_38_2022.id,
  ORDER_HFP_94_2023.id,
] as const;
const M840_IDS = [
  INDEX.id,
  IAE_HOME.id,
  IAE_RECORD.id,
  ORDER_HAC_2572_2003.id,
] as const;
const M848_IDS = [
  INDEX.id,
  IAE_HOME.id,
  IAE_RECORD.id,
  ORDER_HAC_85_2003.id,
] as const;
const M952_IDS = [INDEX.id, M952_HOME.id, M952_RECORD.id, RIVA.id] as const;

const MODEL_798 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_RELEASE_ID_V1,
  code: "798",
  canonicalName:
    "Gravamen temporal de entidades de crédito y establecimientos financieros de crédito. Pago anticipado",
  summary:
    "Pago anticipado del gravamen temporal de entidades de crédito y establecimientos financieros de crédito identificado por la AEAT como Modelo 798.",
  searchTerms: [
    "gravamen temporal entidades de credito",
    "establecimientos financieros",
    "pago anticipado",
    "ley 38 2022",
    "orden hfp 94 2023",
  ],
  sources: [INDEX, M798_HOME, M798_RECORD, LAW_38_2022, ORDER_HFP_94_2023],
  purpose:
    "La AEAT identifica el 798 como el pago anticipado del gravamen temporal de entidades de crédito y establecimientos financieros de crédito.",
  scope:
    "Las instrucciones enlazadas por la Sede describen los ejercicios 2023 y 2024. La página oficial continúa publicada, pero esta ficha no infiere por ello una obligación actual ni una sustitución automática.",
  access:
    "La Sede mantiene un acceso electrónico específico para la presentación y otro para consultar declaraciones presentadas.",
  details:
    "La ficha enlaza la Ley 38/2022 y la Orden HFP/94/2023, además de instrucciones, nota informativa y preguntas frecuentes desde el procedimiento oficial.",
  faq: faq(
    "798",
    "Es el pago anticipado del gravamen temporal indicado en el índice oficial.",
    "La Sede publica formulario y consulta electrónicos.",
    "La documentación oficial se refiere a entidades de crédito y establecimientos financieros de crédito.",
    "El procedimiento reúne instrucciones, nota y preguntas frecuentes.",
    "Constan la Ley 38/2022 y la Orden HFP/94/2023.",
    M798_IDS,
  ),
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M798_HOME.id, M798_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_840 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_RELEASE_ID_V1,
  code: "840",
  canonicalName:
    "IAE. Declaración de alta, variación o baja en el Impuesto sobre Actividades Económicas",
  summary:
    "Declaración de alta, variación o baja en el IAE ante la AEAT, diferenciada del Modelo 848 y de la gestión censal delegada.",
  searchTerms: [
    "iae",
    "impuesto actividades economicas",
    "alta iae",
    "baja iae",
    "variacion iae",
    "gestion censal",
  ],
  sources: [INDEX, IAE_HOME, IAE_RECORD, ORDER_HAC_2572_2003],
  purpose:
    "El Modelo 840 sirve, según el índice oficial, para declarar el alta, la variación o la baja en el Impuesto sobre Actividades Económicas ante la AEAT.",
  scope:
    "La AEAT advierte de que, cuando la gestión censal de cuotas municipales está delegada, las declaraciones se presentan ante la entidad delegada y con sus propios modelos.",
  access:
    "La página agrupada 840/848 ofrece presentación electrónica del 840 y consulta de declaraciones presentadas.",
  details:
    "La Sede enlaza la descarga del modelo y la normativa de aprobación. Esta ficha no decide qué administración gestiona un caso concreto.",
  faq: faq(
    "840",
    "Es la declaración de alta, variación o baja en el IAE tramitada ante la AEAT.",
    "La Sede ofrece presentación y consulta electrónicas.",
    "Se dirige a la tramitación ante la AEAT; la gestión censal delegada puede corresponder a otra entidad.",
    "La página oficial agrupa trámites, descarga del modelo e información del 840 y el 848.",
    "Consta la Orden HAC/2572/2003.",
    M840_IDS,
  ),
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [IAE_HOME.id, IAE_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_848 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_RELEASE_ID_V1,
  code: "848",
  canonicalName: "IAE. Comunicación del importe neto de la cifra de negocios",
  summary:
    "Comunicación del importe neto de la cifra de negocios a efectos del IAE, identificada separadamente del Modelo 840.",
  searchTerms: [
    "iae",
    "importe neto cifra de negocios",
    "comunicacion iae",
    "cifra negocios",
    "modelo 848",
  ],
  sources: [INDEX, IAE_HOME, IAE_RECORD, ORDER_HAC_85_2003],
  purpose:
    "El Modelo 848 es la comunicación del importe neto de la cifra de negocios a efectos del IAE.",
  scope:
    "Comparte página de procedimiento con el 840, pero su finalidad oficial es distinta: comunicar la cifra de negocios, no declarar un alta, variación o baja.",
  access:
    "La página agrupada ofrece acceso electrónico al Modelo 848 y consulta de declaraciones presentadas.",
  details:
    "La Sede enlaza la descarga del modelo y la Orden HAC/85/2003. La ficha no evalúa si una entidad debe presentar la comunicación.",
  faq: faq(
    "848",
    "Es la comunicación del importe neto de la cifra de negocios a efectos del IAE.",
    "La Sede ofrece presentación y consulta electrónicas.",
    "Su identidad es distinta de las altas, variaciones y bajas del Modelo 840.",
    "La página oficial reúne trámites y descarga de los modelos 840 y 848.",
    "Consta la Orden HAC/85/2003.",
    M848_IDS,
  ),
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [IAE_HOME.id, IAE_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_952 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_RELEASE_ID_V1,
  code: "952",
  canonicalName:
    "IVA. Comunicación de la modificación de la base imponible en supuestos de concurso y por crédito incobrable",
  summary:
    "Comunicación electrónica de la modificación de la base imponible del IVA por concurso o crédito incobrable.",
  searchTerms: [
    "iva",
    "modificacion base imponible",
    "concurso",
    "credito incobrable",
    "factura impagada",
    "modelo 952",
  ],
  sources: [INDEX, M952_HOME, M952_RECORD, RIVA],
  purpose:
    "La AEAT identifica el Modelo 952 como la comunicación de una modificación de la base imponible del IVA en supuestos de concurso o crédito incobrable.",
  scope:
    "La ficha describe el canal administrativo publicado, sin comprobar que concurran las condiciones tributarias de un caso concreto.",
  access:
    "La Sede ofrece formulario electrónico, aportación de documentación y consulta de comunicaciones presentadas.",
  details:
    "La referencia normativa enlazada por la AEAT incluye el artículo 24 del Reglamento del IVA.",
  faq: faq(
    "952",
    "Es una comunicación relativa a la modificación de la base imponible del IVA por concurso o crédito incobrable.",
    "La AEAT publica formulario, documentación asociada y consulta.",
    "La ficha oficial cubre los dos supuestos que figuran en su título: concurso y crédito incobrable.",
    "Puede consultarse la página del trámite y su ficha administrativa.",
    "Consta el artículo 24 del Reglamento del IVA.",
    M952_IDS,
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M952_HOME.id, M952_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_18_FINANCIAL_IAE_VAT_798_952_CONTENT_V1 =
  Object.freeze([MODEL_798, MODEL_840, MODEL_848, MODEL_952] as const);
