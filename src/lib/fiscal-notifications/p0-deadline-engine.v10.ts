import {
  AEAT_P0_OFFICIAL_SOURCES_V10,
  type AeatP0AssertionLayerV10,
  type AeatP0DeepProfileIdV10,
  type AeatP0OfficialSourceIdV10,
  type AeatP0OfficialSourceV10,
} from "./knowledge/p0-deep-contracts.v10";

export const AEAT_P0_DEADLINE_ENGINE_VERSION_V10 = "10.0.0" as const;
export const AEAT_P0_DEADLINE_RULE_IDS_V10 = Object.freeze([
  "EXTENSION_ELIGIBILITY",
  "EXTENSION_AUTOMATIC_EFFECT",
  "EXTENSION_DECISION_EFFECT",
  "RECTIFICATION_MAX_RESOLUTION",
  "RECTIFICATION_PROPOSAL_ALLEGATIONS",
  "RECTIFICATION_RESOLUTION_APPEAL",
  "RECTIFYING_RETURN_PERIOD_APPLICABILITY",
  "REVIEW_EXECUTION_ISSUE",
  "CERTIFICATE_DISAGREEMENT",
  "CERTIFICATE_REISSUE",
  "CERTIFICATE_GENERAL_VALIDITY",
] as const);
export type AeatP0DeadlineRuleIdV10 = (typeof AEAT_P0_DEADLINE_RULE_IDS_V10)[number];

export type AeatP0DeadlineStateV10 =
  | "INFORMATION_PENDING"
  | "REVIEW_REQUIRED"
  | "INELIGIBLE"
  | "ELIGIBLE_FOR_AUTOMATIC_HALF_EXTENSION"
  | "AUTO_GRANTED_BY_RULE"
  | "EXPRESS_GRANTED"
  | "EXPRESS_DENIED"
  | "CALCULATED_REVIEW_REQUIRED"
  | "CERTIFICATE_WITHIN_GENERAL_VALIDITY_REVIEW_REQUIRED"
  | "CERTIFICATE_EXPIRED_REVIEW_REQUIRED"
  | "RECTIFYING_ROUTE_ALLOWED"
  | "TRADITIONAL_ROUTE_REQUIRED";

export interface AeatP0DeadlineStateChangeV10 {
  readonly previousState: AeatP0DeadlineStateV10 | "PENDING";
  readonly newState: AeatP0DeadlineStateV10;
  readonly ruleVersion: typeof AEAT_P0_DEADLINE_ENGINE_VERSION_V10;
  readonly evidenceIds: readonly string[];
  readonly changedAt: string;
  readonly reason: string;
}

export interface AeatP0DeadlineEvaluationV10 {
  readonly schemaVersion: 10;
  readonly engineVersion: typeof AEAT_P0_DEADLINE_ENGINE_VERSION_V10;
  readonly ruleId: AeatP0DeadlineRuleIdV10;
  readonly profileId: AeatP0DeepProfileIdV10;
  readonly state: AeatP0DeadlineStateV10;
  readonly triggerDate: string | null;
  readonly calculatedDate: string | null;
  readonly source: AeatP0OfficialSourceV10;
  readonly assertionLayers: readonly AeatP0AssertionLayerV10[];
  readonly deterministicTrace: readonly string[];
  readonly stateHistory: readonly AeatP0DeadlineStateChangeV10[];
  readonly requiresHumanReview: true;
  readonly autoActionBlocked: true;
  readonly materializationPolicy: "PROHIBITED_UNTIL_REVIEW";
}

export interface EvaluateExtensionRequestV10Input {
  readonly filingDateTime: string | null;
  readonly originalDeadline: string | null;
  readonly originalTermDays: number | null;
  readonly motivated: boolean | null;
  readonly noThirdPartyPrejudice: boolean | null;
  readonly isFirstRequest: boolean | null;
  readonly evaluatedAt: string;
  readonly evidenceIds: readonly string[];
}

export interface ReconcileExtensionDecisionV10Input {
  readonly previous: AeatP0DeadlineEvaluationV10;
  readonly decisionResult: "GRANTED" | "GRANTED_SHORTER" | "DENIED";
  readonly decisionNotifiedAt: string | null;
  readonly explicitNewDeadline: string | null;
  readonly evaluatedAt: string;
  readonly evidenceIds: readonly string[];
}

