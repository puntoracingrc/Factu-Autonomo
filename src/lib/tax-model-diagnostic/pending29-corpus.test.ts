import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getExtractorDefinition } from "./extractors/registry";
import { extractFiscalDocumentText } from "./extractors/pipeline";
import {
  PENDING29_CORPUS_BASE_FIXTURE_COUNT,
  PENDING29_CORPUS_FAMILY_COUNT,
  PENDING29_CORPUS_PDF_COUNT,
  PENDING29_FAMILY_REGISTRY,
  evaluatePending29Safety,
  mapPending29DocumentType,
  validatePending29Manifest,
  type Pending29FixtureManifest,
  type Pending29VisualVariant,
} from "./pending29-corpus";

const CORPUS_ROOT = join(
  process.cwd(),
  "test/fixtures/tax-model-diagnostic/pending29-v1",
);

interface FixtureIndexEntry {
  fixtureId: string;
  baseFixtureId: string;
  documentType: Pending29FixtureManifest["documentType"];
  semanticScenario: Pending29FixtureManifest["semanticScenario"];
  visualVariant: Pending29VisualVariant;
  pdf: string;
  manifest: string;
  sha256: string;
  expectedDisposition: Pending29FixtureManifest["expectedDisposition"];
}

interface CorpusIndex {
  families: number;
  semanticBaseFixtures: number;
  totalPdfFixtures: number;
  fixtures: readonly FixtureIndexEntry[];
}

const corpus = JSON.parse(
  readFileSync(join(CORPUS_ROOT, "corpus-manifest.json"), "utf8"),
) as CorpusIndex;

function manifestFor(fixture: FixtureIndexEntry): Pending29FixtureManifest {
  return JSON.parse(
    readFileSync(join(CORPUS_ROOT, fixture.manifest), "utf8"),
  ) as Pending29FixtureManifest;
}

function transcriptPath(fixture: FixtureIndexEntry): string {
  const directory = {
    NATIVE_TEXT_PDF: "native",
    RASTER_SCAN_COMPRESSED: "scan_compressed",
    RASTER_ROTATED_CAPTURE: "rotated_capture",
  }[fixture.visualVariant];
  return join(CORPUS_ROOT, "text", directory, `${fixture.fixtureId}.txt`);
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function textInput(fixture: FixtureIndexEntry, text: string) {
  const pages = text
    .split("\f")
    .filter((page) => page.trim())
    .map((page, index) => ({ page: index + 1, text: page }));
  return {
    documentId: fixture.fixtureId,
    text,
    extractionMethod:
      fixture.visualVariant === "NATIVE_TEXT_PDF"
        ? ("PDF_NATIVE_TEXT" as const)
        : ("OCR_LOCAL" as const),
    totalPages: pages.length,
    detectedPages: pages.map((page) => page.page),
    pages,
  };
}

function scalarLeaves(value: unknown): readonly (string | number)[] {
  if (typeof value === "string" || typeof value === "number") return [value];
  if (Array.isArray(value)) return value.flatMap(scalarLeaves);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(scalarLeaves);
  }
  return [];
}

function nativeFieldEvidenceFailures(
  manifest: Pending29FixtureManifest,
  text: string,
): readonly string[] {
  const pages = text.split("\f").map(normalized);
  const failures: string[] = [];
  const containsWords = (page: string, value: string) => {
    const parts =
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .match(/[A-Z0-9]+/g) ?? [];
    return parts.every((part) => {
      const exact = normalized(part);
      const singular = part.length > 4 && part.endsWith("S")
        ? normalized(part.slice(0, -1))
        : exact;
      return page.includes(exact) || page.includes(singular);
    });
  };
  for (const evidence of manifest.fieldEvidence) {
    const page = pages[evidence.page - 1] ?? "";
    if (!page) failures.push(`${evidence.fieldId}:page:${evidence.page}`);
    if (evidence.fieldId === "document.type") continue;
    for (const value of scalarLeaves(evidence.value)) {
      const expected = normalized(String(value));
      if (expected && !containsWords(page, String(value))) {
        failures.push(`${evidence.fieldId}:value:${String(value)}`);
      }
    }
  }
  return failures;
}

function tokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .match(/[A-Z0-9]{3,}/g) ?? [],
  );
}

function tokenRecall(reference: string, candidate: string): number {
  const expected = tokens(reference);
  const actual = tokens(candidate);
  if (expected.size === 0) return 0;
  return [...expected].filter((token) => actual.has(token)).length / expected.size;
}

const QUESTION_MAPPING_FACT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "ACTIVITY.LIST": ["ACTIVITY.LIST"],
  "ACTIVITY.LIST_TGSS": ["ACTIVITY.LIST_TGSS", "ACTIVITY.LIST", "IRPF.RETA_PERIODS"],
  "ACTIVITY.NATURE": ["ACTIVITY.NATURE"],
  "ACTIVITY.PREMISES": ["IAE.EVENT"],
  "CENSUS.CURRENT_STATUS": ["CENSUS.CURRENT_STATUS"],
  "CENSUS.PERIODIC_OBLIGATIONS": ["CENSUS.PERIODIC_OBLIGATIONS"],
  "COMPANY.CORPORATE_TAX": ["COMPANY.CORPORATE_TAX"],
  "COMPANY.PRIOR_MODEL_200_FILING": ["COMPANY.CORPORATE_TAX"],
  "COMPANY.PRIOR_MODEL_202_FILING": [
    "COMPANY.PRIOR_MODEL_202_FILING",
    "COMPANY.INSTALLMENT_PAYMENT",
  ],
  "ECOMMERCE.OSS_IOSS_OPERATIONS": ["ECOMMERCE.OSS_IOSS_OPERATIONS"],
  "ECOMMERCE.OSS_IOSS_REGIME": [
    "ECOMMERCE.OSS_IOSS_REGISTRATION",
    "ECOMMERCE.OSS_IOSS_OPERATIONS",
  ],
  "ECOMMERCE.OSS_IOSS_REGISTRATION": ["ECOMMERCE.OSS_IOSS_REGISTRATION"],
  "ENTITY.INCOME_ATTRIBUTION": [
    "ENTITY.INCOME_ATTRIBUTION",
    "ENTITY.ATTRIBUTION_REQUIREMENT",
  ],
  "ENTITY.MEMBERS": ["ENTITY.INCOME_ATTRIBUTION", "ENTITY.ATTRIBUTION_REQUIREMENT"],
  "EU.OPERATIONS": ["EU.OPERATIONS"],
  "EU.ROI": ["EU.ROI"],
  "IAE.STATUS": ["IAE.EVENT"],
  "IRPF.METHOD": ["IRPF.METHOD"],
  "IRPF.PRIOR_ANNUAL_FILING": ["IRPF.PRIOR_ANNUAL_FILING", "PERSONAL.IRPF_RETURN"],
  "IRPF.PRIOR_MODEL_131_FILING": ["IRPF.PAYMENT_131"],
  "IRPF.PRIOR_SPECIAL_REGIME_FILING": ["PERSONAL.SPECIAL_ARTICLE_93"],
  "IRPF.RETA_PERIODS": ["IRPF.RETA_PERIODS"],
  "PERSONAL.FOREIGN_ASSETS": ["PERSONAL.FOREIGN_ASSETS"],
  "PERSONAL.FOREIGN_CRYPTO": ["PERSONAL.FOREIGN_CRYPTO"],
  "PERSONAL.SPECIAL_ARTICLE_93": ["PERSONAL.SPECIAL_ARTICLE_93"],
  "PERSONAL.WEALTH_TAX": ["PERSONAL.WEALTH_TAX"],
  "RENT.PRIOR_ANNUAL_SUMMARY": ["WITHHOLDING.RENT"],
  "RETA.CURRENT_STATUS": ["IRPF.RETA_PERIODS"],
  "THIRD_PARTIES.MODEL_347_CANDIDATE": ["THIRD_PARTIES.MODEL_347_CANDIDATE"],
  "VAT.AGRICULTURE_COMPENSATION_REFUND": ["VAT.SPECIAL_REFUND"],
  "VAT.NON_PERIODIC_309": ["VAT.REVERSE_CHARGE", "EU.OPERATIONS"],
  "VAT.REGIMES": ["VAT.REGIMES"],
  "VAT.REVERSE_CHARGE": ["VAT.REVERSE_CHARGE"],
  "VAT.SII": ["VAT.SII"],
  "VAT.SPECIAL_REFUND_308": ["VAT.SPECIAL_REFUND"],
  "WITHHOLDING.ADMINISTRATORS": ["WITHHOLDING.OTHER_IRPF_RECIPIENTS"],
  "WITHHOLDING.CAPITAL": ["WITHHOLDING.CAPITAL"],
  "WITHHOLDING.EMPLOYEES": ["WITHHOLDING.EMPLOYEES", "WITHHOLDING.WORK_RECIPIENTS"],
  "WITHHOLDING.MODEL_123_PERIOD": ["WITHHOLDING.CAPITAL"],
  "WITHHOLDING.NON_RESIDENTS": ["WITHHOLDING.NON_RESIDENTS"],
  "WITHHOLDING.PROFESSIONALS_PAID": [
    "WITHHOLDING.PROFESSIONAL_RECIPIENTS",
    "WITHHOLDING.ECONOMIC_ACTIVITY_RECIPIENTS",
  ],
  "WITHHOLDING.RENT": ["WITHHOLDING.RENT"],
  "WITHHOLDING.RENT.EXEMPTION": ["WITHHOLDING.RENT_EXEMPTION"],
};

