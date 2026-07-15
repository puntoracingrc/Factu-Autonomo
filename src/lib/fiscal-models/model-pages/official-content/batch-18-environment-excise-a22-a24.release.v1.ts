import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  createPublicAeatBatch18StandardFaqV1 as faq,
  definePublicAeatBatch18ModelV1 as model,
  definePublicAeatBatch18SourceV1 as source,
} from "./batch-18.release-helper.v1";

export const PUBLIC_AEAT_BATCH_18_ENVIRONMENT_EXCISE_A22_A24_RELEASE_ID_V1 =
  "public-aeat-official-batch-18-environment-excise-a22-a24.2026-07-15.v2" as const;

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
  hashes: readonly [string, string],
) {
  return [
    official({
      id: `aeat.model-${code}.procedure-home.2026-07-14`,
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: `Modelo ${code} · página oficial`,
      canonicalUrl: `https://sede.agenciatributaria.gob.es/Sede/procedimientoini/${procedureCode}.shtml`,
      officialUpdatedOn: "2026-06-09",
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
      officialUpdatedOn: "2026-06-09",
      capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
      sourceSha256: hashes[1],
      verificationStatus: "SOURCE_HASH_CAPTURED",
    }),
  ] as const;
}

const [A22_HOME, A22_RECORD] = procedure("A22", "DR20", [
  "6bf19ceb4cc275abdabb8ccb3b8ac026243488a7c98b7d5dad56c697f2e95175",
  "33eaf5c4f0d3e84993ea88b0bd9eb5b91c98cbb6a6339b15ef61326d9fd86fde",
]);
const [A23_HOME, A23_RECORD] = procedure("A23", "DR19", [
  "5bfe88ceb26cd030d712a28589b391d967584236cdd0110fe5f144a6f85971cf",
  "50496359784c37859f187da10125aa9d6906e688fc8fd3050a69c746a36b9f84",
]);
const [A24_HOME, A24_RECORD] = procedure("A24", "DJ28", [
  "344cadb59c8de23c54fc609ea7ceb5357d06a18beb6635f1baf592da702a5e8b",
  "0b7531c8a6cb6858dccfda80a7121b40904f64abf6248436c6341fb3f96364dc",
]);
const ORDER_A22 = official({
  id: "boe.order-hfp-1314-2022.model-a22.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1314/2022, de 28 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-23749",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "ca75f2b9492fc46c62947539052f822141951892b991eea5ac863c8792667fdf",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_A23 = official({
  id: "boe.order-hfp-826-2022.model-a23.2026-07-15",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/826/2022, de 30 de agosto",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2022-14275",
  officialUpdatedOn: null,
  capturedOn: "2026-07-15",
  sourceSha256:
    "10604ea3a50a54b7075ad368237e59b8d9911be8e6a58b0ff7340755cd983798",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const ORDER_A24 = official({
  id: "boe.order-hac-86-2025.model-a24.2026-07-15",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/86/2025, de 13 de enero",
  canonicalUrl: "https://www.boe.es/buscar/doc.php?id=BOE-A-2025-1732",
  officialUpdatedOn: null,
  capturedOn: "2026-07-15",
  sourceSha256:
    "0df29bac3ecaff980c24ccdcdec1eb90f43f3118d11dcf1a8e22a1d87888618e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

function ids(
  home: PublicAeatOfficialContentSourceV1,
  record: PublicAeatOfficialContentSourceV1,
  legal: PublicAeatOfficialContentSourceV1,
) {
  return [INDEX.id, home.id, record.id, legal.id] as const;
}

const MODEL_A22 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ENVIRONMENT_EXCISE_A22_A24_RELEASE_ID_V1,
  reviewedOn: "2026-07-15",
  code: "A22",
  canonicalName:
    "Impuesto especial sobre los envases de plástico no reutilizables. Solicitud de devolución",
  summary:
    "Solicitud de devolución del impuesto especial sobre envases de plástico no reutilizables.",
  searchTerms: [
    "envases plastico no reutilizables",
    "impuesto plastico",
    "devolucion plastico",
    "modelo a22",
    "orden hfp 1314 2022",
  ],
  sources: [INDEX, A22_HOME, A22_RECORD, ORDER_A22],
  purpose:
    "La AEAT identifica el A22 como solicitud de devolución del impuesto especial sobre los envases de plástico no reutilizables.",
  scope:
    "La ficha resume la identidad y los canales publicados; no comprueba si se cumplen los supuestos legales de devolución.",
  access:
    "La Sede ofrece formulario en navegador, importación de fichero y consulta de solicitudes presentadas.",
  details:
    "El procedimiento enlaza instrucciones, información sobre beneficios fiscales y la Orden HFP/1314/2022.",
  faq: faq(
    "A22",
    "Es la solicitud de devolución del impuesto sobre envases de plástico no reutilizables.",
    "La Sede publica formulario, importación de fichero y consulta.",
    "La página oficial describe una solicitud de devolución, sin evaluar el derecho de un caso concreto.",
    "Se enlazan instrucciones e información oficial sobre beneficios fiscales.",
    "Consta la Orden HFP/1314/2022.",
    ids(A22_HOME, A22_RECORD, ORDER_A22),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [A22_HOME.id, A22_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_A23 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ENVIRONMENT_EXCISE_A22_A24_RELEASE_ID_V1,
  reviewedOn: "2026-07-15",
  code: "A23",
  canonicalName:
    "Impuesto sobre los Gases Fluorados de Efecto Invernadero. Solicitud de devolución",
  summary:
    "Solicitud de devolución del impuesto sobre los gases fluorados de efecto invernadero.",
  searchTerms: [
    "gases fluorados efecto invernadero",
    "devolucion gases fluorados",
    "impuesto gases",
    "modelo a23",
    "orden hfp 826 2022",
  ],
  sources: [INDEX, A23_HOME, A23_RECORD, ORDER_A23],
  purpose:
    "La AEAT identifica el A23 como solicitud de devolución del impuesto sobre los gases fluorados de efecto invernadero.",
  scope:
    "La información oficial describe el trámite, pero esta ficha no determina si procede una devolución concreta.",
  access:
    "La Sede ofrece formulario electrónico y consulta de solicitudes presentadas.",
  details:
    "El procedimiento registra documentación de ayuda y la Orden HFP/826/2022.",
  faq: faq(
    "A23",
    "Es la solicitud de devolución del impuesto sobre gases fluorados de efecto invernadero.",
    "La Sede publica formulario y consulta electrónicos.",
    "La página describe el trámite de devolución sin resolver su aplicabilidad individual.",
    "Pueden consultarse la portada y la ficha administrativa del procedimiento.",
    "Consta la Orden HFP/826/2022.",
    ids(A23_HOME, A23_RECORD, ORDER_A23),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [A23_HOME.id, A23_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_A24 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ENVIRONMENT_EXCISE_A22_A24_RELEASE_ID_V1,
  reviewedOn: "2026-07-15",
  code: "A24",
  canonicalName:
    "II. EE. Solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco",
  summary:
    "Solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
  searchTerms: [
    "liquidos cigarrillos electronicos",
    "vapeadores",
    "productos tabaco",
    "devolucion impuesto",
    "modelo a24",
    "orden hac 86 2025",
  ],
  sources: [INDEX, A24_HOME, A24_RECORD, ORDER_A24],
  purpose:
    "La AEAT identifica el A24 como solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y otros productos relacionados con el tabaco.",
  scope:
    "La ficha oficial describe una devolución de impuestos especiales; esta página no evalúa el derecho a solicitarla.",
  access:
    "La Sede ofrece formulario electrónico y consulta de solicitudes presentadas.",
  details:
    "El procedimiento enlaza la ficha administrativa y la Orden HAC/86/2025 que aprueba el modelo.",
  faq: faq(
    "A24",
    "Es la solicitud de devolución del impuesto sobre líquidos para cigarrillos electrónicos y productos relacionados con el tabaco.",
    "La AEAT publica formulario y consulta electrónicos.",
    "La identidad oficial abarca los productos expresamente indicados en el título del modelo.",
    "Se consultan la portada y la ficha del procedimiento.",
    "Consta la Orden HAC/86/2025.",
    ids(A24_HOME, A24_RECORD, ORDER_A24),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [A24_HOME.id, A24_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_18_ENVIRONMENT_EXCISE_A22_A24_CONTENT_V1 =
  Object.freeze([MODEL_A22, MODEL_A23, MODEL_A24] as const);
