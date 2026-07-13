import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import {
  FiscalNotificationPdfWorkerAnalysisError,
  parseFiscalNotificationPdfWorkerAnalysis,
  projectFiscalNotificationPdfWorkerAnalysis,
} from "./pdf-worker-analysis-contract";

const PRIVATE_SENTINEL = "PRIVATE_NIF_CSV_DOCUMENT_TEXT_SENTINEL";
const ENFORCEMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 100,00 EUR",
  "Recargo ordinario (20 %): 20,00 EUR",
  "Ingreso a cuenta: 0,00 EUR",
  "Importe total: 120,00 EUR",
  "PLAZOS DE PAGO",
  PRIVATE_SENTINEL,
].join("\n");

function documentInput(text = ENFORCEMENT_TEXT) {
  return Object.freeze({
    ownerScope: "worker:ephemeral",
    documentId: "document:ephemeral",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text,
        isBlank: text.trim().length === 0,
      }),
    ]),
  });
}

function enforcementAnalysis() {
  const input = documentInput();
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: input.pages.length,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
  });
}

function deferralAnalysis() {
  const input = documentInput(
    [
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
      "ANEXO I",
      "CALCULO DE INTERESES",
    ].join("\n"),
  );
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: 1,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: null,
  });
}

function conflictingAnalysis(conflict: string) {
  const input = documentInput(
    [
      conflict,
      "AGENCIA TRIBUTARIA",
      "sede.agenciatributaria.gob.es",
      "PROVIDENCIA DE APREMIO",
      "IDENTIFICACION DEL DOCUMENTO",
      "IMPORTE DE LA DEUDA",
      "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
      "ANEXO I",
      "CALCULO DE INTERESES",
    ].join("\n"),
  );
  return projectFiscalNotificationPdfWorkerAnalysis({
    textLayerStatus: "TEXT_LAYER_AVAILABLE",
    pageCount: 1,
    familyAnalysis: extractFiscalNotificationCandidates(input),
    enforcementMoneyFacts: null,
  });
}

function mutableAnalysis(
  value = enforcementAnalysis(),
): MutableAnalysis {
  return JSON.parse(JSON.stringify(value)) as MutableAnalysis;
}

function mutableMoneyFacts(value: unknown): MutableMoneyFacts {
  return JSON.parse(JSON.stringify(value)) as MutableMoneyFacts;
}

