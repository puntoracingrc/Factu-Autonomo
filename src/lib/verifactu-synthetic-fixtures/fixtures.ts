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
] as const satisfies readonly SyntheticFixtureDescriptor[];
