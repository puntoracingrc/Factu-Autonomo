import {
  TAX_MODEL_DIAGNOSTIC_ENGINE_VERSION,
  TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
  type DiagnosticResult,
  type DiagnosticVatRegime,
  type FilingSubject,
  type FourWayAnswer,
  type ModelResult,
  type ModelResultStatus,
  type TaxModelNumber,
  type TaxpayerProfile,
} from "./contracts";
import { getTaxRule, taxRuleSetVersion } from "./rules";
import { getOfficialSources } from "./sources";

const CENSUS_TRACKED_MODELS = new Set<TaxModelNumber>([
  "111",
  "115",
  "123",
  "130",
  "131",
  "216",
  "303",
]);

const PERIODIC_VAT_REGIMES = new Set<DiagnosticVatRegime>([
  "GENERAL",
  "SIMPLIFIED",
  "CASH_ACCOUNTING",
  "OTHER_SPECIAL",
]);

type ResultInput = Pick<
  ModelResult,
  | "modelNumber"
  | "filingSubject"
  | "status"
  | "periods"
  | "periodicity"
  | "reason"
  | "missingInformation"
  | "nextAction"
> & {
  evidenceFields?: string[];
  confidence?: number;
  censusMismatch?: string;
};

function isEntitySubject(profile: TaxpayerProfile): boolean {
  return (
    profile.invoicingSubject === "COMPANY" ||
    profile.invoicingSubject === "COMMUNITY_OF_PROPERTY" ||
    profile.invoicingSubject === "CIVIL_PARTNERSHIP" ||
    profile.invoicingSubject === "OTHER_ENTITY"
  );
}

function hasPersonalActivity(profile: TaxpayerProfile): boolean {
  return (
    profile.invoicingSubject === "NATURAL_PERSON" ||
    profile.hasPersonalActivity === "YES"
  );
}

function filingSubjectForActivity(profile: TaxpayerProfile): FilingSubject {
  if (profile.invoicingSubject === "COMPANY") return "SOCIEDAD";
  if (
    profile.invoicingSubject === "COMMUNITY_OF_PROPERTY" ||
    profile.invoicingSubject === "CIVIL_PARTNERSHIP" ||
    profile.invoicingSubject === "OTHER_ENTITY"
  ) {
    return "ENTIDAD";
  }
  if (profile.invoicingSubject === "NATURAL_PERSON") return "PERSONA_FISICA";
  return "POR_DETERMINAR";
}

function quarter(date: string): number {
  return Math.floor((Number(date.slice(5, 7)) - 1) / 3) + 1;
}

function activeQuarters(profile: TaxpayerProfile): string[] {
  const start =
    profile.activityStartDate?.startsWith(`${profile.fiscalYear}-`)
      ? quarter(profile.activityStartDate)
      : 1;
  const end =
    profile.activityEndDate?.startsWith(`${profile.fiscalYear}-`)
      ? quarter(profile.activityEndDate)
      : 4;
  if (start > end) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => `${start + index}T`);
}

function activeMonths(profile: TaxpayerProfile): string[] {
  const start =
    profile.activityStartDate?.startsWith(`${profile.fiscalYear}-`)
      ? Number(profile.activityStartDate.slice(5, 7))
      : 1;
  const end =
    profile.activityEndDate?.startsWith(`${profile.fiscalYear}-`)
      ? Number(profile.activityEndDate.slice(5, 7))
      : 12;
  if (start > end) return [];
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `${String(start + index).padStart(2, "0")}M`,
  );
}

function periodicityAndPeriods(
  profile: TaxpayerProfile,
  canBeMonthly = true,
): Pick<ModelResult, "periodicity" | "periods"> {
  const monthly =
    canBeMonthly &&
    (profile.largeCompany === "YES" ||
      profile.redeme === "YES" ||
      profile.sii === "YES");
  return monthly
    ? { periodicity: "MONTHLY", periods: activeMonths(profile) }
    : { periodicity: "QUARTERLY", periods: activeQuarters(profile) };
}

function statusConfidence(status: ModelResultStatus): number {
  switch (status) {
    case "CONFIRMED_BY_CENSUS":
      return 0.9;
    case "DERIVED":
      return 0.84;
    case "NOT_APPLICABLE":
      return 0.78;
    case "CENSUS_MISMATCH":
      return 0.64;
    case "CONDITIONAL":
    case "NEEDS_PROFESSIONAL_REVIEW":
      return 0.45;
    case "NEEDS_INFORMATION":
    case "TERRITORY_NOT_SUPPORTED":
      return 0.25;
  }
}

function buildResult(
  profile: TaxpayerProfile,
  input: ResultInput,
): ModelResult {
  const rule = getTaxRule(profile.fiscalYear, input.modelNumber);
  return {
    modelNumber: input.modelNumber,
    filingSubject: input.filingSubject,
    status: input.status,
    periods: input.periods,
    periodicity: input.periodicity,
    reason: input.reason,
    evidence: (input.evidenceFields ?? []).map(
      (field) => `Respuesta confirmada del cuestionario: ${field}.`,
    ),
    missingInformation: input.missingInformation,
    officialSources: getOfficialSources(rule.officialSourceIds),
    confidence: input.confidence ?? statusConfidence(input.status),
    nextAction: input.nextAction,
    ...(input.censusMismatch ? { censusMismatch: input.censusMismatch } : {}),
    ruleIds: [rule.ruleId],
  };
}

function withCensusReconciliation(
  profile: TaxpayerProfile,
  result: ModelResult,
): ModelResult {
  const censusContains = profile.censusObligations.includes(result.modelNumber);
  const hasCurrentCensusList =
    profile.censusReviewed === "YES" || profile.censusObligations.length > 0;
  if (
    censusContains &&
    (result.status === "DERIVED" || result.status === "CONDITIONAL")
  ) {
    return {
      ...result,
      status: "CONFIRMED_BY_CENSUS",
      confidence: 0.9,
      evidence: [
        ...result.evidence,
        `La obligación ${result.modelNumber} figura en la relación censal confirmada.`,
      ],
      reason: `${result.reason} Además, figura en la situación censal confirmada.`,
    };
  }
  if (censusContains && result.status === "NOT_APPLICABLE") {
    const mismatch = `En el censo figura el modelo ${result.modelNumber}, pero los hechos confirmados apuntan a una posible exclusión.`;
    return {
      ...result,
      status: "CENSUS_MISMATCH",
      confidence: 0.58,
      censusMismatch: mismatch,
      nextAction: "Revisar la situación censal y, si procede, comunicar la modificación mediante el modelo 036.",
    };
  }
  if (
    hasCurrentCensusList &&
    CENSUS_TRACKED_MODELS.has(result.modelNumber) &&
    result.status === "DERIVED" &&
    !censusContains
  ) {
    const mismatch = `Los hechos apuntan al modelo ${result.modelNumber}, pero no aparece en la relación censal confirmada.`;
    return {
      ...result,
      status: "CENSUS_MISMATCH",
      confidence: 0.61,
      censusMismatch: mismatch,
      nextAction: "Comprobar el alta censal y la fecha de efecto antes de presentar.",
    };
  }
  return result;
}

