import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_RELEASE_ID_V1 =
  "public-aeat-official-batch-04-information-returns.2026-07-13.v1" as const;

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

const TECHNICAL_DESIGNS_AMENDMENT_SOURCE = {
  id: "boe.order-hfp-1822-2016",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1822/2016, de 24 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2016-11251",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "2d97ec6c9332f168e4c8890ccbd3cea72a7904e73aa3d8a0f5d3bbf758b1c46e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_156_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_RELEASE_ID_V1,
  code: "156",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Cotizaciones de afiliados y mutualidades a efectos de la deducción por maternidad. Resumen anual.",
  summary:
    "Declaración informativa anual que la AEAT identifica con cotizaciones de afiliados y mutualidades a efectos de la deducción por maternidad.",
  searchTerms: [
    "modelo 156",
    "declaración informativa",
    "cotizaciones de afiliados",
    "cotizaciones de mutualidades",
    "deducción por maternidad",
    "resumen anual",
    "ayuda modelo 156",
    "diseño de registro 156",
    "Orden HAC 3580 2003",
    "Orden HFP 1351 2021",
  ],
  sections: [
    {
      id: "model-156-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-156-purpose-identity",
          heading: "Cotizaciones y deducción por maternidad",
          text: "El índice general y las páginas propias de la AEAT identifican el Modelo 156 como una declaración informativa anual sobre cotizaciones de afiliados y mutualidades a efectos de la deducción por maternidad.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-156.procedure-home.2026-04-07",
            "aeat.model-156.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-156-materials",
      title: "Ayuda y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-156-materials-help",
          heading: "Ayuda técnica específica",
          text: "La AEAT mantiene una página de ayuda técnica específica para el Modelo 156 dentro de la serie de modelos informativos del 038 al 180.",
          sourceIds: ["aeat.model-156.help.2026-02-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-156-materials-register-design",
          heading: "Diseño de registro, no formulario",
          text: "El índice técnico de modelos 100 al 199 incluye una entrada del Modelo 156 vinculada a un diseño de registro. Este release no incorpora ese material como documento ni miniatura porque no es un formulario del modelo.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-156-context",
      title: "Contexto documental",
      kind: "SCOPE",
      items: [
        {
          id: "model-156-context-page-dates",
          heading: "Páginas oficiales separadas",
          text: "La página principal y la ficha administrativa se conservan como fuentes distintas, con actualizaciones oficiales publicadas el 7 de abril y el 8 de julio de 2026, respectivamente.",
          sourceIds: [
            "aeat.model-156.procedure-home.2026-04-07",
            "aeat.model-156.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-156-context-law",
          heading: "Aprobación y modificación normativa",
          text: "La Orden HAC/3580/2003 aprueba el Modelo 156 y la Orden HFP/1351/2021 modifica, entre otras, esa regulación.",
          sourceIds: [
            "boe.model-156.order-hac-3580-2003",
            "boe.model-156.order-hfp-1351-2021",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-156.procedure-home.2026-04-07",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 156 · cotizaciones de afiliados y mutualidades",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G608.shtml",
      officialUpdatedOn: "2026-04-07",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "5837d0b1eb6b44fe9a61d10b36285e0ac2839a55524aaec51be6c4681e40e35f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-156.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 156",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G608.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "67706ecd7f644f4cf69682e34746a6414115229c6b9be2c5ab04d0f3a6f4955e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-156.help.2026-02-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 038 al 180 · Modelo 156",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-156.html",
      officialUpdatedOn: "2026-02-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3efb53931fb2bc94c75aab23f9ad4256acdaca10ade4224bec7cf6fdea34a444",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "boe.model-156.order-hac-3580-2003",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/3580/2003, de 17 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2003-23509",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "cd54fc815a505e055ab121bdb97333dcf3887016e79c0a2c4a0cbef9c16877cd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "boe.model-156.order-hfp-1351-2021",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1351/2021, de 1 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2021-20004",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d1349b219604b83b54e23eef78e7330ca77f0fe1dbdbc2070886b51427005fa0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-156-link-procedure",
      label: "Página oficial del Modelo 156",
      sourceId: "aeat.model-156.procedure-home.2026-04-07",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-link-help",
      label: "Ayuda técnica oficial del Modelo 156",
      sourceId: "aeat.model-156.help.2026-02-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-link-designs",
      label: "Índice oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-link-approval",
      label: "Orden HAC/3580/2003",
      sourceId: "boe.model-156.order-hac-3580-2003",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-link-amendment",
      label: "Orden HFP/1351/2021",
      sourceId: "boe.model-156.order-hfp-1351-2021",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-156-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 156?",
      answer: "Lo identifica como la declaración informativa anual de cotizaciones de afiliados y mutualidades a efectos de la deducción por maternidad.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-faq-frequency",
      question: "¿La denominación oficial lo describe como anual?",
      answer: "Sí. Tanto el índice como las páginas propias incluyen las expresiones «declaración informativa» y «resumen anual».",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-156.procedure-home.2026-04-07",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-faq-help",
      question: "¿Existe una ayuda técnica oficial específica?",
      answer: "Sí. La AEAT publica una página de ayuda del Modelo 156 dentro de la serie de modelos informativos del 038 al 180.",
      sourceIds: ["aeat.model-156.help.2026-02-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-faq-design",
      question: "¿Qué material estático figura en el índice técnico?",
      answer: "El índice de modelos 100 al 199 recoge un diseño de registro del Modelo 156. Esta ficha no lo trata como formulario ni como miniatura.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-faq-law",
      question: "¿Qué normas se registran para este modelo?",
      answer: "Se registran la Orden HAC/3580/2003 como norma de aprobación y la Orden HFP/1351/2021 como modificación posterior.",
      sourceIds: [
        "boe.model-156.order-hac-3580-2003",
        "boe.model-156.order-hfp-1351-2021",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-156-faq-page-dates",
      question: "¿Qué fechas muestran las páginas oficiales capturadas?",
      answer: "La página principal muestra 7 de abril de 2026 y la ficha administrativa 8 de julio de 2026.",
      sourceIds: [
        "aeat.model-156.procedure-home.2026-04-07",
        "aeat.model-156.procedure-record.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"156">;

const MODEL_159_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_RELEASE_ID_V1,
  code: "159",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración Informativa. Declaración anual de consumo de energía eléctrica.",
  summary:
    "Declaración informativa anual que la AEAT identifica con el consumo de energía eléctrica.",
  searchTerms: [
    "modelo 159",
    "declaración informativa",
    "consumo de energía eléctrica",
    "consumo eléctrico",
    "declaración anual",
    "ayuda modelo 159",
    "diseño de registro 159",
    "Orden HAC 672 2024",
  ],
  sections: [
    {
      id: "model-159-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-159-purpose-identity",
          heading: "Consumo de energía eléctrica",
          text: "El índice general y las páginas propias de la AEAT identifican el Modelo 159 como la declaración informativa anual de consumo de energía eléctrica.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-159.procedure-home.2026-03-01",
            "aeat.model-159.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-159-materials",
      title: "Ayuda y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-159-materials-help",
          heading: "Ayuda técnica específica",
          text: "La AEAT mantiene una página de ayuda técnica específica para el Modelo 159 dentro de la serie de modelos informativos del 038 al 180.",
          sourceIds: ["aeat.model-159.help.2026-02-03"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-159-materials-register-design",
          heading: "Diseño para 2024 y siguientes",
          text: "El índice técnico enlaza para el Modelo 159 un diseño de registro rotulado para 2024 y siguientes. Este release no incorpora ese PDF como documento ni miniatura porque es material técnico, no un formulario.",
          sourceIds: [REGISTER_DESIGNS_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-159-context",
      title: "Contexto documental",
      kind: "SCOPE",
      items: [
        {
          id: "model-159-context-page-dates",
          heading: "Páginas oficiales separadas",
          text: "La página principal y la ficha administrativa se conservan como fuentes distintas, con actualizaciones oficiales publicadas el 1 de marzo y el 8 de julio de 2026, respectivamente.",
          sourceIds: [
            "aeat.model-159.procedure-home.2026-03-01",
            "aeat.model-159.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-159-context-law",
          heading: "Norma de aprobación",
          text: "La Orden HAC/672/2024 aprueba el Modelo 159 de declaración anual de consumo de energía eléctrica.",
          sourceIds: ["boe.model-159.order-hac-672-2024"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-159.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 159 · declaración anual de consumo de energía eléctrica",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI31.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bbe95c4300359c45c77dbe6e182dcf69056b0189a168530b98d27505a548e567",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-159.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 159",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI31.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6f5c8c9dc23246f7aec83695117e8847ebfe9d83642070f09f0bc982a0ab61eb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-159.help.2026-02-03",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 038 al 180 · Modelo 159",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-159.html",
      officialUpdatedOn: "2026-02-03",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "da2c7b2ae32e3117dd71b2d628e55a58dfdaa763989731b31d6b04b19684dfeb",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "boe.model-159.order-hac-672-2024",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/672/2024, de 25 de junio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2024-13420",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "70e1bbcc712f613289b39a983cd266ff4d13563198fb345cc251bf4157ea419c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-159-link-procedure",
      label: "Página oficial del Modelo 159",
      sourceId: "aeat.model-159.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-link-help",
      label: "Ayuda técnica oficial del Modelo 159",
      sourceId: "aeat.model-159.help.2026-02-03",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-link-designs",
      label: "Índice oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-link-approval",
      label: "Orden HAC/672/2024",
      sourceId: "boe.model-159.order-hac-672-2024",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-159-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 159?",
      answer: "Lo identifica como la declaración informativa anual de consumo de energía eléctrica.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-faq-frequency",
      question: "¿La denominación oficial lo describe como anual?",
      answer: "Sí. El índice general y las páginas propias emplean la expresión «declaración anual».",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-159.procedure-home.2026-03-01",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-faq-help",
      question: "¿Existe una ayuda técnica oficial específica?",
      answer: "Sí. La AEAT publica una página de ayuda del Modelo 159 dentro de la serie de modelos informativos del 038 al 180.",
      sourceIds: ["aeat.model-159.help.2026-02-03"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-faq-design",
      question: "¿Qué material estático figura en el índice técnico?",
      answer: "El índice recoge un diseño de registro para 2024 y siguientes. Esta ficha no lo trata como formulario ni como miniatura.",
      sourceIds: [REGISTER_DESIGNS_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-faq-law",
      question: "¿Qué norma aprueba el Modelo 159?",
      answer: "La Orden HAC/672/2024 aprueba el modelo con la denominación de declaración anual de consumo de energía eléctrica.",
      sourceIds: ["boe.model-159.order-hac-672-2024"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-159-faq-page-dates",
      question: "¿Qué fechas muestran las páginas oficiales capturadas?",
      answer: "La página principal muestra 1 de marzo de 2026 y la ficha administrativa 8 de julio de 2026.",
      sourceIds: [
        "aeat.model-159.procedure-home.2026-03-01",
        "aeat.model-159.procedure-record.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"159">;

const MODEL_165_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_RELEASE_ID_V1,
  code: "165",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración informativa de certificaciones individuales emitidas a los socios o partícipes de entidades de nueva o reciente creación.",
  summary:
    "Declaración informativa que la AEAT identifica con certificaciones individuales emitidas a socios o partícipes de entidades de nueva o reciente creación.",
  searchTerms: [
    "modelo 165",
    "declaración informativa",
    "certificaciones individuales",
    "socios",
    "partícipes",
    "entidades de nueva creación",
    "entidades de reciente creación",
    "ayuda modelo 165",
    "diseño de registro 165",
    "Orden HAP 2455 2013",
    "Orden HFP 1284 2023",
  ],
  sections: [
    {
      id: "model-165-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-165-purpose-identity",
          heading: "Certificaciones individuales",
          text: "El índice general y las páginas propias de la AEAT identifican el Modelo 165 con certificaciones individuales emitidas a socios o partícipes de entidades de nueva o reciente creación.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-165.procedure-home.2026-07-08",
            "aeat.model-165.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-165-materials",
      title: "Ayuda y materiales oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-165-materials-help",
          heading: "Ayuda técnica específica",
          text: "La AEAT mantiene una página de ayuda técnica específica para el Modelo 165 dentro de la serie de modelos informativos del 038 al 180.",
          sourceIds: ["aeat.model-165.help.2026-02-02"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-165-materials-register-design",
          heading: "Diseño técnico actualizado",
          text: "El índice técnico enlaza un diseño de registro del Modelo 165 cuya etiqueta menciona la actualización por la Orden HFP/1284/2023. Este release no incorpora el PDF como documento ni miniatura porque no es un formulario.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "boe.model-165.order-hfp-1284-2023",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-165-context",
      title: "Contexto normativo",
      kind: "SCOPE",
      items: [
        {
          id: "model-165-context-approval",
          heading: "Aprobación",
          text: "La Orden HAP/2455/2013 aprueba el Modelo 165 con la denominación registrada por la AEAT.",
          sourceIds: ["boe.model-165.order-hap-2455-2013"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-165-context-amendments",
          heading: "Modificaciones técnicas registradas",
          text: "La Orden HFP/1822/2016 y la Orden HFP/1284/2023 incluyen modificaciones de los diseños del Modelo 165.",
          sourceIds: [
            TECHNICAL_DESIGNS_AMENDMENT_SOURCE.id,
            "boe.model-165.order-hfp-1284-2023",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-165.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 165 · certificaciones individuales",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI35.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ea2297864288ff133f2c28f3efdd73c151af6a0651ebf1a3cd4645820e19c027",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-165.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 165",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI35.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "534ccbd3db7e2430d65145e2ad7f870ca818ff45f4b9f5294ee6a8fc5c998557",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-165.help.2026-02-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 038 al 180 · Modelo 165",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-165.html",
      officialUpdatedOn: "2026-02-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d0563f041347fcfa2a43c0ba136e4e843e0ee60d8e36a655f57ed4abb366b2ae",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "boe.model-165.order-hap-2455-2013",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAP/2455/2013, de 27 de diciembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2013-13798",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "35110677f7ac4f9fc2663220866c2b55fe89a7c88d07258454c92177e0ff5ecf",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    TECHNICAL_DESIGNS_AMENDMENT_SOURCE,
    {
      id: "boe.model-165.order-hfp-1284-2023",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HFP/1284/2023, de 28 de noviembre",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2023-24412",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e69d383762ee36130802a32196c1e7fcdff1dc21d8628eb563a8cfe1e32f7f22",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-165-link-procedure",
      label: "Página oficial del Modelo 165",
      sourceId: "aeat.model-165.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-link-help",
      label: "Ayuda técnica oficial del Modelo 165",
      sourceId: "aeat.model-165.help.2026-02-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-link-designs",
      label: "Índice oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-link-approval",
      label: "Orden HAP/2455/2013",
      sourceId: "boe.model-165.order-hap-2455-2013",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-link-amendment",
      label: "Orden HFP/1284/2023",
      sourceId: "boe.model-165.order-hfp-1284-2023",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-165-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 165?",
      answer: "Lo identifica como una declaración informativa de certificaciones individuales emitidas a socios o partícipes de entidades de nueva o reciente creación.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-faq-certificates",
      question: "¿Qué documentos menciona la denominación oficial?",
      answer: "La denominación menciona certificaciones individuales emitidas a socios o partícipes.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-165.procedure-home.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-faq-help",
      question: "¿Existe una ayuda técnica oficial específica?",
      answer: "Sí. La AEAT publica una página de ayuda del Modelo 165 dentro de la serie de modelos informativos del 038 al 180.",
      sourceIds: ["aeat.model-165.help.2026-02-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-faq-design",
      question: "¿Qué material estático figura en el índice técnico?",
      answer: "El índice recoge un diseño de registro cuya etiqueta cita la actualización por la Orden HFP/1284/2023. Esta ficha no lo trata como formulario ni como miniatura.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "boe.model-165.order-hfp-1284-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-faq-approval",
      question: "¿Qué norma aprueba el Modelo 165?",
      answer: "La Orden HAP/2455/2013 aprueba el modelo con la denominación registrada por la AEAT.",
      sourceIds: ["boe.model-165.order-hap-2455-2013"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-165-faq-amendments",
      question: "¿Qué modificaciones técnicas se registran?",
      answer: "Las órdenes HFP/1822/2016 y HFP/1284/2023 incluyen cambios en los diseños del Modelo 165.",
      sourceIds: [
        TECHNICAL_DESIGNS_AMENDMENT_SOURCE.id,
        "boe.model-165.order-hfp-1284-2023",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"165">;

const MODEL_170_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_RELEASE_ID_V1,
  code: "170",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración anual de las operaciones realizadas por los empresarios o profesionales adheridos al sistema de gestión de cobros a través de tarjetas de crédito o de débito.",
  summary:
    "El índice general describe el Modelo 170 como anual, mientras sus páginas propias de 2026 lo describen como mensual e incorporan cualquier tipo de tarjeta y pagos asociados a números de teléfono móvil; esta ficha conserva ambas formulaciones sin resolverlas.",
  searchTerms: [
    "modelo 170",
    "declaración anual",
    "declaración mensual",
    "operaciones con tarjetas",
    "tarjetas de crédito",
    "tarjetas de débito",
    "cualquier tipo de tarjetas",
    "pagos asociados a números de teléfono móvil",
    "gestión de cobros",
    "preguntas frecuentes modelo 170",
    "diseño de registro 170",
    "Orden EHA 97 2010",
    "Orden HAC 747 2025",
  ],
  sections: [
    {
      id: "model-170-purpose",
      title: "Identidad en el índice general",
      kind: "PURPOSE",
      items: [
        {
          id: "model-170-purpose-index-wording",
          heading: "Formulación anual",
          text: "El índice general de declaraciones por modelo denomina el Modelo 170 como declaración anual de operaciones realizadas mediante el sistema de gestión de cobros a través de tarjetas de crédito o de débito.",
          sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-170-discrepancy",
      title: "Discrepancia documental de 2026",
      kind: "SCOPE",
      items: [
        {
          id: "model-170-discrepancy-procedure-wording",
          heading: "Formulación mensual",
          text: "La página propia y la ficha administrativa describen el Modelo 170 como declaración mensual, amplían la referencia a cualquier tipo de tarjetas y añaden pagos asociados a números de teléfono móvil.",
          sourceIds: [
            "aeat.model-170.procedure-home.2026-07-08",
            "aeat.model-170.procedure-record.2026-03-04",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-170-discrepancy-preserved",
          heading: "Formulaciones conservadas por separado",
          text: "Las formulaciones anual y mensual proceden de páginas oficiales distintas capturadas el mismo día. Este release no selecciona una de ellas ni deduce su aplicación temporal o personal.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-170.procedure-home.2026-07-08",
            "aeat.model-170.procedure-record.2026-03-04",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-170-materials",
      title: "Ayuda, diseños y normativa",
      kind: "DETAILS",
      items: [
        {
          id: "model-170-materials-help",
          heading: "Ayuda y preguntas frecuentes",
          text: "La AEAT mantiene una página de ayuda técnica del Modelo 170 y una página de preguntas frecuentes rotulada para 2026 y siguientes.",
          sourceIds: [
            "aeat.model-170.help.2026-03-04",
            "aeat.model-170.faq.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-170-materials-register-design",
          heading: "Diseño técnico con formulación anterior",
          text: "El índice de diseños conserva una entrada del Modelo 170 asociada a la Orden EHA/97/2010 y a su modificación técnica de 2016. Este release no incorpora el PDF técnico como documento ni miniatura.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "boe.model-170.order-eha-97-2010",
            TECHNICAL_DESIGNS_AMENDMENT_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-170-materials-laws",
          heading: "Textos legales con denominaciones distintas",
          text: "La Orden EHA/97/2010 aprueba una formulación referida a tarjetas de crédito o débito. La Orden HAC/747/2025 aprueba una formulación mensual que menciona cualquier tipo de tarjetas y pagos asociados a números de teléfono móvil.",
          sourceIds: [
            "boe.model-170.order-eha-97-2010",
            "boe.model-170.order-hac-747-2025",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-170.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 170 · declaración mensual de operaciones con tarjetas y pagos móviles",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI32.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3dd45700a4057e5bbce6170278584f2e5bc52da8964cb402010204156f376b3a",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-170.procedure-record.2026-03-04",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 170",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI32.shtml",
      officialUpdatedOn: "2026-03-04",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9fe3f325c37014b9df1ef3c625f3b6eb938eebbb690fe5d552c728fe33ce00f2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-170.help.2026-03-04",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelos del 038 al 180 · Modelo 170",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-170.html",
      officialUpdatedOn: "2026-03-04",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "9adaaac3b92822b949a69961949dbfb01b90398a2bdabe08f162f81c4ef225a2",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-170.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 170 · ejercicio 2026 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-170-decla_____obros-traves-tarjetas-debito_/preguntas-frecuentes-modelo-170.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8846a855dab95605b9515250ef1705f1a1b7a8e8d879170da493c6f240a20a01",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    REGISTER_DESIGNS_SOURCE,
    {
      id: "boe.model-170.order-eha-97-2010",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden EHA/97/2010, de 25 de enero",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2010-1392",
      officialUpdatedOn: "2025-07-15",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "54c2e0e0211a33f80389839f5022e1fcf6ec873b155ddec95b0e9dc73f8bf451",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    TECHNICAL_DESIGNS_AMENDMENT_SOURCE,
    {
      id: "boe.model-170.order-hac-747-2025",
      authority: "BOE",
      kind: "LEGAL_TEXT",
      title: "Orden HAC/747/2025, de 27 de junio",
      canonicalUrl:
        "https://www.boe.es/buscar/act.php?id=BOE-A-2025-14600",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "44211d97358fb7f3b17b014ecb8860926d2144010287a920093f39f0686efdc1",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-170-link-procedure",
      label: "Página oficial del Modelo 170",
      sourceId: "aeat.model-170.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-link-faq",
      label: "Preguntas frecuentes oficiales del Modelo 170",
      sourceId: "aeat.model-170.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-link-help",
      label: "Ayuda técnica oficial del Modelo 170",
      sourceId: "aeat.model-170.help.2026-03-04",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-link-designs",
      label: "Índice oficial de diseños de registro",
      sourceId: REGISTER_DESIGNS_SOURCE.id,
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-link-earlier-order",
      label: "Orden EHA/97/2010",
      sourceId: "boe.model-170.order-eha-97-2010",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-link-monthly-order",
      label: "Orden HAC/747/2025",
      sourceId: "boe.model-170.order-hac-747-2025",
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-170-faq-index-wording",
      question: "¿Cómo denomina el índice general al Modelo 170?",
      answer: "Lo denomina declaración anual de operaciones realizadas mediante el sistema de gestión de cobros a través de tarjetas de crédito o de débito.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-faq-procedure-wording",
      question: "¿Cómo lo denominan sus páginas propias de 2026?",
      answer: "Lo denominan declaración mensual y añaden cualquier tipo de tarjetas y pagos asociados a números de teléfono móvil.",
      sourceIds: [
        "aeat.model-170.procedure-home.2026-07-08",
        "aeat.model-170.procedure-record.2026-03-04",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-faq-discrepancy",
      question: "¿Esta ficha resuelve la diferencia entre anual y mensual?",
      answer: "No. Conserva ambas formulaciones con sus fuentes y no determina cuál se aplica a una situación o periodo concretos.",
      sourceIds: [
        OFFICIAL_MODEL_INDEX_SOURCE.id,
        "aeat.model-170.procedure-home.2026-07-08",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-faq-official-faq",
      question: "¿La AEAT publica preguntas frecuentes específicas?",
      answer: "Sí. Publica una página de preguntas frecuentes rotulada para el ejercicio 2026 y siguientes.",
      sourceIds: ["aeat.model-170.faq.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-faq-design",
      question: "¿Se incorpora el PDF del índice de diseños?",
      answer: "No. La entrada está vinculada a la regulación y el diseño técnico anteriores, por lo que este release no la trata como formulario ni miniatura.",
      sourceIds: [
        REGISTER_DESIGNS_SOURCE.id,
        "boe.model-170.order-eha-97-2010",
        TECHNICAL_DESIGNS_AMENDMENT_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-170-faq-laws",
      question: "¿Qué diferencia muestran los textos legales registrados?",
      answer: "La Orden EHA/97/2010 utiliza la referencia a tarjetas de crédito o débito, mientras la Orden HAC/747/2025 formula el modelo como mensual y añade cualquier tipo de tarjetas y pagos asociados a números de teléfono móvil.",
      sourceIds: [
        "boe.model-170.order-eha-97-2010",
        "boe.model-170.order-hac-747-2025",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"170">;

export const PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_CONTENT_V1 = deepFreeze(
  [MODEL_156_CONTENT, MODEL_159_CONTENT, MODEL_165_CONTENT, MODEL_170_CONTENT] as const,
);

export type PublicAeatBatch04InformationReturnsCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_04_INFORMATION_RETURNS_CONTENT_V1)[number]["code"];
