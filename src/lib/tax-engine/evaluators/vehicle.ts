import {
  booleanAnswer,
  numberAnswer,
  stringAnswer,
} from "../answers";
import { percentageOfCents } from "../calculators";
import {
  effectiveInvoiceType,
  isInvoicePresent,
  isVatDocumentQualified,
} from "../documents";
import { VEHICLE_EVIDENCE } from "../evidence";
import {
  DOCUMENT_TYPE_QUESTION,
  SIMPLIFIED_INVOICE_QUESTION,
  VEHICLE_QUESTIONS,
} from "../questions";
import type {
  ConditionalQuestion,
  EvaluationDecision,
  RuleEvaluationRequest,
  TaxOutcome,
} from "../types";
import {
  needsReviewOutcome,
  unresolvedDecision,
  zeroOutcome,
} from "./common";

type VehicleType =
  | "ORDINARY_PASSENGER"
  | "MIXED_GOODS"
  | "PAID_PASSENGER_TRANSPORT"
  | "DRIVING_SCHOOL"
  | "SALES_REP"
  | "SURVEILLANCE"
  | "OTHER";

const VEHICLE_TYPES = new Set<VehicleType>([
  "ORDINARY_PASSENGER",
  "MIXED_GOODS",
  "PAID_PASSENGER_TRANSPORT",
  "DRIVING_SCHOOL",
  "SALES_REP",
  "SURVEILLANCE",
  "OTHER",
]);

const IRPF_ACCESSORY_PRIVATE_USE_EXCEPTIONS = new Set<VehicleType>([
  "MIXED_GOODS",
  "PAID_PASSENGER_TRANSPORT",
  "DRIVING_SCHOOL",
  "SALES_REP",
]);

const VAT_ONE_HUNDRED_PRESUMPTIONS = new Set<VehicleType>([
  "MIXED_GOODS",
  "PAID_PASSENGER_TRANSPORT",
  "DRIVING_SCHOOL",
  "SALES_REP",
  "SURVEILLANCE",
]);

