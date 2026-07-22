import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_VERSION,
} from "./contracts";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1,
  createExpenseAggregateContributionV1,
  isExpenseAggregateContributionBodySizeAllowedV1,
  normalizeExpenseAggregateContributionV1,
} from "./aggregate-contribution.v1";
import {
  EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1,
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
  isExpenseLearningConsentDecisionBodySizeAllowedV1,
  normalizeExpenseLearningConsentDecisionV1,
} from "./learning-consent.v1";

const contributionSource = readFileSync(
  new URL("./aggregate-contribution.v1.ts", import.meta.url),
  "utf8",
);
const consentSource = readFileSync(
  new URL("./learning-consent.v1.ts", import.meta.url),
  "utf8",
);
const adr = readFileSync(
  new URL(
    "../../../docs/architecture/ADR-0008-expense-learning-engine.md",
    import.meta.url,
  ),
  "utf8",
);

function observation() {
  return {
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: "LINE_TABLE",
    documentKind: "EXPENSE_INVOICE",
    sourceQualityBucket: "HIGH",
    routeMode: "SHADOW_AI",
    localOutcome: "CANDIDATE",
    localConfidence: "HIGH",
    abstentionReason: null,
    aiFallbackUsed: false,
    aiFallbackReason: null,
    aiUsageBucket: "ONE",
    localDurationBucket: "LT_1_S",
    humanReviewStatus: "CONFIRMED",
    localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    math: [],
    criticalFlags: [],
    learningHints: null,
  };
}

function contribution() {
  const value = createExpenseAggregateContributionV1(observation());
  if (!value) throw new Error("Expected a valid synthetic contribution");
  return value;
}

function consent() {
  return {
    schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
    noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
    purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    granted: true,
  };
}

describe("expense aggregate learning privacy contract", () => {
  it("mantiene P1A puro, sin reader, red, almacenamiento o promocion", () => {
    expect(
      sourceBoundary("aggregate-contribution.v1.ts", contributionSource, [
        "./contracts",
      ]),
    ).toEqual({
      dependencies: ["./contracts"],
      dynamicImports: 0,
      forbiddenCapabilities: [],
      sideEffectImports: 0,
      topLevelEffects: 0,
    });
    expect(
      sourceBoundary("learning-consent.v1.ts", consentSource, ["./contracts"]),
    ).toEqual({
      dependencies: ["./contracts"],
      dynamicImports: 0,
      forbiddenCapabilities: [],
      sideEffectImports: 0,
      topLevelEffects: 0,
    });
  });

  it("detecta llamadas y mutaciones envueltas sin confiar en su nombre", () => {
    const wrappedEffect = `
      function renamedHelper() {
        return 1;
      }
      const state = (() => {
        const value = renamedHelper();
        const nested = { value: 0 };
        nested.value += value;
        return nested;
      })();
    `;
    const boundary = sourceBoundary("wrapped-effect.ts", wrappedEffect, []);

    expect(boundary.topLevelEffects).toBeGreaterThan(0);
  });

  it("rechaza claves de identidad, periodo, documento y valores exactos", () => {
    const forbidden = [
      ["ownerScope", "user:synthetic"],
      ["userId", "00000000-0000-4000-8000-000000000001"],
      ["tenantId", "tenant-synthetic"],
      ["periodStart", "2026-07-21"],
      ["weekKey", "2026-W30"],
      ["sampleCount", 1],
      ["timestamp", "2026-07-21T10:00:00.000Z"],
      ["documentId", "document-synthetic"],
      ["operationId", "operation-synthetic"],
      ["sha256", "a".repeat(64)],
      ["rawText", "texto OCR privado"],
      ["ocr", "contenido reconocido"],
      ["filename", "factura-privada.pdf"],
      ["supplierName", "Proveedor privado"],
      ["nif", "B00000000"],
      ["bankAccount", "ES0000000000000000000000"],
      ["invoiceNumber", "F-2026-001"],
      ["expenseDate", "2026-07-21"],
      ["exactAmount", 121.25],
      ["exactPercent", 21],
    ] as const;

    for (const [key, value] of forbidden) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...contribution(),
          [key]: value,
        }),
        key,
      ).toBeNull();
      expect(
        normalizeExpenseLearningConsentDecisionV1({
          ...consent(),
          [key]: value,
        }),
        key,
      ).toBeNull();
    }
  });

  it("no deja que texto, importes o porcentajes se escondan en metricas", () => {
    const base = contribution();
    const first = base.metrics[0]!;

    for (const value of [
      "Proveedor privado",
      "B00000000",
      "ES0000000000000000000000",
      "F-2026-001",
      "factura-privada.pdf",
      "2026-07-21",
      "121.25",
      "21%",
    ]) {
      expect(
        normalizeExpenseAggregateContributionV1({
          ...base,
          metrics: [{ ...first, value }, ...base.metrics.slice(1)],
        }),
        value,
      ).toBeNull();
    }
  });

  it("mantiene learningHints explicitamente desactivado", () => {
    const base = contribution();

    expect(base.learningHints).toBeNull();
    expect(
      normalizeExpenseAggregateContributionV1({
        ...base,
        learningHints: { formulas: ["BASE_X_TAX_RATE"] },
      }),
    ).toBeNull();
    expect(
      createExpenseAggregateContributionV1({
        ...observation(),
        learningHints: { schemaVersion: "expense-learning-hints.v1" },
      }),
    ).toBeNull();
  });

  it("acota arrays y declara limites de body para la futura API", () => {
    const base = contribution();
    expect(
      normalizeExpenseAggregateContributionV1({
        ...base,
        metrics: Array.from(
          { length: EXPENSE_AGGREGATE_CONTRIBUTION_MAX_METRICS_V1 + 1 },
          () => base.metrics[0],
        ),
      }),
    ).toBeNull();
    expect(
      isExpenseAggregateContributionBodySizeAllowedV1(
        EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1 + 1,
      ),
    ).toBe(false);
    expect(
      isExpenseLearningConsentDecisionBodySizeAllowedV1(
        EXPENSE_LEARNING_CONSENT_DECISION_MAX_BODY_BYTES_V1 + 1,
      ),
    ).toBe(false);
  });

  it("documenta amenazas, fases y limites sin afirmar anonimato consumado", () => {
    expect(adr).toContain("ingesta autenticada minimizada y desidentificada");
    expect(adr).toContain("acumulador protegido y exclusivo de servicio");
    expect(adr).toContain("métrica semanal cerrada con soporte mínimo");
    expect(adr).toContain("35 días");
    expect(adr).toContain("13 meses");
    expect(adr).toContain("10 aportantes distintos");
    expect(adr).toContain("singling-out");
    expect(adr).toContain("linkability");
    expect(adr).toContain("inference");
    expect(adr).toContain("privacidad diferencial");
    expect(adr).toContain("cliente no confiable");
    expect(adr).toContain("poisoning");
    expect(adr).toContain("Sybil");
    expect(adr).toContain("collusion");
    expect(adr).toContain("replay");
    expect(adr).toMatch(/10 aportantes[^.]+no demuestra[^.]+independencia/iu);
    expect(adr).toMatch(/no contribuye ni promueve/iu);
    expect(adr).toMatch(/no\s+demuestra por sí solo anonimización/iu);
    expect(adr).not.toMatch(/cumple (?:con )?el RGPD|garantiza anonimato/iu);
  });
});

