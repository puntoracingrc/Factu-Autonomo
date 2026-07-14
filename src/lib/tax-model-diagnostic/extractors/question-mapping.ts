import { DIAGNOSTIC_QUESTIONS } from "../questions";
import type {
  EvidenceStatus,
  ExtractedFact,
  JsonValue,
  QuestionResolution,
  TemporalScope,
} from "./contracts";

export const TAX_DOCUMENT_QUESTION_MAPPING_VERSION =
  "tax-document-question-mapping.2026-07.v1" as const;

const KNOWN_QUESTION_IDS = new Set(
  DIAGNOSTIC_QUESTIONS.map((question) => question.questionId),
);

interface ResolutionInput {
  questionId: string;
  answer: JsonValue;
  facts: readonly ExtractedFact[];
  explanation: string;
  completeDocument: boolean;
  missingInformation?: readonly string[];
}

function resolution(input: ResolutionInput): QuestionResolution | null {
  if (!KNOWN_QUESTION_IDS.has(input.questionId) || input.facts.length === 0) {
    return null;
  }
  const conflictFacts = input.facts.filter((fact) => fact.status === "CONFLICT");
  const historical = input.facts.every(
    (fact) =>
      fact.status === "HISTORICAL_ONLY" || fact.temporalScope === "HISTORICAL",
  );
  const status: EvidenceStatus =
    conflictFacts.length > 0
      ? "CONFLICT"
      : historical
        ? "HISTORICAL_ONLY"
        : "PREFILLED_NEEDS_CONFIRMATION";
  const confirmationRequired = true;
  return {
    questionId: input.questionId,
    proposedAnswer: input.answer,
    status,
    temporalScope: input.facts[0].temporalScope,
    evidenceIds: input.facts.map((fact) => fact.factId),
    explanation: input.explanation,
    // La interfaz conserva la pregunta visible. Solo pasa a completada después
    // de la confirmación humana en la frontera de persistencia.
    canSkipQuestion:
      !confirmationRequired && input.completeDocument && conflictFacts.length === 0,
    confirmationRequired,
    missingInformation: [
      ...(input.missingInformation ?? []),
      ...(historical
        ? ["Confirmar si la situación continúa en el ejercicio analizado."]
        : []),
    ],
    conflictingInformation: conflictFacts.map(
      (fact) => `Existe una fuente contradictoria para ${fact.factType}.`,
    ),
  };
}

function factsOf(
  facts: readonly ExtractedFact[],
  factType: string,
): ExtractedFact[] {
  return facts.filter(
    (fact) =>
      fact.factType === factType &&
      fact.status !== "UNREADABLE" &&
      fact.status !== "UNSUPPORTED",
  );
}

function add(
  output: QuestionResolution[],
  item: QuestionResolution | null,
): void {
  if (item) output.push(item);
}

