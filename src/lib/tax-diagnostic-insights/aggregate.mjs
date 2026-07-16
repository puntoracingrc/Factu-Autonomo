export const initialProductThresholds = Object.freeze({
  questions: Object.freeze({
    unknownRate: Object.freeze({ rate: 0.25, minimum: 30, signal: "COPY_OR_HELP_REVIEW" }),
    changeRate: Object.freeze({ rate: 0.15, minimum: 30, signal: "QUESTION_OR_BRANCH_REVIEW" }),
    dropoffRate: Object.freeze({ rate: 0.12, minimum: 30, signal: "FRICTION_REVIEW" }),
    prefillCorrectionRate: Object.freeze({ rate: 0.08, minimum: 25, signal: "DOCUMENT_QUESTION_MAPPING_REVIEW" }),
  }),
  models: Object.freeze({
    manualAddRate: Object.freeze({ rate: 0.1, minimum: 30, signal: "POSSIBLE_MISSING_RECOMMENDATION" }),
    manualRemoveRate: Object.freeze({ rate: 0.15, minimum: 30, signal: "POSSIBLE_OVER_RECOMMENDATION" }),
    needsInformationRate: Object.freeze({ rate: 0.35, minimum: 30, signal: "QUESTION_OR_EVIDENCE_REVIEW" }),
  }),
  documents: Object.freeze({
    unrecognizedRate: Object.freeze({ rate: 0.1, minimum: 20, signal: "EXTRACTOR_OR_LAYOUT_REVIEW" }),
    fieldCorrectionRate: Object.freeze({ rate: 0.05, minimum: 50, signal: "EXTRACTOR_FIELD_REVIEW" }),
    fieldRejectionRate: Object.freeze({ rate: 0.03, minimum: 50, signal: "INFERENCE_OR_LABEL_REVIEW" }),
    regressionPoints: 0.1,
  }),
  abandonmentGraceHours: 24,
});

export const TAX_INSIGHTS_ACTION_CODES = Object.freeze([
  "NO_ACTION",
  "COPY_REVIEW",
  "HELP_EXAMPLE_REVIEW",
  "QUESTION_SPLIT",
  "BRANCH_LOGIC_REVIEW",
  "POSSIBLE_OVER_RECOMMENDATION",
  "POSSIBLE_MISSING_RECOMMENDATION",
  "EXTRACTOR_FIELD_REVIEW",
  "NEW_LAYOUT_VARIANT_NEEDED",
  "REGRESSION_TEST_NEEDED",
  "DATA_VOLUME_INSUFFICIENT",
]);

function ratio(numerator, denominator) {
  return { numerator, denominator, rate: denominator > 0 ? numerator / denominator : null };
}

function key(parts) {
  return parts.map((part) => part ?? "UNSPECIFIED").join("|");
}

function entry(map, entryKey, seed) {
  if (!map.has(entryKey)) map.set(entryKey, seed());
  return map.get(entryKey);
}

function eventDate(event) {
  return new Date(event.occurred_at ?? event.occurredAt ?? 0).getTime();
}

function props(event) {
  return event.properties && typeof event.properties === "object" ? event.properties : {};
}

function eventValue(event, snake, camel) {
  return event[snake] ?? event[camel] ?? null;
}

function uniqueSessionCount(events) {
  return new Set(events.map((event) => eventValue(event, "session_id", "sessionId")).filter(Boolean)).size;
}

function signal(scope, subject, metric, value, threshold) {
  return {
    scope,
    subject,
    metric,
    signal: threshold.signal,
    numerator: value.numerator,
    denominator: value.denominator,
    rate: value.rate,
    threshold: threshold.rate,
    minimumVolume: threshold.minimum,
  };
}

function evaluateThreshold(signals, scope, subject, metric, value, threshold) {
  if (
    value.denominator >= threshold.minimum &&
    value.rate !== null &&
    value.rate >= threshold.rate
  ) {
    signals.push(signal(scope, subject, metric, value, threshold));
  }
}

function previousRate(previous, section, subjectKey, metric) {
  const rows = previous?.[section];
  if (!Array.isArray(rows)) return null;
  const row = rows.find((candidate) => candidate.key === subjectKey);
  return row?.[metric]?.rate ?? null;
}