function expectsPositiveQuestionEvidence(key: string, value: unknown): boolean {
  if (value === true) return true;
  if (value === false) return key === "WITHHOLDING.RENT.EXEMPTION";
  if (typeof value === "number") return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== "string") return false;
  if (/^(?:NEEDS_|DO_NOT_)/.test(value)) return false;
  if (key === "RETA.CURRENT_STATUS" && value === "INACTIVE") return false;
  return true;
}

function expectedQuestionEvidenceFailures(
  manifest: Pending29FixtureManifest,
  result: ReturnType<typeof extractFiscalDocumentText>,
): readonly string[] {
  const actualFacts = new Set(result.facts.map((fact) => fact.factType));
  const failures: string[] = [];
  for (const [key, value] of Object.entries(manifest.expectedQuestionMappings)) {
    if (
      manifest.semanticScenario === "negative_zero" &&
      !new Set([
        "CENSUS.CURRENT_STATUS",
        "ECOMMERCE.OSS_IOSS_REGISTRATION",
        "EU.ROI",
        "IAE.STATUS",
        "WITHHOLDING.RENT.EXEMPTION",
      ]).has(key)
    ) {
      continue;
    }
    if (!expectsPositiveQuestionEvidence(key, value)) continue;
    const aliases = QUESTION_MAPPING_FACT_ALIASES[key];
    if (!aliases) {
      failures.push(`${key}:unregistered-mapping`);
    } else if (!aliases.some((factType) => actualFacts.has(factType))) {
      failures.push(`${key}:missing-fact`);
    }
  }
  return failures;
}

