import {
  booleanAnswer,
  numberAnswer,
  stringAnswer,
} from "../answers";
import {
  annualOnePercentLimitCents,
  minimumCents,
  percentageFromAmounts,
  proportionalCents,
  remainingLimitCents,
} from "../calculators";
import {
  isInvoicePresent,
  effectiveInvoiceType,
  isVatDocumentQualified,
} from "../documents";
import {
  CLIENT_ATTENTION_EVIDENCE,
  MAINTENANCE_EVIDENCE,
} from "../evidence";
import { normalizeComparableText } from "../normalizers";
import {
  maintenanceDailyLimitCents,
  MAINTENANCE_DAILY_LIMITS,
} from "../parameters";
import {
  CLIENT_ATTENTION_QUESTIONS,
  DOCUMENT_TYPE_QUESTION,
  MEAL_PURPOSE_QUESTION,
  SELF_MAINTENANCE_QUESTIONS,
  SIMPLIFIED_INVOICE_QUESTION,
} from "../questions";
import type {
  ConditionalQuestion,
  EvaluationDecision,
  ExpenseAnswers,
  InvoiceType,
  RuleEvaluationRequest,
  TaxOutcome,
} from "../types";
import {
  needsReviewOutcome,
  unresolvedDecision,
  zeroOutcome,
} from "./common";

const PURPOSES = new Set([
  "SELF_MAINTENANCE",
  "CLIENT_OR_SUPPLIER",
  "EMPLOYEE_TRAVEL",
  "INTERNAL_EVENT",
  "PERSONAL",
  "OTHER_UNSURE",
]);

function question(id: string): ConditionalQuestion {
  const found = [
    MEAL_PURPOSE_QUESTION,
    ...SELF_MAINTENANCE_QUESTIONS,
    ...CLIENT_ATTENTION_QUESTIONS,
    DOCUMENT_TYPE_QUESTION,
    SIMPLIFIED_INVOICE_QUESTION,
  ].find((item) => item.id === id);
  if (!found) throw new Error(`Unknown meal question: ${id}`);
  return found;
}

function electronicPaymentFromInput(
  paymentMethod: RuleEvaluationRequest["input"]["paymentMethod"],
  answers: ExpenseAnswers,
): boolean | undefined {
  if (
    paymentMethod === "CARD" ||
    paymentMethod === "BANK_TRANSFER" ||
    paymentMethod === "DIRECT_DEBIT"
  ) {
    return true;
  }
  if (paymentMethod === "CASH") return false;
  return booleanAnswer(answers, "meal.electronicPayment");
}

function failedMaintenanceCondition(
  reason: "activity" | "hospitality" | "payment",
): EvaluationDecision {
  const explanations = {
    activity:
      "No se ha acreditado que el gasto esté relacionado con la actividad económica.",
    hospitality:
      "El gasto no se produjo en un establecimiento de restauración u hostelería.",
    payment:
      "El pago no se realizó mediante un medio electrónico, requisito de esta regla de IRPF.",
  } as const;
  const explanation = explanations[reason];
  return {
    status: "RESOLVED",
    risk: "RED",
    directTax: zeroOutcome("IRPF", explanation),
    indirectTax: zeroOutcome(
      "IVA",
      "Al no superar los requisitos de deducibilidad directa de esta manutención, no se aplica la excepción de hostelería del artículo 96 LIVA.",
    ),
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: MAINTENANCE_EVIDENCE,
    practicalAdvice: [
      "No contabilices esta propuesta como deducible sin nueva documentación o revisión profesional.",
    ],
    warnings: [],
    calculationTrace: [
      {
        code: "maintenance-condition-failed",
        label: "Condición no cumplida",
        detail: explanation,
        amountCents: 0,
      },
    ],
    requiresHumanReview: true,
  };
}

const SPECIFIC_ACTIVITY_EVIDENCE_TOKENS = new Set([
  "agenda",
  "albaran",
  "cita",
  "cliente",
  "contrato",
  "correo",
  "desplazamiento",
  "encargo",
  "hoja",
  "obra",
  "parte",
  "pedido",
  "presupuesto",
  "proyecto",
  "reunion",
  "ruta",
  "servicio",
  "visita",
]);

function hasSpecificActivityEvidence(value: string): boolean {
  return normalizeComparableText(value)
    .split(" ")
    .some((token) => SPECIFIC_ACTIVITY_EVIDENCE_TOKENS.has(token));
}

