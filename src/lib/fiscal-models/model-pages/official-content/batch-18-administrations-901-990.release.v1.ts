import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  createPublicAeatBatch18StandardFaqV1 as faq,
  definePublicAeatBatch18ModelV1 as model,
  definePublicAeatBatch18SourceV1 as source,
} from "./batch-18.release-helper.v1";

export const PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1 =
  "public-aeat-official-batch-18-administrations-901-990.2026-07-14.v1" as const;

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

const [M901_HOME, M901_RECORD] = procedure("901", "GC46", "2026-05-19", [
  "e6a73ffab4f8721cb697b44536df8ea9f7a00bef83690adaf2e63eafb1ad267c",
  "464d52cff421f62e47d902b8c5523bc7422a40bc19bee18ec672483a97df8703",
]);
const [M933_HOME, M933_RECORD] = procedure("933", "GC40", "2025-09-18", [
  "1c824b5326eac2f5907f4cf13b1f2f50a28302d6d4431795714dbf8d0f2097c3",
  "ca69cf3f1c0f9e98cd43d47b49d7091e61bae8efc3dbc2b252a40da33fa8b101",
]);
const [M980_HOME, M980_RECORD] = procedure("980", "ZA23", "2026-07-13", [
  "285f4fdd15c609f79e0c460ac51053485a6bad8b13b44ca163f6b3698bb93130",
  "89fcf9878a6eea916d1e6f84ceff0b1d1114dae3a251643d0835921ddcf23cdd",
]);
const [M981_HOME, M981_RECORD] = procedure("981", "GC39", "2026-05-19", [
  "2482e9d30340f80a46e4172d4ba4fa4f04e2443b604b64e839178d45b7e115df",
  "2999bd1ce0197480fa867efa71671a846ead939e3f0ac0be4885c134c19fa327",
]);
const [M990_HOME, M990_RECORD] = procedure("990", "GC32", "2026-07-13", [
  "c6ccd40376a075b362a4e947bdb847a6f6278c681492ed40cc6aed369639f5da",
  "630348714837129cb3912d9e99e46c90672d6e3c7b35e376969b3da9cf41066f",
]);

function ids(
  home: PublicAeatOfficialContentSourceV1,
  record: PublicAeatOfficialContentSourceV1,
) {
  return [INDEX.id, home.id, record.id] as const;
}