describe("pending29 synthetic fiscal corpus", () => {
  it("registers the 29 families and preserves all 348 validated fixtures", () => {
    expect(corpus).toMatchObject({
      families: PENDING29_CORPUS_FAMILY_COUNT,
      semanticBaseFixtures: PENDING29_CORPUS_BASE_FIXTURE_COUNT,
      totalPdfFixtures: PENDING29_CORPUS_PDF_COUNT,
    });
    expect(corpus.fixtures).toHaveLength(PENDING29_CORPUS_PDF_COUNT);
    expect(PENDING29_FAMILY_REGISTRY).toHaveLength(PENDING29_CORPUS_FAMILY_COUNT);
    expect(
      new Set(
        PENDING29_FAMILY_REGISTRY.map((entry) => entry.corpusDocumentType),
      ).size,
    ).toBe(PENDING29_CORPUS_FAMILY_COUNT);
    for (const entry of PENDING29_FAMILY_REGISTRY) {
      expect(getExtractorDefinition(entry.applicationDocumentType)?.implementationStatus).toBe(
        "DEEP_SUPPORTED",
      );
    }
    for (const fixture of corpus.fixtures) {
      const manifest = manifestFor(fixture);
      expect(validatePending29Manifest(manifest), fixture.fixtureId).toEqual([]);
      expect(mapPending29DocumentType(manifest.documentType)).toBe(
        mapPending29DocumentType(fixture.documentType),
      );
    }
  });

  it("classifies all 116 native PDFs, reads their declared fields and fails closed", () => {
    const native = corpus.fixtures.filter(
      (fixture) => fixture.visualVariant === "NATIVE_TEXT_PDF",
    );
    const questionEvidenceFailures: string[] = [];
    expect(native).toHaveLength(PENDING29_CORPUS_BASE_FIXTURE_COUNT);
    for (const fixture of native) {
      const manifest = manifestFor(fixture);
      const text = readFileSync(transcriptPath(fixture), "utf8");
      const result = extractFiscalDocumentText(textInput(fixture, text));
      const safety = evaluatePending29Safety(manifest, result);
      expect(safety.classificationMatches, fixture.fixtureId).toBe(true);
      expect(safety.requiresReviewAsExpected, fixture.fixtureId).toBe(true);
      expect(safety.forbiddenInferences, fixture.fixtureId).toEqual([]);
      expect(nativeFieldEvidenceFailures(manifest, text), fixture.fixtureId).toEqual([]);
      questionEvidenceFailures.push(
        ...expectedQuestionEvidenceFailures(manifest, result).map(
          (failure) => `${fixture.fixtureId}:${failure}`,
        ),
      );
    }
    expect(questionEvidenceFailures).toEqual([]);
  });

  it("contrasts OCR for all 232 raster PDFs without relaxing fail-closed rules", () => {
    const raster = corpus.fixtures.filter(
      (fixture) => fixture.visualVariant !== "NATIVE_TEXT_PDF",
    );
    const nativeByBase = new Map(
      corpus.fixtures
        .filter((fixture) => fixture.visualVariant === "NATIVE_TEXT_PDF")
        .map((fixture) => [fixture.baseFixtureId, fixture]),
    );
    expect(raster).toHaveLength(PENDING29_CORPUS_PDF_COUNT - PENDING29_CORPUS_BASE_FIXTURE_COUNT);
    const failures: string[] = [];
    for (const fixture of raster) {
      const manifest = manifestFor(fixture);
      const text = readFileSync(transcriptPath(fixture), "utf8");
      const nativeFixture = nativeByBase.get(fixture.baseFixtureId);
      if (!nativeFixture) {
        failures.push(`${fixture.fixtureId}:native-missing`);
        continue;
      }
      const nativeText = readFileSync(transcriptPath(nativeFixture!), "utf8");
      const recall = tokenRecall(nativeText, text);
      if (recall < 0.45) failures.push(`${fixture.fixtureId}:recall:${recall.toFixed(3)}`);
      const result = extractFiscalDocumentText(textInput(fixture, text));
      const safety = evaluatePending29Safety(manifest, result);
      if (!safety.classificationMatches) {
        failures.push(
          `${fixture.fixtureId}:classification:${String(result.envelope.detectedDocumentType)}`,
        );
      }
      if (!safety.requiresReviewAsExpected) {
        failures.push(`${fixture.fixtureId}:did-not-fail-closed`);
      }
      for (const inference of safety.forbiddenInferences) {
        failures.push(`${fixture.fixtureId}:forbidden:${inference}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
