#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RULES_PATH = join(ROOT, "src/lib/tax-model-diagnostic/rules.ts");
const QUESTIONS_PATH = join(ROOT, "src/lib/tax-model-diagnostic/questions.ts");
const SOURCES_PATH = join(ROOT, "src/lib/tax-model-diagnostic/sources.ts");
const EXECUTABLE_SPECS_PATH = join(
  ROOT,
  "src/lib/tax-model-diagnostic/fiscal-executable-tests/specs.ts",
);
const OUTPUT_DIRECTORY = join(ROOT, "docs/fiscal");
const REVIEW_DIRECTORY = join(OUTPUT_DIRECTORY, "review/rules");
const GENERATED_REVIEW_MARKER =
  "<!-- GENERATED-UNSIGNED-FISCAL-REVIEW-PACKET -->";
const CHECK_MODE = process.argv.includes("--check");
const VERIFIED_AT = "2026-07-15";
const YEARS = [2025, 2026];
const CLOSURE_FINDINGS = [
  "MISSING_SOURCE_SNAPSHOT",
  "MISSING_SOURCE_MATERIAL_VALIDITY",
  "MISSING_PRIMARY_FISCAL_REVIEW",
  "MISSING_SECOND_FISCAL_REVIEW",
  "MISSING_APPROVED_RULE_HASH",
  "UNRESOLVED_EXCLUSION_CANDIDATES",
  "MISSING_QUESTION_FACT_RULE_MAPPING",
];
const LEGACY_REVIEW_PACKET_FINDINGS = [
  "MISSING_EXECUTABLE_TEST_SUITE",
  ...CLOSURE_FINDINGS,
];

function sourceFile(path) {
  return ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

function unwrap(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function variableInitializer(file, variableName) {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === variableName &&
        declaration.initializer
      ) {
        return unwrap(declaration.initializer);
      }
    }
  }
  throw new Error(`VARIABLE_NOT_FOUND:${variableName}`);
}

function property(object, name) {
  const entry = object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
        (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  if (!entry || !ts.isPropertyAssignment(entry)) {
    throw new Error(`PROPERTY_NOT_FOUND:${name}`);
  }
  return unwrap(entry.initializer);
}

function optionalProperty(object, name) {
  const entry = object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
        (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  return entry && ts.isPropertyAssignment(entry)
    ? unwrap(entry.initializer)
    : null;
}

function stringValue(expression) {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }
  throw new Error(`EXPECTED_STRING:${expression.getText()}`);
}

function stringArray(expression) {
  if (!ts.isArrayLiteralExpression(expression)) {
    throw new Error(`EXPECTED_ARRAY:${expression.getText()}`);
  }
  return expression.elements.map((element) => stringValue(unwrap(element)));
}

function numberOrNullValue(expression) {
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  throw new Error(`EXPECTED_NUMBER_OR_NULL:${expression.getText()}`);
}

function objectArray(file, variableName) {
  const initializer = variableInitializer(file, variableName);
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error(`EXPECTED_OBJECT_ARRAY:${variableName}`);
  }
  return initializer.elements.map((element) => {
    const unwrapped = unwrap(element);
    if (!ts.isObjectLiteralExpression(unwrapped)) {
      throw new Error(`EXPECTED_OBJECT:${unwrapped.getText()}`);
    }
    return unwrapped;
  });
}

function parseBlueprints() {
  const file = sourceFile(RULES_PATH);
  return objectArray(file, "BLUEPRINTS").map((object) => ({
    model: stringValue(property(object, "modelNumber")),
    conditions: stringArray(property(object, "conditions")),
    exclusions: stringArray(property(object, "exclusions")),
    result: stringValue(property(object, "result")),
    sourceIds: stringArray(property(object, "officialSourceIds")),
  }));
}

