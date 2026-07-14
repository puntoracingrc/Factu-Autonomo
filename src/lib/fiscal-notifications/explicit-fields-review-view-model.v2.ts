import {
  parseAeatEnforcementExplicitFieldsV2,
  type AeatEnforcementExplicitFieldsV2,
} from "./aeat-enforcement-explicit-fields.v2";

export const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V2 = 2 as const;
export const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_VERSION_V2 = "2.0.0" as const;
const EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V2: unique symbol = Symbol(
  "explicit-fields-review-view-model.v2",
);

type ReferenceKindV2 =
  AeatEnforcementExplicitFieldsV2["referenceFacts"][number]["kind"];
type PrintedDateKindV2 =
  AeatEnforcementExplicitFieldsV2["printedDateFacts"][number]["kind"];

export type ExplicitFieldsReviewStateV2 =
  | "FACTS"
  | "PENDING"
  | "AMBIGUOUS"
  | "BLOCKED";

export type ExplicitFieldsReviewStateLabelV2 =
  | "Datos impresos detectados"
  | "Información pendiente"
  | "Lectura ambigua"
  | "Lectura bloqueada";

export type ExplicitFieldsReviewSummaryV2 =
  | "Se han leído referencias y/o fechas impresas. Contrasta los valores con el PDF original antes de confirmarlos."
  | "No se han encontrado campos bajo las etiquetas cubiertas. La ausencia no confirma que el documento no los contenga."
  | "Aparecen valores distintos para una misma categoría. No mostramos ningún valor hasta que una persona revise el documento."
  | "El formato no supera la validación estricta. No mostramos datos parciales ni corregimos valores automáticamente.";

export type ExplicitFieldsReviewCategoryLabelV2 =
  | "Clave de liquidación"
  | "Referencia del documento"
  | "Justificante de pago"
  | "Código seguro de verificación (CSV)"
  | "Vto. (identificador impreso)";

export type ExplicitFieldsReviewDateLabelV2 =
  | "Fecha de emisión impresa"
  | "Fecha de firma impresa"
  | "Fin del período voluntario impreso";

export type ExplicitFieldsReviewCalendarDateV2 =
  `${number}-${number}-${number}`;

export interface ExplicitFieldsReviewCategoryV2 {
  readonly kind: ReferenceKindV2;
  readonly label: ExplicitFieldsReviewCategoryLabelV2;
  readonly printedValue: string;
  readonly meaningLabel: "Valor impreso · revisión obligatoria";
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
}

export interface ExplicitFieldsReviewDateV2 {
  readonly kind: PrintedDateKindV2;
  readonly label: ExplicitFieldsReviewDateLabelV2;
  readonly printedValue: string;
  readonly dateTime: ExplicitFieldsReviewCalendarDateV2;
  readonly meaningLabel: "Fecha impresa · sin efecto jurídico determinado";
  readonly occurrenceCount: number;
  readonly pageNumbers: readonly number[];
}