export function aggregateTaxDiagnosticInsights(events, options = {}) {
  const thresholds = options.thresholds ?? initialProductThresholds;
  const generatedAt = new Date(options.generatedAt ?? Date.now()).toISOString();
  const generatedAtMs = new Date(generatedAt).getTime();
  const previous = options.previous ?? null;
  const ordered = [...events].sort((a, b) => eventDate(a) - eventDate(b));
  const byType = new Map();
  for (const event of ordered) {
    const type = eventValue(event, "event_type", "eventType");
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(event);
  }
  const typed = (type) => byType.get(type) ?? [];
  const latestFieldReviewBySession = new Map();
  for (const event of typed("tax_document_field_reviewed")) {
    const fieldReviewKey = key([
      eventValue(event, "session_id", "sessionId"),
      eventValue(event, "document_family", "documentFamily"),
      eventValue(event, "layout_version", "layoutVersion"),
      eventValue(event, "extraction_method", "extractionMethod"),
      props(event).fieldId,
    ]);
    latestFieldReviewBySession.set(fieldReviewKey, event);
  }

  const started = typed("tax_diagnostic_started");
  const completed = typed("tax_diagnostic_completed");
  const generated = typed("tax_evaluation_generated");
  const saved = typed("tax_models_saved");
  const modelsOpened = typed("tax_models_catalog_opened");
  const calendarOpened = typed("tax_calendar_opened");
  const completedSessions = new Set(completed.map((event) => eventValue(event, "session_id", "sessionId")));
  const graceMs = thresholds.abandonmentGraceHours * 60 * 60 * 1000;
  const abandonedSessions = new Set(
    started
      .filter((event) => {
        const sessionId = eventValue(event, "session_id", "sessionId");
        return sessionId && !completedSessions.has(sessionId) && generatedAtMs - eventDate(event) >= graceMs;
      })
      .map((event) => eventValue(event, "session_id", "sessionId")),
  );

  const funnel = {
    started: uniqueSessionCount(started),
    completed: uniqueSessionCount(completed),
    evaluationsGenerated: uniqueSessionCount(generated),
    evaluationsSaved: uniqueSessionCount(saved),
    modelsOpened: uniqueSessionCount(modelsOpened),
    calendarOpened: uniqueSessionCount(calendarOpened),
    abandoned: abandonedSessions.size,
  };
  funnel.completionRate = ratio(funnel.completed, funnel.started);
  funnel.saveRate = ratio(funnel.evaluationsSaved, funnel.completed);
  funnel.calendarOpenRate = ratio(funnel.calendarOpened, funnel.evaluationsSaved);

  const questionMap = new Map();
  const lastQuestionBySession = new Map();
  for (const event of typed("tax_question_viewed")) {
    const questionId = eventValue(event, "question_id", "questionId");
    const sessionId = eventValue(event, "session_id", "sessionId");
    if (!questionId || !sessionId) continue;
    const row = entry(questionMap, questionId, () => ({
      key: questionId,
      questionId,
      group: eventValue(event, "question_group", "questionGroup"),
      riskTag: eventValue(event, "risk_tag", "riskTag"),
      views: new Set(), answers: 0, unknown: 0, changes: 0,
      prefillReviewed: 0, prefillCorrected: 0, dropoffs: 0,
      devices: {}, fiscalYears: {}, engineVersions: {},
    }));
    row.views.add(sessionId);
    const device = eventValue(event, "device_category", "deviceCategory") ?? "UNKNOWN";
    row.devices[device] = (row.devices[device] ?? 0) + 1;
    const year = eventValue(event, "fiscal_year", "fiscalYear");
    if (year) row.fiscalYears[year] = (row.fiscalYears[year] ?? 0) + 1;
    const engineVersion = eventValue(event, "engine_version", "engineVersion");
    if (engineVersion) row.engineVersions[engineVersion] = (row.engineVersions[engineVersion] ?? 0) + 1;
    lastQuestionBySession.set(sessionId, questionId);
  }
  for (const event of typed("tax_question_answered")) {
    const questionId = eventValue(event, "question_id", "questionId");
    if (!questionId) continue;
    const row = entry(questionMap, questionId, () => ({
      key: questionId, questionId, group: eventValue(event, "question_group", "questionGroup"),
      riskTag: eventValue(event, "risk_tag", "riskTag"), views: new Set(), answers: 0,
      unknown: 0, changes: 0, prefillReviewed: 0, prefillCorrected: 0, dropoffs: 0,
      devices: {}, fiscalYears: {}, engineVersions: {},
    }));
    row.answers += 1;
    if (props(event).answerKind === "UNKNOWN") row.unknown += 1;
  }
  for (const event of typed("tax_question_changed")) {
    const questionId = eventValue(event, "question_id", "questionId");
    const row = questionMap.get(questionId);
    if (row) row.changes += 1;
  }
  for (const event of latestFieldReviewBySession.values()) {
    const questionId = eventValue(event, "question_id", "questionId");
    const row = questionMap.get(questionId);
    if (!row || !props(event).answeredQuestion) continue;
    row.prefillReviewed += 1;
    if (["CORRECTED", "REJECTED"].includes(props(event).action)) row.prefillCorrected += 1;
  }
  for (const sessionId of abandonedSessions) {
    const questionId = lastQuestionBySession.get(sessionId);
    const row = questionMap.get(questionId);
    if (row) row.dropoffs += 1;
  }

  const questions = [...questionMap.values()].map((row) => ({
    key: row.key,
    questionId: row.questionId,
    group: row.group,
    riskTag: row.riskTag,
    volume: row.answers,
    views: row.views.size,
    unknownRate: ratio(row.unknown, row.answers),
    changeRate: ratio(row.changes, row.answers),
    estimatedDropoffRate: ratio(row.dropoffs, row.views.size),
    prefillCorrectionRate: ratio(row.prefillCorrected, row.prefillReviewed),
    segments: { devices: row.devices, fiscalYears: row.fiscalYears, engineVersions: row.engineVersions },
  }));

  const modelMap = new Map();
  const modelRow = (modelNumber) => entry(modelMap, modelNumber, () => ({
    key: modelNumber, modelNumber, views: [], adds: [], removes: [], needsInformation: 0,
    reasonOpened: 0, considered: 0, recommendedSessions: new Set(), eligibleAddSessions: new Set(),
  }));
  for (const event of typed("tax_model_recommendation_viewed")) {
    const modelNumber = eventValue(event, "model_number", "modelNumber");
    if (!modelNumber) continue;
    const row = modelRow(modelNumber);
    row.views.push(event);
    row.considered += 1;
    const status = eventValue(event, "recommendation_status", "recommendationStatus");
    const sessionId = eventValue(event, "session_id", "sessionId");
    if (sessionId && status !== "MANUALLY_SELECTED") row.eligibleAddSessions.add(sessionId);
    if (status === "NEEDS_INFORMATION") row.needsInformation += 1;
    if (sessionId && ["LIKELY_REQUIRED", "POSSIBLY_REQUIRED"].includes(status)) row.recommendedSessions.add(sessionId);
    if (props(event).reasonExpanded) row.reasonOpened += 1;
  }
  for (const event of typed("tax_model_manual_added")) {
    const modelNumber = eventValue(event, "model_number", "modelNumber");
    if (modelNumber) modelRow(modelNumber).adds.push(event);
  }
  for (const event of typed("tax_model_manual_removed")) {
    const modelNumber = eventValue(event, "model_number", "modelNumber");
    if (modelNumber) modelRow(modelNumber).removes.push(event);
  }
  const models = [...modelMap.values()].map((row) => ({
    key: row.key,
    modelNumber: row.modelNumber,
    volume: row.considered,
    manualAddRate: ratio(uniqueSessionCount(row.adds), row.eligibleAddSessions.size),
    manualRemoveRate: ratio(uniqueSessionCount(row.removes), row.recommendedSessions.size),
    reasonOpenRate: ratio(row.reasonOpened, row.views.length),
    needsInformationRate: ratio(row.needsInformation, row.considered),
  }));

  const documentMap = new Map();
  const documentRow = (event) => {
    const family = eventValue(event, "document_family", "documentFamily") ?? "UNSPECIFIED";
    const layout = eventValue(event, "layout_version", "layoutVersion") ?? "UNSPECIFIED";
    const method = eventValue(event, "extraction_method", "extractionMethod") ?? "UNSPECIFIED";
    const documentKey = key([family, layout, method]);
    return entry(documentMap, documentKey, () => ({
      key: documentKey, family, layoutVersion: layout, extractionMethod: method,
      scans: 0, recognized: 0, ambiguous: 0, unrecognized: 0, failures: 0,
      fieldsReviewed: 0, fieldsConfirmed: 0, fieldsCorrected: 0, fieldsRejected: 0,
      confirmedQuestionPrefills: 0, confirmedFacts: 0,
    }));
  };
  for (const event of typed("tax_document_classified")) {
    const row = documentRow(event);
    row.scans += 1;
    const result = props(event).classificationResult;
    if (result === "RECOGNIZED") row.recognized += 1;
    if (result === "AMBIGUOUS") row.ambiguous += 1;
    if (result === "UNRECOGNIZED") row.unrecognized += 1;
  }
  for (const event of typed("tax_document_scan_failed")) {
    const row = documentRow(event);
    row.scans += 1;
    row.failures += 1;
  }
  for (const event of latestFieldReviewBySession.values()) {
    const row = documentRow(event);
    row.fieldsReviewed += 1;
    const action = props(event).action;
    if (action === "CONFIRMED") row.fieldsConfirmed += 1;
    if (action === "CONFIRMED") {
      row.confirmedFacts += 1;
      if (props(event).answeredQuestion) row.confirmedQuestionPrefills += 1;
    }
    if (action === "CORRECTED") row.fieldsCorrected += 1;
    if (action === "REJECTED") row.fieldsRejected += 1;
  }
  const documents = [...documentMap.values()].map((row) => ({
    key: row.key,
    family: row.family,
    layoutVersion: row.layoutVersion,
    extractionMethod: row.extractionMethod,
    volume: row.scans,
    recognitionRate: ratio(row.recognized, row.scans),
    ambiguousRate: ratio(row.ambiguous, row.scans),
    unrecognizedRate: ratio(row.unrecognized, row.scans),
    scanFailureRate: ratio(row.failures, row.scans),
    fieldConfirmationRate: ratio(row.fieldsConfirmed, row.fieldsReviewed),
    fieldCorrectionRate: ratio(row.fieldsCorrected, row.fieldsReviewed),
    fieldRejectionRate: ratio(row.fieldsRejected, row.fieldsReviewed),
    documentQuestionReduction: ratio(row.confirmedQuestionPrefills, row.scans),
    documentConfirmedFactYield: ratio(row.confirmedFacts, row.scans),
  }));

  const signals = [];
  for (const row of questions) {
    evaluateThreshold(signals, "QUESTION", row.questionId, "unknownRate", row.unknownRate, thresholds.questions.unknownRate);
    evaluateThreshold(signals, "QUESTION", row.questionId, "changeRate", row.changeRate, thresholds.questions.changeRate);
    evaluateThreshold(signals, "QUESTION", row.questionId, "estimatedDropoffRate", row.estimatedDropoffRate, thresholds.questions.dropoffRate);
    evaluateThreshold(signals, "QUESTION", row.questionId, "prefillCorrectionRate", row.prefillCorrectionRate, thresholds.questions.prefillCorrectionRate);
  }
  for (const row of models) {
    evaluateThreshold(signals, "MODEL", row.modelNumber, "manualAddRate", row.manualAddRate, thresholds.models.manualAddRate);
    evaluateThreshold(signals, "MODEL", row.modelNumber, "manualRemoveRate", row.manualRemoveRate, thresholds.models.manualRemoveRate);
    evaluateThreshold(signals, "MODEL", row.modelNumber, "needsInformationRate", row.needsInformationRate, thresholds.models.needsInformationRate);
  }
  const regressions = [];
  for (const row of documents) {
    evaluateThreshold(signals, "DOCUMENT", row.key, "unrecognizedRate", row.unrecognizedRate, thresholds.documents.unrecognizedRate);
    evaluateThreshold(signals, "DOCUMENT", row.key, "fieldCorrectionRate", row.fieldCorrectionRate, thresholds.documents.fieldCorrectionRate);
    evaluateThreshold(signals, "DOCUMENT", row.key, "fieldRejectionRate", row.fieldRejectionRate, thresholds.documents.fieldRejectionRate);
    for (const metric of ["recognitionRate", "fieldConfirmationRate"]) {
      const prior = previousRate(previous, "documents", row.key, metric);
      if (prior !== null && row[metric].rate !== null && prior - row[metric].rate >= thresholds.documents.regressionPoints) {
        regressions.push({ scope: "DOCUMENT", subject: row.key, metric, previousRate: prior, currentRate: row[metric].rate, delta: row[metric].rate - prior, action: "REGRESSION_TEST_NEEDED" });
      }
    }
  }

  const versions = {};
  for (const event of ordered) {
    const versionKey = key([
      eventValue(event, "engine_version", "engineVersion"),
      eventValue(event, "ruleset_version", "rulesetVersion"),
      eventValue(event, "fiscal_year", "fiscalYear"),
    ]);
    versions[versionKey] = (versions[versionKey] ?? 0) + 1;
  }
  const recommendations = signals.length === 0
    ? [events.length === 0 ? "DATA_VOLUME_INSUFFICIENT" : "NO_ACTION"]
    : [...new Set(signals.map((item) => {
        if (item.signal === "POSSIBLE_OVER_RECOMMENDATION" || item.signal === "POSSIBLE_MISSING_RECOMMENDATION") return item.signal;
        if (item.scope === "DOCUMENT") return "EXTRACTOR_FIELD_REVIEW";
        if (item.metric === "unknownRate") return "COPY_REVIEW";
        return "BRANCH_LOGIC_REVIEW";
      }))];

  return {
    schemaVersion: "1.0.0",
    generatedAt,
    period: options.period ?? null,
    retentionDays: options.retentionDays ?? 90,
    eventVolume: events.length,
    funnel,
    questions: questions.sort((a, b) => (b.unknownRate.rate ?? -1) - (a.unknownRate.rate ?? -1)),
    models: models.sort((a, b) => (b.manualRemoveRate.rate ?? -1) - (a.manualRemoveRate.rate ?? -1)),
    documents: documents.sort((a, b) => (b.fieldCorrectionRate.rate ?? -1) - (a.fieldCorrectionRate.rate ?? -1)),
    versions,
    signals,
    regressions,
    recommendations,
    safeguards: {
      changesRulesAutomatically: false,
      approvesFiscalRules: false,
      authorizedFiscalExclusion: false,
      allModelsViewRequired: true,
    },
  };
}

