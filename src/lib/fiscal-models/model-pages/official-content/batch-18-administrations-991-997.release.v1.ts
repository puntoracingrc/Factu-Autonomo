import type { PublicAeatOfficialContentSourceV1 } from "./contracts.v1";
import {
  PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  createPublicAeatBatch18StandardFaqV1 as faq,
  definePublicAeatBatch18ModelV1 as model,
  definePublicAeatBatch18SourceV1 as source,
} from "./batch-18.release-helper.v1";

export const PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1 =
  "public-aeat-official-batch-18-administrations-991-997.2026-07-14.v1" as const;

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

const [M991_HOME, M991_RECORD] = procedure("991", "GI49", "2026-05-19", [
  "f49987379dcf72038378da3670ed1b08bf378da86638e8b111202a1e46290882",
  "9fcf5a0a95a283f624b6838b31bdb6e15d12958cc443538a292bed156260bfd2",
]);
const [M992_HOME, M992_RECORD] = procedure("992", "GC30", "2026-05-19", [
  "9f20accd699678b703b07ea4e62ed67dcbda5f4b3b7099d44fcb87cc526229df",
  "af0f7cbb8560a9ece91f9b444847fd872c76e2dc54849bcda254daaa47ec351c",
]);
const [M993_HOME, M993_RECORD] = procedure("993", "GC22", "2026-05-19", [
  "b1da7c6b3788f95b93ac49ab2fe9381d0ba5b076e47c128884f775307ef4b533",
  "547f935252ff3c5bdc77a1cc9ba5ed185f8b6e7f23352acc075d81e1edf3fe8c",
]);
const [M995_HOME, M995_RECORD] = procedure("995", "ZA06", "2026-07-13", [
  "f949c0bff940c563cb2ba46221c9a78cfe1146137a666726a3c24f193567aeba",
  "252a84a95ce1b720a3dd0f0cf8dca747070988d0bdfeed24856a15150c2ef12e",
]);
const [M996_HOME, M996_RECORD] = procedure("996", "ZA07", "2026-07-13", [
  "09f252da793e643601bb0d96a450d08d1cce79f0ff48ae0ecfee28c0055fa959",
  "300cdf904d07703b717480c9772389a45beb79875ed512548efeee47554e22c1",
]);
const [M997_HOME, M997_RECORD] = procedure("997", "ZA09", "2026-07-13", [
  "2616f5725eaf373452a212ff17d98a11a4c1b40aaac347b12d35a5246c5bf711",
  "1e88917ad908955f94ec776c3212154104d132b23c1452c3c06217fa391e7422",
]);

const LGT = official({
  id: "boe.lgt.article-95.model-991.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 58/2003, General Tributaria · artículo 95",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23186",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "cc1fb43852016e297cf909d9b09b11e6788921fc0ce9918828ed2481f33e4215",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});
const LAW_22_2009 = official({
  id: "boe.law-22-2009.article-61.model-991.2026-07-14",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Ley 22/2009, de 18 de diciembre · artículo 61",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2009-20375",
  officialUpdatedOn: null,
  capturedOn: PUBLIC_AEAT_BATCH_18_REVIEWED_ON_V1,
  sourceSha256:
    "53e427ff452015a0f411defc2869138a44ef365660a912eeaf562785b6222de3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
});

function ids(...sources: readonly PublicAeatOfficialContentSourceV1[]) {
  return [INDEX.id, ...sources.map((item) => item.id)] as [string, ...string[]];
}
const administrativeAccess = (
  home: PublicAeatOfficialContentSourceV1,
  record: PublicAeatOfficialContentSourceV1,
) => ({
  methods: ["BROWSER_FORM", "ADMINISTRATIVE_TRANSFER"] as const,
  status: "SOURCE_DESCRIBED" as const,
  sourceIds: [home.id, record.id] as const,
  semantics: "OFFICIAL_INFORMATION_ONLY" as const,
});

const MODEL_991 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "991",
  canonicalName:
    "Declaración informativa de fianzas derivadas del arrendamiento de inmuebles",
  summary:
    "Suministro informativo de fianzas derivadas del arrendamiento de inmuebles.",
  searchTerms: [
    "fianzas alquiler",
    "fianzas arrendamiento",
    "inmuebles",
    "deposito fianza",
    "comunidades autonomas",
    "modelo 991",
  ],
  sources: [INDEX, M991_HOME, M991_RECORD, LGT, LAW_22_2009],
  purpose:
    "El índice de la AEAT identifica el 991 como declaración informativa de fianzas derivadas del arrendamiento de inmuebles.",
  scope:
    "La ficha se refiere al suministro de información por las administraciones competentes sobre las fianzas, no a un formulario ordinario del inquilino o arrendador.",
  access:
    "La Sede publica presentación por ejercicio, consulta y acceso a ejercicios anteriores.",
  details:
    "Entre las referencias oficiales constan el artículo 95 de la Ley General Tributaria y el artículo 61 de la Ley 22/2009.",
  faq: faq(
    "991",
    "Es la declaración informativa de fianzas de arrendamientos inmobiliarios.",
    "La Sede ofrece presentación por ejercicio y consulta.",
    "El suministro se vincula a las administraciones responsables de esas fianzas.",
    "Se consultan la portada, la ficha administrativa y sus accesos por año.",
    "Constan la Ley General Tributaria y la Ley 22/2009.",
    ids(M991_HOME, M991_RECORD, LGT, LAW_22_2009),
  ),
  accessMethods: administrativeAccess(M991_HOME, M991_RECORD),
});

