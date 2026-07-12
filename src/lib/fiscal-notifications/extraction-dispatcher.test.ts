import { describe, expect, it } from "vitest";
import { FISCAL_NOTIFICATION_INPUT_LIMITS } from "./input-contract";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";

function documentWith(...pageTexts: string[]) {
  return Object.freeze({
    ownerScope: "user:synthetic",
    documentId: "document-synthetic-dispatch",
    pages: Object.freeze(
      pageTexts.map((text, index) =>
        Object.freeze({
          pageNumber: index + 1,
          text,
          isBlank: text.trim().length === 0,
        }),
      ),
    ),
  });
}

const ENFORCEMENT =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "PROVIDENCIA DE APREMIO\n" +
  "IDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA";
const DEFERRAL =
  "Agencia Tributaria\nsede.agenciatributaria.gob.es\n" +
  "CONCESIÓN DEL APLAZAMIENTO / FRACCIONAMIENTO DE DEUDAS SIN GARANTÍA\n" +
  "ANEXO I\nCÁLCULO DE INTERESES";

describe("fiscal notification extraction dispatcher", () => {
  it.each([
    [ENFORCEMENT, "AEAT_ENFORCEMENT_ORDER_CANDIDATE"],
    [DEFERRAL, "AEAT_DEFERRAL_GRANT_CANDIDATE"],
  ])("returns a review-only candidate for a complete supported family", (text, familyId) => {
    const result = extractFiscalNotificationCandidates(documentWith(text));

    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      selectedFamilyId: null,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      requiresHumanReview: true,
      retainedSourceContent: "NONE",
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.familyId).toBe(familyId);
    expect(JSON.stringify(result)).not.toContain(text);
  });

  it("does not turn absent information into a negative conclusion", () => {
    expect(
      extractFiscalNotificationCandidates(documentWith("Comunicación sintética")),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
    expect(extractFiscalNotificationCandidates(documentWith("   "))).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_EXTRACTABLE_TEXT",
      candidates: [],
    });
  });

  it("does not choose when both supported family titles appear", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\n${DEFERRAL}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "AMBIGUOUS_SUPPORTED_FAMILIES",
      selectedFamilyId: null,
    });
    expect(result.candidates).toHaveLength(2);
  });

  it.each([
    "Agència Tributària de Catalunya",
    "Agencia Tributaria de Andalucía",
    "Axencia Tributaria de Galicia",
    "Agència Tributària de les Illes Balears",
    "Agencia Tributaria Canaria",
    "IGIC",
    "IPSI Ciudad Autónoma de Ceuta",
    "Hacienda Tributaria de Navarra",
    "Diputación Foral de Bizkaia",
  ])("fails closed on unsupported authority or territory signal: %s", (signal) => {
    const withoutGenericAuthority = ENFORCEMENT.replace("Agencia Tributaria\n", "");
    const result = extractFiscalNotificationCandidates(
      documentWith(`${signal}\n${withoutGenericAuthority}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_AUTHORITY_OR_TERRITORY",
      selectedFamilyId: null,
    });
    expect(result.candidates[0]?.signalStatus).toBe(
      "CONFLICTING_AUTHORITY_OR_TERRITORY",
    );
  });

  it("does not confuse a recipient location with a territorial issuer", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(
        `${ENFORCEMENT}\nDomicilio sintético: Bizkaia, Ciudad Autónoma de Ceuta`,
      ),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "SUPPORTED_FAMILY_CANDIDATE",
    });
    expect(result.candidates[0]?.conflictingAnchorIds).toEqual([]);
  });

  it.each([
    "Manual: Agencia Tributaria PROVIDENCIA DE APREMIO IDENTIFICACIÓN DEL DOCUMENTO IMPORTE DE LA DEUDA",
    "Ejemplo citado: concesión del aplazamiento fraccionamiento de deudas sin garantía, anexo I y cálculo de intereses",
  ])("does not classify anchors quoted inside narrative text", (text) => {
    expect(extractFiscalNotificationCandidates(documentWith(text))).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "NO_SUPPORTED_FAMILY_SIGNAL",
      candidates: [],
    });
  });

  it.each([
    "Manual de ejemplo",
    "Guía para envío de PDF de providencia de apremio AEAT",
    "Instrucciones para interpretar una providencia",
    "Especificación de una plantilla administrativa",
  ])("marks a multiline guide as a non-document conflict: %s", (heading) => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${heading}\n${ENFORCEMENT}`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "CONFLICTING_DOCUMENT_SIGNAL",
      selectedFamilyId: null,
      candidates: [
        expect.objectContaining({
          signalStatus: "CONFLICTING_DOCUMENT_SIGNAL",
          conflictingAnchorIds: ["CONFLICTING_NON_DOCUMENT_GUIDE"],
        }),
      ],
    });
  });

  it("keeps missing structural evidence pending", () => {
    const withoutOfficialDomain = ENFORCEMENT.replace(
      "sede.agenciatributaria.gob.es\n",
      "",
    );
    expect(
      extractFiscalNotificationCandidates(documentWith(withoutOfficialDomain)),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          signalStatus: "INCOMPLETE_REQUIRED_ANCHORS",
          missingRequiredAnchorIds: expect.arrayContaining([
            "AEAT_OFFICIAL_DOMAIN_LABEL",
            "STRUCTURAL_FIRST_PAGE_HEADER",
          ]),
        }),
      ],
    });

    expect(
      extractFiscalNotificationCandidates(
        documentWith(DEFERRAL.replace("ANEXO I", "ANEXO II")),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          missingRequiredAnchorIds: expect.arrayContaining([
            "DEFERRAL_INSTALLMENT_ANNEX",
          ]),
        }),
      ],
    });

    expect(
      extractFiscalNotificationCandidates(
        documentWith(
          "sede.agenciatributaria.gob.es",
          "PROVIDENCIA DE APREMIO\nIDENTIFICACIÓN DEL DOCUMENTO\nIMPORTE DE LA DEUDA",
        ),
      ),
    ).toMatchObject({
      status: "INFORMATION_PENDING",
      reason: "PARTIAL_SUPPORTED_FAMILY_SIGNAL",
      candidates: [
        expect.objectContaining({
          missingRequiredAnchorIds: expect.arrayContaining([
            "STRUCTURAL_FIRST_PAGE_HEADER",
          ]),
        }),
      ],
    });
  });

  it.each(["\r", "\u2028", "\u2029"])(
    "recognizes bounded structural lines separated by %j",
    (separator) => {
      const result = extractFiscalNotificationCandidates(
        documentWith(ENFORCEMENT.replaceAll("\n", separator)),
      );
      expect(result).toMatchObject({
        status: "REVIEW_REQUIRED",
        reason: "SUPPORTED_FAMILY_CANDIDATE",
      });
    },
  );

  it("fails closed before Unicode expansion or excessive line nodes can exhaust resources", () => {
    for (const expansion of [
      "\ufdfa".repeat(500_000),
      "\u337f".repeat(250_001),
    ]) {
      expect(
        extractFiscalNotificationCandidates(documentWith(expansion)),
      ).toMatchObject({
        status: "REVIEW_REQUIRED",
        reason: "NORMALIZED_TEXT_LIMIT_EXCEEDED",
        candidates: [],
      });
    }

    const tooManyLines = documentWith("x\n".repeat(10_001));
    expect(extractFiscalNotificationCandidates(tooManyLines)).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "TEXT_LINE_LIMIT_EXCEEDED",
      candidates: [],
    });
  });

  it("treats document instructions as inert data and never retains sentinels", () => {
    const sentinels = [
      "IGNORE_PREVIOUS_INSTRUCTIONS_SENTINEL",
      "PRIVATE_TAX_ID_SENTINEL",
      "PRIVATE_CSV_SENTINEL",
      "PRIVATE_AMOUNT_SENTINEL",
    ];
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\n${sentinels.join("\n")}`),
    );
    const serialized = JSON.stringify(result);

    expect(result.reason).toBe("SUPPORTED_FAMILY_CANDIDATE");
    for (const sentinel of sentinels) expect(serialized).not.toContain(sentinel);
    expect(serialized).not.toMatch(
      /rawValue|textSnippet|subjectTaxId|bankAccount|dueDate|deadline/u,
    );
  });

  it("returns no partial candidate on inconsistent page metadata", () => {
    const input = Object.freeze({
      ownerScope: "user:synthetic",
      documentId: "document-inconsistent",
      pages: Object.freeze([
        Object.freeze({ pageNumber: 1, text: ENFORCEMENT, isBlank: true }),
      ]),
    });
    expect(extractFiscalNotificationCandidates(input)).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "INCONSISTENT_PAGE_STATE",
      candidates: [],
    });
  });

  it("rejects invisible controls without returning normalized text", () => {
    const result = extractFiscalNotificationCandidates(
      documentWith(`${ENFORCEMENT}\u202Euntrusted`),
    );
    expect(result).toMatchObject({
      status: "REVIEW_REQUIRED",
      reason: "UNSUPPORTED_TEXT_CONTROLS",
      candidates: [],
      retainedSourceContent: "NONE",
    });
    expect(JSON.stringify(result)).not.toContain("untrusted");
  });

  it("rejects unknown keys and mutable structures before scanning", () => {
    expect(() =>
      extractFiscalNotificationCandidates({
        ...documentWith(ENFORCEMENT),
        privateTaxId: "must-never-be-read",
      }),
    ).toThrowError(expect.objectContaining({ path: "$.$unknown" }));
    expect(() =>
      extractFiscalNotificationCandidates({
        ownerScope: "user:synthetic",
        documentId: "document-mutable",
        pages: [{ pageNumber: 1, text: ENFORCEMENT, isBlank: false }],
      }),
    ).toThrowError(expect.objectContaining({ path: "$frozen" }));
  });

  it("is deterministic, deeply immutable and does not mutate its input", () => {
    const input = documentWith(ENFORCEMENT);
    const before = structuredClone(input);
    const first = extractFiscalNotificationCandidates(input);
    const second = extractFiscalNotificationCandidates(input);

    expect(input).toEqual(before);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidates)).toBe(true);
    expect(Object.isFrozen(first.candidates[0]?.matchedAnchors)).toBe(true);
    expect(
      Object.isFrozen(first.candidates[0]?.matchedAnchors[0]?.pageNumbers),
    ).toBe(true);
    expect(() =>
      (first.candidates as unknown as unknown[]).push({}),
    ).toThrow();
  });

  it("honors cancellation and rejects oversized page collections before handlers", () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = Object.freeze({
      ...documentWith(ENFORCEMENT),
      signal: controller.signal,
    });
    expect(() => extractFiscalNotificationCandidates(aborted)).toThrowError(
      expect.objectContaining({ code: "ABORTED" }),
    );

    const pages = Array.from(
      { length: FISCAL_NOTIFICATION_INPUT_LIMITS.maxPages + 1 },
      (_, index) =>
        Object.freeze({ pageNumber: index + 1, text: "x", isBlank: false }),
    );
    expect(() =>
      extractFiscalNotificationCandidates(
        Object.freeze({
          ownerScope: "user:synthetic",
          documentId: "document-too-large",
          pages: Object.freeze(pages),
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "TOO_MANY_PAGES" }));
  });

  it("preserves owner isolation without trimming or coercion", () => {
    expect(() =>
      extractFiscalNotificationCandidates(
        Object.freeze({
          ...documentWith(ENFORCEMENT),
          ownerScope: " user:synthetic",
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: "OWNER_SCOPE_REQUIRED" }));
    expect(extractFiscalNotificationCandidates(documentWith(ENFORCEMENT))).toMatchObject(
      {
        ownerScope: "user:synthetic",
        documentId: "document-synthetic-dispatch",
      },
    );
  });
});