function yes(values: FourWayAnswer[]): boolean {
  return values.some((value) => value === "YES");
}

function unknown(values: FourWayAnswer[]): boolean {
  return values.some((value) => value === "UNKNOWN");
}

function result036(profile: TaxpayerProfile): ModelResult {
  const euOperations = [
    profile.euGoodsSales,
    profile.euGoodsPurchases,
    profile.euServicesSales,
    profile.euServicesPurchases,
  ];
  const roiMismatch = yes(euOperations) && profile.roiRegistered !== "YES";
  const ossMismatch = profile.euConsumerSales === "YES" && profile.ossRegistered === "UNKNOWN";
  if (profile.changesDuringYear === "YES" || roiMismatch || ossMismatch) {
    return buildResult(profile, {
      modelNumber: "036",
      filingSubject: filingSubjectForActivity(profile),
      status: roiMismatch ? "CENSUS_MISMATCH" : "DERIVED",
      periods: ["SEGÚN_FECHA_DE_EFECTO"],
      periodicity: "EVENT_DRIVEN",
      reason: roiMismatch
        ? "Hubo operaciones intracomunitarias, pero el alta efectiva en ROI no está confirmada."
        : "Se ha confirmado un alta, baja o cambio que puede requerir comunicación censal.",
      evidenceFields: ["cambios durante el ejercicio", "operaciones UE", "ROI"],
      missingInformation: [],
      nextAction: "Identificar el cambio y su fecha de efecto; revisar la declaración censal antes del plazo aplicable.",
      ...(roiMismatch
        ? { censusMismatch: "Operaciones UE sin alta efectiva en ROI confirmada." }
        : {}),
    });
  }
  if (profile.changesDuringYear === "UNKNOWN" || unknown(euOperations)) {
    return buildResult(profile, {
      modelNumber: "036",
      filingSubject: filingSubjectForActivity(profile),
      status: "NEEDS_INFORMATION",
      periods: [],
      periodicity: "EVENT_DRIVEN",
      reason: "No está confirmado si hubo cambios censales u operaciones que exigieran modificación.",
      missingInformation: ["Cambios de actividad, local, retenciones, alquiler, régimen u operaciones UE y sus fechas."],
      nextAction: "Comparar la situación censal actual con los hechos del ejercicio.",
    });
  }
  return buildResult(profile, {
    modelNumber: "036",
    filingSubject: filingSubjectForActivity(profile),
    status: "NOT_APPLICABLE",
    periods: [],
    periodicity: "EVENT_DRIVEN",
    reason: "No se han declarado cambios censales durante el ejercicio.",
    evidenceFields: ["cambios durante el ejercicio"],
    missingInformation: [],
    nextAction: "Conservar la situación censal actual como control de coherencia.",
  });
}

function result100(profile: TaxpayerProfile): ModelResult {
  if (profile.retaDuringYear === "YES") {
    return buildResult(profile, {
      modelNumber: "100",
      filingSubject: "PERSONA_FISICA",
      status: "DERIVED",
      periods: ["ANUAL"],
      periodicity: "ANNUAL",
      reason: "La persona estuvo de alta en RETA en algún momento del ejercicio.",
      evidenceFields: ["alta en RETA"],
      missingInformation: [],
      nextAction: "Preparar la declaración anual personal con el resto de rentas y circunstancias familiares.",
    });
  }
  if (profile.retaDuringYear === "UNKNOWN") {
    return buildResult(profile, {
      modelNumber: "100",
      filingSubject: "PERSONA_FISICA",
      status: "NEEDS_INFORMATION",
      periods: ["ANUAL"],
      periodicity: "ANNUAL",
      reason: "No está confirmado si hubo alta en RETA durante el ejercicio.",
      missingInformation: ["Períodos de alta en RETA y otras rentas personales."],
      nextAction: "Consultar el informe de situación en RETA o la vida laboral.",
    });
  }
  if (hasPersonalActivity(profile)) {
    return buildResult(profile, {
      modelNumber: "100",
      filingSubject: "PERSONA_FISICA",
      status: "CONDITIONAL",
      periods: ["ANUAL"],
      periodicity: "ANNUAL",
      reason: "Existe actividad personal, pero RETA figura como no aplicable o no hubo alta; deben revisarse las reglas generales de obligación.",
      evidenceFields: ["actividad personal", "RETA"],
      missingInformation: ["Rentas anuales totales y causa de no alta en RETA."],
      nextAction: "Revisar la obligación anual completa de IRPF.",
    });
  }
  return buildResult(profile, {
    modelNumber: "100",
    filingSubject: "PERSONA_FISICA",
    status: "NOT_APPLICABLE",
    periods: [],
    periodicity: "ANNUAL",
    reason: "No se ha identificado actividad personal ni alta en RETA dentro del alcance analizado.",
    evidenceFields: ["sujeto que factura", "RETA"],
    missingInformation: [],
    nextAction: "Las demás rentas personales quedan fuera de este descarte de actividad.",
  });
}

function relevantRetentionExceptionKinds(profile: TaxpayerProfile): boolean {
  return (
    profile.activityKinds.length > 0 &&
    profile.activityKinds.every((kind) =>
      kind === "PROFESSIONAL" ||
      kind === "AGRICULTURE" ||
      kind === "LIVESTOCK" ||
      kind === "FORESTRY",
    )
  );
}