function documentQuestions(
  invoiceType: InvoiceType,
  answers: ExpenseAnswers,
): ConditionalQuestion[] {
  if (invoiceType === "UNKNOWN") return [DOCUMENT_TYPE_QUESTION];
  if (
    invoiceType === "SIMPLIFIED_INVOICE" &&
    booleanAnswer(answers, "document.simplifiedInvoiceQualified") === undefined
  ) {
    return [SIMPLIFIED_INVOICE_QUESTION];
  }
  return [];
}

function evaluateSelfMaintenance({
  input,
  context,
  answers,
}: RuleEvaluationRequest): EvaluationDecision {
  const businessRelated = booleanAnswer(answers, "meal.businessRelated");
  const hospitality = booleanAnswer(answers, "meal.hospitalityEstablishment");
  const electronicPayment = electronicPaymentFromInput(
    input.paymentMethod,
    answers,
  );

  if (businessRelated === false) return failedMaintenanceCondition("activity");
  if (hospitality === false) return failedMaintenanceCondition("hospitality");
  if (electronicPayment === false) return failedMaintenanceCondition("payment");

  const location = stringAnswer(answers, "meal.location");
  const overnight = booleanAnswer(
    answers,
    "meal.overnightDifferentMunicipality",
  );
  const evidence = stringAnswer(answers, "meal.activityEvidence");
  const consumed =
    input.annualContext?.maintenanceDeductedSameDayCents ??
    numberAnswer(answers, "meal.sameDayAlreadyDeductedCents");

  const pending: ConditionalQuestion[] = [];
  if (businessRelated === undefined) pending.push(question("meal.businessRelated"));
  if (hospitality === undefined) pending.push(question("meal.hospitalityEstablishment"));
  if (electronicPayment === undefined) pending.push(question("meal.electronicPayment"));
  if (location !== "SPAIN" && location !== "FOREIGN") {
    pending.push(question("meal.location"));
  }
  if (overnight === undefined) {
    pending.push(question("meal.overnightDifferentMunicipality"));
  }
  if (consumed === undefined || consumed < 0 || !Number.isSafeInteger(consumed)) {
    pending.push(question("meal.sameDayAlreadyDeductedCents"));
  }
  if (!evidence) pending.push(question("meal.activityEvidence"));
  if (pending.length > 0) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: pending,
      missingInformation: pending.map((item) => item.prompt),
      evidenceRequired: MAINTENANCE_EVIDENCE,
      warnings: ["La ausencia de datos no se interpreta como incumplimiento."],
    });
  }
  if (!hasSpecificActivityEvidence(evidence!)) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [question("meal.activityEvidence")],
      missingInformation: [
        "Indica una prueba concreta de la relación con la actividad; un día laborable por sí solo no basta.",
      ],
      evidenceRequired: MAINTENANCE_EVIDENCE,
      warnings: [
        "Añade una prueba concreta como agenda, proyecto, correo, hoja de ruta o parte de trabajo.",
      ],
    });
  }

  const invoiceType = effectiveInvoiceType(input.invoiceType, answers);
  const pendingDocument = documentQuestions(invoiceType, answers);
  if (pendingDocument.length > 0) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: pendingDocument,
      missingInformation: pendingDocument.map((item) => item.prompt),
      evidenceRequired: MAINTENANCE_EVIDENCE,
    });
  }
  if (!isInvoicePresent(invoiceType)) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "Falta una factura que permita justificar el gasto de manutención en IRPF.",
      ],
      risk: "YELLOW",
      directTax: needsReviewOutcome(
        "IRPF",
        "No se fija un importe deducible hasta revisar si la documentación justifica fiscalmente el gasto.",
      ),
      indirectTax: zeroOutcome(
        "IVA",
        "Un recibo o la ausencia de factura no justifican la deducción de IVA.",
      ),
      evidenceRequired: MAINTENANCE_EVIDENCE,
      practicalAdvice: [
        "Solicita y conserva una factura antes de aplicar la propuesta.",
      ],
    });
  }

  const dailyLimit = maintenanceDailyLimitCents(
    location as "SPAIN" | "FOREIGN",
    overnight!,
  );
  const dailyRemaining = remainingLimitCents(dailyLimit, consumed!);
  const qualifiedVatDocument = isVatDocumentQualified(invoiceType, answers) === true;
  const vatRegimeNeedsReview =
    context.vatRegime === "PRORATA" || context.vatRegime === "UNKNOWN";
  const fullVatRight =
    context.vatRegime === "GENERAL" &&
    context.hasFullVatDeductionRight &&
    qualifiedVatDocument;
  const noVatRight =
    context.vatRegime === "EXEMPT" || !qualifiedVatDocument;

  const directBasisCents = fullVatRight
    ? input.netAmountCents
    : input.totalAmountCents;
  const directDeductibleCents = minimumCents(
    directBasisCents,
    dailyRemaining,
  );
  const directPercentage = percentageFromAmounts(
    directDeductibleCents,
    directBasisCents,
  );
  const appliedLimit = {
    code: "SELF_MAINTENANCE_DAILY_LIMIT",
    label: `Límite diario ${MAINTENANCE_DAILY_LIMITS.version}`,
    limitAmountCents: dailyLimit,
    consumedAmountCents: consumed!,
    remainingBeforeExpenseCents: dailyRemaining,
    excessAmountCents: Math.max(0, directBasisCents - dailyRemaining),
  };
  const directTax: TaxOutcome = {
    taxType: "IRPF",
    eligibility:
      input.amountsKnown === false && dailyRemaining > 0
        ? "POTENTIALLY_DEDUCTIBLE"
        : directDeductibleCents === 0
        ? "NONE"
        : directDeductibleCents < directBasisCents
          ? "PARTIAL"
          : "FULL",
    theoreticalPercentage: directPercentage,
    deductibleAmountCents: directDeductibleCents,
    appliedLimit,
    explanation:
      directDeductibleCents < directBasisCents
        ? "Cumple las condiciones, pero solo es deducible la parte situada dentro del límite diario todavía disponible."
        : "Cumple las condiciones y el importe queda dentro del límite diario disponible.",
  };

  let indirectTax: TaxOutcome;
  let status: EvaluationDecision["status"] = "RESOLVED";
  const warnings = [
    "El límite es diario y conjunto; debe incluir todas las manutenciones de la misma fecha.",
    "La relación con la actividad y la documentación pueden ser comprobadas por la Administración.",
  ];
  if (vatRegimeNeedsReview || (!context.hasFullVatDeductionRight && !noVatRight)) {
    status = "NEEDS_REVIEW";
    indirectTax = needsReviewOutcome(
      "IVA",
      "El régimen de prorrata o el derecho general a deducir IVA requiere una revisión individual antes de fijar la cuota.",
    );
    warnings.push(
      "La estimación de IRPF incluye el IVA como no deducible hasta que se revise el régimen indirecto.",
    );
  } else if (fullVatRight) {
    const vatDeductibleCents = proportionalCents(
      input.vatAmountCents,
      directDeductibleCents,
      input.netAmountCents,
    );
    indirectTax = {
      taxType: "IVA",
      eligibility:
        input.amountsKnown === false
          ? "POTENTIALLY_DEDUCTIBLE"
          : vatDeductibleCents === 0
          ? "NONE"
          : vatDeductibleCents < input.vatAmountCents
            ? "PARTIAL"
            : "FULL",
      theoreticalPercentage: percentageFromAmounts(
        vatDeductibleCents,
        input.vatAmountCents,
      ),
      deductibleAmountCents: vatDeductibleCents,
      appliedLimit: null,
      explanation:
        "Se estima la cuota vinculada a la parte fiscalmente deducible, con factura apta, afectación y derecho general pleno.",
    };
  } else {
    indirectTax = zeroOutcome(
      "IVA",
      invoiceType === "RECEIPT" || invoiceType === "NO_DOCUMENT"
        ? "El recibo o la ausencia de factura no justifican el derecho a deducir IVA."
        : context.vatRegime === "EXEMPT"
          ? "La actividad indicada no origina derecho a deducir esta cuota de IVA."
          : "La factura simplificada no reúne los datos adicionales necesarios para deducir IVA.",
    );
  }

  return {
    status,
    risk: "YELLOW",
    directTax,
    indirectTax,
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: MAINTENANCE_EVIDENCE,
    practicalAdvice: [
      "Conserva factura, justificante electrónico y una prueba concreta de la relación con la actividad.",
      "Revisa el total de manutención de ese día antes de contabilizar.",
    ],
    warnings,
    calculationTrace: [
      {
        code: "meal-purpose",
        label: "Finalidad seleccionada",
        detail: "Manutención del propio autónomo.",
      },
      {
        code: "maintenance-conditions",
        label: "Condiciones comprobadas",
        detail:
          "Actividad: sí; hostelería/restauración: sí; pago electrónico: sí; evidencia indicada: sí.",
      },
      {
        code: "daily-limit",
        label: "Límite diario aplicado",
        detail: `${location === "SPAIN" ? "España" : "Extranjero"}, ${overnight ? "con" : "sin"} pernoctación.`,
        amountCents: dailyLimit,
      },
      {
        code: "daily-consumed",
        label: "Límite consumido antes del gasto",
        detail: "Importe comunicado para esa misma fecha.",
        amountCents: consumed!,
      },
      {
        code: "direct-result",
        label: "Resultado IRPF",
        detail: directTax.explanation,
        amountCents: directDeductibleCents,
        percentage: directPercentage,
      },
      {
        code: "indirect-result",
        label: "Resultado IVA",
        detail: indirectTax.explanation,
        amountCents: indirectTax.deductibleAmountCents,
        percentage: indirectTax.theoreticalPercentage,
      },
    ],
    requiresHumanReview: true,
  };
}

