import {
  parseAeatEnforcementPartyFactsV1,
  type AeatEnforcementPartyFactsV1,
} from "./aeat-enforcement-party-facts.v1";

export const PARTY_FACTS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V1 = 1 as const;
export const PARTY_FACTS_REVIEW_VIEW_MODEL_VERSION_V1 = "1.0.0" as const;
const PARTY_FACTS_REVIEW_VIEW_MODEL_BRAND_V1: unique symbol = Symbol(
  "party-facts-review-view-model.v1",
);

export type PartyFactsReviewStateV1 =
  | "FACTS"
  | "PENDING"
  | "AMBIGUOUS"
  | "BLOCKED";

export interface PartyFactsReviewViewModelV1 {
  readonly [PARTY_FACTS_REVIEW_VIEW_MODEL_BRAND_V1]: true;
  readonly schemaVersion: 1;
  readonly viewModelVersion: "1.0.0";
  readonly state: PartyFactsReviewStateV1;
  readonly stateLabel:
    | "Identificación leída"
    | "Identificación pendiente"
    | "Identificación ambigua"
    | "Identificación bloqueada";
  readonly summary: string;
  readonly subject: Readonly<{
    roleLabel: "Obligado al pago";
    nameLabel: "Nombre o razón social";
    taxIdLabel: "NIF";
    printedName: string;
    printedTaxId: string;
    occurrenceCount: number;
    pageNumbers: readonly number[];
  }> | null;
  readonly warnings: readonly [
    "La identificación procede de la sección «Identificación del obligado al pago» del propio documento.",
    "No se ha comparado el NIF con el perfil de la cuenta ni se ha verificado la autenticidad del PDF.",
    "Mostrar esta identificación no crea ni confirma una deuda, un pago, un asiento o un plazo.",
  ];
  readonly ephemeralNotice: "El nombre y el NIF son visibles solo durante esta revisión: no se guardan en la ficha técnica ni en el historial local.";
  readonly roleMeaning: "EXPLICIT_PRINTED_SECTION_ONLY";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export class PartyFactsReviewViewModelV1Error extends Error {
  constructor() {
    super("INVALID_PARTY_FACTS_REVIEW_INPUT");
    this.name = "PartyFactsReviewViewModelV1Error";
  }
}

const COPY = Object.freeze({
  FACTS: Object.freeze({
    stateLabel: "Identificación leída" as const,
    summary:
      "El documento identifica de forma expresa a la persona o entidad indicada como obligada al pago.",
  }),
  PENDING: Object.freeze({
    stateLabel: "Identificación pendiente" as const,
    summary:
      "No se ha encontrado una sección completa con nombre o razón social y NIF. La ausencia no se interpreta como falta de obligado.",
  }),
  AMBIGUOUS: Object.freeze({
    stateLabel: "Identificación ambigua" as const,
    summary:
      "El documento contiene identificaciones distintas o una sección incompleta junto a otra completa. No mostramos datos parciales.",
  }),
  BLOCKED: Object.freeze({
    stateLabel: "Identificación bloqueada" as const,
    summary:
      "La identificación impresa no supera la validación estricta. No se corrige ni se completa automáticamente.",
  }),
});

const WARNINGS = Object.freeze([
  "La identificación procede de la sección «Identificación del obligado al pago» del propio documento.",
  "No se ha comparado el NIF con el perfil de la cuenta ni se ha verificado la autenticidad del PDF.",
  "Mostrar esta identificación no crea ni confirma una deuda, un pago, un asiento o un plazo.",
] as const);

export function projectPartyFactsReviewViewModelV1(
  input: unknown,
): PartyFactsReviewViewModelV1 {
  try {
    const parsed = parseAeatEnforcementPartyFactsV1(input);
    const state = stateForOutcome(parsed.outcome);
    const hasSubject = parsed.identifiedSubject !== null;
    if ((state === "FACTS") !== hasSubject) {
      throw new PartyFactsReviewViewModelV1Error();
    }
    const subject = parsed.identifiedSubject
      ? Object.freeze({
          roleLabel: "Obligado al pago" as const,
          nameLabel: "Nombre o razón social" as const,
          taxIdLabel: "NIF" as const,
          printedName: parsed.identifiedSubject.printedName,
          printedTaxId: parsed.identifiedSubject.printedTaxId,
          occurrenceCount: parsed.identifiedSubject.occurrenceCount,
          pageNumbers: Object.freeze([
            ...parsed.identifiedSubject.pageNumbers,
          ]),
        })
      : null;
    const copy = COPY[state];
    return Object.freeze({
      [PARTY_FACTS_REVIEW_VIEW_MODEL_BRAND_V1]: true as const,
      schemaVersion: PARTY_FACTS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V1,
      viewModelVersion: PARTY_FACTS_REVIEW_VIEW_MODEL_VERSION_V1,
      state,
      stateLabel: copy.stateLabel,
      summary: copy.summary,
      subject,
      warnings: WARNINGS,
      ephemeralNotice:
        "El nombre y el NIF son visibles solo durante esta revisión: no se guardan en la ficha técnica ni en el historial local.",
      roleMeaning: "EXPLICIT_PRINTED_SECTION_ONLY",
      persistencePolicy: "DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch {
    throw new PartyFactsReviewViewModelV1Error();
  }
}

function stateForOutcome(
  outcome: AeatEnforcementPartyFactsV1["outcome"],
): PartyFactsReviewStateV1 {
  switch (outcome) {
    case "FACTS_AVAILABLE":
      return "FACTS";
    case "INFORMATION_PENDING":
      return "PENDING";
    case "AMBIGUOUS":
      return "AMBIGUOUS";
    case "PROCESSING_BLOCKED":
      return "BLOCKED";
  }
}