function result130(profile: TaxpayerProfile): ModelResult {
  if (!hasPersonalActivity(profile)) {
    return buildResult(profile, {
      modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
      reason: "No se ha identificado una actividad facturada personalmente.", evidenceFields: ["sujeto que factura"], missingInformation: [], nextAction: "Analizar por separado la entidad que emite las facturas.",
    });
  }
  if (profile.incomeTaxRegime === "UNKNOWN") {
    return buildResult(profile, {
      modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NEEDS_INFORMATION", periods: activeQuarters(profile), periodicity: "QUARTERLY",
      reason: "Falta el método de determinación del rendimiento en IRPF.", missingInformation: ["Estimación directa, objetiva o atribución de rentas."], nextAction: "Confirmar el régimen en la situación censal actual.",
    });
  }
  if (profile.incomeTaxRegime !== "DIRECT_NORMAL" && profile.incomeTaxRegime !== "DIRECT_SIMPLIFIED") {
    return buildResult(profile, {
      modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
      reason: profile.incomeTaxRegime === "OBJECTIVE_ESTIMATION" ? "La actividad está en estimación objetiva; se analiza el modelo 131." : "El régimen indicado no utiliza el modelo 130 para este sujeto.",
      evidenceFields: ["régimen de IRPF"], missingInformation: [], nextAction: "Revisar el resultado del modelo alternativo o de la entidad.",
    });
  }
  if (profile.activityKinds.length === 0) {
    return buildResult(profile, {
      modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NEEDS_INFORMATION", periods: activeQuarters(profile), periodicity: "QUARTERLY",
      reason: "No se conoce la naturaleza de las actividades en estimación directa.", missingInformation: ["Tipo de cada actividad."], nextAction: "Confirmar actividades y epígrafes.",
    });
  }
  if (relevantRetentionExceptionKinds(profile)) {
    if (profile.withheldIncomePercent === null) {
      return buildResult(profile, {
        modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NEEDS_INFORMATION", periods: activeQuarters(profile), periodicity: "QUARTERLY",
        reason: "Puede existir la excepción del 70 %, pero falta calcular el porcentaje real de ingresos sometidos a retención.", missingInformation: ["Ingresos totales e ingresos sometidos a retención por actividad."], nextAction: "Calcular el porcentaje con el período correcto; en inicio se usa el propio período.",
      });
    }
    if (profile.withheldIncomePercent >= 70) {
      return buildResult(profile, {
        modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
        reason: `El ${profile.withheldIncomePercent}% de los ingresos computados estuvo sometido a retención y las actividades declaradas entran en la posible excepción.`, evidenceFields: ["porcentaje de ingresos retenidos", "tipos de actividad"], missingInformation: [], nextAction: "Comprobar que el cálculo es por actividad y período correctos y contrastarlo con el censo.",
      });
    }
  }
  return buildResult(profile, {
    modelNumber: "130", filingSubject: "PERSONA_FISICA", status: "DERIVED", ...periodicityAndPeriods(profile, false),
    reason: "Existe actividad personal en estimación directa y no se ha acreditado una excepción completa.", evidenceFields: ["régimen de IRPF", "tipos de actividad", "porcentaje retenido"], missingInformation: [], nextAction: "Preparar los pagos fraccionados de los períodos activos.",
  });
}

function result131(profile: TaxpayerProfile): ModelResult {
  if (!hasPersonalActivity(profile) || profile.incomeTaxRegime !== "OBJECTIVE_ESTIMATION") {
    return buildResult(profile, {
      modelNumber: "131", filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
      reason: "No se ha confirmado una actividad personal en estimación objetiva.", evidenceFields: ["sujeto", "régimen de IRPF"], missingInformation: [], nextAction: "Sin acción para este modelo con los datos actuales.",
    });
  }
  const onlyAgrarian =
    profile.activityKinds.length > 0 &&
    profile.activityKinds.every((kind) =>
      kind === "AGRICULTURE" || kind === "LIVESTOCK" || kind === "FORESTRY",
    );
  if (onlyAgrarian && profile.withheldIncomePercent === null) {
    return buildResult(profile, {
      modelNumber: "131", filingSubject: "PERSONA_FISICA", status: "NEEDS_INFORMATION", periods: activeQuarters(profile), periodicity: "QUARTERLY",
      reason: "Puede existir una excepción agraria del 70 %, pero falta el porcentaje.", missingInformation: ["Ingresos de la explotación e ingresos retenidos."], nextAction: "Calcular el porcentaje del período aplicable.",
    });
  }
  if (onlyAgrarian && (profile.withheldIncomePercent ?? 0) >= 70) {
    return buildResult(profile, {
      modelNumber: "131", filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
      reason: "Se ha acreditado el porcentaje de retención para las actividades agrarias declaradas.", evidenceFields: ["porcentaje retenido", "actividad"], missingInformation: [], nextAction: "Contrastar la excepción con el censo.",
    });
  }
  return buildResult(profile, {
    modelNumber: "131", filingSubject: "PERSONA_FISICA", status: "DERIVED", periods: activeQuarters(profile), periodicity: "QUARTERLY",
    reason: "Existe actividad personal en estimación objetiva sin excepción acreditada.", evidenceFields: ["régimen de IRPF"], missingInformation: [], nextAction: "Preparar los pagos fraccionados de módulos para los períodos activos.",
  });
}

function result303(profile: TaxpayerProfile): ModelResult {
  if (profile.vatRegimes.length === 0) {
    return buildResult(profile, {
      modelNumber: "303", filingSubject: filingSubjectForActivity(profile), status: "NEEDS_INFORMATION", periods: activeQuarters(profile), periodicity: "TO_BE_CONFIRMED",
      reason: "No se ha confirmado el tratamiento de IVA de las actividades.", missingInformation: ["Régimen de IVA por actividad."], nextAction: "Confirmar el régimen en el censo y revisar actividades exentas por servicio concreto.",
    });
  }
  if (!profile.vatRegimes.some((regime) => PERIODIC_VAT_REGIMES.has(regime))) {
    return buildResult(profile, {
      modelNumber: "303", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY",
      reason: "Solo se han indicado tratamientos que, por sí solos, no acreditan autoliquidación periódica 303.", evidenceFields: ["regímenes de IVA"], missingInformation: [], nextAction: "Revisar operaciones no periódicas y el modelo 309.",
    });
  }
  return buildResult(profile, {
    modelNumber: "303", filingSubject: filingSubjectForActivity(profile), status: "DERIVED", ...periodicityAndPeriods(profile),
    reason: "Al menos una actividad utiliza un régimen con autoliquidación periódica de IVA.", evidenceFields: ["regímenes de IVA", "REDEME", "SII", "gran empresa"], missingInformation: [], nextAction: "Preparar los períodos activos y separar sectores o prorrata si existen.",
  });
}