export function resolveQuestionsFromFacts(
  facts: readonly ExtractedFact[],
  completeDocument: boolean,
): readonly QuestionResolution[] {
  const output: QuestionResolution[] = [];

  const taxpayerType = factsOf(facts, "SUBJECT.TAXPAYER_TYPE");
  if (taxpayerType.length === 1) {
    add(
      output,
      resolution({
        questionId: "A_INVOICING_SUBJECT",
        answer: taxpayerType[0].normalizedValue,
        facts: taxpayerType,
        explanation: "El tipo de contribuyente consta expresamente en el documento.",
        completeDocument,
      }),
    );
  }

  const territory = factsOf(facts, "SUBJECT.TAX_TERRITORY");
  if (territory.length === 1) {
    add(
      output,
      resolution({
        questionId: "B_TERRITORY",
        answer: territory[0].normalizedValue,
        facts: territory,
        explanation: "El territorio fiscal se ha leído de un campo explícito.",
        completeDocument,
      }),
    );
  }

  const activityNature = factsOf(facts, "ACTIVITY.NATURE");
  if (activityNature.length === 1) {
    add(
      output,
      resolution({
        questionId: "C_ACTIVITY_KINDS",
        answer: activityNature[0].normalizedValue,
        facts: activityNature,
        explanation: "La sección de las actividades en alta consta en la relación censal.",
        completeDocument,
        missingInformation: completeDocument
          ? []
          : ["La captura no acredita que no existan otras actividades."],
      }),
    );
  }

  const activityDates = factsOf(facts, "ACTIVITY.DATES");
  const dates = activityDates[0]?.normalizedValue;
  if (activityDates.length === 1 && Array.isArray(dates) && dates.length === 1) {
    add(
      output,
      resolution({
        questionId: "B_START_DATE",
        answer: dates[0],
        facts: activityDates,
        explanation: "Se ha leído una única fecha de inicio para la actividad en alta.",
        completeDocument,
      }),
    );
  }

  const incomeTax = factsOf(facts, "IRPF.METHOD");
  if (incomeTax.length === 1) {
    add(
      output,
      resolution({
        questionId: "D_INCOME_TAX_REGIME",
        answer: incomeTax[0].normalizedValue,
        facts: incomeTax,
        explanation: "El método de estimación de IRPF aparece marcado en el documento.",
        completeDocument,
      }),
    );
  }

  const vat = factsOf(facts, "VAT.REGIMES");
  if (vat.length === 1) {
    add(
      output,
      resolution({
        questionId: "E_VAT_REGIMES",
        answer: vat[0].normalizedValue,
        facts: vat,
        explanation: "Los regímenes de IVA aparecen marcados expresamente.",
        completeDocument,
      }),
    );
  }

  const reta = factsOf(facts, "IRPF.RETA_PERIODS");
  if (reta.length > 0) {
    add(
      output,
      resolution({
        questionId: "B_RETA",
        answer: "YES",
        facts: reta,
        explanation: "El informe de Seguridad Social acredita un periodo de trabajo autónomo.",
        completeDocument,
      }),
    );
  }

  const currentCensus = factsOf(facts, "CENSUS.CURRENT_STATUS");
  if (currentCensus.length === 1) {
    add(
      output,
      resolution({
        questionId: "N_CENSUS_REVIEWED",
        answer: "YES",
        facts: currentCensus,
        explanation: "Se ha leído un certificado de situación censal actual.",
        completeDocument,
      }),
    );
  }

  const obligations = factsOf(facts, "CENSUS.PERIODIC_OBLIGATIONS");
  const codes = obligations[0]?.normalizedValue;
  if (obligations.length === 1 && Array.isArray(codes)) {
    add(
      output,
      resolution({
        questionId: "N_CENSUS_OBLIGATIONS",
        answer: codes,
        facts: obligations,
        explanation: "La vista actual muestra las obligaciones periódicas en alta.",
        completeDocument,
        missingInformation: completeDocument
          ? []
          : ["La captura parcial no acredita una lista censal completa."],
      }),
    );
    if (completeDocument) {
      add(
        output,
        resolution({
          questionId: "N_CENSUS_REVIEWED",
          answer: "YES",
          facts: obligations,
          explanation: "La relación de obligaciones se ha leído completa.",
          completeDocument,
        }),
      );
    }
    if (codes.includes("115")) {
      for (const questionId of [
        "G_RENTS_PREMISES",
        "G_RENT_WITHHOLDING",
      ] as const) {
        add(
          output,
          resolution({
            questionId,
            answer: "YES",
            facts: obligations,
            explanation:
              "Hacienda muestra activa la obligación periódica vinculada al modelo 115.",
            completeDocument,
            missingInformation: [
              "Confirmar si el alquiler continúa y coincide con la realidad actual.",
            ],
          }),
        );
      }
    }
    if (codes.includes("131")) {
      add(
        output,
        resolution({
          questionId: "D_INCOME_TAX_REGIME",
          answer: "OBJECTIVE_ESTIMATION",
          facts: obligations,
          explanation:
            "Hacienda muestra activa la obligación de pagos fraccionados en estimación objetiva.",
          completeDocument,
          missingInformation: ["Contrastar el método con la situación tributaria actual."],
        }),
      );
    }
  }

  return output;
}

export function questionMappingUsesOnlyKnownQuestions(): boolean {
  return resolveQuestionsFromFacts([], false).every((item) =>
    KNOWN_QUESTION_IDS.has(item.questionId),
  );
}

export function temporalScopeOf(
  resolution: QuestionResolution,
): TemporalScope {
  return resolution.temporalScope;
}