const MODEL_992 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "992",
  canonicalName: "Tributos cedidos sobre el Juego de Comunidades Autónomas",
  summary:
    "Suministro de las comunidades autónomas relativo a tributos cedidos sobre el juego.",
  searchTerms: [
    "tributos cedidos juego",
    "juego comunidades autonomas",
    "casinos",
    "bingos",
    "apuestas",
    "modelo 992",
  ],
  sources: [INDEX, M992_HOME, M992_RECORD],
  purpose:
    "La AEAT identifica el Modelo 992 como el suministro relativo a tributos cedidos sobre el juego de las comunidades autónomas.",
  scope:
    "Es un intercambio de información entre administraciones; no se presenta como una autoliquidación individual del operador en esta ficha.",
  access:
    "La Sede ofrece presentación del ejercicio vigente, consulta y ejercicios anteriores.",
  details:
    "La portada y la ficha administrativa conservan los accesos oficiales por ejercicio.",
  faq: faq(
    "992",
    "Es el suministro de tributos cedidos sobre el juego de las comunidades autónomas.",
    "La AEAT publica presentación por ejercicio y consulta.",
    "Se dirige a comunidades autónomas en el marco del suministro institucional.",
    "Puede consultarse la página oficial y su ficha administrativa.",
    "Las referencias aplicables se mantienen en la ficha del procedimiento.",
    ids(M992_HOME, M992_RECORD),
  ),
  accessMethods: administrativeAccess(M992_HOME, M992_RECORD),
});

const MODEL_993 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "993",
  canonicalName: "Control de deducciones autonómicas",
  summary:
    "Suministro administrativo para el control de deducciones autonómicas.",
  searchTerms: [
    "deducciones autonomicas",
    "control deducciones",
    "comunidades autonomas",
    "irpf autonomico",
    "modelo 993",
  ],
  sources: [INDEX, M993_HOME, M993_RECORD],
  purpose:
    "El índice oficial denomina Modelo 993 al suministro para el control de deducciones autonómicas.",
  scope:
    "La identidad publicada describe información facilitada por administraciones, no una solicitud personal de deducción.",
  access:
    "La Sede publica presentación del ejercicio vigente, consulta y accesos a ejercicios anteriores.",
  details:
    "La página y la ficha del procedimiento registran los canales administrativos disponibles.",
  faq: faq(
    "993",
    "Es un suministro para el control de deducciones autonómicas.",
    "La Sede ofrece presentación por ejercicio y consulta.",
    "La información oficial está orientada a administraciones suministradoras.",
    "Se consultan la portada y la ficha administrativa oficiales.",
    "Las referencias aplicables están enlazadas desde el procedimiento.",
    ids(M993_HOME, M993_RECORD),
  ),
  accessMethods: administrativeAccess(M993_HOME, M993_RECORD),
});