export interface ExplicitFieldsReviewViewModelV2 {
  readonly [EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V2]: true;
  readonly schemaVersion: 2;
  readonly viewModelVersion: "2.0.0";
  readonly state: ExplicitFieldsReviewStateV2;
  readonly stateLabel: ExplicitFieldsReviewStateLabelV2;
  readonly summary: ExplicitFieldsReviewSummaryV2;
  readonly categories: readonly ExplicitFieldsReviewCategoryV2[];
  readonly dates: readonly ExplicitFieldsReviewDateV2[];
  readonly warnings: readonly [
    "Los valores impresos deben contrastarse con el PDF original antes de confirmarlos.",
    "Las fechas impresas no confirman la fecha de notificación ni calculan un vencimiento.",
    "«Vto.» se trata como un identificador impreso, no como una fecha ni una cuota.",
  ];
  readonly ephemeralNotice: "Estos datos son visibles ahora, pero son efímeros: no se guardan, desaparecen al salir y no se incluyen en la ficha técnica ni en el historial local.";
  readonly referenceDisclosure: "EXACT_VALUE_VISIBLE_EPHEMERAL";
  readonly dateMeaning: "PRINTED_ONLY_NO_LEGAL_EFFECT";
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly requiresHumanReview: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export class ExplicitFieldsReviewViewModelV2Error extends Error {
  constructor() {
    super("INVALID_EXPLICIT_FIELDS_REVIEW_INPUT");
    this.name = "ExplicitFieldsReviewViewModelV2Error";
  }
}

const REFERENCE_LABELS: Readonly<
  Record<ReferenceKindV2, ExplicitFieldsReviewCategoryLabelV2>
> = {
  LIQUIDATION_KEY: "Clave de liquidación",
  DOCUMENT_REFERENCE: "Referencia del documento",
  PAYMENT_JUSTIFICANTE: "Justificante de pago",
  CSV: "Código seguro de verificación (CSV)",
  VTO_RAW: "Vto. (identificador impreso)",
};

const DATE_LABELS: Readonly<
  Record<PrintedDateKindV2, ExplicitFieldsReviewDateLabelV2>
> = {
  PRINTED_ISSUE_DATE: "Fecha de emisión impresa",
  PRINTED_SIGNATURE_DATE: "Fecha de firma impresa",
  PRINTED_VOLUNTARY_PERIOD_END_DATE:
    "Fin del período voluntario impreso",
};

const COPY: Readonly<
  Record<
    ExplicitFieldsReviewStateV2,
    {
      readonly label: ExplicitFieldsReviewStateLabelV2;
      readonly summary: ExplicitFieldsReviewSummaryV2;
    }
  >
> = {
  FACTS: {
    label: "Datos impresos detectados",
    summary:
      "Se han leído referencias y/o fechas impresas. Contrasta los valores con el PDF original antes de confirmarlos.",
  },
  PENDING: {
    label: "Información pendiente",
    summary:
      "No se han encontrado campos bajo las etiquetas cubiertas. La ausencia no confirma que el documento no los contenga.",
  },
  AMBIGUOUS: {
    label: "Lectura ambigua",
    summary:
      "Aparecen valores distintos para una misma categoría. No mostramos ningún valor hasta que una persona revise el documento.",
  },
  BLOCKED: {
    label: "Lectura bloqueada",
    summary:
      "El formato no supera la validación estricta. No mostramos datos parciales ni corregimos valores automáticamente.",
  },
};

const WARNINGS = Object.freeze([
  "Los valores impresos deben contrastarse con el PDF original antes de confirmarlos.",
  "Las fechas impresas no confirman la fecha de notificación ni calculan un vencimiento.",
  "«Vto.» se trata como un identificador impreso, no como una fecha ni una cuota.",
] as const);

export function projectExplicitFieldsReviewViewModelV2(
  input: unknown,
): ExplicitFieldsReviewViewModelV2 {
  try {
    const parsed = parseAeatEnforcementExplicitFieldsV2(input);
    const state = stateForOutcome(parsed.outcome);
    const factCount =
      parsed.referenceFacts.length + parsed.printedDateFacts.length;
    if ((state === "FACTS") !== (factCount > 0)) {
      throw new ExplicitFieldsReviewViewModelV2Error();
    }

    const categories =
      state === "FACTS"
        ? parsed.referenceFacts.map((item) =>
            Object.freeze({
              kind: item.kind,
              label: REFERENCE_LABELS[item.kind],
              printedValue: item.printedValue,
              meaningLabel: "Valor impreso · revisión obligatoria" as const,
              occurrenceCount: item.occurrenceCount,
              pageNumbers: Object.freeze([...item.pageNumbers]),
            }),
          )
        : [];
    const dates =
      state === "FACTS"
        ? parsed.printedDateFacts.map((item) =>
            Object.freeze({
              kind: item.kind,
              label: DATE_LABELS[item.kind],
              printedValue: item.printedValue,
              dateTime:
                item.calendarDate as ExplicitFieldsReviewCalendarDateV2,
              meaningLabel:
                "Fecha impresa · sin efecto jurídico determinado" as const,
              occurrenceCount: item.occurrenceCount,
              pageNumbers: Object.freeze([...item.pageNumbers]),
            }),
          )
        : [];
    const copy = COPY[state];

    return Object.freeze({
      [EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_BRAND_V2]: true as const,
      schemaVersion: EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_SCHEMA_VERSION_V2,
      viewModelVersion: EXPLICIT_FIELDS_REVIEW_VIEW_MODEL_VERSION_V2,
      state,
      stateLabel: copy.label,
      summary: copy.summary,
      categories: Object.freeze(categories),
      dates: Object.freeze(dates),
      warnings: WARNINGS,
      ephemeralNotice:
        "Estos datos son visibles ahora, pero son efímeros: no se guardan, desaparecen al salir y no se incluyen en la ficha técnica ni en el historial local.",
      referenceDisclosure: "EXACT_VALUE_VISIBLE_EPHEMERAL",
      dateMeaning: "PRINTED_ONLY_NO_LEGAL_EFFECT",
      persistencePolicy: "DO_NOT_PERSIST",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
  } catch {
    throw new ExplicitFieldsReviewViewModelV2Error();
  }
}

function stateForOutcome(
  outcome: AeatEnforcementExplicitFieldsV2["outcome"],
): ExplicitFieldsReviewStateV2 {
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