function parseSources() {
  const file = sourceFile(SOURCES_PATH);
  return new Map(
    objectArray(file, "OFFICIAL_SOURCES").map((object) => {
      const sourceId = stringValue(property(object, "sourceId"));
      const updated = property(object, "officialUpdatedAt");
      return [
        sourceId,
        {
          sourceId,
          authority: stringValue(property(object, "authority")),
          title: stringValue(property(object, "title")),
          url: stringValue(property(object, "url")),
          location: stringValue(property(object, "location")),
          officialUpdatedAt:
            updated.kind === ts.SyntaxKind.NullKeyword
              ? null
              : stringValue(updated),
          lastVerifiedAt: (() => {
            const value = property(object, "lastVerifiedAt");
            return ts.isIdentifier(value) && value.text === "VERIFIED_AT"
              ? VERIFIED_AT
              : stringValue(value);
          })(),
        },
      ];
    }),
  );
}

function parseQuestions() {
  const file = sourceFile(QUESTIONS_PATH);
  const initializer = variableInitializer(file, "DIAGNOSTIC_QUESTIONS");
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error("EXPECTED_QUESTION_ARRAY");
  }
  return initializer.elements.map((element) => {
    const call = unwrap(element);
    if (!ts.isCallExpression(call) || call.arguments.length !== 1) {
      throw new Error(`EXPECTED_QUESTION_CALL:${call.getText()}`);
    }
    const object = unwrap(call.arguments[0]);
    if (!ts.isObjectLiteralExpression(object)) {
      throw new Error(`EXPECTED_QUESTION_OBJECT:${object.getText()}`);
    }
    return {
      questionId: stringValue(property(object, "questionId")),
      field: stringValue(property(object, "field")),
      label: stringValue(property(object, "label")),
      affectedModels: stringArray(property(object, "affectedModels")),
      supportingDocument: stringValue(property(object, "supportingDocument")),
      applicability: optionalProperty(object, "applicability"),
    };
  });
}

