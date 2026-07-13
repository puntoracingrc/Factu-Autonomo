import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_RELEASE_ID_V1 =
  "public-aeat-official-batch-06-declarations-194-196.2026-07-13.v1" as const;

export type PublicAeatBatch06Declarations194196CodeV1 = "194" | "195" | "196";

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

const OFFICIAL_MODEL_INDEX_SOURCE = {
  id: "aeat.models.index.2026-07-08",
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

const REGISTER_DESIGNS_SOURCE = {
  id: "aeat.models-100-199.register-designs.2026-07-08",
  authority: "AEAT",
  kind: "INFORMATION_PAGE",
  title: "Diseños de registro. Modelos 100 al 199",
  canonicalUrl:
    "https://sede.agenciatributaria.gob.es/Sede/ayuda/disenos-registro/modelos-100-199.html",
  officialUpdatedOn: "2026-07-08",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "b059ee0dbe678a8a395329805e834651b494da5bfa66877328c857c78a9739af",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_1999_11_18_SOURCE = {
  id: "boe.model-194.order-1999-11-18",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 18 de noviembre de 1999",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-1999-22309",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "06abdab80b6db9fbd7e0580baad5a77fbabbbc408d3c07a3f92a3202f9a950d8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1504_2024_SOURCE = {
  id: "boe.model-194.order-hac-1504-2024",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1504/2024, de 26 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2024-27528",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "91c443efff4b5cca5403d5573be18061effa495cdd9769c6dfc305b3c9110c3c",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_2001_12_21_SOURCE = {
  id: "boe.model-195.order-2001-12-21",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden de 21 de diciembre de 2001",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2001-24854",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "80d6c67856ff197f3d557f75e05038f2fb98d19f7f201d2a1db2aee971f4205f",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1430_2025_SOURCE = {
  id: "boe.model-195.order-hac-1430-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/1430/2025, de 3 de diciembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-25389",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "45522b6eed4eca77673bffd87d7a4d744b9195e00ec4594a9fb9ae591b32421a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_EHA_3300_2008_SOURCE = {
  id: "boe.model-196.order-eha-3300-2008",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/3300/2008, de 7 de noviembre",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2008-18545",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "03319d5e8db23aa1392f5dc7bdff603a864008359d4df7614f554ce360eb113a",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_747_2025_SOURCE = {
  id: "boe.model-196.order-hac-747-2025",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAC/747/2025, de 27 de junio",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2025-14600",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "44211d97358fb7f3b17b014ecb8860926d2144010287a920093f39f0686efdc1",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_194_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_RELEASE_ID_V1,
  code: "194",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Retenciones e ingresos a cuenta del IRPF, IS e IRNR (establecimientos permanentes) sobre rendimientos del capital mobiliario y rentas derivadas de la transmisión, amortización, reembolso, canje o conversión de cualquier clase de activos representativos de la captación y utilización de capitales ajenos. Resumen anual.",
  summary:
    "Declaración informativa que la AEAT identifica como resumen anual de retenciones e ingresos a cuenta vinculados a determinados rendimientos del capital mobiliario y a rentas derivadas de operaciones sobre activos representativos de capitales ajenos.",
  searchTerms: [
    "modelo 194",
    "declaración informativa",
    "resumen anual",
    "retenciones e ingresos a cuenta",
    "rendimientos del capital mobiliario",
    "transmisión de activos",
    "amortización de activos",
    "reembolso canje conversión",
    "captación de capitales ajenos",
    "fichero TGVI",
    "diseño de registro 194",
    "Orden 18 noviembre 1999",
    "Orden HAC 1504 2024",
  ],
  sections: [
    {
      id: "model-194-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-194-purpose-identity",
          heading:
            "Resumen anual sobre determinadas rentas de capital mobiliario",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 194 como una declaración informativa y resumen anual sobre las categorías de rendimientos y operaciones que figuran en su denominación oficial.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-194.procedure-home.2026-07-08",
            "aeat.model-194.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-194-purpose-record",
          heading: "Ficha administrativa separada",
          text: "La ficha administrativa reproduce la identidad del modelo y describe el procedimiento como un resumen anual. Esta referencia documental no determina su aplicación a una persona o entidad concreta.",
          sourceIds: ["aeat.model-194.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-194-access",
      title: "Canal y material técnico descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-194-access-file",
          heading: "Canal mediante fichero y TGVI",
          text: "La portada y la ayuda técnica de la AEAT describen un canal mediante fichero y un entorno TGVI. Aquí se registra únicamente la existencia del método, sin abrir ni ejecutar ninguna gestión.",
          sourceIds: [
            "aeat.model-194.procedure-home.2026-07-08",
            "aeat.model-194.file-upload-help.2026-04-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-194-access-register-design",
          heading: "Diseño de registro del ejercicio 2024",
          text: "El catálogo técnico enlaza un diseño de registro del Modelo 194 rotulado para el ejercicio 2024. El PDF consta de veintiuna páginas y se conserva como descarga técnica, no como formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-194.register-design-pdf.2025-01-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-194-details",
      title: "Trazabilidad normativa y documental",
      kind: "DETAILS",
      items: [
        {
          id: "model-194-details-approval",
          heading: "Norma de aprobación correctamente identificada",
          text: "La fuente BOE registrada para la Orden de 18 de noviembre de 1999 es el documento BOE-A-1999-22309, que incluye la aprobación del Modelo 194.",
          sourceIds: [ORDER_1999_11_18_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-194-details-amendment",
          heading: "Modificación publicada en 2024",
          text: "La Orden HAC/1504/2024 modifica la orden de aprobación del Modelo 194 y figura como referencia normativa en la página oficial del procedimiento.",
          sourceIds: [
            "aeat.model-194.procedure-home.2026-07-08",
            ORDER_HAC_1504_2024_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-194.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 194 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI13.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0dab1615fa7b1bd47766aee18302700f4a1d0602c9833a8efd023b80a0bbd293",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-194.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 194",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI13.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ed3d1de5151f5d0cee388f5b014d7fa3f977cbdbe80bdb1eba68c4e9b81c30e1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-194.file-upload-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 190 al 198 · Modelo 194",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-194.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "f0fa3f401afe1d48b5d57ce37ce71c373b13880afed2916cd316a73a70585aca",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-194.register-design-pdf.2025-01-02",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 194 · diseño de registro · ejercicio 2024",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_194_2024.pdf",
      officialUpdatedOn: "2025-01-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4a738a126ddb465aac236b687aa25441b7cb71ec4b0ef6ea940096a3747b2651",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_1999_11_18_SOURCE,
    ORDER_HAC_1504_2024_SOURCE,
  ],
  documents: [
    {
      id: "model-194-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 194 · ejercicio 2024",
      sourceId: "aeat.model-194.register-design-pdf.2025-01-02",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_194_2024.pdf",
      byteLength: 183268,
      pageCount: 21,
      sha256:
        "4a738a126ddb465aac236b687aa25441b7cb71ec4b0ef6ea940096a3747b2651",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-194-link-procedure",
      label: "Página oficial del Modelo 194",
      sourceId: "aeat.model-194.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-link-help",
      label: "Ayuda técnica oficial del Modelo 194",
      sourceId: "aeat.model-194.file-upload-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-link-register-design",
      label: "Diseño de registro oficial del Modelo 194",
      sourceId: "aeat.model-194.register-design-pdf.2025-01-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-link-approval-order",
      label: "Orden de 18 de noviembre de 1999",
      sourceId: ORDER_1999_11_18_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-link-amendment-order",
      label: "Orden HAC/1504/2024",
      sourceId: ORDER_HAC_1504_2024_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-194-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 194?",
      answer:
        "Lo identifica como una declaración informativa y resumen anual referido a las rentas y operaciones descritas en su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-faq-frequency",
      question: "¿La denominación oficial lo describe como anual?",
      answer:
        "Sí. Tanto el índice como las páginas propias terminan la denominación con «Resumen anual».",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-194.procedure-home.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-faq-access",
      question: "¿Qué canal técnico describe la AEAT?",
      answer:
        "La portada y la ayuda técnica describen un canal mediante fichero y un entorno TGVI.",
      sourceIds: [
        "aeat.model-194.procedure-home.2026-07-08",
        "aeat.model-194.file-upload-help.2026-04-22",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-faq-register-design",
      question: "¿Qué documento técnico se conserva?",
      answer:
        "Se conserva el diseño de registro rotulado para el ejercicio 2024, un PDF de veintiuna páginas sin AcroForm ni JavaScript detectados.",
      sourceIds: ["aeat.model-194.register-design-pdf.2025-01-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-faq-approval",
      question: "¿Qué fuente BOE registra la aprobación del modelo?",
      answer:
        "La Orden de 18 de noviembre de 1999 se registra mediante el documento BOE-A-1999-22309.",
      sourceIds: [ORDER_1999_11_18_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-194-faq-amendment",
      question: "¿Qué modificación posterior se documenta?",
      answer:
        "La Orden HAC/1504/2024 modifica la orden de aprobación del Modelo 194.",
      sourceIds: [ORDER_HAC_1504_2024_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-194.procedure-home.2026-07-08",
      "aeat.model-194.file-upload-help.2026-04-22",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"194">;

const MODEL_195_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_RELEASE_ID_V1,
  code: "195",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Declaración trimestral de cuentas u operaciones cuyos titulares no han facilitado el NIF a las Entidades de Crédito en el plazo establecido.",
  summary:
    "Declaración informativa trimestral que la AEAT identifica con cuentas u operaciones cuyos titulares no han facilitado el NIF a las entidades de crédito en el contexto descrito por la denominación oficial.",
  searchTerms: [
    "modelo 195",
    "declaración informativa",
    "declaración trimestral",
    "cuentas u operaciones",
    "titulares sin NIF",
    "entidades de crédito",
    "fichero TGVI",
    "diseño de registro 195",
    "ejercicio 2025",
    "Orden 21 diciembre 2001",
    "Orden HAC 1430 2025",
  ],
  sections: [
    {
      id: "model-195-purpose",
      title: "Identidad y alcance oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-195-purpose-identity",
          heading: "Declaración informativa trimestral",
          text: "El índice general y las páginas del procedimiento identifican el Modelo 195 como una declaración informativa trimestral sobre las cuentas u operaciones descritas en su denominación oficial.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-195.procedure-home.2026-03-01",
            "aeat.model-195.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-195-purpose-record",
          heading: "Descripción administrativa separada",
          text: "La ficha administrativa conserva la identidad trimestral y sitúa el procedimiento en el ámbito de las entidades de crédito. Esta ficha informativa no evalúa su aplicación a un caso concreto.",
          sourceIds: ["aeat.model-195.procedure-record.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-195-access",
      title: "Canal y material técnico descritos",
      kind: "ACCESS",
      items: [
        {
          id: "model-195-access-file",
          heading: "Canal mediante fichero y TGVI",
          text: "La portada y la ayuda técnica de la AEAT describen un canal mediante fichero y un entorno TGVI. El registro de este método es meramente informativo y no inicia ninguna gestión.",
          sourceIds: [
            "aeat.model-195.procedure-home.2026-03-01",
            "aeat.model-195.file-upload-help.2026-04-22",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-195-access-register-design",
          heading: "Diseño de registro del ejercicio 2025",
          text: "El catálogo técnico enlaza un diseño de registro del Modelo 195 rotulado para el ejercicio 2025. El PDF consta de dieciséis páginas y se conserva como material técnico, no como formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-195.register-design-pdf.2025-12-12",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-195-details",
      title: "Trazabilidad normativa y documental",
      kind: "DETAILS",
      items: [
        {
          id: "model-195-details-approval",
          heading: "Norma de aprobación",
          text: "La Orden de 21 de diciembre de 2001 aprueba el Modelo 195 con la identidad trimestral recogida por la AEAT.",
          sourceIds: [ORDER_2001_12_21_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-195-details-amendment",
          heading: "Modificación publicada en 2025",
          text: "La Orden HAC/1430/2025 modifica la orden que aprueba los modelos 195 y 199 y figura como referencia normativa en la página oficial del Modelo 195.",
          sourceIds: [
            "aeat.model-195.procedure-home.2026-03-01",
            ORDER_HAC_1430_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-195.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 195 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI14.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7180abdf2bc476793837be4a5e397ce1f8c3f8763c273210a0840020231b4cbf",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-195.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 195",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI14.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0ac5353d86ca32ea914617026d9b80620f7f22c5af6e776f8e349756ed541e84",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-195.file-upload-help.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 190 al 198 · Modelo 195",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-195.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "2643bf555082a9cb26c22262332fe5ccc9d3564817023d14357f67150a8a3d9d",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-195.register-design-pdf.2025-12-12",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 195 · diseño de registro · ejercicio 2025",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/DR_Modelo_195_2025.pdf",
      officialUpdatedOn: "2025-12-12",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "4bbf22e84b3eb30b4c6527337b32fbb87179274064dccf1ff010901cc674a4f7",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_2001_12_21_SOURCE,
    ORDER_HAC_1430_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-195-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 195 · ejercicio 2025",
      sourceId: "aeat.model-195.register-design-pdf.2025-12-12",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Modelo_195_2025.pdf",
      byteLength: 188426,
      pageCount: 16,
      sha256:
        "4bbf22e84b3eb30b4c6527337b32fbb87179274064dccf1ff010901cc674a4f7",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-195-link-procedure",
      label: "Página oficial del Modelo 195",
      sourceId: "aeat.model-195.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-link-help",
      label: "Ayuda técnica oficial del Modelo 195",
      sourceId: "aeat.model-195.file-upload-help.2026-04-22",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-link-register-design",
      label: "Diseño de registro oficial del Modelo 195",
      sourceId: "aeat.model-195.register-design-pdf.2025-12-12",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-link-approval-order",
      label: "Orden de 21 de diciembre de 2001",
      sourceId: ORDER_2001_12_21_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-link-amendment-order",
      label: "Orden HAC/1430/2025",
      sourceId: ORDER_HAC_1430_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-195-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 195?",
      answer:
        "Lo identifica como una declaración informativa trimestral sobre las cuentas u operaciones descritas en su denominación oficial.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-faq-frequency",
      question: "¿La denominación oficial lo describe como trimestral?",
      answer:
        "Sí. El índice general, la portada y la ficha administrativa utilizan expresamente la palabra «trimestral».",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-195.procedure-home.2026-03-01",
        "aeat.model-195.procedure-record.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-faq-access",
      question: "¿Qué canal técnico describe la AEAT?",
      answer:
        "La portada y la ayuda técnica describen un canal mediante fichero y un entorno TGVI.",
      sourceIds: [
        "aeat.model-195.procedure-home.2026-03-01",
        "aeat.model-195.file-upload-help.2026-04-22",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-faq-register-design",
      question: "¿Qué documento técnico se conserva?",
      answer:
        "Se conserva el diseño de registro rotulado para el ejercicio 2025, un PDF de dieciséis páginas sin AcroForm ni JavaScript detectados.",
      sourceIds: ["aeat.model-195.register-design-pdf.2025-12-12"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-faq-approval",
      question: "¿Qué norma aprueba el Modelo 195?",
      answer:
        "La Orden de 21 de diciembre de 2001 aprueba el Modelo 195 y conserva en su título la referencia a su carácter trimestral.",
      sourceIds: [ORDER_2001_12_21_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-195-faq-amendment",
      question: "¿Qué modificación posterior se documenta?",
      answer:
        "La Orden HAC/1430/2025 modifica la orden que aprueba los modelos 195 y 199.",
      sourceIds: [ORDER_HAC_1430_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-195.procedure-home.2026-03-01",
      "aeat.model-195.file-upload-help.2026-04-22",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"195">;

const MODEL_196_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_RELEASE_ID_V1,
  code: "196",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa mensual de cuentas en toda clase de instituciones financieras y resumen anual de retenciones e ingresos a cuenta sobre rendimientos del capital mobiliario y rentas obtenidas por la contraprestación derivada de cuentas en toda clase de instituciones financieras.",
  summary:
    "Declaración informativa que las páginas propias de la AEAT describen con una vertiente mensual sobre cuentas y un resumen anual de retenciones e ingresos a cuenta sobre las rentas indicadas en su denominación oficial.",
  searchTerms: [
    "modelo 196",
    "declaración informativa mensual",
    "cuentas en instituciones financieras",
    "resumen anual de retenciones",
    "rendimientos del capital mobiliario",
    "servicio web 196",
    "ejercicio 2026 y siguientes",
    "esquemas XML modelo 196",
    "WSDL modelo 196",
    "validaciones modelo 196",
    "diseño de registro 2023",
    "Orden EHA 3300 2008",
    "Orden HAC 747 2025",
  ],
  sections: [
    {
      id: "model-196-purpose",
      title: "Identidad oficial actual",
      kind: "PURPOSE",
      items: [
        {
          id: "model-196-purpose-current-identity",
          heading: "Formulación mensual y resumen anual",
          text: "La portada y la ficha administrativa actuales denominan el Modelo 196 como declaración informativa mensual de cuentas y resumen anual de retenciones e ingresos a cuenta sobre las rentas descritas en el título oficial.",
          sourceIds: [
            "aeat.model-196.procedure-home.2026-07-08",
            "aeat.model-196.procedure-record.2026-05-27",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-196-purpose-documentary-context",
          heading: "Formulaciones anteriores conservadas como contexto",
          text: "El índice general, la ayuda TGVI rotulada para 2025 y el diseño de registro del ejercicio 2023 conservan una formulación documental anterior. No se utilizan para sustituir la identidad mensual publicada en las páginas propias actuales.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-196.file-upload-help-2025.2026-04-22",
            "aeat.model-196.register-design-2023-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-196-access",
      title: "Canal actual y documentación técnica",
      kind: "ACCESS",
      items: [
        {
          id: "model-196-access-current-web-service",
          heading: "Servicio web para 2026 y siguientes",
          text: "La portada oficial identifica un cliente de servicio web para el ejercicio 2026 y siguientes. Las páginas de esquemas y WSDL y la documentación técnica se registran como información del mismo canal, sin enlazar una acción de envío.",
          sourceIds: [
            "aeat.model-196.procedure-home.2026-07-08",
            "aeat.model-196.schemas.2026-05-28",
            "aeat.model-196.wsdl.2026-05-28",
            "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-196-access-technical-documents",
          heading: "Descripción y validaciones del servicio",
          text: "La AEAT enlaza un documento de descripción del servicio web, identificado internamente como versión 1.3 de 28 de mayo de 2026, y un documento de validaciones versión 1.0 actualizado el 27 de mayo de 2026.",
          sourceIds: [
            "aeat.model-196.procedure-home.2026-07-08",
            "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
            "aeat.model-196.validations-pdf.v1-0.2026-05-27",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-196-details",
      title: "Ayuda, diseño anterior y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-196-details-faq-and-register-design",
          heading: "Preguntas frecuentes actuales y diseño anterior",
          text: "La AEAT publica preguntas frecuentes rotuladas para 2026 y siguientes. Por separado, el catálogo técnico conserva un diseño de registro del ejercicio 2023; este último se registra como referencia histórica y no como canal actual.",
          sourceIds: [
            "aeat.model-196.faq.2026-07-08",
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-196.register-design-2023-pdf.2026-07-13",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-196-details-laws",
          heading: "Evolución normativa registrada",
          text: "La Orden EHA/3300/2008 recoge la formulación anual anterior. La Orden HAC/747/2025 aprueba la formulación mensual que muestran las páginas actuales del Modelo 196.",
          sourceIds: [
            ORDER_EHA_3300_2008_SOURCE.id,
            ORDER_HAC_747_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-196.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 196 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI15.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "fbdd3d646c4a545886d2eabe0d4679c38a9b45c369b3b51c5783a4dac6eb273a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.procedure-record.2026-05-27",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 196",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI15.shtml",
      officialUpdatedOn: "2026-05-27",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6ff58ee2c7f06d86ae18b537cf24e6ef1b97e4a45b5b4a0e04b7c2bcdabed076",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.file-upload-help-2025.2026-04-22",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 190 al 198 · Modelo 196 · ayuda TGVI de 2025",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-190-198/modelo-196.html",
      officialUpdatedOn: "2026-04-22",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "743380212d84862d6e1c648ed02bd17433e776d827de596b284b76f329cc61cd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title:
        "Preguntas frecuentes del Modelo 196 · ejercicio 2026 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-196-decla_____uentas-toda-clase-financieras_/preguntas-frecuentes-modelo-196.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e712bb433dedaa6cadf7d085737c449bb0bcc5be04bf4aff17a55851a0d503b0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.schemas.2026-05-28",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Esquemas de los servicios web del Modelo 196",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-196-decla_____uentas-toda-clase-financieras_/esquemas-servicios-web.html",
      officialUpdatedOn: "2026-05-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bc70c259fd56a503b7fe2e9880fd7a3863f229102135e3da50387582a7237c80",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.wsdl.2026-05-28",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "WSDL de los servicios web del Modelo 196",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-196-decla_____uentas-toda-clase-financieras_/wsdl-servicios-web.html",
      officialUpdatedOn: "2026-05-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5514a16b371496c3808a9d9b38c00d2e21b3795bd8e48e5469292be174716010",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-196.register-design-2023-pdf.2026-07-13",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 196 · diseño de registro · ejercicio 2023",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos_23/DR_Mod_196_2023.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "722a6e13b37ed3e5402293bc809a547931398c516de7202cefd52c1b8b4aab90",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 196 · descripción del servicio web · versión 1.3",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/Informativas/Mod_196/Mod196_ServicioWeb.pdf",
      officialUpdatedOn: "2026-05-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e747d93ea902efbb408dc4015da158eb7e61305e5f91e4ca7334eb232fad0457",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-196.validations-pdf.v1-0.2026-05-27",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 196 · validaciones y errores · versión 1.0",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/AEAT_Desarrolladores/EEDD/Informativas/Mod_196/mod196_documento_validaciones_v1.0.pdf",
      officialUpdatedOn: "2026-05-27",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9b21836ca8269a3a2fe0ba87d1ac0458953e772b56cac01dd6f35a54045ea4a6",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_3300_2008_SOURCE,
    ORDER_HAC_747_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-196-register-design-2023-document",
      kind: "REGISTER_DESIGN",
      title: "Diseño de registro del Modelo 196 · ejercicio 2023",
      sourceId: "aeat.model-196.register-design-2023-pdf.2026-07-13",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "DR_Mod_196_2023.pdf",
      byteLength: 185033,
      pageCount: 38,
      sha256:
        "722a6e13b37ed3e5402293bc809a547931398c516de7202cefd52c1b8b4aab90",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-196-web-service-description-document",
      kind: "GUIDE",
      title: "Descripción del servicio web del Modelo 196 · versión 1.3",
      sourceId: "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
      landingPageSourceId: "aeat.model-196.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "Mod196_ServicioWeb.pdf",
      byteLength: 826296,
      pageCount: 34,
      sha256:
        "e747d93ea902efbb408dc4015da158eb7e61305e5f91e4ca7334eb232fad0457",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-196-validations-document",
      kind: "GUIDE",
      title: "Validaciones y errores del Modelo 196 · versión 1.0",
      sourceId: "aeat.model-196.validations-pdf.v1-0.2026-05-27",
      landingPageSourceId: "aeat.model-196.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "mod196_documento_validaciones_v1.0.pdf",
      byteLength: 742967,
      pageCount: 36,
      sha256:
        "9b21836ca8269a3a2fe0ba87d1ac0458953e772b56cac01dd6f35a54045ea4a6",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: null,
  links: [
    {
      id: "model-196-link-procedure",
      label: "Página oficial del Modelo 196",
      sourceId: "aeat.model-196.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 196",
      sourceId: "aeat.model-196.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-link-schemas",
      label: "Esquemas oficiales de los servicios web",
      sourceId: "aeat.model-196.schemas.2026-05-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-link-wsdl",
      label: "Información oficial sobre el WSDL",
      sourceId: "aeat.model-196.wsdl.2026-05-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-link-service-description",
      label: "Descripción oficial del servicio web",
      sourceId: "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-link-current-order",
      label: "Orden HAC/747/2025",
      sourceId: ORDER_HAC_747_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-196-faq-current-identity",
      question: "¿Cómo denominan las páginas actuales al Modelo 196?",
      answer:
        "Lo denominan declaración informativa mensual de cuentas y resumen anual de retenciones e ingresos a cuenta sobre las rentas descritas en el título oficial.",
      sourceIds: [
        "aeat.model-196.procedure-home.2026-07-08",
        "aeat.model-196.procedure-record.2026-05-27",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-faq-current-access",
      question: "¿Qué canal actual registra esta ficha?",
      answer:
        "Registra el servicio web que la portada oficial rotula para el ejercicio 2026 y siguientes.",
      sourceIds: [
        "aeat.model-196.procedure-home.2026-07-08",
        "aeat.model-196.schemas.2026-05-28",
        "aeat.model-196.wsdl.2026-05-28",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-faq-legacy-help",
      question: "¿Cómo se trata la ayuda de fichero y TGVI?",
      answer:
        "Se conserva únicamente como contexto del ejercicio 2025 y no se registra como método actual para 2026 y siguientes.",
      sourceIds: [
        "aeat.model-196.procedure-home.2026-07-08",
        "aeat.model-196.file-upload-help-2025.2026-04-22",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-faq-service-documents",
      question: "¿Qué documentación técnica del servicio publica la AEAT?",
      answer:
        "Publica páginas de esquemas y WSDL, una descripción del servicio web versión 1.3 y un documento de validaciones versión 1.0.",
      sourceIds: [
        "aeat.model-196.schemas.2026-05-28",
        "aeat.model-196.wsdl.2026-05-28",
        "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
        "aeat.model-196.validations-pdf.v1-0.2026-05-27",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-faq-register-design",
      question: "¿El diseño de registro de 2023 representa el canal actual?",
      answer:
        "No. Se conserva como referencia técnica anterior y separada del servicio web rotulado para 2026 y siguientes.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "aeat.model-196.register-design-2023-pdf.2026-07-13",
        "aeat.model-196.procedure-home.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-196-faq-laws",
      question: "¿Qué cambio muestran las normas registradas?",
      answer:
        "La Orden EHA/3300/2008 conserva la formulación anual anterior y la Orden HAC/747/2025 aprueba la formulación mensual actual.",
      sourceIds: [ORDER_EHA_3300_2008_SOURCE.id, ORDER_HAC_747_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-196.procedure-home.2026-07-08",
      "aeat.model-196.schemas.2026-05-28",
      "aeat.model-196.wsdl.2026-05-28",
      "aeat.model-196.web-service-description-pdf.v1-3.2026-05-28",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"196">;

export const PUBLIC_AEAT_BATCH_06_DECLARATIONS_194_196_CONTENT_V1 = deepFreeze([
  MODEL_194_CONTENT,
  MODEL_195_CONTENT,
  MODEL_196_CONTENT,
] as const);