describe("fiscal notification PDF Worker safe analysis contract", () => {
  it("projects only closed family metadata and ephemeral money facts", () => {
    const analysis = enforcementAnalysis();

    expect(analysis).toMatchObject({
      schemaVersion: 1,
      analysisVersion: "1.0.0",
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: {
        reason: "SUPPORTED_FAMILY_CANDIDATE",
        candidates: [
          { familyId: "AEAT_ENFORCEMENT_ORDER_CANDIDATE" },
        ],
      },
      enforcementMoneyFacts: {
        outcome: "FACTS_AVAILABLE",
        facts: [
          { kind: "OUTSTANDING_PRINCIPAL", amountCents: 10_000 },
          { kind: "ORDINARY_ENFORCEMENT_SURCHARGE", amountCents: 2_000 },
          { kind: "PAYMENT_ON_ACCOUNT", amountCents: 0 },
          { kind: "DOCUMENT_TOTAL", amountCents: 12_000 },
        ],
      },
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
      retainedSourceContent: "NONE",
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    const serialized = JSON.stringify(analysis);
    expect(serialized).not.toContain(PRIVATE_SENTINEL);
    expect(serialized).not.toMatch(
      /"(?:ownerScope|documentId|filename|bytes|pages|text|rawValue|textSnippet|nif|csv)"/i,
    );
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(Object.isFrozen(analysis.familyAnalysis)).toBe(true);
    expect(Object.isFrozen(analysis.familyAnalysis?.candidates)).toBe(true);
    expect(Object.isFrozen(analysis.enforcementMoneyFacts)).toBe(true);
    expect(Object.isFrozen(analysis.enforcementMoneyFacts?.facts)).toBe(true);
    expect(
      Object.isFrozen(analysis.enforcementMoneyFacts?.facts[0]?.evidence[0]),
    ).toBe(true);
  });

  it("represents a textless PDF without fabricating analysis", () => {
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "NO_EXTRACTABLE_TEXT",
      pageCount: 2,
      familyAnalysis: null,
      enforcementMoneyFacts: null,
    });
    expect(analysis).toMatchObject({
      textLayerStatus: "NO_EXTRACTABLE_TEXT",
      pageCount: 2,
      familyAnalysis: null,
      enforcementMoneyFacts: null,
    });
  });

  it("keeps the enforcement money reader inapplicable to deferrals", () => {
    const analysis = deferralAnalysis();
    expect(analysis.familyAnalysis).toMatchObject({
      reason: "SUPPORTED_FAMILY_CANDIDATE",
      candidates: [{ familyId: "AEAT_DEFERRAL_GRANT_CANDIDATE" }],
    });
    expect(analysis.enforcementMoneyFacts).toBeNull();
  });

  it.each([
    ["COMUNICACION ADMINISTRATIVA SINTETICA", "NO_SUPPORTED_FAMILY_SIGNAL"],
    ["PROVIDENCIA DE APREMIO", "PARTIAL_SUPPORTED_FAMILY_SIGNAL"],
    [
      `GUIA PARA INTERPRETAR\n${ENFORCEMENT_TEXT}`,
      "CONFLICTING_DOCUMENT_SIGNAL",
    ],
    [`${ENFORCEMENT_TEXT}\n\u202e`, "UNSUPPORTED_TEXT_CONTROLS"],
    [
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "IDENTIFICACION DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
        "CONCESION DEL APLAZAMIENTO O FRACCIONAMIENTO",
        "ANEXO I",
        "CALCULO DE INTERESES",
      ].join("\n"),
      "AMBIGUOUS_SUPPORTED_FAMILIES",
    ],
  ] as const)("accepts the engine's closed %s state", (text, reason) => {
    const input = documentInput(text);
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: extractFiscalNotificationCandidates(input),
      enforcementMoneyFacts: null,
    });
    expect(analysis.familyAnalysis?.reason).toBe(reason);
    expect(analysis.enforcementMoneyFacts).toBeNull();
  });

  it("defensively snapshots a structured-clone-like response", () => {
    const source = mutableAnalysis();
    const parsed = parseFiscalNotificationPdfWorkerAnalysis(source);
    source.pageCount = 80;
    source.familyAnalysis!.reason = "PRIVATE_MUTATION" as never;
    source.enforcementMoneyFacts!.facts[0]!.amountCents = 99_999;

    expect(parsed.pageCount).toBe(1);
    expect(parsed.familyAnalysis?.reason).toBe(
      "SUPPORTED_FAMILY_CANDIDATE",
    );
    expect(parsed.enforcementMoneyFacts?.facts[0]?.amountCents).toBe(10_000);
    expect(JSON.stringify(parsed)).not.toContain("PRIVATE_MUTATION");
  });

  it.each([
    (value: MutableAnalysis) => {
      value.privateTaxId = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.rawValue = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.candidates[0]!.privateCsv = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.familyAnalysis!.candidates[0]!.matchedAnchors[0]!.textSnippet =
        PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.rawText = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.facts[0]!.rawValue = PRIVATE_SENTINEL;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.facts[0]!.evidence[0]!.lineNumber = 7;
    },
    (value: MutableAnalysis) => {
      value.enforcementMoneyFacts!.issues.push({
        code: "NO_CLOSED_LABEL_MATCH",
        kind: "DOCUMENT_TOTAL",
        pageNumbers: [1],
        privateValue: PRIVATE_SENTINEL,
      });
    },
  ])("rejects unknown keys at every response level", (mutate) => {
    const value = mutableAnalysis();
    mutate(value);
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects accessors, symbols, exotic prototypes and sparse arrays", () => {
    const accessor = mutableAnalysis();
    const getter = () => PRIVATE_SENTINEL;
    Object.defineProperty(accessor, "privateCsv", { get: getter });

    const symbol = mutableAnalysis();
    Object.defineProperty(symbol, Symbol("private"), { value: PRIVATE_SENTINEL });

    const exotic = Object.assign(Object.create({ inherited: true }),
      mutableAnalysis(),
    );

    const sparse = mutableAnalysis();
    sparse.familyAnalysis!.candidates.length = 2;

    for (const value of [accessor, symbol, exotic, sparse]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    1.5,
    100_000_000_001,
  ])("rejects the unsafe cents value %j", (amountCents) => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.facts[0]!.amountCents = amountCents;
    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects duplicate kinds and invalid evidence provenance", () => {
    const duplicate = mutableAnalysis();
    duplicate.enforcementMoneyFacts!.facts[1]!.kind =
      "OUTSTANDING_PRINCIPAL";

    const wrongLabel = mutableAnalysis();
    wrongLabel.enforcementMoneyFacts!.facts[0]!.evidence[0]!.label =
      "DOCUMENT_TOTAL_LABEL";

    const impossiblePage = mutableAnalysis();
    impossiblePage.enforcementMoneyFacts!.facts[0]!.evidence[0]!.pageNumber =
      2;

    for (const value of [duplicate, wrongLabel, impossiblePage]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("requires every absent covered money kind to remain explicitly pending", () => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.facts = [
      value.enforcementMoneyFacts!.facts[0]!,
    ];
    value.enforcementMoneyFacts!.issues = [];

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("rejects available facts accompanied by a blocking money issue", () => {
    const value = mutableAnalysis();
    value.enforcementMoneyFacts!.issues.push({
      code: "SECTION_SCAN_LIMIT_EXCEEDED",
      kind: null,
      pageNumbers: [1],
    });

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("binds money evidence to the enforcement amount-section anchor", () => {
    const value = mutableAnalysis();
    value.pageCount = 2;
    value.enforcementMoneyFacts!.facts[0]!.evidence[0]!.pageNumber = 2;

    expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
      FiscalNotificationPdfWorkerAnalysisError,
    );
  });

  it("accepts partial facts only when every absent kind stays pending", () => {
    const input = documentInput(
      [
        "AGENCIA TRIBUTARIA",
        "sede.agenciatributaria.gob.es",
        "PROVIDENCIA DE APREMIO",
        "IDENTIFICACION DEL DOCUMENTO",
        "IMPORTE DE LA DEUDA",
        "Principal pendiente: 100,00 EUR",
      ].join("\n"),
    );
    const analysis = projectFiscalNotificationPdfWorkerAnalysis({
      textLayerStatus: "TEXT_LAYER_AVAILABLE",
      pageCount: 1,
      familyAnalysis: extractFiscalNotificationCandidates(input),
      enforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
    });

    expect(analysis.enforcementMoneyFacts).toMatchObject({
      outcome: "FACTS_AVAILABLE",
      facts: [{ kind: "OUTSTANDING_PRINCIPAL", amountCents: 10_000 }],
      issues: [
        { code: "NO_CLOSED_LABEL_MATCH", kind: "ORDINARY_ENFORCEMENT_SURCHARGE" },
        { code: "NO_CLOSED_LABEL_MATCH", kind: "PAYMENT_ON_ACCOUNT" },
        { code: "NO_CLOSED_LABEL_MATCH", kind: "DOCUMENT_TOTAL" },
      ],
    });
  });

  it("rejects unsorted, duplicate and out-of-range page traces", () => {
    const values = [
      [1, 1],
      [2, 1],
      [2],
      [0],
    ];
    for (const pageNumbers of values) {
      const value = mutableAnalysis();
      value.familyAnalysis!.candidates[0]!.matchedAnchors[0]!.pageNumbers =
        pageNumbers;
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("binds page-one domain and structural-header provenance", () => {
    const domainOffFirstPage = mutableAnalysis();
    domainOffFirstPage.pageCount = 2;
    const domainAnchor = domainOffFirstPage.familyAnalysis!.candidates[0]!
      .matchedAnchors.find(
        (anchor) => anchor.anchorId === "AEAT_OFFICIAL_DOMAIN_LABEL",
      );
    if (!domainAnchor) throw new Error("Synthetic domain anchor missing");
    domainAnchor.pageNumbers = [2];

    const titleOffFirstPage = mutableAnalysis();
    titleOffFirstPage.pageCount = 2;
    const titleAnchor = titleOffFirstPage.familyAnalysis!.candidates[0]!
      .matchedAnchors.find(
        (anchor) => anchor.anchorId === "ENFORCEMENT_ORDER_TITLE",
      );
    if (!titleAnchor) throw new Error("Synthetic title anchor missing");
    titleAnchor.pageNumbers = [2];

    for (const value of [domainOffFirstPage, titleOffFirstPage]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it.each([
    [
      "TESORERIA GENERAL DE LA SEGURIDAD SOCIAL",
      "CONFLICTING_AUTHORITY_OR_TERRITORY",
    ],
    ["GUIA PARA INTERPRETAR", "CONFLICTING_DOCUMENT_SIGNAL"],
  ] as const)(
    "rejects a mixed candidate state for the global conflict %s",
    (conflict, expectedReason) => {
      const value = mutableAnalysis(conflictingAnalysis(conflict));
      expect(value.familyAnalysis?.reason).toBe(expectedReason);
      expect(value.familyAnalysis?.candidates).toHaveLength(2);
      const candidate = value.familyAnalysis!.candidates[1]!;
      candidate.signalStatus = "COMPLETE_REQUIRED_ANCHORS";
      candidate.conflictingAnchorIds = [];
      candidate.matchedAnchors = candidate.matchedAnchors.filter(
        (anchor) =>
          !String(anchor.anchorId).startsWith("CONFLICTING_"),
      );

      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    },
  );

  it("rejects incoherent text, family and money combinations", () => {
    const noTextWithFamily = mutableAnalysis();
    noTextWithFamily.textLayerStatus = "NO_EXTRACTABLE_TEXT";

    const textWithoutFamily = mutableAnalysis();
    textWithoutFamily.familyAnalysis = null;

    const enforcementWithoutMoney = mutableAnalysis();
    enforcementWithoutMoney.enforcementMoneyFacts = null;

    const deferralWithMoney = mutableAnalysis(deferralAnalysis());
    deferralWithMoney.enforcementMoneyFacts = mutableMoneyFacts(
      enforcementAnalysis().enforcementMoneyFacts,
    );

    for (const value of [
      noTextWithFamily,
      textWithoutFamily,
      enforcementWithoutMoney,
      deferralWithMoney,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("rejects impossible outcome and fact combinations", () => {
    const factsWithoutOutcome = mutableAnalysis();
    factsWithoutOutcome.enforcementMoneyFacts!.outcome = "INFORMATION_PENDING";
    factsWithoutOutcome.enforcementMoneyFacts!.status = "INFORMATION_PENDING";

    const availableWithoutFacts = mutableAnalysis();
    availableWithoutFacts.enforcementMoneyFacts!.facts = [];

    const blockedWithFacts = mutableAnalysis();
    blockedWithFacts.enforcementMoneyFacts!.outcome = "PROCESSING_BLOCKED";

    for (const value of [
      factsWithoutOutcome,
      availableWithoutFacts,
      blockedWithFacts,
    ]) {
      expect(() => parseFiscalNotificationPdfWorkerAnalysis(value)).toThrow(
        FiscalNotificationPdfWorkerAnalysisError,
      );
    }
  });

  it("contains no network, AI, persistence, clock or operational action", () => {
    const source = readFileSync(
      new URL("./pdf-worker-analysis-contract.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|new Date|Math\.random|console\.|payment-actions|prepareAccountingDraft|create.*(?:Debt|Payment|Deadline|Entry)/i,
    );
  });
});

interface MutableAnalysis extends Record<string | symbol, unknown> {
  textLayerStatus: string;
  pageCount: number;
  familyAnalysis: MutableFamilyAnalysis | null;
  enforcementMoneyFacts: MutableMoneyFacts | null;
}

interface MutableFamilyAnalysis extends Record<string, unknown> {
  reason: string;
  candidates: MutableCandidate[];
}

interface MutableCandidate extends Record<string, unknown> {
  familyId: string;
  signalStatus: string;
  matchedAnchors: Array<
    Record<string, unknown> & { anchorId: string; pageNumbers: number[] }
  >;
  conflictingAnchorIds: string[];
}

interface MutableMoneyFacts extends Record<string, unknown> {
  status: string;
  outcome: string;
  facts: MutableMoneyFact[];
  issues: Array<Record<string, unknown>>;
}

interface MutableMoneyFact extends Record<string, unknown> {
  kind: string;
  amountCents: number;
  evidence: Array<Record<string, unknown>>;
}