const MODEL_995 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "995",
  canonicalName: "Cesión de Información Urbanística por Entidades Locales",
  summary:
    "Cesión a la AEAT de información urbanística por entidades locales mediante formulario o fichero.",
  searchTerms: [
    "informacion urbanistica",
    "entidades locales",
    "ayuntamientos",
    "urbanismo",
    "cesion informacion",
    "modelo 995",
  ],
  sources: [INDEX, M995_HOME, M995_RECORD],
  purpose:
    "La AEAT identifica el 995 como la cesión de información urbanística por entidades locales.",
  scope:
    "El canal está dirigido a entidades locales; no es una consulta urbanística ciudadana.",
  access:
    "La Sede distingue un formulario web para suministros acotados, carga de fichero y consulta de presentaciones.",
  details:
    "La portada del procedimiento describe las alternativas de remisión y enlaza la ficha administrativa.",
  faq: faq(
    "995",
    "Es la cesión de información urbanística por entidades locales.",
    "La AEAT publica formulario web, carga de fichero y consulta.",
    "Se dirige a entidades locales como suministradoras de información.",
    "La página del procedimiento explica los canales y enlaza su ficha.",
    "Las referencias aplicables constan en el procedimiento oficial.",
    ids(M995_HOME, M995_RECORD),
  ),
  accessMethods: {
    methods: ["BROWSER_FORM", "FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M995_HOME.id, M995_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

const MODEL_996 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "996",
  canonicalName: "Embargo de devoluciones gestionadas por la AEAT",
  summary:
    "Canal administrativo para actuaciones de embargo sobre devoluciones gestionadas por la AEAT.",
  searchTerms: [
    "embargo devoluciones",
    "devoluciones aeat",
    "administraciones publicas",
    "diligencia embargo",
    "modelo 996",
  ],
  sources: [INDEX, M996_HOME, M996_RECORD],
  purpose:
    "El Modelo 996 identifica el canal de embargo de devoluciones gestionadas por la AEAT.",
  scope:
    "La página oficial describe una relación entre administraciones y órganos de recaudación; esta ficha no permite ordenar ni ejecutar embargos.",
  access:
    "La Sede publica presentación, consulta, gestión de errores e información general del procedimiento.",
  details:
    "La portada reúne los accesos operativos oficiales y la ficha administrativa de referencia.",
  faq: faq(
    "996",
    "Es el canal administrativo para embargo de devoluciones gestionadas por la AEAT.",
    "La Sede ofrece presentación, consulta y corrección de errores.",
    "Está orientado a administraciones y órganos competentes, no al uso ordinario de un particular.",
    "El procedimiento reúne información general y su ficha administrativa.",
    "Las referencias aplicables se consultan en la ficha oficial.",
    ids(M996_HOME, M996_RECORD),
  ),
  accessMethods: administrativeAccess(M996_HOME, M996_RECORD),
});

const MODEL_997 = model({
  releaseId: PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_RELEASE_ID_V1,
  code: "997",
  canonicalName:
    "Embargo de pagos presupuestarios de otras Administraciones Públicas",
  summary:
    "Canal por fichero para actuaciones de embargo sobre pagos presupuestarios de otras administraciones públicas.",
  searchTerms: [
    "embargo pagos presupuestarios",
    "administraciones publicas",
    "pagos aapp",
    "portal ficheros",
    "modelo 997",
  ],
  sources: [INDEX, M997_HOME, M997_RECORD],
  purpose:
    "La AEAT identifica el 997 como el procedimiento de embargo de pagos presupuestarios de otras administraciones públicas.",
  scope:
    "Es un intercambio institucional mediante ficheros; la ficha no ejecuta ni recomienda actuaciones de embargo.",
  access:
    "La Sede enlaza un portal para consulta, envío y descarga de ficheros.",
  details:
    "El procedimiento publica manual de usuario, descarga de modelo y ficha administrativa.",
  faq: faq(
    "997",
    "Es el canal para embargo de pagos presupuestarios de otras administraciones públicas.",
    "La AEAT publica un portal de consulta, envío y descarga de ficheros.",
    "Se dirige a administraciones públicas y órganos competentes.",
    "La portada enlaza manual de usuario, descarga y ficha del procedimiento.",
    "Las referencias aplicables constan en la documentación oficial enlazada.",
    ids(M997_HOME, M997_RECORD),
  ),
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [M997_HOME.id, M997_RECORD.id],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
});

export const PUBLIC_AEAT_BATCH_18_ADMINISTRATIONS_991_997_CONTENT_V1 =
  Object.freeze([
    MODEL_991,
    MODEL_992,
    MODEL_993,
    MODEL_995,
    MODEL_996,
    MODEL_997,
  ] as const);