function vehicleQuestion(id: string): ConditionalQuestion {
  const found = VEHICLE_QUESTIONS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown vehicle question: ${id}`);
  return found;
}

function noProfessionalUse(reason: string): EvaluationDecision {
  return {
    status: "RESOLVED",
    risk: "RED",
    directTax: zeroOutcome(
      "IRPF",
      "Sin utilización profesional demostrable del vehículo, no se propone deducción del gasto en IRPF.",
    ),
    indirectTax: zeroOutcome(
      "IVA",
      "Sin utilización empresarial demostrable del vehículo, no se aplica ninguna presunción de deducción de IVA.",
    ),
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: VEHICLE_EVIDENCE,
    practicalAdvice: [
      "Conserva un registro verificable de vehículo, desplazamientos y relación con la actividad antes de volver a analizar.",
    ],
    warnings: [],
    calculationTrace: [
      {
        code: "professional-use-failed",
        label: "Uso profesional",
        detail: reason,
        amountCents: 0,
      },
    ],
    requiresHumanReview: true,
  };
}

function vehicleTypeLabel(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    ORDINARY_PASSENGER: "Turismo ordinario",
    MIXED_GOODS: "Vehículo mixto para mercancías",
    PAID_PASSENGER_TRANSPORT: "Transporte remunerado de viajeros",
    DRIVING_SCHOOL: "Vehículo de autoescuela",
    SALES_REP: "Vehículo de representante o agente comercial",
    SURVEILLANCE: "Vehículo utilizado en servicios de vigilancia",
    OTHER: "Otra categoría",
  };
  return labels[type];
}

export function evaluateVehicleRule({
  input,
  context,
  answers,
}: RuleEvaluationRequest): EvaluationDecision {
  const vehicleIdentifier = stringAnswer(answers, "vehicle.identifier");
  const rawType = stringAnswer(answers, "vehicle.type") as
    | VehicleType
    | undefined;
  const vehicleType = rawType && VEHICLE_TYPES.has(rawType) ? rawType : undefined;
  const usedInBusiness = booleanAnswer(answers, "vehicle.usedInBusiness");
  const professionalUseProven = booleanAnswer(
    answers,
    "vehicle.professionalUseProven",
  );

  if (usedInBusiness === false) {
    return noProfessionalUse(
      "La respuesta indica que el vehículo no se utiliza realmente en la actividad.",
    );
  }
  if (professionalUseProven === false) {
    return noProfessionalUse(
      "La respuesta indica que no existe prueba del uso profesional.",
    );
  }

  const evidenceDescription = stringAnswer(
    answers,
    "vehicle.evidenceDescription",
  );
  const privateUse = booleanAnswer(answers, "vehicle.privateUse");
  const privateUseAccessory = booleanAnswer(
    answers,
    "vehicle.privateUseAccessory",
  );
  const exclusiveUse = booleanAnswer(
    answers,
    "vehicle.exclusiveProfessionalUse",
  );
  const effectiveExclusiveUse =
    privateUse === true && exclusiveUse === undefined ? false : exclusiveUse;
  const expenseLinked = booleanAnswer(answers, "vehicle.expenseLinked");
  const differentVatUseProven = booleanAnswer(
    answers,
    "vehicle.higherVatUseProven",
  );
  const provenVatPercentage = numberAnswer(
    answers,
    "vehicle.provenVatPercentage",
  );
  const marked = booleanAnswer(answers, "vehicle.marked");
  const pending: ConditionalQuestion[] = [];
  if (!vehicleIdentifier) pending.push(vehicleQuestion("vehicle.identifier"));
  if (!vehicleType) pending.push(vehicleQuestion("vehicle.type"));
  if (usedInBusiness === undefined) {
    pending.push(vehicleQuestion("vehicle.usedInBusiness"));
  }
  if (professionalUseProven === undefined) {
    pending.push(vehicleQuestion("vehicle.professionalUseProven"));
  }
  if (!evidenceDescription) {
    pending.push(vehicleQuestion("vehicle.evidenceDescription"));
  }
  if (privateUse === undefined) pending.push(vehicleQuestion("vehicle.privateUse"));
  if (
    privateUse === true &&
    vehicleType &&
    IRPF_ACCESSORY_PRIVATE_USE_EXCEPTIONS.has(vehicleType) &&
    privateUseAccessory === undefined
  ) {
    pending.push(vehicleQuestion("vehicle.privateUseAccessory"));
  }
  if (effectiveExclusiveUse === undefined) {
    pending.push(vehicleQuestion("vehicle.exclusiveProfessionalUse"));
  }
  if (expenseLinked === undefined) {
    pending.push(vehicleQuestion("vehicle.expenseLinked"));
  }
  if (differentVatUseProven === undefined) {
    pending.push(vehicleQuestion("vehicle.higherVatUseProven"));
  }
  if (
    differentVatUseProven === true &&
    (provenVatPercentage === undefined ||
      !Number.isInteger(provenVatPercentage) ||
      provenVatPercentage < 0 ||
      provenVatPercentage > 100)
  ) {
    pending.push(vehicleQuestion("vehicle.provenVatPercentage"));
  }
  if (pending.length > 0) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: pending,
      missingInformation: pending.map((item) => item.prompt),
      evidenceRequired: VEHICLE_EVIDENCE,
      warnings: ["La ausencia de información no se interpreta como riesgo rojo."],
    });
  }

  if (expenseLinked === false) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "El combustible, reparación, aparcamiento o peaje debe vincularse a un vehículo identificado.",
      ],
      evidenceRequired: VEHICLE_EVIDENCE,
      practicalAdvice: [
        "Identifica el vehículo y conserva factura y prueba del desplazamiento antes de aplicar un porcentaje.",
      ],
    });
  }
  if (privateUse === true && effectiveExclusiveUse === true) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "Las respuestas de uso privado y uso profesional exclusivo son incompatibles.",
      ],
      evidenceRequired: VEHICLE_EVIDENCE,
    });
  }
  if (privateUse === false && effectiveExclusiveUse === false) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [
        vehicleQuestion("vehicle.privateUse"),
        vehicleQuestion("vehicle.exclusiveProfessionalUse"),
      ],
      missingInformation: [
        "Aclara si existe uso privado o si el uso profesional es exclusivo.",
      ],
      evidenceRequired: VEHICLE_EVIDENCE,
    });
  }
  if (vehicleType === "OTHER") {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "La categoría indicada no tiene tratamiento implementado en la versión 1.",
      ],
      evidenceRequired: VEHICLE_EVIDENCE,
      practicalAdvice: ["Solicita revisión fiscal de la categoría concreta."],
    });
  }

  const invoiceType = effectiveInvoiceType(input.invoiceType, answers);
  if (invoiceType === "UNKNOWN") {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [DOCUMENT_TYPE_QUESTION],
      missingInformation: [DOCUMENT_TYPE_QUESTION.prompt],
      evidenceRequired: VEHICLE_EVIDENCE,
    });
  }
  if (
    invoiceType === "SIMPLIFIED_INVOICE" &&
    isVatDocumentQualified(invoiceType, answers) === undefined
  ) {
    return unresolvedDecision({
      status: "NEEDS_INPUT",
      questions: [SIMPLIFIED_INVOICE_QUESTION],
      missingInformation: [SIMPLIFIED_INVOICE_QUESTION.prompt],
      evidenceRequired: VEHICLE_EVIDENCE,
    });
  }
  if (!isInvoicePresent(invoiceType)) {
    return unresolvedDecision({
      status: "NEEDS_REVIEW",
      missingInformation: [
        "Falta una factura que vincule el gasto al vehículo y justifique fiscalmente la operación.",
      ],
      risk: "YELLOW",
      directTax: needsReviewOutcome(
        "IRPF",
        "No se propone deducción directa hasta revisar la justificación documental.",
      ),
      indirectTax: zeroOutcome(
        "IVA",
        "Un recibo o la ausencia de factura no justifican la deducción de IVA.",
      ),
      evidenceRequired: VEHICLE_EVIDENCE,
    });
  }

  const irpfException = IRPF_ACCESSORY_PRIVATE_USE_EXCEPTIONS.has(vehicleType!);
  const irpfPercentage = irpfException
    ? privateUse && privateUseAccessory !== true
      ? 0
      : 100
    : effectiveExclusiveUse && !privateUse
      ? 100
      : 0;
  let vatUsePercentage = VAT_ONE_HUNDRED_PRESUMPTIONS.has(vehicleType!)
    ? 100
    : 50;
  if (differentVatUseProven) vatUsePercentage = provenVatPercentage!;

  const documentQualifiedForVat =
    isVatDocumentQualified(invoiceType, answers) === true;
  const vatRegimeNeedsReview =
    context.vatRegime === "PRORATA" ||
    context.vatRegime === "UNKNOWN" ||
    (!context.hasFullVatDeductionRight && context.vatRegime !== "EXEMPT");

  let status: EvaluationDecision["status"] = "RESOLVED";
  let indirectTax: TaxOutcome;
  if (vatRegimeNeedsReview) {
    status = "NEEDS_REVIEW";
    indirectTax = needsReviewOutcome(
      "IVA",
      "El régimen de prorrata o el derecho general a deducir IVA impide fijar un porcentaje final sin revisión.",
    );
  } else if (!documentQualifiedForVat || context.vatRegime === "EXEMPT") {
    indirectTax = zeroOutcome(
      "IVA",
      !documentQualifiedForVat
        ? "La factura no reúne los datos necesarios para justificar IVA deducible."
        : "La actividad indicada no origina derecho a deducir esta cuota de IVA.",
    );
  } else {
    indirectTax = {
      taxType: "IVA",
      eligibility:
        input.amountsKnown === false && vatUsePercentage > 0
          ? "POTENTIALLY_DEDUCTIBLE"
          : vatUsePercentage === 0
          ? "NONE"
          : vatUsePercentage === 100
            ? "FULL"
            : "PARTIAL",
      theoreticalPercentage: vatUsePercentage,
      deductibleAmountCents: percentageOfCents(
        input.vatAmountCents,
        vatUsePercentage,
      ),
      appliedLimit: null,
      explanation:
        differentVatUseProven === true
          ? "Se usa el porcentaje profesional que el usuario declara poder acreditar."
          : VAT_ONE_HUNDRED_PRESUMPTIONS.has(vehicleType!)
            ? "Se aplica la presunción específica del 100 % para IVA, sujeta a realidad, vínculo y documentación."
            : "Se aplica la presunción general del 50 % para IVA de un turismo con uso empresarial demostrado. Un porcentaje distinto exige prueba específica.",
    };
  }

  let directTax: TaxOutcome;
  if (irpfPercentage === 0) {
    directTax = zeroOutcome(
      "IRPF",
      irpfException && privateUseAccessory === false
        ? "El uso privado declarado no es accesorio y notoriamente irrelevante, por lo que no se propone la excepción de afectación en IRPF."
        : vehicleType === "SURVEILLANCE"
        ? "La vigilancia tiene presunción específica en IVA, pero no es una excepción automática de afectación en IRPF; con uso privado no se propone deducción directa."
        : "Un turismo ordinario con uso profesional y privado no se considera afecto de forma parcial en esta regla de IRPF.",
    );
  } else if (vatRegimeNeedsReview) {
    directTax = needsReviewOutcome(
      "IRPF",
      "Debe revisarse primero qué IVA no deducible forma parte del gasto de IRPF.",
    );
  } else {
    const nonDeductibleVatCents = Math.max(
      0,
      input.vatAmountCents - indirectTax.deductibleAmountCents,
    );
    const directBasisCents = Math.min(
      input.totalAmountCents,
      input.netAmountCents + nonDeductibleVatCents,
    );
    directTax = {
      taxType: "IRPF",
      eligibility:
        input.amountsKnown === false
          ? "POTENTIALLY_DEDUCTIBLE"
          : directBasisCents === 0
            ? "NONE"
            : "FULL",
      theoreticalPercentage: directBasisCents === 0 ? 0 : 100,
      deductibleAmountCents: directBasisCents,
      appliedLimit: null,
      explanation: IRPF_ACCESSORY_PRIVATE_USE_EXCEPTIONS.has(vehicleType!)
        ? "La categoría está entre las excepciones de afectación del artículo 22 RIRPF, sujeta a acreditar el uso y la realidad del gasto."
        : "Se propone la afectación total porque se declara uso profesional exclusivo suficientemente acreditado.",
    };
  }

  const warnings = [
    "Cada factura debe estar vinculada al vehículo identificado y a la actividad; la evaluación del vehículo no sustituye esa prueba.",
    "La rotulación es solo un indicio complementario y no ha modificado ningún porcentaje.",
  ];
  if (vehicleType === "SURVEILLANCE") {
    warnings.push(
      "La presunción de vigilancia pertenece al IVA y no se ha trasladado automáticamente al IRPF.",
    );
  }
  if (differentVatUseProven) {
    warnings.push(
      "El porcentaje distinto de la presunción solo es aplicable si puede acreditarse por medios de prueba suficientes.",
    );
  }
  if (irpfException && privateUse) {
    warnings.push(
      "La excepción de IRPF depende de que el uso privado sea realmente accesorio y notoriamente irrelevante.",
    );
  }

  return {
    status,
    risk: "YELLOW",
    directTax,
    indirectTax,
    requiredQuestions: [],
    missingInformation: [],
    evidenceRequired: VEHICLE_EVIDENCE,
    practicalAdvice: [
      "Conserva matrícula, factura, registro de desplazamientos y evidencia del trabajo asociado.",
      "Revisa la exclusividad y el porcentaje de IVA antes de contabilizar la propuesta.",
    ],
    warnings,
    calculationTrace: [
      {
        code: "vehicle-category",
        label: "Categoría del vehículo",
        detail: `${vehicleTypeLabel(vehicleType!)}; identificador estable indicado sin reproducirlo en la traza.`,
      },
      {
        code: "vehicle-conditions",
        label: "Condiciones contestadas",
        detail: `Uso profesional: sí; prueba indicada: sí; uso privado: ${privateUse ? "sí" : "no"}; exclusividad: ${effectiveExclusiveUse ? "sí" : "no"}; gasto vinculado: sí.`,
      },
      {
        code: "vehicle-marking",
        label: "Rotulación",
        detail: `${marked === true ? "Sí" : marked === false ? "No" : "No indicado"}; tratada solo como evidencia complementaria y nunca exigida para resolver.`,
      },
      {
        code: "direct-result",
        label: "Resultado IRPF",
        detail: directTax.explanation,
        amountCents: directTax.deductibleAmountCents,
        percentage: directTax.theoreticalPercentage,
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