function evaluateClientAttention({
  input,
  answers,
}: RuleEvaluationRequest): EvaluationDecision {
  const identified = booleanAnswer(answers, "client.identified");
  const commercialRelationship = booleanAnswer(
    answers,
    "client.commercialRelationship",
  );
  const relationshipEvidence = stringAnswer(
    answers,
    "client.relationshipEvidence",
  );

  if (commercialRelationship === false) {
    return {
      status: "RESOLVED",
      risk: "RED",
      directTax: zeroOutcome(
        "IRPF",
        "No se ha acreditado una relación comercial real para tratarlo como atención a clientes o proveedores.",
      ),
      indirectTax: zeroOutcome(
        "IVA",
        "No se propone deducción de IVA para este gasto clasificado como atención.",
      ),
      requiredQuestions: [],
      missingInformation: [],
      evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
      practicalAdvice: ["Reclasifica el gasto o solicita revisión profesional."],
      warnings: [],
      calculationTrace: [
        {
          code: "commercial-relationship-failed",
          label: "Relación comercial",
          detail: "La respuesta indica que no existe una relación comercial documentable.",
          amountCents: 0,
        },
      ],
      requiresHumanReview: true,
    };
  }

  const netTurnoverCents =
    input.annualContext?.netTurnoverCents ??
    numberAnswer(answers, "client.netTurnoverCents");
  const alreadyDeductedCents =
    input.annualContext?.clientAttentionDeductedCents ??
    numberAnswer(answers, "client.alreadyDeductedCents");
  const pending: ConditionalQuestion[] = [];
  if (identified === undefined) pending.push(question("client.identified"));
  if (commercialRelationship === undefined) {
    pending.push(question("client.commercialRelationship"));
  }
  if (!relationshipEvidence) pending.push(question("client.relationshipEvidence"));
  if (netTurnoverCents === undefined) pending.push(question("client.netTurnoverCents"));
  if (alreadyDeductedCents === undefined) {
    pending.push(question("client.alreadyDeductedCents"));
  }
  if (pending.length > 0) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: pending,
      missingInformation: pending.map((item) => item.prompt),
      evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
    });
  }
  if (identified === false) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "Debe identificarse al cliente o proveedor para acreditar la finalidad comercial.",
      ],
      risk: "RED",
      directTax: needsReviewOutcome(
        "IRPF",
        "No se propone importe deducible mientras no pueda identificarse la contraparte.",
      ),
      indirectTax: zeroOutcome(
        "IVA",
        "La propuesta conserva IVA no deducible para una atención a terceros.",
      ),
      evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
    });
  }

  const invoiceType = effectiveInvoiceType(input.invoiceType, answers);
  if (invoiceType === "UNKNOWN") {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [DOCUMENT_TYPE_QUESTION],
      missingInformation: [DOCUMENT_TYPE_QUESTION.prompt],
      evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
    });
  }
  if (!isInvoicePresent(invoiceType)) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "No se ha indicado una factura suficiente para justificar fiscalmente el gasto.",
      ],
      risk: "YELLOW",
      directTax: needsReviewOutcome(
        "IRPF",
        "La relación puede ser comercial, pero falta una factura que permita proponer la deducción.",
      ),
      indirectTax: zeroOutcome(
        "IVA",
        "Un gasto clasificado como atención a clientes o proveedores no genera IVA deducible en esta regla.",
      ),
      evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
    });
  }

  const annualLimitCents = annualOnePercentLimitCents(netTurnoverCents!);
  const availableCents = remainingLimitCents(
    annualLimitCents,
    alreadyDeductedCents!,
  );
  const directBasisCents = input.totalAmountCents;
  const deductibleCents = minimumCents(directBasisCents, availableCents);
  const directTax: TaxOutcome = {
    taxType: "IRPF",
    eligibility:
      input.amountsKnown === false && availableCents > 0
        ? "POTENTIALLY_DEDUCTIBLE"
        : deductibleCents === 0
        ? "NONE"
        : deductibleCents < directBasisCents
          ? "PARTIAL"
          : "FULL",
    theoreticalPercentage: percentageFromAmounts(
      deductibleCents,
      directBasisCents,
    ),
    deductibleAmountCents: deductibleCents,
    appliedLimit: {
      code: "CLIENT_ATTENTION_ANNUAL_ONE_PERCENT",
      label: "Límite anual conjunto del 1 % del INCN",
      limitAmountCents: annualLimitCents,
      consumedAmountCents: alreadyDeductedCents!,
      remainingBeforeExpenseCents: availableCents,
      excessAmountCents: Math.max(0, directBasisCents - availableCents),
    },
    explanation:
      deductibleCents < directBasisCents
        ? "La propuesta se limita al saldo anual conjunto todavía disponible."
        : "La atención documentada cabe dentro del saldo anual conjunto disponible.",
  };
  const indirectTax = zeroOutcome(
    "IVA",
    "Para una atención clasificada realmente como atención a clientes o proveedores, esta regla no propone deducción de IVA.",
  );
  const warnings = [
    "El INCN debe corresponder al conjunto de actividades del mismo contribuyente y ejercicio, sin IVA.",
    "El IVA no deducible se incluye en la base estimada del gasto directo; esta política requiere validación del asesor fiscal.",
    "La calificación de comidas de trabajo frente a atenciones gratuitas requiere revisión fiscal antes de producción.",
  ];
  if (alreadyDeductedCents! > annualLimitCents) {
    warnings.push(
      "El importe ya consumido supera el límite calculado; el saldo disponible se ha fijado en cero.",
    );
  }
  return {
    status: "RESOLVED",
    risk: "YELLOW",
    directTax,
    indirectTax,
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: CLIENT_ATTENTION_EVIDENCE,
    practicalAdvice: [
      "Conserva factura e identificación de la contraparte junto con la evidencia comercial.",
      "Actualiza el acumulado anual antes de analizar otra atención.",
    ],
    warnings,
    calculationTrace: [
      {
        code: "meal-purpose",
        label: "Finalidad seleccionada",
        detail: "Atención a cliente o proveedor.",
      },
      {
        code: "commercial-evidence",
        label: "Relación comercial",
        detail: "Contraparte identificada y evidencia comercial indicada.",
      },
      {
        code: "annual-limit",
        label: "Límite anual",
        detail: "1 % del importe neto de la cifra de negocios comunicado.",
        amountCents: annualLimitCents,
        percentage: 1,
      },
      {
        code: "annual-consumed",
        label: "Límite consumido",
        detail: "Atenciones ya deducidas en el mismo ejercicio.",
        amountCents: alreadyDeductedCents!,
      },
      {
        code: "direct-result",
        label: "Resultado IRPF",
        detail: directTax.explanation,
        amountCents: deductibleCents,
        percentage: directTax.theoreticalPercentage,
      },
      {
        code: "indirect-result",
        label: "Resultado IVA",
        detail: indirectTax.explanation,
        amountCents: 0,
        percentage: 0,
      },
    ],
    requiresHumanReview: true,
  };
}