export type EvaluateCalendarDeadlineV10Input =
  | Readonly<{ ruleId: "RECTIFICATION_MAX_RESOLUTION"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "RECTIFICATION_PROPOSAL_ALLEGATIONS"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "RECTIFICATION_RESOLUTION_APPEAL"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "REVIEW_EXECUTION_ISSUE"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "CERTIFICATE_DISAGREEMENT"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "CERTIFICATE_REISSUE"; triggerDate: string | null; evaluatedAt: string; evidenceIds: readonly string[] }>
  | Readonly<{ ruleId: "CERTIFICATE_GENERAL_VALIDITY"; triggerDate: string | null; periodicObligation: boolean | null; specificValidityDate: string | null; changedCircumstances: boolean | null; evaluatedAt: string; evidenceIds: readonly string[] }>;

export interface EvaluateRectifyingRouteV10Input {
  readonly model: string | null;
  readonly fiscalYear: number | null;
  readonly taxPeriod: string | null;
  readonly rectifyingFlag: boolean | null;
  readonly originalReceiptAvailable: boolean | null;
  readonly reasonCount: number | null;
  readonly traditionalRouteException: boolean | null;
  readonly evaluatedAt: string;
  readonly evidenceIds: readonly string[];
}

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?Z$/u;

function date(value: string | null, path: string): Date | null {
  if (value === null) return null;
  const match = ISO_DATE.exec(value);
  if (!match) throw new Error(`AEAT_P0_DEADLINE_V10_INVALID:${path}`);
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (parsed.toISOString().slice(0, 10) !== value) throw new Error(`AEAT_P0_DEADLINE_V10_INVALID:${path}`);
  return parsed;
}

function instant(value: string, path: string): Date {
  if (!ISO_INSTANT.test(value)) throw new Error(`AEAT_P0_DEADLINE_V10_INVALID:${path}`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`AEAT_P0_DEADLINE_V10_INVALID:${path}`);
  return parsed;
}

function filingInstant(value: string | null): Date | null {
  if (value === null) return null;
  if (ISO_DATE.test(value)) return date(value, "filingDateTime");
  return instant(value, "filingDateTime");
}

function evidence(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length > 64) throw new Error("AEAT_P0_DEADLINE_V10_INVALID:evidenceIds");
  const output = values.map((value) => {
    if (typeof value !== "string" || !SAFE_ID.test(value)) throw new Error("AEAT_P0_DEADLINE_V10_INVALID:evidenceIds");
    return value;
  });
  if (new Set(output).size !== output.length) throw new Error("AEAT_P0_DEADLINE_V10_INVALID:evidenceIds");
  return Object.freeze(output);
}

