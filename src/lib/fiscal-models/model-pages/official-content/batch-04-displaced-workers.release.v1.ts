import {
  PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  type PublicAeatOfficialContentSourceV1,
  type PublicAeatOfficialModelContentV1,
} from "./contracts.v1";

export const PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_RELEASE_ID_V1 =
  "public-aeat-official-batch-04-displaced-workers.2026-07-13.v1" as const;

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

const CURRENT_REGIME_ORDER_SOURCE = {
  id: "boe.order-hfp-1338-2023",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HFP/1338/2023, de 13 de diciembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2023-25416",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "c9a5a562f39830b9d48cc2a2f71dbc7bdd45234cead7eccbf17f2168cfba884d",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PREVIOUS_REGIME_ORDER_SOURCE = {
  id: "boe.order-hap-2783-2015",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2783/2015, de 21 de diciembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2015-14021",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "529c16eff89047ba7df68ad91586cdcef693d16d3a9c1dca646d404af8fbcac8",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const LEGACY_REGIME_ORDER_SOURCE = {
  id: "boe.order-eha-848-2008",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden EHA/848/2008, de 24 de marzo",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2008-5828",
  officialUpdatedOn: null,
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "21335b1ca89e091b20c1d6f070d75d7abdca22a8616304736124858bff64f180",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const PROCESSING_ORDER_SOURCE = {
  id: "boe.order-hap-2194-2013",
  authority: "BOE",
  kind: "LEGAL_TEXT",
  title: "Orden HAP/2194/2013, de 22 de noviembre",
  canonicalUrl:
    "https://www.boe.es/buscar/act.php?id=BOE-A-2013-12385",
  officialUpdatedOn: "2025-12-22",
  capturedOn: REVIEWED_ON,
  sourceSha256:
    "5b16adc4b94d3e56453ce3da12e7275bf707376b0120856931277e65ba2ef52e",
  verificationStatus: "SOURCE_HASH_CAPTURED",
} as const satisfies PublicAeatOfficialContentSourceV1;

const MODEL_149_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_RELEASE_ID_V1,
  code: "149",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores desplazados a territorio español. Comunicación de la opción, renuncia, exclusión y fin del desplazamiento.",
  summary:
    "Comunicación que la AEAT identifica con la opción, renuncia, exclusión y fin del desplazamiento dentro del régimen especial descrito en la denominación oficial.",
  searchTerms: [
    "modelo 149",
    "comunicación régimen especial",
    "trabajadores desplazados",
    "profesionales desplazados",
    "emprendedores desplazados",
    "inversores desplazados",
    "opción régimen especial",
    "renuncia régimen especial",
    "exclusión régimen especial",
    "fin del desplazamiento",
    "IRPF desplazados",
    "Orden HFP 1338 2023",
  ],
  sections: [
    {
      id: "model-149-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-149-purpose-communications",
          heading: "Comunicación vinculada al régimen especial",
          text: "La AEAT identifica el Modelo 149 como una comunicación relativa al régimen especial aplicable a trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
          sourceIds: [
            "aeat.model-149.procedure-home.2026-06-09",
            "aeat.model-149.procedure-record.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-149-purpose-types",
          heading: "Tipos de comunicación enumerados",
          text: "La denominación oficial enumera la opción, la renuncia, la exclusión y el fin del desplazamiento. Esta ficha reproduce esas categorías sin decidir cuál corresponde a una persona.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-149.instructions.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-149-information",
      title: "Información oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-149-information-instructions",
          heading: "Instrucciones publicadas en HTML",
          text: "La Sede mantiene una página de instrucciones para cumplimentar la comunicación, con apartados generales y una descripción documental de los distintos tipos de comunicación.",
          sourceIds: ["aeat.model-149.instructions.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-149-information-help",
          heading: "Ayuda técnica del formulario web",
          text: "La AEAT publica una ayuda técnica del Modelo 149. Las páginas oficiales revisadas no enlazan un impreso PDF estático independiente para este modelo.",
          sourceIds: [
            "aeat.model-149.procedure-home.2026-06-09",
            "aeat.model-149.help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-149-temporal-context",
      title: "Contexto temporal y normativo",
      kind: "SCOPE",
      items: [
        {
          id: "model-149-temporal-context-instructions",
          heading: "Referencias desde 1 de enero de 2023",
          text: "La página de instrucciones declara que se confeccionó teniendo en cuenta la normativa vigente desde el 1 de enero de 2023 y conserva además un apartado transitorio referido a desplazamientos de 2022 y 2023.",
          sourceIds: ["aeat.model-149.instructions.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-149-temporal-context-orders",
          heading: "Normas enlazadas por la AEAT",
          text: "La página oficial enlaza la Orden HFP/1338/2023 y conserva como antecedentes las órdenes HAP/2783/2015 y EHA/848/2008. La presencia de esos antecedentes no se interpreta aquí como una decisión de vigencia para un caso concreto.",
          sourceIds: [
            CURRENT_REGIME_ORDER_SOURCE.id,
            PREVIOUS_REGIME_ORDER_SOURCE.id,
            LEGACY_REGIME_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-149.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 149. IRPF. Régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores desplazados a territorio español. Comunicación de la opción, renuncia, exclusión y fin del desplazamiento.",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G606.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "3a60cfc593e5a335b844e85327373a747354054a7164fc685d7c3d3a1c6e78d4",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-149.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 149",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G606.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "dd01676b18b2c7db4b7679d31888ad0357d85de8b13f0a8a242c1134ad40911e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-149.instructions.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones para cumplimentar la comunicación",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-149-irpf-comunicacion-opcion-exclusion_/instrucciones-cumplimentar-comunicacion.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "a87fdebf45f209383dbdc85693b19f09eff2aad173c05ce23b9e4313bac80fe3",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-149.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 149",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-149.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "66b462e35b62553fa11952e9d9353f7134a784bba1d7ee9cd042b9532e3f7711",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    CURRENT_REGIME_ORDER_SOURCE,
    PREVIOUS_REGIME_ORDER_SOURCE,
    LEGACY_REGIME_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-149-link-procedure",
      label: "Página oficial del Modelo 149",
      sourceId: "aeat.model-149.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-link-instructions",
      label: "Instrucciones oficiales del Modelo 149",
      sourceId: "aeat.model-149.instructions.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-link-help",
      label: "Ayuda técnica oficial del Modelo 149",
      sourceId: "aeat.model-149.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-link-current-order",
      label: "Orden HFP/1338/2023",
      sourceId: CURRENT_REGIME_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-149-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 149?",
      answer: "La AEAT lo identifica como la comunicación vinculada al régimen especial aplicable a trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
      sourceIds: ["aeat.model-149.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-faq-types",
      question: "¿Qué comunicaciones enumera su denominación oficial?",
      answer: "Enumera la opción, la renuncia, la exclusión y el fin del desplazamiento, sin que esta ficha determine cuál corresponde a una persona.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-faq-instructions",
      question: "¿Dónde publica la AEAT las instrucciones?",
      answer: "Las publica en una página HTML titulada «Instrucciones para cumplimentar la comunicación».",
      sourceIds: ["aeat.model-149.instructions.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-faq-static-pdf",
      question: "¿La página oficial enlaza un formulario PDF estático?",
      answer: "No en las páginas oficiales revisadas. La información y la ayuda disponibles corresponden a páginas web de la AEAT.",
      sourceIds: [
        "aeat.model-149.procedure-home.2026-06-09",
        "aeat.model-149.help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-faq-temporal-context",
      question: "¿Qué referencia temporal contienen las instrucciones?",
      answer: "Indican que se confeccionaron con la normativa vigente desde el 1 de enero de 2023 y conservan una referencia transitoria a desplazamientos de 2022 y 2023.",
      sourceIds: ["aeat.model-149.instructions.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-149-faq-law",
      question: "¿Qué norma reciente enlaza la página oficial?",
      answer: "Enlaza la Orden HFP/1338/2023, que aprueba los modelos 149 y 151 adaptados al régimen descrito en esa orden.",
      sourceIds: [CURRENT_REGIME_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"149">;

const MODEL_150_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_RELEASE_ID_V1,
  code: "150",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "HISTORICAL",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "IRPF. Régimen especial aplicable a los trabajadores desplazados a territorio español (para contribuyentes que hayan optado por este régimen con anterioridad a 1 de enero de 2015).",
  summary:
    "Ficha histórica del Modelo 150, que la AEAT delimita literalmente a opciones por el régimen anteriores al 1 de enero de 2015.",
  searchTerms: [
    "modelo 150",
    "modelo 150 histórico",
    "trabajadores desplazados",
    "régimen especial anterior a 2015",
    "opción anterior a 1 de enero de 2015",
    "IRPF desplazados histórico",
    "formulario histórico 150",
    "instrucciones modelo 150",
    "códigos de países modelo 150",
    "Orden EHA 848 2008",
    "Orden HAP 2783 2015",
  ],
  sections: [
    {
      id: "model-150-purpose",
      title: "Identidad histórica",
      kind: "PURPOSE",
      items: [
        {
          id: "model-150-purpose-historical",
          heading: "Modelo limitado expresamente por la AEAT",
          text: "La denominación oficial sitúa el Modelo 150 en el régimen especial aplicable a trabajadores desplazados que hubieran optado por dicho régimen con anterioridad al 1 de enero de 2015.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-150.procedure-home.2022-06-03",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-150-purpose-status",
          heading: "Ficha conservada como histórica",
          text: "Este release conserva el Modelo 150 como referencia histórica y no interpreta esa delimitación temporal para decidir la situación de una persona concreta.",
          sourceIds: [
            "aeat.model-150.procedure-home.2022-06-03",
            "aeat.model-150.instructions-pdf.2016-04-15",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-150-documents",
      title: "Documentos oficiales históricos",
      kind: "DETAILS",
      items: [
        {
          id: "model-150-documents-form",
          heading: "Formulario PDF enlazado por la AEAT",
          text: "La página de descarga enlaza un PDF de once páginas con formulario AcroForm y JavaScript. Sus metadatos registran creación en 2008 y modificación en 2015; se conserva exclusivamente como documento histórico.",
          sourceIds: [
            "aeat.model-150.download-page.2026-06-09",
            "aeat.model-150.form-pdf.2015-05-14",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-150-documents-supporting",
          heading: "Instrucciones y relación de códigos",
          text: "La página de descarga enlaza unas instrucciones PDF de veinte páginas, mientras la portada del procedimiento enlaza una relación PDF de códigos de países y territorios. Ambos archivos contienen referencias antiguas y se catalogan como materiales históricos.",
          sourceIds: [
            "aeat.model-150.procedure-home.2022-06-03",
            "aeat.model-150.download-page.2026-06-09",
            "aeat.model-150.instructions-pdf.2016-04-15",
            "aeat.model-150.country-codes-pdf.2014-06-04",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-150-temporal-context",
      title: "Contexto temporal y normativo",
      kind: "SCOPE",
      items: [
        {
          id: "model-150-temporal-context-pages",
          heading: "Fechas documentales distintas",
          text: "La portada del procedimiento figura actualizada en 2022, mientras la ficha administrativa y la página de descarga figuran actualizadas en 2026. Estas fechas de página no alteran la delimitación histórica expresada en el título oficial.",
          sourceIds: [
            "aeat.model-150.procedure-home.2022-06-03",
            "aeat.model-150.procedure-record.2026-06-09",
            "aeat.model-150.download-page.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-150-temporal-context-orders",
          heading: "Normas enlazadas",
          text: "La página oficial enlaza la Orden EHA/848/2008, que aprobó el Modelo 150, y la Orden HAP/2783/2015, que aprobó el Modelo 151 y preservó referencias al régimen anterior.",
          sourceIds: [
            LEGACY_REGIME_ORDER_SOURCE.id,
            PREVIOUS_REGIME_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-150.procedure-home.2022-06-03",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 150. IRPF. Régimen especial aplicable a los trabajadores desplazados a territorio español. (Para contribuyentes que hayan optado por este régimen con anterioridad a 1 de enero de 2015)",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G607.shtml",
      officialUpdatedOn: "2022-06-03",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "1cbbd1ebd54de158551bec03683947129a0b6c6c29842f967e26234dd6a05a89",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-150.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 150",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G607.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "30ba7b243302acd686cc3bc07dc61da55d982a2314d8eb7dbb800ceb3cc5c4fd",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-150.download-page.2026-06-09",
      authority: "AEAT",
      kind: "DOWNLOAD_PAGE",
      title: "Descarga del modelo",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-150-irpf______los-trabajadores-desplazados-espanol_/descarga-modelo.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "6470f24200dee39fda0af2b5e905a57aa78964744b96594fe094636564e02e11",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-150.form-pdf.2015-05-14",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Formulario histórico oficial del Modelo 150",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G607/mod150_mi_MI.pdf",
      officialUpdatedOn: "2015-05-14",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "871bfc13ecd61036b765c45f76d8068131229cbd6d2822e691c7fc7de8507d01",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-150.instructions-pdf.2016-04-15",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Instrucciones históricas oficiales del Modelo 150",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/G607/instr150.pdf",
      officialUpdatedOn: "2016-04-15",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ae9c0605d30f01bc587a8a98718f38a0d6bcfd85a85f8a0c0590b4f646b2d82e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-150.country-codes-pdf.2014-06-04",
      authority: "AEAT",
      kind: "DOCUMENT_PDF",
      title: "Códigos de países y territorios enlazados por el Modelo 150",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/static_files/Sede/Procedimiento_ayuda/C_paises/codpaises.pdf",
      officialUpdatedOn: "2014-06-04",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    LEGACY_REGIME_ORDER_SOURCE,
    PREVIOUS_REGIME_ORDER_SOURCE,
  ],
  documents: [
    {
      id: "model-150-historical-form",
      kind: "FORM",
      title: "Formulario histórico oficial del Modelo 150",
      sourceId: "aeat.model-150.form-pdf.2015-05-14",
      landingPageSourceId: "aeat.model-150.download-page.2026-06-09",
      mediaType: "application/pdf",
      fileName: "mod150_mi_MI.pdf",
      byteLength: 1603620,
      pageCount: 11,
      sha256:
        "871bfc13ecd61036b765c45f76d8068131229cbd6d2822e691c7fc7de8507d01",
      activeContentStatus: "JAVASCRIPT_PRESENT",
      formStatus: "ACROFORM_PRESENT",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "FORM_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-150-historical-instructions",
      kind: "INSTRUCTIONS",
      title: "Instrucciones históricas oficiales del Modelo 150",
      sourceId: "aeat.model-150.instructions-pdf.2016-04-15",
      landingPageSourceId: "aeat.model-150.download-page.2026-06-09",
      mediaType: "application/pdf",
      fileName: "instr150.pdf",
      byteLength: 281842,
      pageCount: 20,
      sha256:
        "ae9c0605d30f01bc587a8a98718f38a0d6bcfd85a85f8a0c0590b4f646b2d82e",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "DOCUMENT_PREVIEW",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
    {
      id: "model-150-historical-country-codes",
      kind: "GUIDE",
      title: "Relación histórica de códigos de países y territorios",
      sourceId: "aeat.model-150.country-codes-pdf.2014-06-04",
      landingPageSourceId: "aeat.model-150.procedure-home.2022-06-03",
      mediaType: "application/pdf",
      fileName: "codpaises.pdf",
      byteLength: 27829,
      pageCount: 2,
      sha256:
        "ce8b80e56456a9d344593697a978216ce1e393fce237a37c52ba10aebd4f5ffe",
      activeContentStatus: "NO_JAVASCRIPT_DETECTED",
      formStatus: "NO_ACROFORM_DETECTED",
      freshnessStatus: "LEGACY_REFERENCES_DETECTED",
      previewSuitability: "NONE",
      usePolicy: "OFFICIAL_EXTERNAL_DOWNLOAD_ONLY",
    },
  ],
  thumbnail: {
    id: "model-150-historical-form-preview",
    sourceId: "aeat.model-150.form-pdf.2015-05-14",
    publicHref:
      "/fiscal-models/modelo-150/formulario-modelo-150-historico-preview.png",
    mediaType: "image/png",
    width: 640,
    height: 640,
    pageNumber: 1,
    cropVariant: "HEADER_AND_DOCUMENT_START",
    sha256:
      "0a2981d01f2e205bd6ac110756e64d65439585317a9a54cc3153ff099c0de19a",
    alt: "Vista previa histórica de la primera página del formulario oficial del Modelo 150 de la AEAT",
    provenanceStatus: "DERIVED_FROM_HASHED_OFFICIAL_PDF",
  },
  links: [
    {
      id: "model-150-link-procedure",
      label: "Página oficial histórica del Modelo 150",
      sourceId: "aeat.model-150.procedure-home.2022-06-03",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-link-downloads",
      label: "Documentos históricos enlazados por la AEAT",
      sourceId: "aeat.model-150.download-page.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-link-form",
      label: "Formulario PDF histórico del Modelo 150",
      sourceId: "aeat.model-150.form-pdf.2015-05-14",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-link-approval-order",
      label: "Orden EHA/848/2008",
      sourceId: LEGACY_REGIME_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-150-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 150?",
      answer: "La AEAT lo identifica como la declaración del régimen especial aplicable a trabajadores desplazados, limitada en su título a quienes hubieran optado por ese régimen antes del 1 de enero de 2015.",
      sourceIds: ["aeat.model-150.procedure-home.2022-06-03"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-faq-historical",
      question: "¿Por qué se muestra como modelo histórico?",
      answer: "Porque la propia denominación oficial lo circunscribe a opciones anteriores al 1 de enero de 2015. La ficha no decide si esa referencia corresponde a una persona concreta.",
      sourceIds: [OFFICIAL_MODEL_INDEX_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-faq-documents",
      question: "¿Qué documentos enlaza la AEAT?",
      answer: "La página de descarga enlaza el formulario y sus instrucciones PDF; la portada del procedimiento enlaza además una relación PDF de códigos de países y territorios.",
      sourceIds: [
        "aeat.model-150.procedure-home.2022-06-03",
        "aeat.model-150.download-page.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-faq-form-metadata",
      question: "¿Qué metadatos conserva el formulario PDF?",
      answer: "El archivo tiene once páginas, contiene un AcroForm con JavaScript y registra en sus metadatos creación en 2008 y modificación en 2015.",
      sourceIds: ["aeat.model-150.form-pdf.2015-05-14"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-faq-thumbnail",
      question: "¿Qué representa la miniatura de esta ficha?",
      answer: "Es una imagen derivada de la primera página del formulario oficial enlazado, mostrada únicamente como vista previa histórica.",
      sourceIds: [
        "aeat.model-150.download-page.2026-06-09",
        "aeat.model-150.form-pdf.2015-05-14",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-150-faq-law",
      question: "¿Qué normas destaca la página oficial?",
      answer: "La página enlaza la Orden EHA/848/2008 y la Orden HAP/2783/2015 dentro del contexto normativo de los modelos 150 y 151.",
      sourceIds: [
        LEGACY_REGIME_ORDER_SOURCE.id,
        PREVIOUS_REGIME_ORDER_SOURCE.id,
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"150">;

const MODEL_151_CONTENT = {
  schemaVersion: PUBLIC_AEAT_OFFICIAL_CONTENT_SCHEMA_VERSION_V1,
  releaseId: PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_RELEASE_ID_V1,
  code: "151",
  contentStatus: "OFFICIAL_INFORMATION",
  sourceVerificationStatus: "VERIFIED",
  applicabilityStatus: "NOT_EVALUATED",
  lifecycleStatus: "UNDETERMINED",
  reviewedOn: REVIEWED_ON,
  canonicalName:
    "Declaración del Impuesto sobre la Renta de las Personas Físicas del régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
  summary:
    "Declaración del IRPF que la AEAT vincula al régimen especial aplicable a trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
  searchTerms: [
    "modelo 151",
    "declaración IRPF desplazados",
    "régimen especial trabajadores desplazados",
    "profesionales desplazados",
    "emprendedores desplazados",
    "inversores desplazados",
    "ejercicio 2023 y siguientes",
    "hasta ejercicio 2022",
    "instrucciones modelo 151",
    "IRPF régimen especial",
    "Orden HFP 1338 2023",
    "Orden HAP 2783 2015",
  ],
  sections: [
    {
      id: "model-151-purpose",
      title: "Para qué sirve",
      kind: "PURPOSE",
      items: [
        {
          id: "model-151-purpose-declaration",
          heading: "Declaración del IRPF del régimen especial",
          text: "La AEAT identifica el Modelo 151 como la declaración del IRPF del régimen especial aplicable a trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
          sourceIds: [
            OFFICIAL_MODEL_INDEX_SOURCE.id,
            "aeat.model-151.procedure-home.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-151-purpose-administrative-record",
          heading: "Identidad en la ficha administrativa",
          text: "La ficha administrativa registra el Modelo 151 dentro del IRPF y describe su relación con el régimen especial, sin que este contenido evalúe condiciones personales.",
          sourceIds: ["aeat.model-151.procedure-record.2026-06-09"],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-151-information",
      title: "Información oficial disponible",
      kind: "DETAILS",
      items: [
        {
          id: "model-151-information-instructions",
          heading: "Dos recorridos de instrucciones",
          text: "La Sede publica unas instrucciones para el ejercicio 2023 y siguientes y conserva por separado las instrucciones hasta el ejercicio 2022.",
          sourceIds: [
            "aeat.model-151.instructions-current.2026-06-12",
            "aeat.model-151.instructions-historical.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-151-information-help",
          heading: "Ayuda técnica del formulario web",
          text: "La AEAT mantiene una ayuda técnica del Modelo 151. Las páginas oficiales revisadas no enlazan un formulario PDF estático independiente del servicio web.",
          sourceIds: [
            "aeat.model-151.procedure-home.2026-06-09",
            "aeat.model-151.help.2026-06-19",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
    {
      id: "model-151-temporal-context",
      title: "Contexto temporal y normativo",
      kind: "SCOPE",
      items: [
        {
          id: "model-151-temporal-context-exercises",
          heading: "Separación documental por ejercicios",
          text: "La página oficial diferencia expresamente «ejercicio 2023 y siguientes» de «hasta el ejercicio 2022». Este release conserva ambas referencias y no selecciona un ejercicio para el usuario.",
          sourceIds: [
            "aeat.model-151.procedure-home.2026-06-09",
            "aeat.model-151.instructions-current.2026-06-12",
            "aeat.model-151.instructions-historical.2026-06-09",
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
        {
          id: "model-151-temporal-context-orders",
          heading: "Normas enlazadas por la AEAT",
          text: "La página enlaza la Orden HFP/1338/2023, la Orden HAP/2783/2015 y la Orden HAP/2194/2013. Se conservan como referencias oficiales sin convertirlas en una decisión de aplicabilidad.",
          sourceIds: [
            CURRENT_REGIME_ORDER_SOURCE.id,
            PREVIOUS_REGIME_ORDER_SOURCE.id,
            PROCESSING_ORDER_SOURCE.id,
          ],
          semantics: "OFFICIAL_INFORMATION_ONLY",
        },
      ],
    },
  ],
  sources: [
    OFFICIAL_MODEL_INDEX_SOURCE,
    {
      id: "aeat.model-151.procedure-home.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_HOME",
      title:
        "Modelo 151. Régimen especial aplicable a los trabajadores, profesionales, emprendedores e inversores, desplazados a territorio español",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientoini/G615.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "7b510f05d74b3575102b5c731ff7c60c7d56c1a78b1eaefab62fcb49dce010be",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-151.procedure-record.2026-06-09",
      authority: "AEAT",
      kind: "PROCEDURE_RECORD",
      title: "Ficha del procedimiento del Modelo 151",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/procedimientos/G615.shtml",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "096818083a2a68f92efd5be74c1b441edea86b83577a746342ba9f8939e4eb05",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-151.instructions-current.2026-06-12",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones de cumplimentación ejercicio 2023 y siguientes",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-151-decla_____los-trabajadores-desplazados-espanol_/instrucciones-cumplimentacion-ejercicio-2023-siguientes.html",
      officialUpdatedOn: "2026-06-12",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "bcf777c7f05613b8c065062fea7addd505aa114b64df8fbd24b94573959a3412",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-151.instructions-historical.2026-06-09",
      authority: "AEAT",
      kind: "INFORMATION_PAGE",
      title: "Instrucciones de cumplimentación hasta el ejercicio 2022",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/todas-gestiones/impuestos-tasas/impuesto-sobre-renta-personas-fisicas/modelo-151-decla_____los-trabajadores-desplazados-espanol_/instrucciones-cumplimentar-declaracion.html",
      officialUpdatedOn: "2026-06-09",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "0129c1303504e6b0e7dcd6598ab62d740d0d3875a4ad4a744c2b24fe5e89753e",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    {
      id: "aeat.model-151.help.2026-06-19",
      authority: "AEAT",
      kind: "HELP_PAGE",
      title: "Modelo 151",
      canonicalUrl:
        "https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/presentacion-declaraciones-ayuda-tecnica/modelo-151.html",
      officialUpdatedOn: "2026-06-19",
      capturedOn: REVIEWED_ON,
      sourceSha256:
        "515fd643db1c29bb413135db2347c8a786195f75e967e50b2ecc1b266399d155",
      verificationStatus: "SOURCE_HASH_CAPTURED",
    },
    CURRENT_REGIME_ORDER_SOURCE,
    PREVIOUS_REGIME_ORDER_SOURCE,
    PROCESSING_ORDER_SOURCE,
  ],
  documents: [],
  thumbnail: null,
  links: [
    {
      id: "model-151-link-procedure",
      label: "Página oficial del Modelo 151",
      sourceId: "aeat.model-151.procedure-home.2026-06-09",
      category: "PROCEDURE",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-link-current-instructions",
      label: "Instrucciones para el ejercicio 2023 y siguientes",
      sourceId: "aeat.model-151.instructions-current.2026-06-12",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-link-historical-instructions",
      label: "Instrucciones hasta el ejercicio 2022",
      sourceId: "aeat.model-151.instructions-historical.2026-06-09",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-link-help",
      label: "Ayuda técnica oficial del Modelo 151",
      sourceId: "aeat.model-151.help.2026-06-19",
      category: "INFORMATION",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-link-current-order",
      label: "Orden HFP/1338/2023",
      sourceId: CURRENT_REGIME_ORDER_SOURCE.id,
      category: "LEGAL",
      policy: "OFFICIAL_EXTERNAL_INFORMATION_ONLY",
    },
  ],
  faq: [
    {
      id: "model-151-faq-identity",
      question: "¿Qué identifica la AEAT como Modelo 151?",
      answer: "La AEAT lo identifica como la declaración del IRPF del régimen especial aplicable a trabajadores, profesionales, emprendedores e inversores desplazados a territorio español.",
      sourceIds: ["aeat.model-151.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-faq-instructions",
      question: "¿Qué instrucciones publica la Sede?",
      answer: "Publica unas instrucciones para el ejercicio 2023 y siguientes y mantiene por separado las instrucciones hasta el ejercicio 2022.",
      sourceIds: [
        "aeat.model-151.instructions-current.2026-06-12",
        "aeat.model-151.instructions-historical.2026-06-09",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-faq-exercise",
      question: "¿Esta ficha selecciona un ejercicio para el usuario?",
      answer: "No. Conserva literalmente la separación documental publicada por la AEAT entre 2023 y siguientes y hasta 2022.",
      sourceIds: ["aeat.model-151.procedure-home.2026-06-09"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-faq-help",
      question: "¿Existe ayuda técnica oficial?",
      answer: "Sí. La AEAT mantiene una página de ayuda técnica titulada «Modelo 151» para su formulario web.",
      sourceIds: ["aeat.model-151.help.2026-06-19"],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-faq-static-pdf",
      question: "¿La página enlaza un formulario PDF estático?",
      answer: "No en las páginas oficiales revisadas. El formulario descrito por la ayuda es un servicio web y las instrucciones se publican como páginas HTML.",
      sourceIds: [
        "aeat.model-151.procedure-home.2026-06-09",
        "aeat.model-151.help.2026-06-19",
      ],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
    {
      id: "model-151-faq-law",
      question: "¿Qué norma reciente aprueba el Modelo 151?",
      answer: "La Orden HFP/1338/2023 aprueba el Modelo 151 y el Modelo 149 adaptados al régimen descrito en esa orden.",
      sourceIds: [CURRENT_REGIME_ORDER_SOURCE.id],
      semantics: "OFFICIAL_INFORMATION_ONLY",
    },
  ],
  externalNavigation: null,
  limitations: LIMITATIONS,
} as const satisfies PublicAeatOfficialModelContentV1<"151">;

export const PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_CONTENT_V1 = deepFreeze([
  MODEL_149_CONTENT,
  MODEL_150_CONTENT,
  MODEL_151_CONTENT,
] as const);

export type PublicAeatBatch04DisplacedWorkersCodeV1 =
  (typeof PUBLIC_AEAT_BATCH_04_DISPLACED_WORKERS_CONTENT_V1)[number]["code"];