function result390(profile: TaxpayerProfile, vat303: ModelResult): ModelResult {
  if (vat303.status === "NOT_APPLICABLE") {
    return buildResult(profile, { modelNumber: "390", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "No se ha determinado obligación periódica de IVA que resumir.", evidenceFields: ["resultado 303"], missingInformation: [], nextAction: "Sin acción salvo que exista otro régimen o sector." });
  }
  if (profile.sii === "YES" || profile.vatAnnualSummaryExempt === "YES") {
    return buildResult(profile, { modelNumber: "390", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: profile.sii === "YES" ? "El usuario confirma SII, supuesto que debe contrastarse con la exoneración del ejercicio." : "El usuario confirma una exoneración del resumen anual.", evidenceFields: ["SII", "exoneración 390"], missingInformation: [], nextAction: "Conservar evidencia de la exoneración y completar la información adicional exigida en el último 303 si procede." });
  }
  if (profile.vatAnnualSummaryExempt === "UNKNOWN" || profile.sii === "UNKNOWN") {
    return buildResult(profile, { modelNumber: "390", filingSubject: filingSubjectForActivity(profile), status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "No se ha comprobado expresamente si aplica una exoneración del resumen anual.", missingInformation: ["SII y condiciones de exoneración del ejercicio."], nextAction: "Contrastar las instrucciones del 390 del ejercicio." });
  }
  return buildResult(profile, { modelNumber: "390", filingSubject: filingSubjectForActivity(profile), status: "DERIVED", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "Existe autoliquidación periódica de IVA y no se ha indicado exoneración.", evidenceFields: ["resultado 303", "exoneración 390"], missingInformation: [], nextAction: "Preparar el resumen anual con la versión del ejercicio." });
}

function result309(profile: TaxpayerProfile, vat303: ModelResult): ModelResult {
  const operations = [profile.euGoodsPurchases, profile.euServicesPurchases, profile.reverseChargeTransactions];
  if (vat303.status === "DERIVED" || vat303.status === "CONFIRMED_BY_CENSUS") {
    return buildResult(profile, { modelNumber: "309", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "PER_OPERATION", reason: "Las operaciones indicadas se integrarían normalmente en la autoliquidación periódica 303.", evidenceFields: ["resultado 303"], missingInformation: [], nextAction: "Comprobar cada operación especial antes de descartarlo definitivamente." });
  }
  if (yes(operations)) {
    return buildResult(profile, { modelNumber: "309", filingSubject: filingSubjectForActivity(profile), status: "DERIVED", periods: activeQuarters(profile), periodicity: "PER_OPERATION", reason: "No hay 303 periódico y se ha confirmado una adquisición u operación con posible autoliquidación no periódica.", evidenceFields: ["compras UE", "servicios UE", "inversión del sujeto pasivo"], missingInformation: [], nextAction: "Clasificar la operación y confirmar el período exacto." });
  }
  if (unknown(operations)) {
    return buildResult(profile, { modelNumber: "309", filingSubject: filingSubjectForActivity(profile), status: "NEEDS_INFORMATION", periods: [], periodicity: "PER_OPERATION", reason: "Falta confirmar si hubo operaciones que exijan autoliquidación no periódica.", missingInformation: ["Adquisiciones UE, servicios extranjeros e inversión del sujeto pasivo."], nextAction: "Revisar facturas recibidas del extranjero." });
  }
  return buildResult(profile, { modelNumber: "309", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "PER_OPERATION", reason: "No se han identificado operaciones no periódicas declarables.", evidenceFields: ["operaciones especiales de IVA"], missingInformation: [], nextAction: "Sin acción con los datos actuales." });
}

function withholdingPair(
  profile: TaxpayerProfile,
  periodicModel: "111" | "115",
  annualModel: "190" | "180",
  trigger: FourWayAnswer,
  subject: FilingSubject,
  reason: string,
): [ModelResult, ModelResult] {
  if (trigger === "YES") {
    const periodic = buildResult(profile, { modelNumber: periodicModel, filingSubject: subject, status: "DERIVED", ...periodicityAndPeriods(profile), reason, evidenceFields: [reason], missingInformation: [], nextAction: "Preparar las autoliquidaciones de los períodos con rentas satisfechas." });
    const annual = buildResult(profile, { modelNumber: annualModel, filingSubject: subject, status: "DERIVED", periods: ["ANUAL"], periodicity: "ANNUAL", reason: `${reason} Debe revisarse también el resumen anual.`, evidenceFields: [reason], missingInformation: [], nextAction: "Preparar el resumen anual de perceptores." });
    return [periodic, annual];
  }
  if (trigger === "UNKNOWN") {
    return [
      buildResult(profile, { modelNumber: periodicModel, filingSubject: subject, status: "NEEDS_INFORMATION", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "No se sabe si se pagaron rentas comprendidas en esta retención.", missingInformation: ["Rentas pagadas, perceptores y retenciones."], nextAction: "Revisar nóminas, facturas y libro de retenciones." }),
      buildResult(profile, { modelNumber: annualModel, filingSubject: subject, status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "El resumen anual depende de las rentas y retenciones del ejercicio.", missingInformation: ["Datos anuales de perceptores."], nextAction: "Completar primero la información periódica." }),
    ];
  }
  return [
    buildResult(profile, { modelNumber: periodicModel, filingSubject: subject, status: "NOT_APPLICABLE", periods: [], periodicity: "QUARTERLY", reason: "No se han declarado rentas comprendidas en el modelo.", evidenceFields: [reason], missingInformation: [], nextAction: "Sin acción con los datos actuales." }),
    buildResult(profile, { modelNumber: annualModel, filingSubject: subject, status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "No existen retenciones periódicas que resumir.", evidenceFields: [reason], missingInformation: [], nextAction: "Sin acción con los datos actuales." }),
  ];
}

