import { DIAGNOSTIC_QUESTIONS } from "../questions";
import type {
  EvidenceStatus,
  ExtractedFact,
  JsonValue,
  QuestionResolution,
  TemporalScope,
} from "./contracts";

export const TAX_DOCUMENT_QUESTION_MAPPING_VERSION =
  "tax-document-question-mapping.2026-07.v2" as const;

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
  const conflictFacts = input.facts.filter(
    (fact) => fact.status === "CONFLICT",
  );
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
      !confirmationRequired &&
      input.completeDocument &&
      conflictFacts.length === 0,
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
        explanation:
          "El tipo de contribuyente consta expresamente en el documento.",
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
        explanation:
          "La sección de las actividades en alta consta en la relación censal.",
        completeDocument,
        missingInformation: completeDocument
          ? []
          : ["La captura no acredita que no existan otras actividades."],
      }),
    );
  }

  const activityDates = factsOf(facts, "ACTIVITY.DATES");
  const dates = activityDates[0]?.normalizedValue;
  if (
    activityDates.length === 1 &&
    Array.isArray(dates) &&
    dates.length === 1
  ) {
    add(
      output,
      resolution({
        questionId: "B_START_DATE",
        answer: dates[0],
        facts: activityDates,
        explanation:
          "Se ha leído una única fecha de inicio para la actividad en alta.",
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
        explanation:
          "El método de estimación de IRPF aparece marcado en el documento.",
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
        explanation:
          "El informe de Seguridad Social acredita un periodo de trabajo autónomo.",
        completeDocument,
      }),
    );
  }

  const employees = factsOf(facts, "WITHHOLDING.EMPLOYEES");
  if (employees.length > 0) {
    add(
      output,
      resolution({
        questionId: "F_EMPLOYEES",
        answer: "YES",
        facts: employees,
        explanation:
          "El modelo 190 contiene la clave anual que identifica empleados por cuenta ajena.",
        completeDocument,
        missingInformation: [
          "La respuesta solo se acredita para el ejercicio o periodo de la declaración.",
        ],
      }),
    );
  }

  const professionalRecipients = factsOf(
    facts,
    "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
  );
  if (professionalRecipients.length > 0) {
    add(
      output,
      resolution({
        questionId: "F_PROFESSIONALS",
        answer: "YES",
        facts: professionalRecipients,
        explanation:
          "La declaración identifica expresamente rendimientos de actividades profesionales.",
        completeDocument,
        missingInformation: [
          "La respuesta solo se acredita para el ejercicio o periodo de la declaración.",
        ],
      }),
    );
  }

  const otherIrpfRecipients = factsOf(
    facts,
    "WITHHOLDING.OTHER_IRPF_RECIPIENTS",
  );
  if (otherIrpfRecipients.length > 0) {
    add(
      output,
      resolution({
        questionId: "F_OTHER_WITHHOLDING",
        answer: "YES",
        facts: otherIrpfRecipients,
        explanation:
          "La declaración contiene otras percepciones sujetas a retención o ingreso a cuenta.",
        completeDocument,
        missingInformation: [
          "La respuesta solo se acredita para el ejercicio o periodo de la declaración.",
        ],
      }),
    );
  }

  const rentWithholding = factsOf(facts, "WITHHOLDING.RENT");
  if (rentWithholding.length > 0) {
    for (const questionId of [
      "G_RENTS_PREMISES",
      "G_RENT_WITHHOLDING",
    ] as const) {
      add(
        output,
        resolution({
          questionId,
          answer: "YES",
          facts: rentWithholding,
        explanation:
            "El documento contiene rentas de inmuebles urbanos sujetas a retención.",
          completeDocument,
          missingInformation: [
            "Confirmar si el alquiler continúa en el ejercicio que se está configurando.",
          ],
        }),
      );
    }
  }

  const rentExemption = factsOf(facts, "WITHHOLDING.RENT_EXEMPTION");
  if (rentExemption.length > 0) {
    const exemptionValue = rentExemption[0]?.normalizedValue;
    const exemptionFlag =
      exemptionValue &&
      typeof exemptionValue === "object" &&
      !Array.isArray(exemptionValue)
        ? (exemptionValue as {
            readonly exemptionAccredited?: JsonValue;
          }).exemptionAccredited
        : undefined;
    const exemptionAccredited =
      typeof exemptionFlag === "boolean"
        ? exemptionFlag
        : true;
    add(
      output,
      resolution({
        questionId: "G_LANDLORD_EXEMPTION",
        answer: exemptionAccredited ? "YES" : "NO",
        facts: rentExemption,
        explanation:
          exemptionAccredited
            ? "El certificado acredita expresamente una exoneración de retención del arrendador."
            : "El certificado indica expresamente que la exoneración de retención no está acreditada.",
        completeDocument,
        missingInformation: [
          "Confirmar que el certificado sigue vigente y corresponde al alquiler analizado.",
        ],
      }),
    );
  }

  const capitalWithholding = factsOf(facts, "WITHHOLDING.CAPITAL");
  if (capitalWithholding.length > 0) {
    add(
      output,
      resolution({
        questionId: "H_CAPITAL",
        answer: "YES",
        facts: capitalWithholding,
        explanation:
          "La declaración contiene perceptores, registros o importes positivos de rentas de capital sujetas a retención.",
        completeDocument,
      }),
    );
  }

  const nonResidentWithholding = factsOf(facts, "WITHHOLDING.NON_RESIDENTS");
  if (nonResidentWithholding.length > 0) {
    for (const questionId of [
      "H_NON_RESIDENT",
      "H_NON_RESIDENT_CONFIRMED",
    ] as const) {
      add(
        output,
        resolution({
          questionId,
          answer: "YES",
          facts: nonResidentWithholding,
          explanation:
            "La declaración presentada acredita rentas satisfechas a no residentes declaradas como retenedor en España.",
          completeDocument,
          missingInformation: [
            "La respuesta solo queda acreditada para el ejercicio o periodo de la declaración.",
          ],
        }),
      );
    }
  }

  const reverseCharge = factsOf(facts, "VAT.REVERSE_CHARGE");
  if (reverseCharge.length > 0) {
    add(
      output,
      resolution({
        questionId: "E_REVERSE_CHARGE",
        answer: "YES",
        facts: reverseCharge,
        explanation:
          "La autoliquidación contiene un importe positivo en una casilla explícita de inversión del sujeto pasivo.",
        completeDocument,
      }),
    );
  }

  const specialVatRefund = factsOf(facts, "VAT.SPECIAL_REFUND");
  if (specialVatRefund.length > 0) {
    add(
      output,
      resolution({
        questionId: "E_SPECIAL_REFUND",
        answer: "YES",
        facts: specialVatRefund,
        explanation:
          "El documento contiene un importe positivo en una devolución o compensación especial de IVA.",
        completeDocument,
      }),
    );
  }

  const euOperations = factsOf(facts, "EU.OPERATIONS");
  const euValue = euOperations[0]?.normalizedValue;
  const euKeys =
    euOperations.length === 1 &&
    euValue &&
    !Array.isArray(euValue) &&
    typeof euValue === "object" &&
    Array.isArray(euValue.keys)
      ? euValue.keys.filter((key): key is string => typeof key === "string")
      : [];
  const euQuestions = {
    E: "I_EU_GOODS_SALES",
    A: "I_EU_GOODS_PURCHASES",
    S: "I_EU_SERVICES_SALES",
    I: "I_EU_SERVICES_PURCHASES",
  } as const;
  for (const key of euKeys) {
    const questionId = euQuestions[key as keyof typeof euQuestions];
    if (!questionId) continue;
    add(
      output,
      resolution({
        questionId,
        answer: "YES",
        facts: euOperations,
        explanation: `La categoría ${key} aparece expresamente en una declaración del periodo.`,
        completeDocument,
        missingInformation: [
          "La operación declarada no acredita por sí sola un alta ROI vigente.",
        ],
      }),
    );
  }

  const ossRegistration = factsOf(facts, "ECOMMERCE.OSS_IOSS_REGISTRATION");
  const ossValue = ossRegistration[0]?.normalizedValue;
  const ossAction =
    ossValue && typeof ossValue === "object" && !Array.isArray(ossValue)
      ? (ossValue as { readonly action?: JsonValue }).action
      : undefined;
  if (ossRegistration.length === 1 && ossAction === "REGISTRATION") {
    add(
      output,
      resolution({
        questionId: "J_OSS",
        answer: "YES",
        facts: ossRegistration,
        explanation:
          "El modelo 035 contiene una causa de alta explícita en un régimen OSS/IOSS.",
        completeDocument,
        missingInformation: [
          "Confirmar que no existe una baja o modificación posterior.",
        ],
      }),
    );
  }

  const ossOperations = factsOf(facts, "ECOMMERCE.OSS_IOSS_OPERATIONS");
  if (ossOperations.length > 0) {
    add(
      output,
      resolution({
        questionId: "J_EU_CONSUMERS",
        answer: "YES",
        facts: ossOperations,
        explanation:
          "El modelo 369 presentado acredita operaciones declaradas con consumidores en el periodo.",
        completeDocument,
        missingInformation: [
          "El modelo 369 no acredita por sí solo que el registro OSS/IOSS siga vigente.",
        ],
      }),
    );
  }

  const attribution = factsOf(facts, "ENTITY.ATTRIBUTION_REQUIREMENT");
  if (attribution.length > 0) {
    add(
      output,
      resolution({
        questionId: "L_ATTRIBUTION_THRESHOLD",
        answer: "YES",
        facts: attribution,
        explanation:
          "El modelo 184 contiene actividad económica o rentas positivas de la entidad.",
        completeDocument,
      }),
    );
  }

  const companyInstallment = factsOf(facts, "COMPANY.INSTALLMENT_PAYMENT");
  if (companyInstallment.length > 0) {
    add(
      output,
      resolution({
        questionId: "L_COMPANY_INSTALLMENTS",
        answer: "YES",
        facts: companyInstallment,
        explanation:
          "Existe un modelo 202 presentado para el periodo indicado.",
        completeDocument,
      }),
    );
  }

  const thirdParties = factsOf(facts, "THIRD_PARTIES.MODEL_347_CANDIDATE");
  if (thirdParties.length > 0) {
    add(
      output,
      resolution({
        questionId: "K_THRESHOLD",
        answer: "YES",
        facts: thirdParties,
        explanation:
          "El modelo 347 contiene un registro o importe anual positivo por tercero.",
        completeDocument,
        missingInformation: [
          "El modelo no permite afirmar que todas las operaciones actuales estén incluidas o excluidas.",
        ],
      }),
    );
  }

  const personalFacts = [
    ["PERSONAL.FOREIGN_ASSETS", "M_FOREIGN_ASSETS"],
    ["PERSONAL.FOREIGN_CRYPTO", "M_FOREIGN_CRYPTO"],
    ["PERSONAL.WEALTH_TAX", "M_WEALTH"],
  ] as const;
  for (const [factType, questionId] of personalFacts) {
    const matching = factsOf(facts, factType);
    if (matching.length === 0) continue;
    add(
      output,
      resolution({
        questionId,
        answer: "YES",
        facts: matching,
        explanation:
          "La declaración presentada acredita esta situación personal en el ejercicio indicado.",
        completeDocument,
        missingInformation: [
          "La respuesta no se extiende automáticamente a otros ejercicios.",
        ],
      }),
    );
  }

  const iaeEvents = factsOf(facts, "IAE.EVENT");
  if (iaeEvents.length > 0) {
    add(
      output,
      resolution({
        questionId: "N_CHANGES",
        answer: "YES",
        facts: iaeEvents,
        explanation:
          "El modelo 840 contiene un alta, variación o baja con fecha y epígrafe explícitos.",
        completeDocument,
      }),
    );
  }

  const roi = factsOf(facts, "EU.ROI");
  if (roi.length > 0) {
    const roiValue = roi[0]?.normalizedValue;
    const registeredFlag =
      roiValue && typeof roiValue === "object" && !Array.isArray(roiValue)
        ? (roiValue as { readonly registered?: JsonValue }).registered
        : undefined;
    const registered =
      typeof registeredFlag === "boolean"
        ? registeredFlag
        : true;
    add(
      output,
      resolution({
        questionId: "I_ROI",
        answer: registered ? "YES" : "NO",
        facts: roi,
        explanation:
          registered
            ? "El certificado acredita expresamente la inclusión en el Registro de Operadores Intracomunitarios."
            : "El certificado indica expresamente que no existe una inscripción ROI vigente.",
        completeDocument,
        missingInformation: [
          "Confirmar que no existe una baja o certificado posterior.",
        ],
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
        explanation:
          "La vista actual muestra las obligaciones periódicas en alta.",
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
          missingInformation: [
            "Contrastar el método con la situación tributaria actual.",
          ],
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

export function temporalScopeOf(resolution: QuestionResolution): TemporalScope {
  return resolution.temporalScope;
}