function sourceBoundary(
  filename: string,
  source: string,
  allowedDependencies: readonly string[],
) {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const dependencies: string[] = [];
  const forbiddenCapabilities: string[] = [];
  let dynamicImports = 0;
  let sideEffectImports = 0;
  let topLevelEffects = 0;
  const forbiddenIdentifiers = new Set([
    "EventSource",
    "Function",
    "Deno",
    "Bun",
    "Date",
    "WebSocket",
    "XMLHttpRequest",
    "Worker",
    "console",
    "crypto",
    "document",
    "eval",
    "fetch",
    "globalThis",
    "indexedDB",
    "localStorage",
    "navigator",
    "performance",
    "process",
    "queueMicrotask",
    "require",
    "sendBeacon",
    "setInterval",
    "setTimeout",
    "sessionStorage",
    "supabase",
    "window",
  ]);

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        dependencies.push(statement.moduleSpecifier.text);
      }
      if (!statement.importClause) sideEffectImports += 1;
    } else if (ts.isExportDeclaration(statement) && statement.moduleSpecifier) {
      if (ts.isStringLiteral(statement.moduleSpecifier)) {
        dependencies.push(statement.moduleSpecifier.text);
      }
    } else if (ts.isExpressionStatement(statement)) {
      topLevelEffects += 1;
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!declaration.initializer) continue;
        const inspectInitializer = (node: ts.Node): void => {
          if (
            ts.isCallExpression(node) ||
            ts.isNewExpression(node) ||
            ts.isAwaitExpression(node) ||
            ts.isYieldExpression(node) ||
            ts.isDeleteExpression(node) ||
            ts.isTaggedTemplateExpression(node) ||
            (ts.isBinaryExpression(node) &&
              node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
              node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
            (ts.isPrefixUnaryExpression(node) &&
              (node.operator === ts.SyntaxKind.PlusPlusToken ||
                node.operator === ts.SyntaxKind.MinusMinusToken)) ||
            ts.isPostfixUnaryExpression(node)
          ) {
            topLevelEffects += 1;
          }
          ts.forEachChild(node, inspectInitializer);
        };
        inspectInitializer(declaration.initializer);
      }
    } else if (
      !ts.isFunctionDeclaration(statement) &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !(ts.isExportDeclaration(statement) && !statement.moduleSpecifier)
    ) {
      topLevelEffects += 1;
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      dynamicImports += 1;
    }
    if (
      ts.isIdentifier(node) &&
      forbiddenIdentifiers.has(node.text) &&
      !isDeclarationName(node)
    ) {
      forbiddenCapabilities.push(node.text);
    }
    if (
      ts.isElementAccessExpression(node) &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression) &&
      forbiddenIdentifiers.has(node.argumentExpression.text)
    ) {
      forbiddenCapabilities.push(node.argumentExpression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  expect(dependencies).toEqual(allowedDependencies);
  return {
    dependencies,
    dynamicImports,
    forbiddenCapabilities: [...new Set(forbiddenCapabilities)].sort(),
    sideEffectImports,
    topLevelEffects,
  };
}

function isDeclarationName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isPropertySignature(parent)) &&
    parent.name === node
  );
}