function format(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: Date, days: number): Date {
  const copy = new Date(value.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonths(value: Date, months: number): Date {
  const day = value.getUTCDate();
  const first = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first;
}

const RULE_META: Readonly<Record<AeatP0DeadlineRuleIdV10, readonly [AeatP0DeepProfileIdV10, AeatP0OfficialSourceIdV10]>> = Object.freeze({
  EXTENSION_ELIGIBILITY: ["procedure.deadline_extension_request", "BOE_RD1065_ART91"],
  EXTENSION_AUTOMATIC_EFFECT: ["procedure.deadline_extension_request", "BOE_RD1065_ART91"],
  EXTENSION_DECISION_EFFECT: ["procedure.deadline_extension_decision", "BOE_RD1065_ART91"],
  RECTIFICATION_MAX_RESOLUTION: ["assessment.rectification_request", "AEAT_RECTIFICATION_GZ28"],
  RECTIFICATION_PROPOSAL_ALLEGATIONS: ["assessment.rectification_proposal", "AEAT_RECTIFICATION_GZ28"],
  RECTIFICATION_RESOLUTION_APPEAL: ["assessment.rectification_resolution", "AEAT_RECTIFICATION_GZ28"],
  RECTIFYING_RETURN_PERIOD_APPLICABILITY: ["filing.rectifying_self_assessment_receipt", "AEAT_VAT_RECTIFYING_303"],
  REVIEW_EXECUTION_ISSUE: ["review.execution_resolution", "BOE_RD520_ART66"],
  CERTIFICATE_DISAGREEMENT: ["certificate.specialized", "AEAT_CERT_CONTRACTORS_G303"],
  CERTIFICATE_REISSUE: ["certificate.correction_or_disagreement", "AEAT_CERT_CENSUS_G313"],
  CERTIFICATE_GENERAL_VALIDITY: ["certificate.specialized", "AEAT_CERT_GENERAL_FAQ"],
});

function result(input: {
  ruleId: AeatP0DeadlineRuleIdV10;
  state: AeatP0DeadlineStateV10;
  triggerDate: string | null;
  calculatedDate: string | null;
  layers: readonly AeatP0AssertionLayerV10[];
  trace: readonly string[];
  evaluatedAt: string;
  evidenceIds: readonly string[];
  previousState?: AeatP0DeadlineStateV10 | "PENDING";
  priorHistory?: readonly AeatP0DeadlineStateChangeV10[];
  reason: string;
}): AeatP0DeadlineEvaluationV10 {
  instant(input.evaluatedAt, "evaluatedAt");
  const [profileId, sourceId] = RULE_META[input.ruleId];
  const evidenceIds = evidence(input.evidenceIds);
  const stateHistory = Object.freeze([
    ...(input.priorHistory ?? []).map((item) => Object.freeze({ ...item, evidenceIds: Object.freeze([...item.evidenceIds]) })),
    Object.freeze({
      previousState: input.previousState ?? "PENDING",
      newState: input.state,
      ruleVersion: AEAT_P0_DEADLINE_ENGINE_VERSION_V10,
      evidenceIds,
      changedAt: input.evaluatedAt,
      reason: input.reason,
    }),
  ]);
  return Object.freeze({
    schemaVersion: 10,
    engineVersion: AEAT_P0_DEADLINE_ENGINE_VERSION_V10,
    ruleId: input.ruleId,
    profileId,
    state: input.state,
    triggerDate: input.triggerDate,
    calculatedDate: input.calculatedDate,
    source: AEAT_P0_OFFICIAL_SOURCES_V10[sourceId],
    assertionLayers: Object.freeze([...input.layers]),
    deterministicTrace: Object.freeze([...input.trace]),
    stateHistory,
    requiresHumanReview: true,
    autoActionBlocked: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

export function evaluateExtensionRequestV10(input: EvaluateExtensionRequestV10Input): AeatP0DeadlineEvaluationV10 {
  const filing = filingInstant(input.filingDateTime);
  const deadline = date(input.originalDeadline, "originalDeadline");
  const trace = [
    "rule:EXTENSION_ELIGIBILITY@10.0.0",
    `original_deadline:${input.originalDeadline ?? "missing"}`,
  ];
  if (!filing || !deadline || input.motivated === null || input.noThirdPartyPrejudice === null || input.isFirstRequest === null) {
    return result({ ruleId: "EXTENSION_ELIGIBILITY", state: "INFORMATION_PENDING", triggerDate: input.filingDateTime?.slice(0, 10) ?? null, calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: [...trace, "missing:eligibility_prerequisite"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "Faltan datos necesarios para evaluar la ampliación automática." });
  }
  const cutoff = addDays(deadline, -3);
  const timely = filing.getTime() < cutoff.getTime();
  trace.push(`filed_before_final_three_days:${timely}`, `motivated:${input.motivated}`, `no_third_party_prejudice:${input.noThirdPartyPrejudice}`, `first_request:${input.isFirstRequest}`);
  if (!timely || !input.motivated || !input.noThirdPartyPrejudice || !input.isFirstRequest) {
    return result({ ruleId: "EXTENSION_ELIGIBILITY", state: "INELIGIBLE", triggerDate: format(filing), calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED"], trace, evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "La solicitud no reúne todos los requisitos cerrados del artículo 91." });
  }
  if (input.originalTermDays === null || !Number.isSafeInteger(input.originalTermDays) || input.originalTermDays <= 0 || input.originalTermDays % 2 !== 0) {
    return result({ ruleId: "EXTENSION_AUTOMATIC_EFFECT", state: "ELIGIBLE_FOR_AUTOMATIC_HALF_EXTENSION", triggerDate: format(filing), calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: [...trace, "original_term_half:not_safely_calculable"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "La solicitud es elegible, pero falta una duración inicial divisible y verificable para fechar la mitad." });
  }
  const newDeadline = format(addDays(deadline, input.originalTermDays / 2));
  return result({ ruleId: "EXTENSION_AUTOMATIC_EFFECT", state: "AUTO_GRANTED_BY_RULE", triggerDate: format(filing), calculatedDate: newDeadline, layers: ["PRINTED", "CALCULATED_FROM_PRINTED_VALUES", "LEGAL_RULE_APPLIED"], trace: [...trace, `half_term_days:${input.originalTermDays / 2}`, `calculated_deadline:${newDeadline}`, "express_decision:pending_reconciliation"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "Requisitos completos: efecto automático por la mitad, pendiente de reconciliar una decisión expresa en plazo." });
}

export function reconcileExtensionDecisionV10(input: ReconcileExtensionDecisionV10Input): AeatP0DeadlineEvaluationV10 {
  if (!input.previous.ruleId.startsWith("EXTENSION_") || input.previous.profileId !== "procedure.deadline_extension_request") throw new Error("AEAT_P0_DEADLINE_V10_INVALID:previous");
  const notified = input.decisionNotifiedAt ? filingInstant(input.decisionNotifiedAt) : null;
  const originalDeadlineTrace = input.previous.deterministicTrace.find((item) => item.startsWith("original_deadline:"));
  const priorDeadline = input.previous.calculatedDate;
  if (!notified) {
    return result({ ruleId: "EXTENSION_DECISION_EFFECT", state: "INFORMATION_PENDING", triggerDate: null, calculatedDate: priorDeadline, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["decision_notification:missing", `previous_state:${input.previous.state}`], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, previousState: input.previous.state, priorHistory: input.previous.stateHistory, reason: "No consta cuándo se notificó la decisión expresa." });
  }
  const explicitDeadline = date(input.explicitNewDeadline, "explicitNewDeadline");
  if (input.decisionResult !== "DENIED") {
    if (!explicitDeadline) return result({ ruleId: "EXTENSION_DECISION_EFFECT", state: "INFORMATION_PENDING", triggerDate: format(notified), calculatedDate: priorDeadline, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["express_grant:new_deadline_missing", `previous_state:${input.previous.state}`], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, previousState: input.previous.state, priorHistory: input.previous.stateHistory, reason: "La concesión expresa no contiene una nueva fecha verificable." });
    return result({ ruleId: "EXTENSION_DECISION_EFFECT", state: "EXPRESS_GRANTED", triggerDate: format(notified), calculatedDate: format(explicitDeadline), layers: ["PRINTED", "CONFIRMED_BY_LATER_DOCUMENT", "LEGAL_RULE_APPLIED"], trace: ["decision:express_grant", `explicit_deadline:${format(explicitDeadline)}`], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, previousState: input.previous.state, priorHistory: input.previous.stateHistory, reason: "La decisión expresa sustituye el estado automático únicamente para este plazo." });
  }
  const originalDeadlineValue = originalDeadlineTrace?.slice("original_deadline:".length) ?? null;
  const originalDeadline = originalDeadlineValue && ISO_DATE.test(originalDeadlineValue)
    ? date(originalDeadlineValue, "previous.originalDeadline")
    : null;
  if (!originalDeadline) {
    return result({ ruleId: "EXTENSION_DECISION_EFFECT", state: "REVIEW_REQUIRED", triggerDate: format(notified), calculatedDate: priorDeadline, layers: ["PRINTED", "CONFIRMED_BY_LATER_DOCUMENT", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["decision:express_denial", "original_deadline:not_carried", "timeliness:requires_exact_original_deadline"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, previousState: input.previous.state, priorHistory: input.previous.stateHistory, reason: "La denegación requiere comprobar que se notificó antes de terminar el plazo original; no se revierte automáticamente." });
  }
  const timely = notified.getTime() <= addDays(originalDeadline, 1).getTime() - 1;
  return result({ ruleId: "EXTENSION_DECISION_EFFECT", state: timely ? "EXPRESS_DENIED" : "REVIEW_REQUIRED", triggerDate: format(notified), calculatedDate: timely ? null : priorDeadline, layers: ["PRINTED", "CONFIRMED_BY_LATER_DOCUMENT", "LEGAL_RULE_APPLIED", ...(timely ? [] : ["NOT_PROVEN" as const])], trace: ["decision:express_denial", `original_deadline:${format(originalDeadline)}`, `denial_timely:${timely}`], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, previousState: input.previous.state, priorHistory: input.previous.stateHistory, reason: timely ? "La denegación expresa se notificó antes de finalizar el plazo original." : "La denegación llegó fuera del plazo original y no revierte silenciosamente el efecto automático." });
}

export function evaluateAeatP0CalendarDeadlineV10(input: EvaluateCalendarDeadlineV10Input): AeatP0DeadlineEvaluationV10 {
  const trigger = date(input.triggerDate, "triggerDate");
  if (!trigger) return result({ ruleId: input.ruleId, state: "INFORMATION_PENDING", triggerDate: null, calculatedDate: null, layers: ["LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["trigger_date:missing"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "Falta la fecha exacta que inicia esta regla." });
  let calculated: Date | null = null;
  let trace: string[] = [];
  if (input.ruleId === "RECTIFICATION_MAX_RESOLUTION") { calculated = addMonths(trigger, 6); trace = ["duration:6_months", "silence:not_a_grant"]; }
  else if (input.ruleId === "RECTIFICATION_PROPOSAL_ALLEGATIONS") { calculated = addDays(trigger, 15); trace = ["duration:15_days", "anchor:effective_notification"]; }
  else if (input.ruleId === "RECTIFICATION_RESOLUTION_APPEAL") { calculated = addMonths(trigger, 1); trace = ["duration:1_month", "first_instance_routes:alternatives"]; }
  else if (input.ruleId === "REVIEW_EXECUTION_ISSUE") { calculated = addMonths(trigger, 1); trace = ["duration:1_month", "anchor:entry_at_competent_body"]; }
  else if (input.ruleId === "CERTIFICATE_DISAGREEMENT") { calculated = addDays(trigger, 10); trace = ["duration:10_days", "route:certificate_disagreement_not_ordinary_appeal"]; }
  else if (input.ruleId === "CERTIFICATE_REISSUE") { calculated = addDays(trigger, 10); trace = ["duration:10_days", "alternative:reasoned_refusal"]; }
  else {
    if (input.changedCircumstances === true) {
      return result({ ruleId: input.ruleId, state: "REVIEW_REQUIRED", triggerDate: format(trigger), calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["certificate_validity:requires_scope_and_circumstances"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "La validez general no sustituye una regla específica ni prevalece si cambiaron las circunstancias." });
    }
    if (input.specificValidityDate !== null) {
      calculated = date(input.specificValidityDate, "specificValidityDate");
      trace = ["validity:specific_date", "changed_circumstances:not_observed"];
    } else if (input.periodicObligation === null || input.changedCircumstances === null) {
      return result({ ruleId: input.ruleId, state: "REVIEW_REQUIRED", triggerDate: format(trigger), calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["certificate_validity:requires_scope_and_circumstances"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "La validez general requiere conocer el tipo de obligación y comprobar que las circunstancias no han cambiado." });
    } else {
      calculated = addMonths(trigger, input.periodicObligation ? 12 : 3);
      trace = [`duration:${input.periodicObligation ? 12 : 3}_months`, "specific_rule:none", "changed_circumstances:false"];
    }
    if (!calculated) throw new Error("AEAT_P0_DEADLINE_V10_INVALID:certificateValidity");
    const evaluatedDate = instant(input.evaluatedAt, "evaluatedAt");
    const expired = evaluatedDate.getTime() >= addDays(calculated, 1).getTime();
    return result({
      ruleId: input.ruleId,
      state: expired
        ? "CERTIFICATE_EXPIRED_REVIEW_REQUIRED"
        : "CERTIFICATE_WITHIN_GENERAL_VALIDITY_REVIEW_REQUIRED",
      triggerDate: format(trigger),
      calculatedDate: format(calculated),
      layers: ["PRINTED", "CALCULATED_FROM_PRINTED_VALUES", "LEGAL_RULE_APPLIED", ...(expired ? ["NOT_PROVEN" as const] : [])],
      trace: [...trace, `evaluated_date:${format(evaluatedDate)}`, `certificate_expired:${expired}`],
      evaluatedAt: input.evaluatedAt,
      evidenceIds: input.evidenceIds,
      reason: expired
        ? "La fecha de validez ya ha terminado; el certificado no se presenta como estado actual."
        : "La fecha general todavía no ha terminado, pero el alcance y las circunstancias siguen pendientes de revisión.",
    });
  }
  return result({ ruleId: input.ruleId, state: "CALCULATED_REVIEW_REQUIRED", triggerDate: format(trigger), calculatedDate: calculated ? format(calculated) : null, layers: ["PRINTED", "CALCULATED_FROM_PRINTED_VALUES", "LEGAL_RULE_APPLIED"], trace, evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "Fecha calculada de forma determinista desde el disparador impreso o confirmado; permanece pendiente de revisión." });
}

export function evaluateRectifyingReturnRouteV10(input: EvaluateRectifyingRouteV10Input): AeatP0DeadlineEvaluationV10 {
  instant(input.evaluatedAt, "evaluatedAt");
  const complete = input.model !== null && input.fiscalYear !== null && input.taxPeriod !== null && input.rectifyingFlag !== null && input.originalReceiptAvailable !== null && input.reasonCount !== null && input.traditionalRouteException !== null;
  if (!complete) return result({ ruleId: "RECTIFYING_RETURN_PERIOD_APPLICABILITY", state: "INFORMATION_PENDING", triggerDate: null, calculatedDate: null, layers: ["PRINTED", "LEGAL_RULE_APPLIED", "NOT_PROVEN"], trace: ["rectifying_route:missing_prerequisite"], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: "Falta modelo, período, justificante anterior, marca rectificativa, motivo o control de excepciones." });
  if (!Number.isSafeInteger(input.fiscalYear) || input.fiscalYear! < 2000 || input.fiscalYear! > 2200 || !Number.isSafeInteger(input.reasonCount) || input.reasonCount! < 0) throw new Error("AEAT_P0_DEADLINE_V10_INVALID:rectifyingRoute");
  const period = input.taxPeriod!.toUpperCase();
  const monthly = /^(?:0[1-9]|1[0-2])$/u.exec(period);
  const quarterly = /^([1-4])T$/u.exec(period);
  const eligiblePeriod = monthly
    ? input.fiscalYear! > 2024 || (input.fiscalYear === 2024 && Number(monthly[0]) >= 9)
    : quarterly
      ? input.fiscalYear! > 2024 || (input.fiscalYear === 2024 && Number(quarterly[1]) >= 3)
      : false;
  const allowed = input.model === "303" && input.rectifyingFlag === true && input.originalReceiptAvailable === true && input.reasonCount! > 0 && input.traditionalRouteException === false && eligiblePeriod;
  return result({ ruleId: "RECTIFYING_RETURN_PERIOD_APPLICABILITY", state: allowed ? "RECTIFYING_ROUTE_ALLOWED" : "TRADITIONAL_ROUTE_REQUIRED", triggerDate: null, calculatedDate: null, layers: ["PRINTED", "NORMALIZED", "LEGAL_RULE_APPLIED"], trace: [`model:${input.model}`, `period:${input.fiscalYear}-${period}`, `eligible_period:${eligiblePeriod}`, `rectifying_flag:${input.rectifyingFlag}`, `original_receipt:${input.originalReceiptAvailable}`, `reason_count:${input.reasonCount}`, `traditional_exception:${input.traditionalRouteException}`], evaluatedAt: input.evaluatedAt, evidenceIds: input.evidenceIds, reason: allowed ? "La puerta temporal y los campos mínimos del modelo 303 rectificativo están completos." : "El período, los campos o una excepción exigen la vía tradicional; no se fuerza la rectificativa." });
}
