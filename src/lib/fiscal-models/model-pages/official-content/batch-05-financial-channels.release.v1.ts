import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

const PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_RELEASE_ID_V1 =
  "public-aeat-official-batch-05-financial-channels.2026-07-13.v1" as const;

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

const ORDER_EHA_98_2010_SOURCE = {
  id: "boe.model-171.order-eha-98-2010",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/98/2010, de 25 de enero",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2010-1393",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "29d1932b4028552b65c46f7e15babc2396cfa84b63ac90ee98c34444d34714d3",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HFP_887_2023_SOURCE = {
  id: "boe.models-172-173.order-hfp-887-2023",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/887/2023, de 26 de julio",
  canonicalUrl: "https://www.boe.es/buscar/act.php?id=BOE-A-2023-17430",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "d53ca07c1f426c54ce8a606304730b72264cb281c342d1b49df8d0650d2d4e05",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const ORDER_HAC_1504_2024_SOURCE = {
  id: "boe.model-172.order-hac-1504-2024",
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

const ORDER_HAC_747_2025_SOURCE = {
  id: "boe.models-171-174.order-hac-747-2025",
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

const MODEL_171_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_RELEASE_ID_V1,
  code: "171",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración anual de imposiciones, disposiciones de fondos y de los cobros de cualquier documento.",
  summary:
    "Declaración informativa anual que la AEAT identifica con imposiciones, disposiciones de fondos y cobros de cualquier documento.",
  searchTerms: [
    "modelo 171",
    "declaración informativa",
    "imposiciones",
    "disposiciones de fondos",
    "cobros de documentos",
    "canal mediante fichero",
    "carga de fichero",
    "TGVI online",
    "diseño de registro 171",
    "Orden EHA 98 2010",
  ],
  sections: [
    {
      id: "model-171-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-171-purpose-identity",
          heading: "Imposiciones, disposiciones de fondos y cobros",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 171 como una declaración informativa anual sobre imposiciones, disposiciones de fondos y cobros de cualquier documento.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-171.procedure-home.2026-03-01",
            "aeat.model-171.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-171-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-171-access-file",
          heading: "Fichero con diseño de registro",
          text: "La ayuda técnica oficial describe un canal basado en un fichero ajustado al diseño de registro publicado y un flujo TGVI online. Esta ficha registra ese canal únicamente como información y no inicia ni reproduce su operativa.",
          sourceIds: [
            "aeat.model-171.help.2026-02-02",
            REGISTER_DESIGNS_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-171-access-design",
          heading: "Documento técnico sin previsualización",
          text: "La AEAT enlaza un PDF de diseño de registro de trece páginas. Se conserva como documentación técnica descargable, no como formulario ni como imagen de la declaración.",
          sourceIds: [
            REGISTER_DESIGNS_SOURCE.id,
            "aeat.model-171.register-design.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-171-official-materials",
      title: "Páginas y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-171-official-materials-pages",
          heading: "Página, ficha y ayuda separadas",
          text: "La AEAT publica por separado la página principal del modelo, su ficha administrativa y una guía técnica sobre el canal mediante fichero.",
          sourceIds: [
            "aeat.model-171.procedure-home.2026-03-01",
            "aeat.model-171.procedure-record.2026-07-08",
            "aeat.model-171.help.2026-02-02",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-171-official-materials-law",
          heading: "Textos legales registrados",
          text: "La ficha conserva la Orden EHA/98/2010 asociada a la aprobación del Modelo 171 y la Orden HAC/747/2025 que modifica esa regulación.",
          sourceIds: [
            ORDER_EHA_98_2010_SOURCE.id,
            ORDER_HAC_747_2025_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    REGISTER_DESIGNS_SOURCE,
    {
      id: "aeat.model-171.procedure-home.2026-03-01",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 171 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI33.shtml",
      officialUpdatedOn: "2026-03-01",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "eea5f3fdf8a226e3707bb6bdb65cf9917afaa24a6fc5898a313e0188afd0851b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-171.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 171",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI33.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1c67715b9cec5ec7d6fa20759756e630adf6601ad2e31e24369a3ba0ef92d693",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-171.help.2026-02-02",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Ayuda técnica del Modelo 171",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/declaraciones-informativas-ayuda-tecnica/modelos-038-180/modelo-171.html",
      officialUpdatedOn: "2026-02-02",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3a1b2a26464897696578aca979fb2f20700e72503085f08a21a14eee574c876f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-171.register-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Modelo 171 · diseños de registro",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Disenyo_registro/DR_100_199/archivos/171_EHA_98_2010.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "18cc93915b64873da77e032f5ac8c199a327963d541c772415e5f7f1bb7b331b",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_EHA_98_2010_SOURCE,
    ORDER_HAC_747_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-171-register-design-document",
      kind: "REGISTER_DESIGN",
      title: "Diseños de registro del Modelo 171",
      sourceId: "aeat.model-171.register-design.pdf",
      landingPageSourceId: REGISTER_DESIGNS_SOURCE.id,
      mediaType: "application/pdf",
      fileName: "171_EHA_98_2010.pdf",
      byteLength: 209572,
      pageCount: 13,
      sha256:
        "18cc93915b64873da77e032f5ac8c199a327963d541c772415e5f7f1bb7b331b",
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
      id: "model-171-link-procedure",
      label: "Página oficial del Modelo 171",
      sourceId: "aeat.model-171.procedure-home.2026-03-01",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-171.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-link-help",
      label: "Ayuda técnica oficial del Modelo 171",
      sourceId: "aeat.model-171.help.2026-02-02",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-link-design",
      label: "Diseño de registro oficial",
      sourceId: "aeat.model-171.register-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-link-law",
      label: "Orden EHA/98/2010",
      sourceId: ORDER_EHA_98_2010_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-link-amendment",
      label: "Orden HAC/747/2025",
      sourceId: ORDER_HAC_747_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-171-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 171?",
      answer: "Como una declaración informativa anual sobre imposiciones, disposiciones de fondos y cobros de cualquier documento.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-faq-channel",
      question: "¿Qué canal describe la AEAT para el Modelo 171?",
      answer: "La ayuda técnica describe un flujo mediante fichero ajustado al diseño de registro y TGVI online.",
      sourceIds: ["aeat.model-171.help.2026-02-02"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-faq-tgvi",
      question: "¿Qué referencia técnica acompaña al canal mediante fichero?",
      answer: "La AEAT publica una guía del flujo TGVI y un diseño de registro específico del Modelo 171.",
      sourceIds: [
        "aeat.model-171.help.2026-02-02",
        REGISTER_DESIGNS_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-faq-pdf",
      question: "¿El PDF registrado es un formulario visual?",
      answer: "No. Es un documento técnico de diseño de registro y por ello no se utiliza como miniatura de formulario.",
      sourceIds: ["aeat.model-171.register-design.pdf"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-faq-pages",
      question: "¿Qué páginas informativas mantiene la AEAT?",
      answer: "Mantiene una página principal, una ficha administrativa y una página de ayuda técnica específica.",
      sourceIds: [
        "aeat.model-171.procedure-home.2026-03-01",
        "aeat.model-171.procedure-record.2026-07-08",
        "aeat.model-171.help.2026-02-02",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-171-faq-law",
      question: "¿Qué normativa se registra para identificar el modelo?",
      answer: "La Orden EHA/98/2010 y su modificación recogida en la Orden HAC/747/2025.",
      sourceIds: [
        ORDER_EHA_98_2010_SOURCE.id,
        ORDER_HAC_747_2025_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["FILE_UPLOAD"],
    status: "SOURCE_DESCRIBED",
    sourceIds: ["aeat.model-171.help.2026-02-02"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"171">;

const MODEL_172_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_RELEASE_ID_V1,
  code: "172",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Declaración informativa sobre saldos en monedas virtuales",
  summary:
    "Declaración informativa que la AEAT identifica con saldos en monedas virtuales y cuyo canal oficial se documenta como servicio web.",
  searchTerms: [
    "modelo 172",
    "declaración informativa",
    "saldos en monedas virtuales",
    "criptomonedas",
    "servicio web",
    "web service",
    "mensajes XML",
    "documentación técnica 172",
    "preguntas frecuentes 172",
    "Orden HFP 887 2023",
  ],
  sections: [
    {
      id: "model-172-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-172-purpose-identity",
          heading: "Saldos en monedas virtuales",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 172 como una declaración informativa sobre saldos en monedas virtuales.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-172.procedure-home.2026-05-25",
            "aeat.model-172.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-172-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-172-access-web-service",
          heading: "Servicio web",
          text: "La página oficial indica que el canal del Modelo 172 se realiza mediante servicio web y remite a documentación técnica específica. Esta ficha solo explica esa modalidad y no conecta con el servicio.",
          sourceIds: [
            "aeat.model-172.procedure-home.2026-05-25",
            "aeat.model-172.service-description.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-172-access-documents",
          heading: "Diseño, descripción y validaciones",
          text: "La AEAT publica un anexo de contenido, una descripción del servicio web y un documento de validaciones. Son materiales técnicos sin campos interactivos y no se muestran como formulario o miniatura.",
          sourceIds: [
            "aeat.model-172.content-design.pdf",
            "aeat.model-172.service-description.pdf",
            "aeat.model-172.validations.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-172-official-materials",
      title: "Información y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-172-official-materials-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT mantiene preguntas frecuentes específicas del Modelo 172 y referencias comunes para los Modelos 172 y 173.",
          sourceIds: ["aeat.model-172.faq.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-172-official-materials-law",
          heading: "Regulación registrada",
          text: "La página oficial enlaza la Orden HFP/887/2023, asociada a los Modelos 172 y 173, y la Orden HAC/1504/2024 como modificación posterior relacionada con el Modelo 172.",
          sourceIds: [
            ORDER_HFP_887_2023_SOURCE.id,
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
      id: "aeat.model-172.procedure-home.2026-05-25",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 172 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI53.shtml",
      officialUpdatedOn: "2026-05-25",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "dd4947b654981ae60057dd3b358c86792d4822784a115800cbe497b20ffabb7c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-172.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 172",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI53.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6d8396c70b207c3508fc12f78ff3c10844918b2ce95118ab81fc5d1352da3e1e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-172.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 172",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-172-declaracion-informativa-sobre-virtuales/preguntas-frecuentes.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "23d68b225b596df30cd433dc0c1b066350d5853309cb9cc7186ebfa32bf5035c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-172.content-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Contenido técnico de la declaración del Modelo 172",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI53/Anexo172.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "973b0ec9942e050eb0bfac263fda9fe034d0bd7555b619628fdedea3ce942d29",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-172.service-description.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Descripción del servicio web del Modelo 172",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI53/2024/DescripcionServicioWebMod172.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a40f11a0f4996fb98f3b66373938b82dcadb616689f7335c62130e7a9f8e9a52",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-172.validations.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Validaciones y errores del Modelo 172",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI53/2024/Validaciones_errores_Mod172.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "14b108af99cd99933a228eedf4284b5b300dc858dd8bcfef41084d0280c150c0",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HFP_887_2023_SOURCE,
    ORDER_HAC_1504_2024_SOURCE,
  ],
  documents: [
    {
      id: "model-172-content-design-document",
      kind: "REGISTER_DESIGN",
      title: "Contenido técnico de la declaración del Modelo 172",
      sourceId: "aeat.model-172.content-design.pdf",
      landingPageSourceId: "aeat.model-172.procedure-home.2026-05-25",
      mediaType: "application/pdf",
      fileName: "Anexo172.pdf",
      byteLength: 285927,
      pageCount: 10,
      sha256:
        "973b0ec9942e050eb0bfac263fda9fe034d0bd7555b619628fdedea3ce942d29",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-172-service-description-document",
      kind: "GUIDE",
      title: "Descripción del servicio web del Modelo 172",
      sourceId: "aeat.model-172.service-description.pdf",
      landingPageSourceId: "aeat.model-172.procedure-home.2026-05-25",
      mediaType: "application/pdf",
      fileName: "DescripcionServicioWebMod172.pdf",
      byteLength: 717289,
      pageCount: 36,
      sha256:
        "a40f11a0f4996fb98f3b66373938b82dcadb616689f7335c62130e7a9f8e9a52",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-172-validations-document",
      kind: "GUIDE",
      title: "Validaciones y errores del Modelo 172",
      sourceId: "aeat.model-172.validations.pdf",
      landingPageSourceId: "aeat.model-172.procedure-home.2026-05-25",
      mediaType: "application/pdf",
      fileName: "Validaciones_errores_Mod172.pdf",
      byteLength: 267185,
      pageCount: 9,
      sha256:
        "14b108af99cd99933a228eedf4284b5b300dc858dd8bcfef41084d0280c150c0",
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
      id: "model-172-link-procedure",
      label: "Página oficial del Modelo 172",
      sourceId: "aeat.model-172.procedure-home.2026-05-25",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-172.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-172.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-link-content-design",
      label: "Contenido técnico del Modelo 172",
      sourceId: "aeat.model-172.content-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-link-service-description",
      label: "Descripción oficial del servicio web",
      sourceId: "aeat.model-172.service-description.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-link-law",
      label: "Orden HFP/887/2023",
      sourceId: ORDER_HFP_887_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-172-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 172?",
      answer: "Como una declaración informativa sobre saldos en monedas virtuales.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-faq-channel",
      question: "¿Qué canal describe la AEAT para el Modelo 172?",
      answer: "La página oficial indica un servicio web y enlaza documentación técnica para ese canal.",
      sourceIds: ["aeat.model-172.procedure-home.2026-05-25"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-faq-documents",
      question: "¿Qué documentación técnica oficial está registrada?",
      answer: "Un anexo de contenido, una descripción del servicio web y un documento de validaciones y errores.",
      sourceIds: [
        "aeat.model-172.content-design.pdf",
        "aeat.model-172.service-description.pdf",
        "aeat.model-172.validations.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-faq-preview",
      question: "¿Por qué esos PDF no tienen miniatura de formulario?",
      answer: "Porque son documentos de estructura y ayuda técnica, sin un formulario visual interactivo que representar.",
      sourceIds: [
        "aeat.model-172.content-design.pdf",
        "aeat.model-172.service-description.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-faq-official-faq",
      question: "¿La AEAT publica preguntas frecuentes del Modelo 172?",
      answer: "Sí. La página oficial reúne preguntas específicas del Modelo 172 y otras comunes con el Modelo 173.",
      sourceIds: ["aeat.model-172.faq.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-172-faq-law",
      question: "¿Qué textos legales se conservan en la ficha?",
      answer: "La Orden HFP/887/2023 y la modificación posterior enlazada por la AEAT mediante la Orden HAC/1504/2024.",
      sourceIds: [
        ORDER_HFP_887_2023_SOURCE.id,
        ORDER_HAC_1504_2024_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-172.procedure-home.2026-05-25",
      "aeat.model-172.service-description.pdf",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"172">;

const MODEL_173_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_RELEASE_ID_V1,
  code: "173",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Declaración informativa sobre operaciones con monedas virtuales",
  summary:
    "Declaración informativa que la AEAT identifica con operaciones con monedas virtuales y cuyo canal oficial se documenta como servicio web.",
  searchTerms: [
    "modelo 173",
    "declaración informativa",
    "operaciones con monedas virtuales",
    "criptomonedas",
    "servicio web",
    "web service",
    "mensajes XML",
    "documentación técnica 173",
    "preguntas frecuentes 173",
    "Orden HFP 887 2023",
  ],
  sections: [
    {
      id: "model-173-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-173-purpose-identity",
          heading: "Operaciones con monedas virtuales",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 173 como una declaración informativa sobre operaciones con monedas virtuales.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-173.procedure-home.2026-05-28",
            "aeat.model-173.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-173-access",
      title: "Canal descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-173-access-web-service",
          heading: "Servicio web",
          text: "La página oficial indica que el canal del Modelo 173 se realiza mediante servicio web y remite a documentación técnica específica. Esta ficha solo explica esa modalidad y no conecta con el servicio.",
          sourceIds: [
            "aeat.model-173.procedure-home.2026-05-28",
            "aeat.model-173.service-description.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-173-access-documents",
          heading: "Diseño, descripción y validaciones",
          text: "La AEAT publica un anexo de contenido, una descripción del servicio web y un documento de validaciones. Son materiales técnicos sin campos interactivos y no se muestran como formulario o miniatura.",
          sourceIds: [
            "aeat.model-173.content-design.pdf",
            "aeat.model-173.service-description.pdf",
            "aeat.model-173.validations.pdf",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-173-official-materials",
      title: "Información y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-173-official-materials-faq",
          heading: "Preguntas frecuentes oficiales",
          text: "La AEAT mantiene preguntas frecuentes específicas del Modelo 173 y referencias comunes para los Modelos 172 y 173.",
          sourceIds: ["aeat.model-173.faq.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-173-official-materials-law",
          heading: "Regulación compartida con el Modelo 172",
          text: "La página oficial enlaza la Orden HFP/887/2023 como texto asociado a la aprobación de los Modelos 172 y 173.",
          sourceIds: [ORDER_HFP_887_2023_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-173.procedure-home.2026-05-28",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 173 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI54.shtml",
      officialUpdatedOn: "2026-05-28",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "e6f539aeb20589f0cd06012f42d897c67e6e8f9d01699df10600a2b70a2061b4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-173.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 173",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI54.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "04973e6c4c387c8b5050ce7892e3d060b9f8c4d77f8b8b6fd2128b852fc50d1f",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-173.faq.2026-07-08",
      authority: "AEAT",
      kind: "FAQ_PAGE",
      title: "Preguntas frecuentes del Modelo 173",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/declaraciones-informativas/modelo-172-declaracion-informativa-sobre-virtuales/preguntas-frecuentes/preguntas-frecuentes-sobre-modelo-173.html",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8a6add2e5a42413882ffbbc4bf8ed30ab0c8cb2df3d273b51b1d1ad18d63ae43",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-173.content-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Contenido técnico de la declaración del Modelo 173",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI54/Anexo173.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "54ea3ae68fa217966c7d667e6f9373bac1d9d8307e3f760b8539af8300a95492",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-173.service-description.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Descripción del servicio web del Modelo 173",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI54/Mod173_Descripcion_ServicioWeb.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d2fd943b4b2adfc6e9fd45c6f59106b05bd688ad3fa680995ea70c1d90c59765",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-173.validations.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Validaciones y errores del Modelo 173",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI54/Mod173-Validaciones-errores.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7faddd42da1015a4a03a74f11b84f4194f61a7d18ec000a6dd2dcbb1d5542a39",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HFP_887_2023_SOURCE,
  ],
  documents: [
    {
      id: "model-173-content-design-document",
      kind: "REGISTER_DESIGN",
      title: "Contenido técnico de la declaración del Modelo 173",
      sourceId: "aeat.model-173.content-design.pdf",
      landingPageSourceId: "aeat.model-173.procedure-home.2026-05-28",
      mediaType: "application/pdf",
      fileName: "Anexo173.pdf",
      byteLength: 536004,
      pageCount: 11,
      sha256:
        "54ea3ae68fa217966c7d667e6f9373bac1d9d8307e3f760b8539af8300a95492",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-173-service-description-document",
      kind: "GUIDE",
      title: "Descripción del servicio web del Modelo 173",
      sourceId: "aeat.model-173.service-description.pdf",
      landingPageSourceId: "aeat.model-173.procedure-home.2026-05-28",
      mediaType: "application/pdf",
      fileName: "Mod173_Descripcion_ServicioWeb.pdf",
      byteLength: 1251482,
      pageCount: 35,
      sha256:
        "d2fd943b4b2adfc6e9fd45c6f59106b05bd688ad3fa680995ea70c1d90c59765",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "CURRENTNESS_UNDETERMINED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-173-validations-document",
      kind: "GUIDE",
      title: "Validaciones y errores del Modelo 173",
      sourceId: "aeat.model-173.validations.pdf",
      landingPageSourceId: "aeat.model-173.procedure-home.2026-05-28",
      mediaType: "application/pdf",
      fileName: "Mod173-Validaciones-errores.pdf",
      byteLength: 317622,
      pageCount: 9,
      sha256:
        "7faddd42da1015a4a03a74f11b84f4194f61a7d18ec000a6dd2dcbb1d5542a39",
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
      id: "model-173-link-procedure",
      label: "Página oficial del Modelo 173",
      sourceId: "aeat.model-173.procedure-home.2026-05-28",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-173.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-link-faq",
      label: "Preguntas frecuentes oficiales",
      sourceId: "aeat.model-173.faq.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-link-content-design",
      label: "Contenido técnico del Modelo 173",
      sourceId: "aeat.model-173.content-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-link-service-description",
      label: "Descripción oficial del servicio web",
      sourceId: "aeat.model-173.service-description.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-link-law",
      label: "Orden HFP/887/2023",
      sourceId: ORDER_HFP_887_2023_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-173-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 173?",
      answer: "Como una declaración informativa sobre operaciones con monedas virtuales.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-faq-channel",
      question: "¿Qué canal describe la AEAT para el Modelo 173?",
      answer: "La página oficial indica un servicio web y enlaza documentación técnica para ese canal.",
      sourceIds: ["aeat.model-173.procedure-home.2026-05-28"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-faq-documents",
      question: "¿Qué documentación técnica oficial está registrada?",
      answer: "Un anexo de contenido, una descripción del servicio web y un documento de validaciones y errores.",
      sourceIds: [
        "aeat.model-173.content-design.pdf",
        "aeat.model-173.service-description.pdf",
        "aeat.model-173.validations.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-faq-preview",
      question: "¿Por qué esos PDF no tienen miniatura de formulario?",
      answer: "Porque son documentos de estructura y ayuda técnica, sin un formulario visual interactivo que representar.",
      sourceIds: [
        "aeat.model-173.content-design.pdf",
        "aeat.model-173.service-description.pdf",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-faq-official-faq",
      question: "¿La AEAT publica preguntas frecuentes del Modelo 173?",
      answer: "Sí. La página oficial reúne preguntas específicas del Modelo 173 y otras comunes con el Modelo 172.",
      sourceIds: ["aeat.model-173.faq.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-173-faq-law",
      question: "¿Qué texto legal se conserva en la ficha?",
      answer: "La Orden HFP/887/2023, que la AEAT vincula a los Modelos 172 y 173.",
      sourceIds: [ORDER_HFP_887_2023_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE"],
    status: "SOURCE_DESCRIBED",
    sourceIds: [
      "aeat.model-173.procedure-home.2026-05-28",
      "aeat.model-173.service-description.pdf",
    ],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"173">;

const MODEL_174_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_RELEASE_ID_V1,
  code: "174",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName: "Declaración informativa sobre todo tipo de tarjetas",
  summary:
    "Declaración informativa sobre todo tipo de tarjetas cuya página oficial anuncia gestiones mediante servicio web a partir del 1 de enero de 2027.",
  searchTerms: [
    "modelo 174",
    "declaración informativa",
    "todo tipo de tarjetas",
    "tarjetas",
    "servicio web",
    "web service",
    "mensajes XML",
    "gestiones desde 2027",
    "documentación técnica 174",
    "Orden HAC 747 2025",
  ],
  sections: [
    {
      id: "model-174-purpose",
      title: "Identidad oficial",
      kind: "PURPOSE",
      items: [
        {
          id: "model-174-purpose-identity",
          heading: "Todo tipo de tarjetas",
          text: "El índice general, la página principal y la ficha administrativa de la AEAT identifican el Modelo 174 como una declaración informativa sobre todo tipo de tarjetas.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-174.procedure-home.2026-07-08",
            "aeat.model-174.procedure-record.2026-07-08",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-174-access",
      title: "Canal futuro descrito por la AEAT",
      kind: "ACCESS",
      items: [
        {
          id: "model-174-access-future",
          heading: "Gestiones anunciadas desde 2027",
          text: "La AEAT anuncia expresamente que las gestiones del procedimiento estarán disponibles a partir del 1 de enero de 2027. Esta fecha futura se conserva sin considerar el canal disponible actualmente.",
          sourceIds: ["aeat.model-174.procedure-home.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-174-access-web-service",
          heading: "Servicio web anunciado",
          text: "La página oficial denomina la gestión prevista como cliente de servicio web. Esta ficha solo registra esa descripción y no contiene ninguna conexión ni acción de envío.",
          sourceIds: ["aeat.model-174.procedure-home.2026-07-08"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-174-official-materials",
      title: "Documentación y normativa oficiales",
      kind: "DETAILS",
      items: [
        {
          id: "model-174-official-materials-document",
          heading: "Contenido técnico del modelo",
          text: "La AEAT publica un PDF técnico de siete páginas con el contenido estructurado de la declaración. No es un formulario visual y por ello no genera miniatura.",
          sourceIds: ["aeat.model-174.content-design.pdf"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-174-official-materials-law",
          heading: "Texto legal registrado",
          text: "La página oficial enlaza la Orden HAC/747/2025 como normativa asociada al Modelo 174.",
          sourceIds: [ORDER_HAC_747_2025_SOURCE.id],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-174.procedure-home.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title: "Modelo 174 · página oficial",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/GI62.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "8c974bdbaabb446495fe7db2de1e695e0ce395a1cc29bb432c8f4c37c9efec57",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-174.procedure-record.2026-07-08",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 174",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/GI62.shtml",
      officialUpdatedOn: "2026-07-08",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "b4ce78948f012dc0f9e35bc93030cd6a9f389ad5812e6d96f29d12ff9c8d8f9c",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-174.content-design.pdf",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Contenido técnico de la declaración del Modelo 174",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/GI62/Modelo_174_todo_tipo_tarjetas.pdf",
      officialUpdatedOn: null,
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "d17fa32473ef59959c9a73fff8a08e8a9a9e6b4f768fd4114695da8eae82991e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    ORDER_HAC_747_2025_SOURCE,
  ],
  documents: [
    {
      id: "model-174-content-design-document",
      kind: "REGISTER_DESIGN",
      title: "Contenido técnico de la declaración del Modelo 174",
      sourceId: "aeat.model-174.content-design.pdf",
      landingPageSourceId: "aeat.model-174.procedure-home.2026-07-08",
      mediaType: "application/pdf",
      fileName: "Modelo_174_todo_tipo_tarjetas.pdf",
      byteLength: 906823,
      pageCount: 7,
      sha256:
        "d17fa32473ef59959c9a73fff8a08e8a9a9e6b4f768fd4114695da8eae82991e",
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
      id: "model-174-link-procedure",
      label: "Página oficial del Modelo 174",
      sourceId: "aeat.model-174.procedure-home.2026-07-08",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-link-record",
      label: "Ficha oficial del procedimiento",
      sourceId: "aeat.model-174.procedure-record.2026-07-08",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-link-content-design",
      label: "Contenido técnico oficial del Modelo 174",
      sourceId: "aeat.model-174.content-design.pdf",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-link-law",
      label: "Orden HAC/747/2025",
      sourceId: ORDER_HAC_747_2025_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-174-faq-identity",
      question: "¿Cómo identifica la AEAT el Modelo 174?",
      answer: "Como una declaración informativa sobre todo tipo de tarjetas.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-faq-availability",
      question: "¿Qué fecha anuncia la AEAT para sus gestiones?",
      answer: "La página oficial anuncia que estarán disponibles a partir del 1 de enero de 2027.",
      sourceIds: ["aeat.model-174.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-faq-channel",
      question: "¿Qué canal anuncia la AEAT?",
      answer: "La página oficial identifica la gestión prevista como cliente de servicio web.",
      sourceIds: ["aeat.model-174.procedure-home.2026-07-08"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-faq-document",
      question: "¿Qué documento técnico oficial está registrado?",
      answer: "Un PDF con el contenido estructurado de la declaración informativa del Modelo 174.",
      sourceIds: ["aeat.model-174.content-design.pdf"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-faq-preview",
      question: "¿Por qué el PDF no se usa como miniatura de formulario?",
      answer: "Porque describe la estructura del contenido y no es un formulario visual del modelo.",
      sourceIds: ["aeat.model-174.content-design.pdf"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-174-faq-law",
      question: "¿Qué normativa oficial se enlaza?",
      answer: "La Orden HAC/747/2025, que la AEAT asocia al Modelo 174.",
      sourceIds: [ORDER_HAC_747_2025_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  accessMethods: {
    methods: ["WEB_SERVICE"],
    status: "SOURCE_DESCRIBED_FUTURE",
    sourceIds: ["aeat.model-174.procedure-home.2026-07-08"],
    semantics: "OFFICIAL_INFORMATION_ONLY",
  },
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"174">;

export const PUBLIC_AEAT_BATCH_05_FINANCIAL_CHANNELS_CONTENT_V1 = deepFreeze(
  [MODEL_171_CONTENT, MODEL_172_CONTENT, MODEL_173_CONTENT, MODEL_174_CONTENT] as const,
);