export function renderTaxDiagnosticInsightsMarkdown(report) {
  const percent = (value) => value?.rate === null || value?.rate === undefined
    ? `— (${value?.numerator ?? 0}/${value?.denominator ?? 0})`
    : `${(value.rate * 100).toFixed(1)}% (${value.numerator}/${value.denominator})`;
  const lines = [
    "# Informe semanal del diagnóstico fiscal orientativo",
    "",
    `Generado: ${report.generatedAt}`,
    `Periodo: ${report.period?.from ?? "sin datos"} → ${report.period?.to ?? "sin datos"}`,
    "",
    "## Embudo",
    "",
    `- Iniciados: ${report.funnel.started}`,
    `- Completados: ${report.funnel.completed}; tasa ${percent(report.funnel.completionRate)}`,
    `- Evaluaciones generadas: ${report.funnel.evaluationsGenerated}`,
    `- Evaluaciones guardadas: ${report.funnel.evaluationsSaved}; tasa ${percent(report.funnel.saveRate)}`,
    `- Aperturas de Modelos: ${report.funnel.modelsOpened}`,
    `- Aperturas de Calendario: ${report.funnel.calendarOpened}; tasa ${percent(report.funnel.calendarOpenRate)}`,
    "",
    "## Mayores fricciones",
    "",
    ...report.questions.slice(0, 5).map((row) => `- Pregunta ${row.questionId}: UNKNOWN ${percent(row.unknownRate)}, cambios ${percent(row.changeRate)}`),
    ...report.models.slice(0, 5).map((row) => `- Modelo ${row.modelNumber}: añadido ${percent(row.manualAddRate)}, retirado ${percent(row.manualRemoveRate)}`),
    ...report.documents.slice(0, 5).map((row) => `- Documento ${row.key}: corrección ${percent(row.fieldCorrectionRate)}, no reconocido ${percent(row.unrecognizedRate)}`),
    "",
    "## Señales y regresiones",
    "",
    ...(report.signals.length ? report.signals.map((item) => `- ${item.signal}: ${item.scope} ${item.subject}, ${item.metric} ${(item.rate * 100).toFixed(1)}% (${item.numerator}/${item.denominator})`) : ["- Sin señales con volumen suficiente."]),
    ...report.regressions.map((item) => `- REGRESSION_TEST_NEEDED: ${item.subject} ${item.metric}, ${(item.delta * 100).toFixed(1)} puntos`),
    "",
    `Acciones: ${report.recommendations.join(", ")}`,
    "",
    "> Estas señales son de producto, no una aprobación fiscal ni una modificación automática de reglas.",
  ];
  return `${lines.join("\n")}\n`;
}
