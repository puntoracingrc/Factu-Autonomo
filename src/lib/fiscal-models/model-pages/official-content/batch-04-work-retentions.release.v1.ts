import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const RELEASE_ID =
  "public-aeat-official-batch-04-work-retentions.2026-07-13.v1" as const;
const REVIEWED_ON = "2026-07-13" as const;
const LIMITATIONS =
  "Información general procedente de fuentes oficiales. No determina la aplicabilidad a un caso concreto y no permite presentar, firmar, pagar ni enviar declaraciones." as const;

function deepFreeze<Value>(value: Value): Value {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nested);
    }
    Object.freeze(value);
  }
  return value;
}

const MODEL_INDEX_SOURCE = {
  id: "aeat.model-index.2026-07-08",
  authority: "AEAT",
  kind: "OFFICIAL_MODEL_INDEX",
  title: "Presentar y consultar declaraciones por modelo",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/presentar-consultar-declaraciones-modelo.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "afcdabfbf137a734a06f7e8026af54cfae63d1cd8e78dd6a8d8f8c8deff00983",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_145_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: RELEASE_ID,
  code: "145",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Retenciones sobre rendimientos del trabajo. Comunicación de datos al pagador.",
  summary:
    "Comunicación de datos del perceptor de rendimientos del trabajo a su pagador o de variaciones de datos previamente comunicados, según la identificación oficial de la AEAT.",
  searchTerms: [
    "modelo 145",
    "retenciones del trabajo",
    "rendimientos del trabajo",
    "comunicación de datos",
    "comunicación al pagador",
    "variación de datos",
    "datos personales y familiares",
    "IRPF",
    "formulario 145",
    "Agencia Tributaria",
  ],
  sections: [
    {
      id: "model-145-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-145-purpose-communication",
          heading: "Comunicación al pagador",
          text: "La AEAT identifica el Modelo 145 con la comunicación de datos del perceptor de rendimientos del trabajo a su pagador y con la variación de datos previamente comunicados.",
          sourceIds: [
            "aeat.model-145.procedure-home.2022-05-30",
            "aeat.model-145.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-145-purpose-channel",
          heading: "Canal descrito por la AEAT",
          text: "La página oficial señala que la tramitación se realiza entre la persona interesada y el pagador de las retribuciones y que la Sede no ofrece una gestión electrónica para este modelo.",
          sourceIds: ["aeat.model-145.procedure-home.2022-05-30"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-145-materials",
      title: "Material oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-145-materials-form",
          heading: "Formulario PDF enlazado",
          text: "La página de descarga de la AEAT enlaza un formulario PDF interactivo de dos páginas. Su metadato de título lo identifica como Modelo 145_2024; este registro documental no interpreta su vigencia para un caso concreto.",
          sourceIds: [
            "aeat.model-145.download.2026-06-09",
            "aeat.model-145.form-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-145-materials-note",
          heading: "Nota aclaratoria histórica",
          text: "La página titulada Nota aclaratoria se refiere expresamente al ejercicio 2013 y está fechada en enero de 2013. Se conserva como contexto documental histórico, sin extrapolar su contenido.",
          sourceIds: ["aeat.model-145.note.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-145-traceability",
      title: "Identidad y normativa enlazada",
      kind: "DETAILS",
      items: [
        {
          id: "model-145-traceability-title",
          heading: "Denominaciones oficiales registradas",
          text: "El índice y la página principal muestran la denominación sin la sigla IRPF, mientras que la ficha del procedimiento incorpora esa sigla. Ambas variantes se conservan como aparecen en las fuentes oficiales.",
          sourceIds: [
            MODEL_INDEX_SOURCE.id,
            "aeat.model-145.procedure-home.2022-05-30",
            "aeat.model-145.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-145-traceability-law",
          heading: "Resoluciones enlazadas por la AEAT",
          text: "La página oficial enlaza la Resolución de 3 de enero de 2011 que aprobó el modelo y cuatro resoluciones modificativas publicadas entre 2012 y 2015. Esta ficha registra esa cadena sin determinar sus efectos actuales.",
          sourceIds: [
            "boe.model-145.resolution-2011",
            "boe.model-145.resolution-2012",
            "boe.model-145.resolution-2013",
            "boe.model-145.resolution-2014",
            "boe.model-145.resolution-2015",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-145.procedure-home.2022-05-30",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 145. Retenciones sobre rendimientos del trabajo. Comunicación de datos al pagador.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G603.shtml",
      officialUpdatedOn: "2022-05-30",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4075ccdcf37bb7e821fd193bdbf9517f78eac68701444d6028ab00ed9e6f29fe",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-145.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title:
        "Modelo 145. IRPF. Retenciones sobre rendimientos del trabajo. Comunicación de datos al pagador.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G603.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "81049e889c34a52b20b6340b71782b1f9bf5ab2c59447b2e83a0422d871fc21d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-145.download.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-145-irpf______tos-trabajo-comunicacion-pagador_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0fac4e9427327614b7e4086dba57464c519b90cea1d54ba44122ba1e17f657a7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-145.note.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Nota aclaratoria",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-145-irpf______tos-trabajo-comunicacion-pagador_/nota-aclaratoria.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "59b4c964c39dbf50d6a7f6c0495ea4d4461b4cc952449b134c7eb29118053a65",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-145.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 145_2024. Formulario en castellano",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G603/mod145_es_es.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2061c0035b2ce7a4bd25dd7727798ed3754c6902306eac783112aa2824af5667",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-145.resolution-2015",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 3 de diciembre de 2015, por la que se modifica la de 3 de enero de 2011",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2015-13690",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a94e391853a073b6da812f1adec20429a67bae2aec0a7b2295fb9c6888b9a1a2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-145.resolution-2014",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 18 de diciembre de 2014, por la que se modifica la de 3 de enero de 2011",
      canonicalUrl:
        "https://www.boe.es/buscar/doc.php?id=BOE-A-2014-13679",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3f274e0d8357cb0f98dc32ff354c94eb6d1eeee6f52d90563b9892ad1f774320",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-145.resolution-2013",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 17 de diciembre de 2013, por la que se modifica la de 3 de enero de 2011",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2014-59",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1519acf1d04d9c829698fe585486fee9c624d71cb90d8fc47da6ed883bcb8a09",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-145.resolution-2012",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 23 de enero de 2012, por la que se modifica la de 3 de enero de 2011",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2012-1385",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "dd6c3233e27bf58935236282d7389eae62ed0e54390dc3214817f7e4b5a5c153",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-145.resolution-2011",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 3 de enero de 2011, por la que se aprueba el modelo 145",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2011-208",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cd7e675164a324ba0ef9bf397cfe4143bdd125264effacad18e0d97194ca8190",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-145-form",
      kind: "FORM",
      title: "Formulario oficial enlazado del Modelo 145",
      sourceId: "aeat.model-145.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-145.download.2026-06-09",
      mediaType: "application/pdf",
      fileName: "mod145_es_es.pdf",
      byteLength: 123230,
      pageCount: 2,
      sha256:
        "2061c0035b2ce7a4bd25dd7727798ed3754c6902306eac783112aa2824af5667",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-145-form-preview",
    sourceId: "aeat.model-145.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-145/formulario-modelo-145-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "456996676a6e5ef51e9c87525ccb7446131edaf0451c8c5eaaf3e5edf4661abf",
    alt: "Vista previa del formulario oficial enlazado del Modelo 145 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-145-link-procedure",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-145.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-link-download",
      label: "Página oficial de descarga",
      sourceId: "aeat.model-145.download.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-link-note",
      label: "Nota aclaratoria de la AEAT",
      sourceId: "aeat.model-145.note.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-link-law",
      label: "Resolución de aprobación del Modelo 145",
      sourceId: "boe.model-145.resolution-2011",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-145-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 145?",
      answer: "La AEAT lo identifica como la comunicación de datos sobre rendimientos del trabajo al pagador y de variaciones de datos previamente comunicados.",
      sourceIds: [
        "aeat.model-145.procedure-home.2022-05-30",
        "aeat.model-145.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-faq-channel",
      question: "¿Qué canal describe la página oficial para esta comunicación?",
      answer: "La página de la AEAT sitúa la comunicación entre la persona interesada y el pagador de las retribuciones.",
      sourceIds: ["aeat.model-145.procedure-home.2022-05-30"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-faq-electronic",
      question: "¿Incluye la página principal una gestión electrónica del Modelo 145?",
      answer: "No. La AEAT indica que las características de esta comunicación no permiten una gestión electrónica en su Sede.",
      sourceIds: ["aeat.model-145.procedure-home.2022-05-30"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-faq-document",
      question: "¿Qué documento ofrece la página de descarga?",
      answer: "La página enlaza un formulario PDF interactivo de dos páginas identificado en sus metadatos como Modelo 145_2024.",
      sourceIds: [
        "aeat.model-145.download.2026-06-09",
        "aeat.model-145.form-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-faq-note",
      question: "¿A qué periodo se refiere la nota aclaratoria enlazada?",
      answer: "La nota se refiere expresamente al ejercicio 2013 y figura fechada en enero de 2013.",
      sourceIds: ["aeat.model-145.note.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-145-faq-law",
      question: "¿Qué normativa de aprobación enlaza la AEAT?",
      answer: "La página enlaza la Resolución de 3 de enero de 2011 que aprobó el Modelo 145 y resoluciones modificativas posteriores.",
      sourceIds: [
        "boe.model-145.resolution-2011",
        "boe.model-145.resolution-2012",
        "boe.model-145.resolution-2013",
        "boe.model-145.resolution-2014",
        "boe.model-145.resolution-2015",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"145">;

const MODEL_146_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: RELEASE_ID,
  code: "146",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Pensionistas con dos o más pagadores. Solicitud de determinación del importe de las retenciones.",
  summary:
    "Solicitud que la AEAT identifica con la determinación de retenciones para pensionistas con dos o más pagadores.",
  searchTerms: [
    "modelo 146",
    "pensionistas",
    "dos o más pagadores",
    "varios pagadores",
    "retenciones de pensiones",
    "prestaciones pasivas",
    "solicitud de retenciones",
    "IRPF",
    "formulario 146",
    "Agencia Tributaria",
  ],
  sections: [
    {
      id: "model-146-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-146-purpose-request",
          heading: "Solicitud asociada a retenciones",
          text: "La AEAT denomina Modelo 146 a la solicitud de determinación de retenciones para pensionistas con dos o más pagadores.",
          sourceIds: [
            "aeat.model-146.procedure-home.2026-06-09",
            "aeat.model-146.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-146-purpose-context",
          heading: "Contexto que recoge la ficha",
          text: "La ficha del procedimiento encuadra el modelo en el IRPF y describe un procedimiento especial relacionado con pensiones y prestaciones pasivas procedentes de varios pagadores.",
          sourceIds: ["aeat.model-146.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-146-official-information",
      title: "Información oficial disponible",
      kind: "ACCESS",
      items: [
        {
          id: "model-146-information-record",
          heading: "Ficha del procedimiento",
          text: "La ficha oficial registra información general, canales de atención y la normativa básica del procedimiento. Esta página informativa no incorpora ningún acceso de presentación.",
          sourceIds: ["aeat.model-146.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-146-information-help",
          heading: "Ayuda técnica separada",
          text: "La AEAT mantiene una página de ayuda técnica titulada Modelo 146. Se registra como documentación informativa y no como una acción dentro de esta ficha.",
          sourceIds: ["aeat.model-146.help.2026-01-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-146-materials",
      title: "Formulario y referencia normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-146-materials-form",
          heading: "PDF estático enlazado",
          text: "La página oficial de descarga enlaza un PDF estático de dos páginas. Sus metadatos datan de 2023 y el documento contiene referencias normativas antiguas; por ello su actualidad material queda sin determinar.",
          sourceIds: [
            "aeat.model-146.download.2026-06-09",
            "aeat.model-146.form-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-146-materials-law",
          heading: "Resolución de aprobación enlazada",
          text: "La ficha del procedimiento enlaza la Resolución de 13 de enero de 2003 que aprobó el Modelo 146. El registro de la norma no determina por sí mismo su aplicación actual.",
          sourceIds: ["boe.model-146.resolution-2003"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-146.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 146. IRPF. Pensionistas con dos o más pagadores. Solicitud de determinación del importe de las retenciones.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G604.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ea0b66207578fc7d626952248ba455049b8cffba3053a36ddae771df2d51f712",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-146.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title:
        "Modelo 146. IRPF. Pensionistas con dos o más pagadores. Solicitud de determinación del importe de las retenciones.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G604.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ecc6e8425405bdbae2fe11fc02a6856ce6002d59a641a73d638fe76b18101558",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-146.download.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-146-irpf______d-determinacion-importe-retenciones_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "905a58c2bd2942e5460827be48b75e7e262b10a6666ba02cd9f2a3190c23913f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-146.help.2026-01-09",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 146",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-146.html",
      officialUpdatedOn: "2026-01-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a50b1c72bb61523464f6b482db44c5fd6a293f1e4fbb87e256e6f072dc48d89f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-146.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario PDF oficial enlazado del Modelo 146",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G604/Modelo_146.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bba7fd0ed7beac1cfefe7ac7f776f823054ec6a59045846a0c832e29f947fab2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-146.resolution-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 13 de enero de 2003, por la que se aprueba el modelo 146, de solicitud de determinación del importe de las retenciones",
      canonicalUrl:
        "https://www.boe.es/buscar/doc.php?id=BOE-A-2003-808",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cc20dddf5e704d8c82c50aeb83693e567c7e9344f37b51d2538a23915b933c26",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-146-form",
      kind: "FORM",
      title: "Formulario oficial enlazado del Modelo 146",
      sourceId: "aeat.model-146.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-146.download.2026-06-09",
      mediaType: "application/pdf",
      fileName: "Modelo_146.pdf",
      byteLength: 51149,
      pageCount: 2,
      sha256:
        "bba7fd0ed7beac1cfefe7ac7f776f823054ec6a59045846a0c832e29f947fab2",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "ACROFORM_METADATA_ONLY",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-146-form-preview",
    sourceId: "aeat.model-146.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-146/formulario-modelo-146-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "ab1f22fa909b2d1580a8f518fb70f13824b1ba3f81ca592b6d33812a2b291f7f",
    alt: "Vista previa del formulario oficial enlazado del Modelo 146 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-146-link-procedure",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-146.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-link-download",
      label: "Página oficial de descarga",
      sourceId: "aeat.model-146.download.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-link-help",
      label: "Ayuda técnica oficial del Modelo 146",
      sourceId: "aeat.model-146.help.2026-01-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-link-law",
      label: "Resolución de aprobación del Modelo 146",
      sourceId: "boe.model-146.resolution-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-146-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 146?",
      answer: "La AEAT lo identifica como una solicitud relacionada con la determinación de retenciones para pensionistas con dos o más pagadores.",
      sourceIds: [
        "aeat.model-146.procedure-home.2026-06-09",
        "aeat.model-146.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-faq-context",
      question: "¿En qué impuesto sitúa la AEAT este modelo?",
      answer: "La denominación oficial y la ficha del procedimiento lo sitúan en el Impuesto sobre la Renta de las Personas Físicas.",
      sourceIds: ["aeat.model-146.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-faq-record",
      question: "¿Existe una ficha oficial del procedimiento?",
      answer: "Sí. La AEAT publica una ficha G604 con la denominación, el objeto, los datos generales y la normativa básica del procedimiento.",
      sourceIds: ["aeat.model-146.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-faq-help",
      question: "¿Publica la AEAT una página de ayuda técnica específica?",
      answer: "Sí. La Sede mantiene una página de ayuda técnica titulada Modelo 146, separada de la ficha del procedimiento.",
      sourceIds: ["aeat.model-146.help.2026-01-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-faq-document",
      question: "¿Qué documento enlaza la página de descarga?",
      answer: "Enlaza un formulario PDF estático de dos páginas cuyos metadatos registran creación y modificación en 2023.",
      sourceIds: [
        "aeat.model-146.download.2026-06-09",
        "aeat.model-146.form-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-146-faq-law",
      question: "¿Qué norma de aprobación recoge la ficha oficial?",
      answer: "La ficha enlaza la Resolución de 13 de enero de 2003 que aprobó el Modelo 146.",
      sourceIds: [
        "aeat.model-146.procedure-record.2026-06-09",
        "boe.model-146.resolution-2003",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"146">;

const MODEL_147_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: RELEASE_ID,
  code: "147",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena",
  summary:
    "Comunicación que la AEAT relaciona con el desplazamiento a territorio español de trabajadores por cuenta ajena y con un documento acreditativo para el pagador.",
  searchTerms: [
    "modelo 147",
    "desplazamiento a España",
    "territorio español",
    "trabajadores por cuenta ajena",
    "cambio de residencia",
    "retenciones del trabajo",
    "documento acreditativo",
    "pagador",
    "IRPF",
    "formulario 147",
    "Agencia Tributaria",
  ],
  sections: [
    {
      id: "model-147-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-147-purpose-communication",
          heading: "Comunicación de desplazamiento",
          text: "La AEAT identifica el Modelo 147 con la comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena.",
          sourceIds: [
            "aeat.model-147.procedure-home.2026-06-09",
            "aeat.model-147.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-147-purpose-document",
          heading: "Documento acreditativo descrito",
          text: "La ficha del procedimiento explica que la comunicación se vincula con la obtención de un documento acreditativo de la Administración tributaria destinado al pagador de rendimientos del trabajo.",
          sourceIds: ["aeat.model-147.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-147-official-information",
      title: "Información oficial disponible",
      kind: "ACCESS",
      items: [
        {
          id: "model-147-information-record",
          heading: "Ficha del procedimiento",
          text: "La AEAT publica una ficha G605 con la denominación, el objeto, los datos generales y las referencias normativas. Esta ficha informativa no incorpora accesos de presentación.",
          sourceIds: ["aeat.model-147.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-147-information-help",
          heading: "Ayuda técnica separada",
          text: "La Sede mantiene una página de ayuda técnica específica titulada Modelo 147. Se registra únicamente como documentación oficial informativa.",
          sourceIds: ["aeat.model-147.help.2026-06-19"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-147-materials",
      title: "Formulario y normativa enlazada",
      kind: "DETAILS",
      items: [
        {
          id: "model-147-materials-form",
          heading: "Formulario PDF enlazado",
          text: "La página de descarga enlaza un formulario PDF interactivo de dos páginas. Sus metadatos registran creación en 2007 y modificación en 2010; se conserva como documento oficial enlazado con actualidad material sin determinar.",
          sourceIds: [
            "aeat.model-147.download.2026-06-09",
            "aeat.model-147.form-pdf.captured-2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-147-materials-law",
          heading: "Referencias normativas registradas",
          text: "La AEAT enlaza la Orden HAC/117/2003 como normativa básica y de tramitación. La ficha también enlaza la Resolución de 28 de diciembre de 2009 relativa a la Sede y sus registros electrónicos.",
          sourceIds: [
            "boe.model-147.order-hac-117-2003",
            "boe.aeat-electronic-office-resolution-2009",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-147.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 147. IRPF. Comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G605.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "00ee3591f31d3cd00bb86dc79161e5776fe5112a6da0a7e3aab19cf1ee89d917",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-147.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title:
        "Modelo 147. IRPF. Comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G605.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b82f516eb68702a601d9ac7f9f0a9d0b34b614071a4f5b3ee22cf5c9e45b46ec",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-147.download.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-147-irpf______panol-efectuado-trabajadores-ajena_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "04901e35668f186aac21af3d1c31931910d7c02d0ae8895d90ae5c468aa71254",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-147.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 147",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-147.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d79d556f15e38efb22eeead34aa72471e52cda8f0352973affde880b0193c9e0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-147.form-pdf.captured-2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title:
        "Mod. 147: Comunicación del desplazamiento a territorio español efectuada por trabajadores por cuenta ajena.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G605/mod147_mi_MI.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5503066f11f88c0cccd32163af3f49a977a0c5d4993f7d9aad4e7b131ed715ad",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-147.order-hac-117-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Orden HAC/117/2003, de 31 de enero, por la que se aprueban los modelos para comunicar el cambio de residencia a efectos de retenciones sobre rendimientos del trabajo",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2003-2098",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6c76f775871ec56ef2af4a7284f06b82421e928a4ecc9e34b4a18ce6e8e48c18",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.aeat-electronic-office-resolution-2009",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title:
        "Resolución de 28 de diciembre de 2009, por la que se crea la sede electrónica y se regulan los registros electrónicos de la AEAT",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2009-21051",
      officialUpdatedOn: "2024-07-23",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a63d27d7c63eb206716546d3291d6ff2bb2af41238ad4ba0c93624931a390af2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [
    {
      id: "model-147-form",
      kind: "FORM",
      title: "Formulario oficial enlazado del Modelo 147",
      sourceId: "aeat.model-147.form-pdf.captured-2026-07-13",
      landingPageSourceId: "aeat.model-147.download.2026-06-09",
      mediaType: "application/pdf",
      fileName: "mod147_mi_MI.pdf",
      byteLength: 216196,
      pageCount: 2,
      sha256:
        "5503066f11f88c0cccd32163af3f49a977a0c5d4993f7d9aad4e7b131ed715ad",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-147-form-preview",
    sourceId: "aeat.model-147.form-pdf.captured-2026-07-13",
    publicHref:
      "/fiscal-models/modelo-147/formulario-modelo-147-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "6fc176ec5db971a4fc7c9f8522e01eb5f267f1d605b9e154ed6f5b79df31fd33",
    alt: "Vista previa del formulario oficial enlazado del Modelo 147 de la Agencia Tributaria",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-147-link-procedure",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-147.procedure-record.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-link-download",
      label: "Página oficial de descarga",
      sourceId: "aeat.model-147.download.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-link-help",
      label: "Ayuda técnica oficial del Modelo 147",
      sourceId: "aeat.model-147.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-link-law",
      label: "Orden HAC/117/2003",
      sourceId: "boe.model-147.order-hac-117-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-147-faq-purpose",
      question: "¿Qué identifica la AEAT como Modelo 147?",
      answer: "La AEAT lo identifica como la comunicación del desplazamiento a territorio español efectuado por trabajadores por cuenta ajena.",
      sourceIds: [
        "aeat.model-147.procedure-home.2026-06-09",
        "aeat.model-147.procedure-record.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-faq-document-purpose",
      question: "¿Qué documento describe la ficha del procedimiento?",
      answer: "La ficha vincula la comunicación con un documento acreditativo expedido por la Administración tributaria para el pagador de rendimientos del trabajo.",
      sourceIds: ["aeat.model-147.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-faq-record",
      question: "¿Existe una ficha oficial del procedimiento?",
      answer: "Sí. La AEAT publica la ficha G605 con datos generales, objeto y referencias normativas.",
      sourceIds: ["aeat.model-147.procedure-record.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-faq-help",
      question: "¿Publica la AEAT una página de ayuda técnica específica?",
      answer: "Sí. La Sede mantiene una página de ayuda técnica titulada Modelo 147, separada de la ficha del procedimiento.",
      sourceIds: ["aeat.model-147.help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-faq-document",
      question: "¿Qué documento enlaza la página de descarga?",
      answer: "Enlaza un formulario PDF interactivo de dos páginas cuyos metadatos registran creación en 2007 y modificación en 2010.",
      sourceIds: [
        "aeat.model-147.download.2026-06-09",
        "aeat.model-147.form-pdf.captured-2026-07-13",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-147-faq-law",
      question: "¿Qué normativa básica enlaza la AEAT?",
      answer: "La página y la ficha enlazan la Orden HAC/117/2003, de 31 de enero, como referencia normativa del modelo.",
      sourceIds: [
        "aeat.model-147.procedure-home.2026-06-09",
        "boe.model-147.order-hac-117-2003",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"147">;

export const PUBLIC_AEAT_BATCH_04_WORK_RETENTIONS_CONTENT_V1 = deepFreeze(
  [MODEL_145_CONTENT, MODEL_146_CONTENT, MODEL_147_CONTENT] as const satisfies readonly PublicAeatOfficialModelContentV1[],
);
