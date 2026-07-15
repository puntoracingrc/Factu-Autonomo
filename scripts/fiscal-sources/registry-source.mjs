import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCES_PATH = join(ROOT, "src/lib/tax-model-diagnostic/sources.ts");
const INVENTORY_PATH = join(ROOT, "docs/fiscal/rule-inventory.json");
const APPROVAL_HASH_REGISTRY_PATH = join(
  ROOT,
  "docs/fiscal/approval/fiscal-approval-registry.v1.json",
);

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

function stringValue(expression) {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }
  throw new Error(`EXPECTED_STRING:${expression.getText()}`);
}

function nullableStringValue(expression) {
  return expression.kind === ts.SyntaxKind.NullKeyword
    ? null
    : stringValue(expression);
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

export function readCurrentOfficialSources() {
  const file = sourceFile(SOURCES_PATH);
  return objectArray(file, "OFFICIAL_SOURCES")
    .map((object) => ({
      sourceId: stringValue(property(object, "sourceId")),
      authority: stringValue(property(object, "authority")),
      title: stringValue(property(object, "title")),
      officialLocator: stringValue(property(object, "url")),
      materialScope: stringValue(property(object, "location")),
      declaredOfficialUpdatedAt: nullableStringValue(
        property(object, "officialUpdatedAt"),
      ),
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

export function readCurrentRuleInventory() {
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
  if (!existsSync(APPROVAL_HASH_REGISTRY_PATH)) return inventory;
  const approvalRegistry = JSON.parse(
    readFileSync(APPROVAL_HASH_REGISTRY_PATH, "utf8"),
  );
  if (
    approvalRegistry.contractVersion !== "fiscal-approval-registry.v1" ||
    approvalRegistry.ruleCount !== inventory.rules.length ||
    approvalRegistry.rules.length !== inventory.rules.length
  ) {
    throw new Error("FISCAL_APPROVAL_REGISTRY_INCOMPLETE");
  }
  const approvalHashByRule = new Map(
    approvalRegistry.rules.map((rule) => [
      rule.ruleId,
      rule.approvalFiscalHash,
    ]),
  );
  const rules = inventory.rules.map((rule) => {
    const approvalFiscalHash = approvalHashByRule.get(rule.ruleId);
    if (!approvalFiscalHash) {
      throw new Error(`MISSING_FISCAL_APPROVAL_HASH:${rule.ruleId}`);
    }
    return {
      ...rule,
      approvalFiscalHash,
    };
  });
  return {
    ...inventory,
    rules,
  };
}

export function sourceRuleAssociations(inventory) {
  const associations = new Map();
  for (const rule of inventory.rules) {
    for (const sourceId of rule.sourceIds) {
      const rules = associations.get(sourceId) ?? [];
      rules.push(rule.ruleId);
      associations.set(sourceId, rules);
    }
  }
  return new Map(
    [...associations.entries()].map(([sourceId, ruleIds]) => [
      sourceId,
      [...new Set(ruleIds)].sort(),
    ]),
  );
}
