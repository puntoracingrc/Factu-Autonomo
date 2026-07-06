#!/usr/bin/env node

import fs from "node:fs";
import {
  discoverInvoiceFixtures,
  INVOICE_FIXTURES_ROOT,
  normalizeExpectedInvoice,
  readJson,
  roundMoney,
} from "./invoice-benchmark/lib.mjs";

const failures = [];
const fixtures = discoverInvoiceFixtures();

function addFailure(invoiceId, message) {
  failures.push({ invoiceId, message });
}

function isSynthetic(fixture) {
  return fixture.suite.startsWith("synthetic_");
}

function containsSyntheticNotice(raw) {
  const text = JSON.stringify(raw).toLowerCase();
  return (
    text.includes("ficticio") ||
    text.includes("ficticios") ||
    text.includes("synthetic") ||
    text.includes("sintetica") ||
    text.includes("sintética")
  );
}

function expectedLineBase(raw, expected) {
  return (
    raw.subtotal ??
    raw.totals?.base_before_global_discount ??
    raw.totals?.taxable_base ??
    expected.totals?.taxBase
  );
}

for (const fixture of fixtures) {
  if (!fs.existsSync(fixture.groundTruthPath)) {
    addFailure(fixture.invoiceId, "Falta JSON ground truth.");
    continue;
  }
  if (!fixture.isPrivate && !fs.existsSync(fixture.pdfPath)) {
    addFailure(fixture.invoiceId, "Falta PDF sintético.");
  }

  let raw;
  let expected;
  try {
    raw = readJson(fixture.groundTruthPath);
    expected = normalizeExpectedInvoice(raw, fixture);
  } catch (error) {
    addFailure(fixture.invoiceId, `JSON no válido: ${error.message}`);
    continue;
  }

  if (!expected.metadata?.invoiceNumber) {
    addFailure(fixture.invoiceId, "Falta invoiceNumber.");
  }
  if (!expected.metadata?.date) {
    addFailure(fixture.invoiceId, "Falta fecha normalizada.");
  }
  if (!expected.totals?.total && expected.totals?.total !== 0) {
    addFailure(fixture.invoiceId, "Falta total.");
  }
  if (!Array.isArray(expected.lines) || expected.lines.length === 0) {
    addFailure(fixture.invoiceId, "Faltan líneas esperadas.");
  }

  const lineBase = roundMoney(
    (expected.lines ?? []).reduce((sum, line) => sum + (line.amount ?? 0), 0),
  );
  const comparableLineBase = roundMoney(expectedLineBase(raw, expected) ?? 0);
  if (
    comparableLineBase !== undefined &&
    Math.abs(lineBase - comparableLineBase) > 0.05
  ) {
    addFailure(
      fixture.invoiceId,
      `La suma de líneas (${lineBase}) no cuadra con base previa esperada (${comparableLineBase}).`,
    );
  }

  if (
    isSynthetic(fixture) &&
    fixture.suite !== "synthetic_basic" &&
    !containsSyntheticNotice(raw)
  ) {
    addFailure(
      fixture.invoiceId,
      "Fixture sintético sin aviso claro de datos ficticios.",
    );
  }
}

const seen = new Set();
for (const fixture of fixtures) {
  if (seen.has(fixture.invoiceId)) {
    addFailure(fixture.invoiceId, "invoiceId duplicado.");
  }
  seen.add(fixture.invoiceId);
}

if (fixtures.length === 0) {
  addFailure("fixtures", `No se encontraron fixtures en ${INVOICE_FIXTURES_ROOT}.`);
}

if (failures.length > 0) {
  console.error("Validación de fixtures fallida:");
  for (const failure of failures.slice(0, 80)) {
    console.error(`- ${failure.invoiceId}: ${failure.message}`);
  }
  if (failures.length > 80) {
    console.error(`... ${failures.length - 80} fallos más.`);
  }
  process.exit(1);
}

const syntheticCount = fixtures.filter((fixture) => !fixture.isPrivate).length;
const privateCount = fixtures.length - syntheticCount;
console.log(
  `Fixtures de facturas OK: ${fixtures.length} total, ${syntheticCount} sintéticos, ${privateCount} privados.`,
);