const MODEL_901 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1,
  code: "901",
  canonicalName:
    "Información de las CC. AA. sobre datos consignados en el certificado de eficiencia energética",
  summary:
    "Suministro de información autonómica a la AEAT sobre datos de certificados de eficiencia energética.",
  searchTerms: [
    "certificado eficiencia energetica",
    "comunidades autonomas",
    "ccaa",
    "vivienda",
    "inmueble",
    "modelo 901",
  ],
  sources: [INDEX, M901_HOME, M901_RECORD],
  purpose:
    "El índice oficial identifica el Modelo 901 como el suministro de las comunidades autónomas sobre datos consignados en certificados de eficiencia energética.",
  scope:
    "Es un intercambio informativo entre administraciones; no se presenta como un formulario ordinario dirigido al contribuyente particular.",
  access:
    "La Sede organiza la presentación por ejercicios y mantiene consulta de declaraciones presentadas.",
  details:
    "La página oficial y la ficha administrativa registran el procedimiento y sus accesos por periodo.",
  faq: faq(
    "901",
    "Es el suministro de datos autonómicos procedentes de certificados de eficiencia energética.",
    "La AEAT publica presentación por ejercicios y consulta.",
    "La información oficial se dirige a comunidades autónomas.",
    "Se consultan la portada del procedimiento y su ficha administrativa.",
    "La normativa y los requisitos aplicables se mantienen en la ficha oficial enlazada.",
    ids(M901_HOME, M901_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M901_HOME.id, M901_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_933 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1,
  code: "933",
  canonicalName:
    "Información de las CC. AA. sobre guarderías y centros de educación infantil autorizados",
  summary:
    "Suministro autonómico a la AEAT de información sobre guarderías y centros de educación infantil autorizados.",
  searchTerms: [
    "guarderias",
    "centros educacion infantil",
    "comunidades autonomas",
    "ccaa",
    "centros autorizados",
    "modelo 933",
  ],
  sources: [INDEX, M933_HOME, M933_RECORD],
  purpose:
    "La AEAT identifica el 933 como la información de las comunidades autónomas sobre guarderías y centros de educación infantil autorizados.",
  scope:
    "Es un suministro institucional de información; la ficha no lo convierte en una gestión personal de familias o centros.",
  access:
    "La Sede ofrece presentación y consulta electrónicas para el suministro oficial.",
  details:
    "El procedimiento enlaza una ayuda técnica extensa y la ficha administrativa del modelo.",
  faq: faq(
    "933",
    "Es el suministro autonómico sobre guarderías y centros de educación infantil autorizados.",
    "La Sede publica presentación y consulta electrónicas.",
    "El destinatario del suministro descrito son las comunidades autónomas.",
    "La portada enlaza una guía de ayuda y la ficha del procedimiento.",
    "Las referencias vigentes se consultan en el procedimiento oficial.",
    ids(M933_HOME, M933_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M933_HOME.id, M933_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_980 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1,
  code: "980",
  canonicalName:
    "Información de los intereses de demora pagados a los contribuyentes por las CC. AA.",
  summary:
    "Suministro de las comunidades autónomas sobre intereses de demora pagados a contribuyentes.",
  searchTerms: [
    "intereses de demora",
    "pagados contribuyentes",
    "comunidades autonomas",
    "ccaa",
    "modelo 980",
  ],
  sources: [INDEX, M980_HOME, M980_RECORD],
  purpose:
    "El Modelo 980 identifica la información de intereses de demora pagados por las comunidades autónomas a contribuyentes.",
  scope:
    "La identidad oficial describe un suministro administrativo, no una solicitud de cobro de intereses por el contribuyente.",
  access:
    "La Sede publica presentación por ejercicios y consulta de suministros presentados.",
  details:
    "La portada y la ficha del procedimiento son las referencias administrativas registradas.",
  faq: faq(
    "980",
    "Es el suministro sobre intereses de demora pagados por las comunidades autónomas.",
    "La Sede ofrece presentación por ejercicios y consulta.",
    "Se dirige a comunidades autónomas como suministradoras de la información.",
    "Puede consultarse la página y la ficha administrativa oficiales.",
    "Las referencias aplicables constan en la ficha del procedimiento.",
    ids(M980_HOME, M980_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M980_HOME.id, M980_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_981 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1,
  code: "981",
  canonicalName:
    "Suministro de información sobre la prestación por maternidad/paternidad",
  summary:
    "Suministro a la AEAT de información sobre prestaciones por maternidad y paternidad.",
  searchTerms: [
    "prestacion maternidad",
    "prestacion paternidad",
    "seguridad social",
    "mutualidades",
    "suministro informacion",
    "modelo 981",
  ],
  sources: [INDEX, M981_HOME, M981_RECORD],
  purpose:
    "La AEAT identifica el Modelo 981 como el suministro de información sobre prestaciones por maternidad y paternidad.",
  scope:
    "La portada distingue accesos de presentación, consulta, apoderados y colaboradores. Esta ficha no lo presenta como una solicitud de la prestación.",
  access:
    "La Sede ofrece presentación electrónica, consulta y accesos específicos para representación y colaboración social.",
  details:
    "El procedimiento publica una nota de cumplimentación junto a la ficha administrativa.",
  faq: faq(
    "981",
    "Es un suministro informativo sobre prestaciones por maternidad y paternidad.",
    "La Sede ofrece presentación, consulta y accesos de representación.",
    "La identidad oficial describe a quienes suministran la información, no a quien solicita la prestación.",
    "La portada enlaza una nota de cumplimentación y la ficha del procedimiento.",
    "Las referencias del suministro constan en la ficha oficial.",
    ids(M981_HOME, M981_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M981_HOME.id, M981_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_990 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_RELEASE_ID_V1,
  code: "990",
  canonicalName:
    "Información mensual de las CC. AA. sobre familias numerosas o con personas con discapacidad a cargo",
  summary:
    "Suministro mensual autonómico sobre familias numerosas y personas con discapacidad a cargo.",
  searchTerms: [
    "familias numerosas",
    "discapacidad a cargo",
    "comunidades autonomas",
    "informacion mensual",
    "deduccion familia",
    "modelo 990",
  ],
  sources: [INDEX, M990_HOME, M990_RECORD],
  purpose:
    "El Modelo 990 recoge información mensual de las comunidades autónomas sobre familias numerosas o con personas con discapacidad a cargo.",
  scope:
    "Es un suministro de información entre administraciones; no es la solicitud personal de un título ni de una deducción.",
  access:
    "La Sede ofrece presentación del ejercicio vigente, consulta y accesos a ejercicios anteriores.",
  details:
    "La página y la ficha del procedimiento registran los canales disponibles por ejercicio.",
  faq: faq(
    "990",
    "Es el suministro mensual autonómico sobre familias numerosas y personas con discapacidad a cargo.",
    "La AEAT publica presentación por ejercicio y consulta.",
    "Se dirige a comunidades autónomas como suministradoras.",
    "Se consultan la portada y la ficha administrativa del procedimiento.",
    "Las referencias aplicables están en la ficha oficial enlazada.",
    ids(M990_HOME, M990_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M990_HOME.id, M990_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_901_990_CONTENT_V1 =
  Object.freeze([
    MODEL_901,
    MODEL_933,
    MODEL_980,
    MODEL_981,
    MODEL_990,
  ] as const);
