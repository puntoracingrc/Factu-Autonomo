import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateFiscalCorpusResult,
  type FiscalCorpusManifest,
} from "./corpus";
import { extractFiscalDocumentText } from "./extractors";

const corpusRoot = join(
  process.cwd(),
  "test/fixtures/tax-model-diagnostic",
);

describe("corpus fiscal sintético versionado", () => {
  it("mantiene los 41 casos dentro del contrato y sin inferencias prohibidas", () => {
    const manifests = readdirSync(join(corpusRoot, "manifests"))
      .filter((name) => name.endsWith(".json"))
      .sort()
      .map(
        (name) =>
          JSON.parse(
            readFileSync(join(corpusRoot, "manifests", name), "utf8"),
          ) as FiscalCorpusManifest,
      );

    const failures: string[] = [];
    for (const manifest of manifests) {
      const text = readFileSync(
        join(corpusRoot, manifest.asset.extractedTextPath ?? ""),
        "utf8",
      );
      const pages = text
        .split(/\n?\f\n?/)
        .map((pageText, index) => ({ page: index + 1, text: pageText }));
      const result = extractFiscalDocumentText({
        documentId: manifest.fixtureId,
        text,
        extractionMethod: "PDF_NATIVE_TEXT",
        totalPages: pages.length,
        detectedPages: pages
          .filter((page) => page.text.trim().length > 0)
          .map((page) => page.page),
        pages,
        asOfDate: "2026-07-15",
      });
      const evaluation = evaluateFiscalCorpusResult(manifest, result);
      for (const failure of evaluation.failures) {
        failures.push(
          `${manifest.fixtureId}: ${failure.code} ${failure.message}`,
        );
      }
    }

    expect(manifests).toHaveLength(41);
    expect(
      manifests.reduce(
        (total, manifest) => total + manifest.expectedFields.length,
        0,
      ),
    ).toBeGreaterThan(70);
    expect(failures).toEqual([]);
  });
});
