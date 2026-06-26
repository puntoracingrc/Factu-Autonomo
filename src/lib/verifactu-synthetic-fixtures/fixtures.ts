import type { SyntheticFixtureDescriptor } from "./types";

export const VERIFACTU_SYNTHETIC_FIXTURE_DESCRIPTORS = [
  {
    id: "SYNTHETIC_ONLY_ALTA_BASIC_001",
    kind: "alta_basic",
    purpose:
      "Descriptor interno para un alta basica ficticia de la primera oleada sintetica.",
    syntheticOnly: true,
    sourcePhase: "2B.6B",
    expectedFutureValidations: [
      "descriptor_policy",
      "shape_candidate",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta aprobacion explicita de fases posteriores de serializacion candidata.",
    riskNotes: [
      "Datos ficticios y no reutilizables como documento fiscal.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_1",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_ALTA_BASIC",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_NORTE_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_ALTA_BASIC_001",
      controlledDate: "2026-01-15",
      amountCents: 12500,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_CHAIN_FIRST_001",
    kind: "chain_first",
    purpose:
      "Descriptor interno para el primer elemento ficticio de una cadena sintetica.",
    syntheticOnly: true,
    sourcePhase: "2B.6B",
    expectedFutureValidations: [
      "descriptor_policy",
      "first_chain_shape",
      "local_sequence_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de cadena revisada.",
    riskNotes: [
      "Referencia de cadena puramente conceptual.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_1",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_CHAIN_FIRST",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_SUR_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_CHAIN_FIRST_001",
      chainRef: "SYNTHETIC_ONLY_CHAIN_ALPHA",
      sequence: 1,
      previousRef: null,
      controlledDate: "2026-01-16",
      amountCents: 9900,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_CHAIN_SECOND_001",
    kind: "chain_second",
    purpose:
      "Descriptor interno para el segundo elemento ficticio de una cadena sintetica.",
    syntheticOnly: true,
    sourcePhase: "2B.6B",
    expectedFutureValidations: [
      "descriptor_policy",
      "second_chain_shape",
      "local_sequence_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de cadena revisada.",
    riskNotes: [
      "Referencia de cadena puramente conceptual.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_1",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_CHAIN_SECOND",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_SUR_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_CHAIN_SECOND_001",
      chainRef: "SYNTHETIC_ONLY_CHAIN_ALPHA",
      sequence: 2,
      previousRef: "SYNTHETIC_ONLY_DOC_CHAIN_FIRST_001",
      controlledDate: "2026-01-17",
      amountCents: 10100,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_CANCEL_BASIC_001",
    kind: "cancel_basic",
    purpose:
      "Descriptor interno para una anulacion basica ficticia de la primera oleada sintetica.",
    syntheticOnly: true,
    sourcePhase: "2B.6B",
    expectedFutureValidations: [
      "descriptor_policy",
      "cancel_shape_candidate",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de anulacion revisada.",
    riskNotes: [
      "Vinculacion ficticia a documento sintetico.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_1",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_CANCEL_BASIC",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_BLUE_STUDIO",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_NORTE_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_CANCEL_BASIC_001",
      targetDocumentRef: "SYNTHETIC_ONLY_DOC_ALTA_BASIC_001",
      controlledDate: "2026-01-18",
      amountCents: 12500,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_ALTA_INVALID_NIF_001",
    kind: "alta_invalid_nif",
    purpose:
      "Descriptor interno para un alta ficticia con identificador tributario no valido.",
    syntheticOnly: true,
    sourcePhase: "2B.6C",
    expectedFutureValidations: [
      "descriptor_policy",
      "negative_nif_shape",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de validacion negativa revisada.",
    riskNotes: [
      "Caso negativo ficticio; no representa una persona ni entidad existente.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_2",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_ALTA_INVALID_NIF",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_OESTE_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_ALTA_INVALID_NIF_001",
      syntheticNif: "SYNTHETIC_ONLY_NIF_INVALID_ALPHA",
      controlledDate: "2026-02-10",
      amountCents: 8700,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_ALTA_INVALID_DATE_001",
    kind: "alta_invalid_date",
    purpose:
      "Descriptor interno para un alta ficticia con fecha controlada no valida.",
    syntheticOnly: true,
    sourcePhase: "2B.6C",
    expectedFutureValidations: [
      "descriptor_policy",
      "negative_date_shape",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de validacion negativa revisada.",
    riskNotes: [
      "Caso negativo ficticio; la fecha no procede de ningun documento emitido.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_2",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_ALTA_INVALID_DATE",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_ESTE_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_ALTA_INVALID_DATE_001",
      dateCandidate: "SYNTHETIC_ONLY_DATE_INVALID_MONTH_13",
      controlledDate: "2026-02-11",
      amountCents: 4321,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_ALTA_MISSING_SERIES_NUMBER_001",
    kind: "alta_missing_series_number",
    purpose:
      "Descriptor interno para un alta ficticia sin referencia de serie y numero.",
    syntheticOnly: true,
    sourcePhase: "2B.6C",
    expectedFutureValidations: [
      "descriptor_policy",
      "negative_series_number_shape",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de validacion negativa revisada.",
    riskNotes: [
      "Caso negativo ficticio; no crea huecos ni numeracion documental.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_2",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_ALTA_MISSING_SERIES_NUMBER",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_CENTRO_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_ALTA_MISSING_SERIES_NUMBER_001",
      seriesNumberRef: "SYNTHETIC_ONLY_SERIES_NUMBER_MISSING",
      controlledDate: "2026-02-12",
      amountCents: 5550,
      currency: "EUR",
    },
  },
  {
    id: "SYNTHETIC_ONLY_ALTA_HASH_MISMATCH_001",
    kind: "alta_hash_mismatch",
    purpose:
      "Descriptor interno para un alta ficticia con huella candidata discordante.",
    syntheticOnly: true,
    sourcePhase: "2B.6C",
    expectedFutureValidations: [
      "descriptor_policy",
      "negative_hash_shape",
      "local_semantic_candidate",
    ],
    blockedUntil:
      "Bloqueado hasta que exista una politica candidata de validacion negativa revisada.",
    riskNotes: [
      "Caso negativo ficticio; las huellas son marcadores internos sin valor fiscal.",
      "Sin payload serializado ni conexion externa.",
    ],
    metadata: {
      wave: "SYNTHETIC_ONLY_WAVE_2",
      scenarioTag: "SYNTHETIC_ONLY_SCENARIO_ALTA_HASH_MISMATCH",
      issuerRef: "SYNTHETIC_ONLY_ISSUER_RED_WORKSHOP",
      customerRef: "SYNTHETIC_ONLY_CUSTOMER_CENTRO_TEST",
      documentRef: "SYNTHETIC_ONLY_DOC_ALTA_HASH_MISMATCH_001",
      expectedHashRef: "SYNTHETIC_ONLY_HASH_EXPECTED_ALPHA",
      observedHashRef: "SYNTHETIC_ONLY_HASH_OBSERVED_BETA",
      controlledDate: "2026-02-13",
      amountCents: 6400,
      currency: "EUR",
    },
  },
] as const satisfies readonly SyntheticFixtureDescriptor[];