function result115And180(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  const subject = filingSubjectForActivity(profile);
  if (profile.rentsBusinessPremises === "NO" || profile.rentsBusinessPremises === "NOT_APPLICABLE") {
    return withholdingPair(profile, "115", "180", "NO", subject, "alquiler de inmueble urbano");
  }
  if (profile.rentsBusinessPremises === "UNKNOWN") {
    return withholdingPair(profile, "115", "180", "UNKNOWN", subject, "alquiler de inmueble urbano");
  }
  if (profile.landlordWithholdingExemption === "YES" || profile.rentSubjectToWithholding === "NO") {
    return withholdingPair(profile, "115", "180", "NO", subject, "alquiler exonerado o no sujeto a retención");
  }
  if (profile.rentSubjectToWithholding === "YES" && profile.landlordWithholdingExemption === "NO") {
    return withholdingPair(profile, "115", "180", "YES", subject, "alquiler urbano sujeto a retención");
  }
  return withholdingPair(profile, "115", "180", "UNKNOWN", subject, "tratamiento de la retención del alquiler");
}

function resultCapitalPair(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  const subject = filingSubjectForActivity(profile);
  if (profile.paidCapitalIncome === "YES") {
    return [
      buildResult(profile, { modelNumber: "123", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", periods: activeQuarters(profile), periodicity: "TO_BE_CONFIRMED", reason: "Se pagaron rendimientos de capital, pero falta clasificar si corresponden al 123 u otro modelo específico.", evidenceFields: ["rendimientos de capital"], missingInformation: ["Clase de renta y modelo específico aplicable."], nextAction: "Clasificar la renta antes de presentar." }),
      buildResult(profile, { modelNumber: "193", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "El resumen anual depende de la clasificación de los rendimientos de capital.", evidenceFields: ["rendimientos de capital"], missingInformation: ["Perceptores, clase de renta y exclusiones 188/194/196."], nextAction: "Revisar el resumen informativo correcto." }),
    ];
  }
  const trigger = profile.paidCapitalIncome === "UNKNOWN" ? "UNKNOWN" : "NO";
  return [
    buildResult(profile, { modelNumber: "123", filingSubject: subject, status: trigger === "UNKNOWN" ? "NEEDS_INFORMATION" : "NOT_APPLICABLE", periods: [], periodicity: "TO_BE_CONFIRMED", reason: trigger === "UNKNOWN" ? "No se sabe si se pagaron rendimientos de capital sujetos a retención." : "No se declararon pagos de rendimientos de capital.", evidenceFields: trigger === "UNKNOWN" ? [] : ["pagos de rendimientos de capital"], missingInformation: trigger === "UNKNOWN" ? ["Pagos de intereses y otros rendimientos."] : [], nextAction: trigger === "UNKNOWN" ? "Revisar contratos y pagos." : "Sin acción." }),
    buildResult(profile, { modelNumber: "193", filingSubject: subject, status: trigger === "UNKNOWN" ? "NEEDS_INFORMATION" : "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: trigger === "UNKNOWN" ? "Falta confirmar la existencia de rentas a resumir." : "No existen rentas de capital identificadas para el resumen.", evidenceFields: trigger === "UNKNOWN" ? [] : ["pagos de rendimientos de capital"], missingInformation: trigger === "UNKNOWN" ? ["Datos anuales de perceptores."] : [], nextAction: trigger === "UNKNOWN" ? "Revisar el ejercicio." : "Sin acción." }),
  ];
}

function resultNonResidentPair(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  const subject = filingSubjectForActivity(profile);
  if (profile.paidNonResidentIncome === "YES") {
    if (profile.nonResidentWithholdingConfirmed === "YES") {
      return [
        buildResult(profile, { modelNumber: "216", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", ...periodicityAndPeriods(profile), reason: "Se ha confirmado una posible obligación como retenedor de rentas de no residentes, sujeta a revisión de renta y convenio.", evidenceFields: ["pago a no residente", "retención confirmada"], missingInformation: ["País, clase de renta, certificado de residencia y convenio."], nextAction: "Validar el tratamiento antes de presentar el 216." }),
        buildResult(profile, { modelNumber: "296", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "La posible obligación periódica puede requerir resumen anual.", evidenceFields: ["pago a no residente"], missingInformation: ["Detalle anual por perceptor y exclusiones."], nextAction: "Validar el resumen anual correcto." }),
      ];
    }
    return [
      buildResult(profile, { modelNumber: "216", filingSubject: subject, status: "NEEDS_INFORMATION", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "Una factura extranjera no basta para concluir el 216.", missingInformation: ["País, renta, convenio y obligación de retener en España."], nextAction: "Obtener certificado de residencia y revisar el convenio." }),
      buildResult(profile, { modelNumber: "296", filingSubject: subject, status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "No se ha confirmado la obligación de resumen anual.", missingInformation: ["Resultado del análisis del 216 y perceptor."], nextAction: "Completar primero la clasificación de la renta." }),
    ];
  }
  const status: ModelResultStatus = profile.paidNonResidentIncome === "UNKNOWN" ? "NEEDS_INFORMATION" : "NOT_APPLICABLE";
  return ["216", "296"].map((modelNumber) => buildResult(profile, { modelNumber: modelNumber as "216" | "296", filingSubject: subject, status, periods: modelNumber === "296" ? ["ANUAL"] : [], periodicity: modelNumber === "296" ? "ANNUAL" : "TO_BE_CONFIRMED", reason: status === "NEEDS_INFORMATION" ? "No se sabe si hubo pagos a no residentes." : "No se declararon pagos a no residentes.", evidenceFields: status === "NOT_APPLICABLE" ? ["pagos a no residentes"] : [], missingInformation: status === "NEEDS_INFORMATION" ? ["Pagos a personas o entidades no residentes."] : [], nextAction: status === "NEEDS_INFORMATION" ? "Revisar proveedores y perceptores extranjeros." : "Sin acción." })) as [ModelResult, ModelResult];
}

function result349(profile: TaxpayerProfile): ModelResult {
  const operations = [profile.euGoodsSales, profile.euGoodsPurchases, profile.euServicesSales, profile.euServicesPurchases];
  if (yes(operations)) {
    const roiMismatch = profile.roiRegistered !== "YES";
    return buildResult(profile, { modelNumber: "349", filingSubject: filingSubjectForActivity(profile), status: roiMismatch ? "CENSUS_MISMATCH" : "DERIVED", ...periodicityAndPeriods(profile, false), reason: roiMismatch ? "Hay operaciones intracomunitarias, pero no está confirmada el alta efectiva en ROI." : "Se han confirmado operaciones intracomunitarias comprendidas en el análisis.", evidenceFields: ["operaciones UE", "ROI"], missingInformation: [], nextAction: roiMismatch ? "Revisar ROI/VIES y la modificación censal sin omitir la clasificación de las operaciones." : "Preparar la recapitulación de los períodos con operaciones.", ...(roiMismatch ? { censusMismatch: "Operaciones UE sin alta ROI confirmada." } : {}) });
  }
  if (unknown(operations)) {
    return buildResult(profile, { modelNumber: "349", filingSubject: filingSubjectForActivity(profile), status: "NEEDS_INFORMATION", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "No están confirmadas todas las clases de operaciones intracomunitarias.", missingInformation: ["Ventas y compras de bienes y servicios por país y NIF-IVA."], nextAction: "Revisar facturas UE y validaciones VIES." });
  }
  return buildResult(profile, { modelNumber: "349", filingSubject: filingSubjectForActivity(profile), status: "NOT_APPLICABLE", periods: [], periodicity: "TO_BE_CONFIRMED", reason: profile.roiRegistered === "YES" ? "Existe alta en ROI, pero no hubo operaciones intracomunitarias; el alta por sí sola no genera 349." : "No se declararon operaciones intracomunitarias.", evidenceFields: ["operaciones UE", "ROI"], missingInformation: [], nextAction: "Sin presentación por el mero hecho de estar en ROI." });
}

function resultOssPair(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  const subject = filingSubjectForActivity(profile);
  if (profile.euConsumerSales === "YES" && profile.ossRegistered === "YES") {
    return [
      buildResult(profile, { modelNumber: "035", filingSubject: subject, status: "CONDITIONAL", periods: ["SEGÚN_ALTA_O_CAMBIO"], periodicity: "EVENT_DRIVEN", reason: "Se utiliza OSS/IOSS; el 035 corresponde a altas, modificaciones o bajas, no a cada período sin cambios.", evidenceFields: ["ventas B2C UE", "OSS/IOSS"], missingInformation: ["Régimen concreto y cambios durante el año."], nextAction: "Comprobar si hubo alta, modificación o baja que comunicar." }),
      buildResult(profile, { modelNumber: "369", filingSubject: subject, status: "DERIVED", periods: activeQuarters(profile), periodicity: "TO_BE_CONFIRMED", reason: "Se confirmaron ventas B2C europeas y alta en un régimen OSS/IOSS.", evidenceFields: ["ventas B2C UE", "OSS/IOSS"], missingInformation: ["Régimen concreto y países de consumo para fijar periodicidad."], nextAction: "Preparar la declaración del régimen y períodos aplicables." }),
    ];
  }
  if (profile.euConsumerSales === "YES") {
    return [
      buildResult(profile, { modelNumber: "035", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", periods: [], periodicity: "EVENT_DRIVEN", reason: "Hay ventas B2C europeas, pero no está confirmado el régimen de ventanilla única.", missingInformation: ["Umbral, países de consumo, tipo de venta y régimen elegido."], nextAction: "Revisar si procede alta en OSS/IOSS u obligaciones en otros países." }),
      buildResult(profile, { modelNumber: "369", filingSubject: subject, status: "NEEDS_INFORMATION", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "El 369 depende de la adhesión efectiva a un régimen OSS/IOSS.", missingInformation: ["Justificante de alta y régimen."], nextAction: "No presentar 369 automáticamente sin confirmar el alta." }),
    ];
  }
  const status: ModelResultStatus = profile.euConsumerSales === "UNKNOWN" ? "NEEDS_INFORMATION" : "NOT_APPLICABLE";
  return ["035", "369"].map((modelNumber) => buildResult(profile, { modelNumber: modelNumber as "035" | "369", filingSubject: subject, status, periods: [], periodicity: modelNumber === "035" ? "EVENT_DRIVEN" : "TO_BE_CONFIRMED", reason: status === "NEEDS_INFORMATION" ? "No se sabe si hubo ventas a consumidores europeos." : "No se declararon ventas B2C europeas.", evidenceFields: status === "NOT_APPLICABLE" ? ["ventas B2C a consumidores europeos"] : [], missingInformation: status === "NEEDS_INFORMATION" ? ["Ventas B2C por país."] : [], nextAction: status === "NEEDS_INFORMATION" ? "Revisar ventas online y servicios digitales." : "Sin acción." })) as [ModelResult, ModelResult];
}

function result347(profile: TaxpayerProfile): ModelResult {
  const subject = filingSubjectForActivity(profile);
  if (profile.sii === "YES" || profile.thirdPartyOperationsAllExcluded === "YES") {
    return buildResult(profile, { modelNumber: "347", filingSubject: subject, status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: profile.sii === "YES" ? "Se ha confirmado SII durante el ejercicio, supuesto excluido del 347 que debe contrastarse temporalmente." : "El usuario confirma que todas las operaciones por encima del umbral están excluidas.", evidenceFields: ["SII", "exclusiones 347"], missingInformation: [], nextAction: "Conservar el desglose que acredita la exclusión." });
  }
  if (profile.thirdPartyThresholdExceeded === "YES" && profile.thirdPartyOperationsAllExcluded === "NO") {
    return buildResult(profile, { modelNumber: "347", filingSubject: subject, status: "DERIVED", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "Se superó el umbral por tercero y no se han declarado exclusiones para todas las operaciones.", evidenceFields: ["importe por tercero", "exclusiones"], missingInformation: [], nextAction: "Preparar el detalle trimestral/anual conforme al diseño del ejercicio." });
  }
  if (profile.thirdPartyThresholdExceeded === "NO") {
    return buildResult(profile, { modelNumber: "347", filingSubject: subject, status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "No se alcanzó el umbral anual por ningún tercero.", evidenceFields: ["importe por tercero"], missingInformation: [], nextAction: "Conservar el cálculo anual por cliente y proveedor." });
  }
  return buildResult(profile, { modelNumber: "347", filingSubject: subject, status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "No está completo el cálculo por tercero o sus exclusiones.", missingInformation: ["Importe anual por cliente/proveedor y operaciones excluidas."], nextAction: "Calcular por tercero y cruzar con retenciones, UE y SII." });
}

function resultCorporate(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  if (profile.invoicingSubject !== "COMPANY") {
    return [
      buildResult(profile, { modelNumber: "200", filingSubject: "SOCIEDAD", status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "El sujeto que factura no se ha identificado como sociedad.", evidenceFields: ["sujeto que factura"], missingInformation: [], nextAction: "Sin acción para la sociedad dentro de este perfil." }),
      buildResult(profile, { modelNumber: "202", filingSubject: "SOCIEDAD", status: "NOT_APPLICABLE", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "No se analiza una sociedad contribuyente del Impuesto sobre Sociedades.", evidenceFields: ["sujeto que factura"], missingInformation: [], nextAction: "Sin acción." }),
    ];
  }
  const model200 = buildResult(profile, { modelNumber: "200", filingSubject: "SOCIEDAD", status: "DERIVED", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "La sociedad es el sujeto que emite las facturas.", evidenceFields: ["sujeto que factura"], missingInformation: [], nextAction: "Preparar la declaración anual de la entidad por su período impositivo." });
  if (profile.companyInstallmentPayments === "YES") {
    return [model200, buildResult(profile, { modelNumber: "202", filingSubject: "SOCIEDAD", status: "DERIVED", periods: ["ABRIL", "OCTUBRE", "DICIEMBRE"], periodicity: "TO_BE_CONFIRMED", reason: "Se ha confirmado que la sociedad debe efectuar pagos fraccionados.", evidenceFields: ["obligación de pagos fraccionados"], missingInformation: [], nextAction: "Confirmar modalidad, base y períodos según el ejercicio social." })];
  }
  if (profile.companyInstallmentPayments === "NO") {
    return [model200, buildResult(profile, { modelNumber: "202", filingSubject: "SOCIEDAD", status: "NOT_APPLICABLE", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "Se ha confirmado una ausencia de obligación de pagos fraccionados.", evidenceFields: ["obligación de pagos fraccionados"], missingInformation: [], nextAction: "Conservar el fundamento de la excepción." })];
  }
  return [model200, buildResult(profile, { modelNumber: "202", filingSubject: "SOCIEDAD", status: "NEEDS_INFORMATION", periods: [], periodicity: "TO_BE_CONFIRMED", reason: "No basta ser sociedad para concluir el modelo 202.", missingInformation: ["Modalidad, cifra de negocios, tipo y excepciones."], nextAction: "Revisar el modelo 200 anterior y la modalidad del artículo 40 LIS." })];
}

function result184(profile: TaxpayerProfile): ModelResult {
  const isAttribution = profile.invoicingSubject === "COMMUNITY_OF_PROPERTY" || profile.invoicingSubject === "CIVIL_PARTNERSHIP";
  if (!isAttribution) {
    return buildResult(profile, { modelNumber: "184", filingSubject: "ENTIDAD", status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "No se ha identificado una entidad en régimen de atribución de rentas.", evidenceFields: ["sujeto que factura"], missingInformation: [], nextAction: "Sin acción para este modelo." });
  }
  if (profile.attributionEntityIncomeAboveThreshold === "YES") {
    return buildResult(profile, { modelNumber: "184", filingSubject: "ENTIDAD", status: "DERIVED", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "La entidad en atribución ejerce actividad económica o supera el umbral indicado.", evidenceFields: ["entidad y rentas"], missingInformation: [], nextAction: "Preparar la declaración de la entidad y comunicar la atribución a sus miembros." });
  }
  if (profile.attributionEntityIncomeAboveThreshold === "NO") {
    return buildResult(profile, { modelNumber: "184", filingSubject: "ENTIDAD", status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: "Se ha confirmado que no ejerce actividad económica ni supera el umbral.", evidenceFields: ["entidad y rentas"], missingInformation: [], nextAction: "Conservar el cálculo anual." });
  }
  return buildResult(profile, { modelNumber: "184", filingSubject: "ENTIDAD", status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: "Falta confirmar actividad económica e importe anual de rentas de la entidad.", missingInformation: ["Actividad e ingresos de la entidad."], nextAction: "Revisar contabilidad y contrato de la entidad." });
}

function personalSupplementary(
  profile: TaxpayerProfile,
  modelNumber: "714" | "720" | "721",
  answer: FourWayAnswer,
  fact: string,
): ModelResult {
  if (answer === "YES") {
    return buildResult(profile, { modelNumber, filingSubject: "PERSONA_FISICA", status: "NEEDS_PROFESSIONAL_REVIEW", periods: ["ANUAL"], periodicity: "ANNUAL", reason: `Se ha indicado que puede haber ${fact}, pero faltan umbrales, categorías y excepciones personales.`, evidenceFields: [fact], missingInformation: ["Importes, titularidad, residencia y reglas del ejercicio."], nextAction: "Realizar una revisión personal separada de las obligaciones de la actividad." });
  }
  if (answer === "UNKNOWN") {
    return buildResult(profile, { modelNumber, filingSubject: "PERSONA_FISICA", status: "NEEDS_INFORMATION", periods: ["ANUAL"], periodicity: "ANNUAL", reason: `No está confirmado si hay ${fact}.`, missingInformation: [fact], nextAction: "Reunir la información personal correspondiente." });
  }
  return buildResult(profile, { modelNumber, filingSubject: "PERSONA_FISICA", status: "NOT_APPLICABLE", periods: [], periodicity: "ANNUAL", reason: `No se ha declarado ${fact}.`, evidenceFields: [fact], missingInformation: [], nextAction: "Sin acción dentro de este diagnóstico." });
}

function specialVatPair(profile: TaxpayerProfile): [ModelResult, ModelResult] {
  const subject = filingSubjectForActivity(profile);
  if (profile.specialVatRefundSituation === "YES") {
    return ["308", "341"].map((modelNumber) => buildResult(profile, { modelNumber: modelNumber as "308" | "341", filingSubject: subject, status: "NEEDS_PROFESSIONAL_REVIEW", periods: [], periodicity: "PER_OPERATION", reason: "Se indicó una devolución o compensación especial, pero falta identificar el supuesto legal concreto.", evidenceFields: ["devolución especial de IVA"], missingInformation: ["Tipo de operación y régimen especial."], nextAction: "Clasificar el supuesto antes de elegir entre 308, 341 u otro procedimiento." })) as [ModelResult, ModelResult];
  }
  const status: ModelResultStatus = profile.specialVatRefundSituation === "UNKNOWN" ? "NEEDS_INFORMATION" : "NOT_APPLICABLE";
  return ["308", "341"].map((modelNumber) => buildResult(profile, { modelNumber: modelNumber as "308" | "341", filingSubject: subject, status, periods: [], periodicity: "PER_OPERATION", reason: status === "NEEDS_INFORMATION" ? "No se sabe si existió un supuesto especial de devolución o compensación." : "No se declaró ningún supuesto especial.", evidenceFields: status === "NOT_APPLICABLE" ? ["devoluciones y compensaciones especiales de IVA"] : [], missingInformation: status === "NEEDS_INFORMATION" ? ["Operaciones especiales de devolución o compensación."] : [], nextAction: status === "NEEDS_INFORMATION" ? "Revisar operaciones de IVA especiales." : "Sin acción." })) as [ModelResult, ModelResult];
}

export function evaluateTaxModelDiagnostic(
  profile: TaxpayerProfile,
  generatedAt: string,
): DiagnosticResult {
  if (profile.territory !== "ES_COMMON") {
    const unknownTerritory = profile.territory === "UNKNOWN" || profile.territory === "UNCERTAIN";
    return {
      schemaVersion: TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
      engineVersion: TAX_MODEL_DIAGNOSTIC_ENGINE_VERSION,
      ruleSetVersion: taxRuleSetVersion(profile.fiscalYear),
      fiscalYear: profile.fiscalYear,
      territory: profile.territory,
      generatedAt,
      status: unknownTerritory ? "NEEDS_INFORMATION" : "TERRITORY_NOT_SUPPORTED",
      models: [],
      missingInformation: unknownTerritory ? ["Territorio fiscal exacto de la actividad."] : [],
      discrepancies: [],
      warnings: [
        unknownTerritory
          ? "No se generan modelos hasta confirmar el territorio."
          : "Este motor todavía no evalúa ese territorio. No se ha emitido una lista estatal de IVA.",
      ],
    };
  }

  const vat303 = result303(profile);
  const retentionTrigger: FourWayAnswer = yes([
    profile.employees,
    profile.paidProfessionalsWithWithholding,
    profile.otherIrpfWithholdingPayments,
  ])
    ? "YES"
    : unknown([
          profile.employees,
          profile.paidProfessionalsWithWithholding,
          profile.otherIrpfWithholdingPayments,
        ])
      ? "UNKNOWN"
      : "NO";
  const withholding111 = withholdingPair(
    profile,
    "111",
    "190",
    retentionTrigger,
    filingSubjectForActivity(profile),
    "pagos de trabajo o profesionales sujetos a retención",
  );
  const withholding115 = result115And180(profile);
  const capital = resultCapitalPair(profile);
  const nonResident = resultNonResidentPair(profile);
  const oss = resultOssPair(profile);
  const corporate = resultCorporate(profile);
  const specialVat = specialVatPair(profile);

  const results = [
    result036(profile),
    result100(profile),
    result130(profile),
    result131(profile),
    vat303,
    result390(profile, vat303),
    result309(profile, vat303),
    ...specialVat,
    ...withholding111,
    ...withholding115,
    ...capital,
    ...nonResident,
    result349(profile),
    ...oss,
    result347(profile),
    ...corporate,
    result184(profile),
    personalSupplementary(profile, "720", profile.foreignAssetsPotentiallyReportable, "bienes o derechos potencialmente declarables en el extranjero"),
    personalSupplementary(profile, "721", profile.foreignCryptoPotentiallyReportable, "monedas virtuales potencialmente declarables custodiadas en el extranjero"),
    personalSupplementary(profile, "714", profile.wealthTaxPotentiallyApplicable, "una posible obligación por patrimonio"),
  ].map((result) => withCensusReconciliation(profile, result));

  const missingInformation = [...new Set(results.flatMap((result) => result.missingInformation))];
  const discrepancies = results
    .map((result) => result.censusMismatch)
    .filter((item): item is string => Boolean(item));
  const hasReview = results.some((result) =>
    result.status === "NEEDS_PROFESSIONAL_REVIEW" ||
    result.status === "CENSUS_MISMATCH",
  );
  const hasMissing = results.some((result) =>
    result.status === "NEEDS_INFORMATION" || result.status === "CONDITIONAL",
  );

  return {
    schemaVersion: TAX_MODEL_DIAGNOSTIC_SCHEMA_VERSION,
    engineVersion: TAX_MODEL_DIAGNOSTIC_ENGINE_VERSION,
    ruleSetVersion: taxRuleSetVersion(profile.fiscalYear),
    fiscalYear: profile.fiscalYear,
    territory: profile.territory,
    generatedAt,
    status: hasReview
      ? "NEEDS_PROFESSIONAL_REVIEW"
      : hasMissing
        ? "NEEDS_INFORMATION"
        : "READY",
    models: results,
    missingInformation,
    discrepancies,
    warnings: [
      "Resultado orientativo y no vinculante, basado únicamente en los datos confirmados.",
      "Las reglas de esta versión están pendientes de revisión fiscal formal antes de activarse en producción.",
      ...(isEntitySubject(profile) && profile.hasPersonalActivity === "YES"
        ? ["Se han evaluado por separado la entidad que factura y la actividad personal declarada."]
        : []),
    ],
  };
}

export function summarizeDiagnosticCounts(result: DiagnosticResult) {
  const counts: Partial<Record<ModelResultStatus, number>> = {};
  for (const model of result.models) counts[model.status] = (counts[model.status] ?? 0) + 1;
  return counts;
}

export function isProfileQuestionnaireComplete(profile: TaxpayerProfile): boolean {
  const euOperations = [profile.euGoodsSales, profile.euGoodsPurchases, profile.euServicesSales, profile.euServicesPurchases];
  return (
    profile.territory !== "UNKNOWN" &&
    profile.invoicingSubject !== "UNKNOWN" &&
    profile.taxpayerRole !== "UNKNOWN" &&
    profile.activityKinds.length > 0 &&
    profile.incomeTaxRegime !== "UNKNOWN" &&
    profile.vatRegimes.length > 0 &&
    !unknown([
      profile.retaDuringYear,
      profile.employees,
      profile.paidProfessionalsWithWithholding,
      profile.rentsBusinessPremises,
      profile.paidNonResidentIncome,
      profile.euConsumerSales,
      profile.thirdPartyThresholdExceeded,
      profile.changesDuringYear,
      profile.censusReviewed,
      ...euOperations,
    ])
  );
}