function personalMeal(): EvaluationDecision {
  return {
    status: "RESOLVED",
    risk: "RED",
    directTax: zeroOutcome(
      "IRPF",
      "El gasto se ha identificado como personal y no se propone como deducible.",
    ),
    indirectTax: zeroOutcome(
      "IVA",
      "El gasto personal no origina una propuesta de IVA deducible.",
    ),
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: [],
    practicalAdvice: ["Regístralo, si procede, fuera de los gastos fiscales de la actividad."],
    warnings: [],
    calculationTrace: [
      {
        code: "personal-purpose",
        label: "Finalidad seleccionada",
        detail: "Gasto personal; deducción propuesta igual a cero.",
        amountCents: 0,
      },
    ],
    requiresHumanReview: false,
  };
}

export function evaluateMealRule(
  request: RuleEvaluationRequest,
): EvaluationDecision {
  const purpose = stringAnswer(request.answers, "meal.purpose");
  if (!purpose || !PURPOSES.has(purpose)) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [MEAL_PURPOSE_QUESTION],
      missingInformation: [MEAL_PURPOSE_QUESTION.prompt],
    });
  }
  if (purpose === "PERSONAL") return personalMeal();
  if (purpose === "SELF_MAINTENANCE") return evaluateSelfMaintenance(request);
  if (purpose === "CLIENT_OR_SUPPLIER") return evaluateClientAttention(request);
  return unresolvedDecision({
    status: "NEEDS_REVIEW",
    missingInformation: [
      "Esta finalidad todavía no dispone de una regla fiscal completa en la versión 1.",
    ],
    warnings: [
      "No se ha aplicado silenciosamente la regla de manutención del autónomo.",
    ],
    practicalAdvice: ["Consulta el caso con un asesor fiscal antes de contabilizar."],
  });
}