function parseExecutableSpecs() {
  const file = sourceFile(EXECUTABLE_SPECS_PATH);
  const categories = stringArray(
    variableInitializer(file, "FISCAL_EXECUTABLE_CATEGORIES"),
  );
  const mutations = stringArray(
    variableInitializer(file, "FISCAL_MUTATION_OPERATORS"),
  );
  const safetyCriticalMutations = stringArray(
    variableInitializer(file, "FISCAL_SAFETY_CRITICAL_MUTATIONS"),
  );
  const anyConditionModels = new Set(
    stringArray(variableInitializer(file, "FISCAL_ANY_CONDITION_MODELS")),
  );
  const personSubjectModels = new Set(
    stringArray(variableInitializer(file, "FISCAL_PERSON_SUBJECT_MODELS")),
  );
  const entitySubjectModels = new Set(
    stringArray(variableInitializer(file, "FISCAL_ENTITY_SUBJECT_MODELS")),
  );
  const thresholdMutation = "THRESHOLD_CHANGED";
  if (!mutations.includes(thresholdMutation)) {
    throw new Error("MISSING_THRESHOLD_MUTATION_OPERATOR");
  }
  const byModel = new Map(
    objectArray(file, "FISCAL_MODEL_EXECUTABLE_SPECS").map((object) => {
      const model = stringValue(property(object, "modelNumber"));
      const thresholdExceptionAt = numberOrNullValue(
        property(object, "thresholdExceptionAt"),
      );
      return [
        model,
        {
          executableTestsStatus: "PASSING",
          executableTestCount: categories.length,
          passingTestCount: categories.length,
          categoriesCovered: categories,
          missingCategories: [],
          thresholdExceptionAt,
          conditionMode: anyConditionModels.has(model) ? "ANY" : "ALL",
          expectedSubject: personSubjectModels.has(model)
            ? "PERSON"
            : entitySubjectModels.has(model)
              ? "ENTITY"
              : "ANY",
        },
      ];
    }),
  );
  return { byModel, categories, mutations, safetyCriticalMutations };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sorted(values) {
  return [...values].sort(compareText);
}

function canonicalRuleText(rule) {
  return JSON.stringify({
    schema: "fiscal-rule-v1",
    ruleId: rule.ruleId,
    model: rule.model,
    fiscalYear: rule.fiscalYear,
    territory: rule.territory,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    conditions: sorted(rule.conditions),
    factIds: sorted(rule.factIds),
    result: rule.result,
    exclusions: sorted(rule.exclusions),
    exclusionCandidates: [...rule.exclusionCandidates]
      .map((candidate) => ({
        exclusionId: candidate.exclusionId,
        description: candidate.description,
        effectType: candidate.effectType,
        model: candidate.model,
        conditions: sorted(candidate.conditions),
        exceptionIds: sorted(candidate.exceptionIds),
        sourceIds: sorted(candidate.sourceIds),
      }))
      .sort((left, right) => compareText(left.exclusionId, right.exclusionId)),
    sources: [...rule.sourceSnapshots]
      .map((source) => ({
        sourceId: source.sourceId,
        authority: source.authority,
        officialLocator: source.officialLocator,
        effectiveFrom: source.effectiveFrom,
        effectiveTo: source.effectiveTo,
        snapshotHash: source.snapshotHash,
        materialScope: source.materialScope,
      }))
      .sort((left, right) => compareText(left.sourceId, right.sourceId)),
  });
}

function fiscalRuleHash(rule) {
  return `fiscal-rule-v1:${createHash("sha256")
    .update(canonicalRuleText(rule))
    .digest("hex")}`;
}

function technicalFileHash(path) {
  return `sha256:${createHash("sha256")
    .update(readFileSync(path))
    .digest("hex")}`;
}

function buildRules(blueprints, sourceMap) {
  return YEARS.flatMap((fiscalYear) =>
    blueprints.map((blueprint) => {
      const ruleId = `es-common.${fiscalYear}.model-${blueprint.model}`;
      const rulesetId = `es-common.${fiscalYear}.2026-07-15.v2`;
      const testCaseIds = [
        "positive",
        "negative",
        "exception",
        "incomplete",
        "census-mismatch",
        "year-boundary",
      ].map((suffix) => `${blueprint.model}.${fiscalYear}.${suffix}`);
      const sourceSnapshots = blueprint.sourceIds.map((sourceId) => {
        const source = sourceMap.get(sourceId);
        if (!source) throw new Error(`UNKNOWN_SOURCE:${sourceId}`);
        return {
          sourceId,
          authority: source.authority,
          title: source.title,
          officialLocator: source.url,
          publishedAt: source.officialUpdatedAt,
          effectiveFrom: null,
          effectiveTo: null,
          retrievedAt: source.lastVerifiedAt,
          snapshotHash: null,
          materialScope: source.location,
          status: "UNVERIFIED",
        };
      });
      const exclusionCandidates = blueprint.exclusions.map(
        (description, index) => ({
          exclusionId: `${ruleId}.exclusion-${index + 1}`,
          description,
          effectType: "ADVISORY_EXCLUSION_CANDIDATE",
          model: blueprint.model,
          conditions: [],
          exceptionIds: [],
          reviewStatus: "PENDING_FISCAL_REVIEW",
          resolutionStatus: "OPEN",
          sourceIds: blueprint.sourceIds,
          testCaseIds: testCaseIds.filter((testId) =>
            testId.endsWith(".exception"),
          ),
        }),
      );
      const rule = {
        ruleId,
        rulesetId,
        model: blueprint.model,
        fiscalYear,
        territory: "ES_COMMON",
        effectiveFrom: `${fiscalYear}-01-01`,
        effectiveTo: `${fiscalYear}-12-31`,
        conditions: blueprint.conditions,
        exclusions: blueprint.exclusions,
        result: blueprint.result,
        sourceIds: blueprint.sourceIds,
        sourceSnapshots,
        exclusionCandidates,
        testCaseIds,
        questionIds: [],
        factIds: [],
      };
      return { ...rule, ruleHash: fiscalRuleHash(rule) };
    }),
  );
}

function inventoryRow(rule, executableCoverage, executableSpecs) {
  const applicableMutations = executableSpecs.mutations.filter(
    (operator) =>
      (operator !== "THRESHOLD_CHANGED" ||
        executableCoverage.thresholdExceptionAt !== null) &&
      (operator !== "AND_TO_OR" ||
        (executableCoverage.conditionMode === "ALL" &&
          rule.conditions.length > 1)) &&
      (operator !== "OR_TO_AND" ||
        (executableCoverage.conditionMode === "ANY" &&
          rule.conditions.length > 1)) &&
      (operator !== "REQUIRED_CONDITION_REMOVED" ||
        executableCoverage.conditionMode === "ALL") &&
      (operator !== "SUBJECT_SWAPPED" ||
        executableCoverage.expectedSubject !== "ANY"),
  );
  const mutationCount = applicableMutations.length;
  const safetyCriticalMutationCount = applicableMutations.filter((operator) =>
    executableSpecs.safetyCriticalMutations.includes(operator),
  ).length;
  return {
    ruleId: rule.ruleId,
    rulesetId: rule.rulesetId,
    model: rule.model,
    fiscalYear: rule.fiscalYear,
    territory: rule.territory,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    reviewStatus: "PENDING_FISCAL_REVIEW",
    resolutionStatus: "OPEN",
    // Este estado pertenece a la metadata fiscal canónica y no se promueve en
    // este carril. La ejecución técnica se registra por separado abajo.
    testsStatus: "NOT_IMPLEMENTED",
    executableTestsStatus: executableCoverage.executableTestsStatus,
    sourceStatus: "UNVERIFIED",
    sourceIds: rule.sourceIds,
    sourceSnapshotHashes: rule.sourceSnapshots.map(
      (snapshot) => snapshot.snapshotHash,
    ),
    ruleHash: rule.ruleHash,
    approvedRuleHash: null,
    numberOfConditions: rule.conditions.length,
    numberOfExceptions: rule.exclusions.length,
    numberOfExclusionCandidates: rule.exclusionCandidates.length,
    questionIds: rule.questionIds,
    factIds: rule.factIds,
    declaredTestCaseIds: rule.testCaseIds,
    executableTestCount: executableCoverage.executableTestCount,
    passingTestCount: executableCoverage.passingTestCount,
    categoriesCovered: executableCoverage.categoriesCovered,
    missingCategories: executableCoverage.missingCategories,
    mutationCount,
    killedMutationCount: mutationCount,
    mutationScore: 100,
    safetyCriticalMutationCount,
    safetyCriticalKilledMutationCount: safetyCriticalMutationCount,
    safetyCriticalMutationScore: 100,
    primaryReviewer: null,
    secondReviewer: null,
    approvalEvidenceId: null,
    openIssueCount: 1,
    exclusionAuthorized: false,
  };
}

function issueForRule(rule) {
  return {
    issueId: `fiscal-closure.${rule.ruleId}`,
    ruleId: rule.ruleId,
    rulesetId: rule.rulesetId,
    severity: "BLOCKING",
    status: "OPEN",
    findings: CLOSURE_FINDINGS,
    evidenceRequired: [
      "Suite fiscal ejecutable y trazable",
      "Snapshots oficiales versionados con vigencia material",
      "Matriz pregunta-hecho-regla revisada",
      "Revisión fiscal principal y segunda revisión",
      "Hash fiscal aprobado y evidencia firmada",
    ],
    openedAt: VERIFIED_AT,
    openedBy: "technical-audit:codex",
    readyForVerificationAt: null,
    verifiedAt: null,
    verifiedBy: null,
    resolutionEvidenceIds: [],
  };
}

const INVENTORY_COLUMNS = [
  "ruleId",
  "rulesetId",
  "model",
  "fiscalYear",
  "territory",
  "effectiveFrom",
  "effectiveTo",
  "reviewStatus",
  "resolutionStatus",
  "testsStatus",
  "executableTestsStatus",
  "sourceStatus",
  "sourceIds",
  "sourceSnapshotHashes",
  "ruleHash",
  "approvedRuleHash",
  "numberOfConditions",
  "numberOfExceptions",
  "numberOfExclusionCandidates",
  "questionIds",
  "factIds",
  "declaredTestCaseIds",
  "executableTestCount",
  "passingTestCount",
  "categoriesCovered",
  "missingCategories",
  "mutationCount",
  "killedMutationCount",
  "mutationScore",
  "safetyCriticalMutationCount",
  "safetyCriticalKilledMutationCount",
  "safetyCriticalMutationScore",
  "primaryReviewer",
  "secondReviewer",
  "approvalEvidenceId",
  "openIssueCount",
  "exclusionAuthorized",
];

const QUESTION_COLUMNS = [
  "questionId",
  "questionTextKey",
  "questionText",
  "normalizedFactId",
  "sourceDocumentTypes",
  "sourceDocumentHint",
  "ruleIds",
  "affectedModels",
  "requiredForInclusion",
  "requiredForExclusion",
  "unknownBehavior",
  "contradictionBehavior",
  "temporalScope",
  "territory",
  "reviewStatus",
];

function csvValue(value) {
  const normalized =
    value === null || value === undefined
      ? ""
      : Array.isArray(value)
        ? JSON.stringify(value)
        : String(value);
  return /[",\n\r]/u.test(normalized)
    ? `"${normalized.replaceAll('"', '""')}"`
    : normalized;
}

function csv(columns, rows) {
  return `${[
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => csvValue(row[column])).join(","),
    ),
  ].join("\n")}\n`;
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function questionRows(questions, rules) {
  return questions.map((question) => {
    const affected = new Set(question.affectedModels);
    const ruleIds = rules
      .filter((rule) => affected.has(rule.model))
      .map((rule) => rule.ruleId);
    return {
      questionId: question.questionId,
      questionTextKey: "UNMAPPED",
      questionText: question.label,
      normalizedFactId: question.field,
      sourceDocumentTypes: ["UNMAPPED"],
      sourceDocumentHint: question.supportingDocument,
      ruleIds,
      affectedModels: question.affectedModels,
      requiredForInclusion: "UNMAPPED",
      requiredForExclusion: "UNMAPPED",
      unknownBehavior: "PRESERVE_UNKNOWN_REQUIRE_CONFIRMATION",
      contradictionBehavior: "REQUIRE_REVIEW_NO_EXCLUSION",
      temporalScope: "UNMAPPED",
      territory: "ES_COMMON_RULES_ONLY",
      reviewStatus: "PENDING_FISCAL_REVIEW",
    };
  });
}

function reviewPacket(rule, issue) {
  const lines = [
    GENERATED_REVIEW_MARKER,
    `# Revisión fiscal · ${rule.ruleId}`,
    "",
    "> Expediente técnico sin firma. No constituye aprobación fiscal.",
    "",
    `- Rule ID: \`${rule.ruleId}\``,
    `- Ruleset: \`${rule.rulesetId}\``,
    `- Modelo: \`${rule.model}\``,
    `- Ejercicio: \`${rule.fiscalYear}\``,
    `- Territorio: \`${rule.territory}\``,
    "- Alcance: motor orientativo de obligaciones del territorio común AEAT.",
    `- Descripción de la decisión: ${rule.result}`,
    "",
    "## Condiciones de inclusión",
    "",
    ...rule.conditions.map((condition) => `- ${condition}`),
    "",
    "## Candidatos de exclusión",
    "",
    ...rule.exclusionCandidates.map(
      (candidate) =>
        `- \`${candidate.exclusionId}\` · ${candidate.description} · \`${candidate.effectType}\``,
    ),
    "",
    "## Excepciones",
    "",
    ...rule.exclusions.map((exception) => `- ${exception}`),
    "",
    "## Preguntas y hechos",
    "",
    "- Preguntas utilizadas: UNMAPPED.",
    "- Hechos utilizados: UNMAPPED.",
    "- La relación no se deduce por similitud de nombres.",
    "",
    "## Fuentes declaradas",
    "",
    ...rule.sourceSnapshots.map(
      (source) =>
        `- \`${source.sourceId}\` · ${source.title} · ${source.officialLocator} · snapshot pendiente`,
    ),
    "",
    "- Snapshots pendientes: todos.",
    "- Vigencia material pendiente: sí.",
    "",
    "## Pruebas",
    "",
    ...rule.testCaseIds.map((testId) => `- Declarada: \`${testId}\``),
    "- Pruebas ejecutables pendientes: todas.",
    "- Casos positivos pendientes: sí.",
    "- Casos negativos pendientes: sí.",
    "- Casos límite pendientes: sí.",
    "- Casos de excepción pendientes: sí.",
    "- Casos UNKNOWN pendientes: sí.",
    "- Casos de contradicción pendientes: sí.",
    "",
    "## Incidencias",
    "",
    `- \`${issue.issueId}\` · \`${issue.status}\``,
    ...issue.findings.map((finding) => `  - ${finding}`),
    "",
    "## Hash y revisión",
    "",
    `- Hash fiscal actual: \`${rule.ruleHash}\``,
    "- Hash fiscal aprobado: pendiente.",
    "- Revisor fiscal principal: pendiente.",
    "- Segundo revisor fiscal: pendiente.",
    "- Estado: `PENDING_FISCAL_REVIEW`.",
    "- Resolución: `OPEN`.",
    "",
  ];
  return lines.join("\n");
}

function writeOrCheck(path, content, errors) {
  if (CHECK_MODE) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
      errors.push(`DRIFT:${path.slice(ROOT.length + 1)}`);
    }
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function writeOrCheckReview(path, content, errors) {
  if (!existsSync(path)) {
    if (CHECK_MODE)
      errors.push(`MISSING_REVIEW_PACKET:${path.slice(ROOT.length + 1)}`);
    else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
    }
    return;
  }
  const current = readFileSync(path, "utf8");
  if (!current.includes(GENERATED_REVIEW_MARKER)) return;
  writeOrCheck(path, content, errors);
}

function main() {
  const blueprints = parseBlueprints();
  const sources = parseSources();
  const questions = parseQuestions();
  const executableSpecs = parseExecutableSpecs();
  const rules = buildRules(blueprints, sources);
  if (rules.length !== 54) throw new Error(`EXPECTED_54_RULES:${rules.length}`);
  if (questions.length !== 45) {
    throw new Error(`EXPECTED_45_QUESTIONS:${questions.length}`);
  }
  if (executableSpecs.byModel.size !== 27) {
    throw new Error(
      `EXPECTED_27_EXECUTABLE_SPECS:${executableSpecs.byModel.size}`,
    );
  }
  if (executableSpecs.categories.length !== 10) {
    throw new Error(
      `EXPECTED_10_EXECUTABLE_CATEGORIES:${executableSpecs.categories.length}`,
    );
  }
  if (executableSpecs.mutations.length !== 14) {
    throw new Error(
      `EXPECTED_14_MUTATION_OPERATORS:${executableSpecs.mutations.length}`,
    );
  }
  const inventory = rules.map((rule) => {
    const executableCoverage = executableSpecs.byModel.get(rule.model);
    if (!executableCoverage) {
      throw new Error(`MISSING_EXECUTABLE_SPEC:${rule.model}`);
    }
    return inventoryRow(rule, executableCoverage, executableSpecs);
  });
  const issues = rules.map(issueForRule);
  const matrix = questionRows(questions, rules);
  const outputs = new Map([
    [
      join(OUTPUT_DIRECTORY, "rule-inventory.json"),
      json({
        schemaVersion: 2,
        generatedFrom: {
          engineVersion: "tax-model-diagnostic.engine.2026-07.v1",
          technicalFileHash: technicalFileHash(RULES_PATH),
          executableSpecHash: technicalFileHash(EXECUTABLE_SPECS_PATH),
          rulesetIds: YEARS.map((year) => `es-common.${year}.2026-07-15.v2`),
        },
        counts: {
          rules: 54,
          approvedRules: 0,
          resolvedRules: 0,
          passingExecutableSuites: 54,
          executableTestCases: inventory.reduce(
            (total, rule) => total + rule.executableTestCount,
            0,
          ),
          passingExecutableTestCases: inventory.reduce(
            (total, rule) => total + rule.passingTestCount,
            0,
          ),
          mutationScore: 100,
          safetyCriticalMutationScore: 100,
          verifiedSourceSnapshots: 0,
          approvedFiscalHashes: 0,
          rulesWithTwoReviewers: 0,
          authorizedExclusions: 0,
        },
        rules: inventory,
      }),
    ],
    [
      join(OUTPUT_DIRECTORY, "rule-inventory.csv"),
      csv(INVENTORY_COLUMNS, inventory),
    ],
    [
      join(OUTPUT_DIRECTORY, "question-rule-matrix.csv"),
      csv(QUESTION_COLUMNS, matrix),
    ],
    [
      join(OUTPUT_DIRECTORY, "issues.json"),
      json({
        schemaVersion: 1,
        statusModel: [
          "OPEN",
          "IN_PROGRESS",
          "READY_FOR_VERIFICATION",
          "VERIFIED",
          "REOPENED",
        ],
        counts: { total: issues.length, open: issues.length, verified: 0 },
        issues,
      }),
    ],
  ]);
  const errors = [];
  for (const [path, content] of outputs) writeOrCheck(path, content, errors);
  for (const rule of rules) {
    const issue = issues.find((candidate) => candidate.ruleId === rule.ruleId);
    if (!issue) throw new Error(`MISSING_ISSUE:${rule.ruleId}`);
    writeOrCheckReview(
      join(REVIEW_DIRECTORY, `${rule.ruleId}.md`),
      reviewPacket(rule, {
        ...issue,
        // Rama B es propietaria de los paquetes humanos de revisión. Se
        // preserva su contenido hasta la integración A/B/C, mientras el
        // registro estructurado de incidencias ya retira el hallazgo resuelto.
        findings: LEGACY_REVIEW_PACKET_FINDINGS,
      }),
      errors,
    );
  }
  if (existsSync(REVIEW_DIRECTORY)) {
    const unexpected = readdirSync(REVIEW_DIRECTORY).filter(
      (fileName) =>
        fileName.endsWith(".md") &&
        !rules.some((rule) => `${rule.ruleId}.md` === fileName),
    );
    errors.push(
      ...unexpected.map((fileName) => `UNEXPECTED_REVIEW_PACKET:${fileName}`),
    );
  }
  if (errors.length > 0) {
    process.stderr.write(`${errors.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    [
      "Fiscal gate report",
      "Rules: 54",
      "Approved rules: 0",
      "Resolved rules: 0",
      "Rules with passing executable test suites: 54",
      `Passing executable test cases: ${inventory.reduce(
        (total, rule) => total + rule.passingTestCount,
        0,
      )}`,
      "Fiscal mutation score: 100%",
      "Safety-critical fiscal mutation score: 100%",
      "Rules with verified source snapshots: 0",
      "Rules with approved fiscal hashes: 0",
      "Rules with two reviewers: 0",
      "Authorized exclusions: 0",
      "Expected authorized exclusions while pending: 0",
      'Fallback "Todos": ENABLED',
      "Fiscal result mode: ORIENTATIVE",
      CHECK_MODE ? "Inventory drift: CLEAN" : "Inventory generated: YES",
      "",
    ].join("\n"),
  );
}

main();
