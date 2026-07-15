import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const RULES_PATH = join(ROOT, "src/lib/tax-model-diagnostic/rules.ts");

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

function variableInitializer(file, name) {
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === name &&
        declaration.initializer
      ) {
        return unwrap(declaration.initializer);
      }
    }
  }
  throw new Error(`VARIABLE_NOT_FOUND:${name}`);
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
    throw new Error(`EXPECTED_STRING_ARRAY:${expression.getText()}`);
  }
  return expression.elements.map((element) => stringValue(unwrap(element)));
}

export function readFiscalRuleBlueprints() {
  const file = ts.createSourceFile(
    RULES_PATH,
    readFileSync(RULES_PATH, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const initializer = variableInitializer(file, "BLUEPRINTS");
  if (!ts.isArrayLiteralExpression(initializer)) {
    throw new Error("EXPECTED_BLUEPRINT_ARRAY");
  }
  return initializer.elements.map((element) => {
    const object = unwrap(element);
    if (!ts.isObjectLiteralExpression(object)) {
      throw new Error(`EXPECTED_BLUEPRINT_OBJECT:${object.getText()}`);
    }
    return {
      model: stringValue(property(object, "modelNumber")),
      conditions: stringArray(property(object, "conditions")),
      exceptions: stringArray(property(object, "exclusions")),
      decision: stringValue(property(object, "result")),
      sourceIds: stringArray(property(object, "officialSourceIds")),
    };
  });
}
