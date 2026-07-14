import { describe, expect, it } from "vitest";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type { FiscalNotificationLocalReviewResult } from "./local-review-flow";
import {
  appendAeatEnforcementStructuredReviewV1,
  FiscalNotificationStructuredReviewV1Error,
} from "./structured-review-workspace.v1";
import { validateFiscalNotificationsWorkspaceIntegrity } from "./workspace-integrity";

const OWNER = "user:synthetic-structured-review";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000041";
const CREATED_AT = "2026-07-14T08:30:00.000Z";
const HASH = "a".repeat(64);
const PRIVATE_NAME = "PERSONA SINTETICA ESTRUCTURADA";
const PRIVATE_TAX_ID = "12345678Z";
const PRIVATE_RAW_PARAGRAPH =
  "PARRAFO PRIVADO IRRELEVANTE QUE NO DEBE QUEDAR GUARDADO";

const COMPLETE_DOCUMENT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 1.234,56 EUR",
  "Recargo de apremio ordinario (20 %): 246,91 EUR",
  "Ingreso a cuenta: 0,00 EUR",
  "Importe total: 1.481,47 EUR",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  `NOMBRE O RAZON SOCIAL: ${PRIVATE_NAME}`,
  `NIF: ${PRIVATE_TAX_ID}`,
  "Clave de liquidación: LQ-SYNTH-001",
  "Referencia del documento: REF-SYNTH-002",
  "Número de justificante: JUST-SYNTH-003",
  "Código Seguro de Verificación (CSV): CSV-SYNTH-004",
  "Vto.: VTO-SYNTH-005",
  "Fecha de emisión: 05/02/2026",
  "Fecha de firma: 06-02-2026",
  "Fecha de finalización del período voluntario: 28/02/2026",
  PRIVATE_RAW_PARAGRAPH,
].join("\n");

function source(text = COMPLETE_DOCUMENT): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

function technicalReview(
  documentInput: BoundedDocumentInput = source(),
): FiscalNotificationLocalReviewResult {
  const extraction = extractFiscalNotificationCandidates(documentInput);
  return Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: documentInput.pages.length,
    byteLength: 4_096,
    sha256: HASH,
    candidates: Object.freeze(
      extraction.candidates.map((candidate) =>
        Object.freeze({
          familyId: candidate.familyId,
          ...(candidate.recognitionPolicyVersion
            ? { recognitionPolicyVersion: candidate.recognitionPolicyVersion }
            : {}),
          ...(candidate.segmentationVersion
            ? { segmentationVersion: candidate.segmentationVersion }
            : {}),
          documentType: candidate.documentType,
          authoritySignal: candidate.authoritySignal,
          handlerId: candidate.handlerId,
          handlerVersion: candidate.handlerVersion,
          signalStatus: candidate.signalStatus,
          matchedAnchors: Object.freeze(
            candidate.matchedAnchors.map((anchor) =>
              Object.freeze({
                anchorId: anchor.anchorId,
                pageNumbers: Object.freeze([...anchor.pageNumbers]),
              }),
            ),
          ),
          missingRequiredAnchorIds: Object.freeze([
            ...candidate.missingRequiredAnchorIds,
          ]),
          conflictingAnchorIds: Object.freeze([
            ...candidate.conflictingAnchorIds,
          ]),
          requiresHumanReview: true as const,
        }),
      ),
    ),
    selectedFamilyId: null,
    providerCalled: false,
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    retainedSourceContent: "NONE",
  });
}

function input(
  overrides: Partial<Parameters<typeof appendAeatEnforcementStructuredReviewV1>[0]> = {},
) {
  const documentInput = source();
  const technical = technicalReview(documentInput);
  return {
    ownerScope: OWNER,
    reviewId: REVIEW_ID,
    createdAt: CREATED_AT,
    workspace: null,
    analysis: Object.freeze({
      schemaVersion: 6 as const,
      analysisVersion: "6.0.0" as const,
      technicalReview: technical,
      ephemeralEnforcementMoneyFacts:
        extractAeatEnforcementMoneyFacts(documentInput),
      ephemeralEnforcementExplicitFields:
        extractAeatEnforcementExplicitFieldsV2(documentInput),
      ephemeralEnforcementPartyFacts:
        extractAeatEnforcementPartyFactsV1(documentInput),
      ephemeralDeferralGrantFacts: null,
      ephemeralOffsetAgreementFacts: null,
      sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST" as const,
      requiresHumanReview: true as const,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW" as const,
    }),
    ...overrides,
  };
}

function mutable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("structured fiscal notification review workspace v1", () => {
  it("keeps accepting historical engine 1.3 reviews after the 1.4 rollout", () => {
    const historical = mutable(input());

    const result = appendAeatEnforcementStructuredReviewV1({
      ...historical,
      analysis: {
        ...historical.analysis,
        technicalReview: {
          ...historical.analysis.technicalReview,
          engineVersion: "1.3.0",
        },
      },
    });

    expect(result.status).toBe("APPLIED");
    expect(result.workspace.analysisSnapshots[0]?.rulesVersion).toBe("1.3.0");
  });

  it("persists exact structured facts without retaining the PDF or raw text", () => {
    const candidate = input();
    const before = structuredClone(candidate);

    const result = appendAeatEnforcementStructuredReviewV1(candidate);

    expect(result.status).toBe("APPLIED");
    expect(result).toMatchObject({
      schemaVersion: 1,
      engineId: "fiscal-notification-structured-review-workspace",
      engineVersion: "1.0.0",
      sourceContentRetention: "NOT_RETAINED",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
    });
    expect(validateFiscalNotificationsWorkspaceIntegrity(result.workspace, OWNER)).toEqual({
      valid: true,
      issues: [],
    });
    expect(candidate).toEqual(before);

    const file = result.workspace.files[0];
    expect(file).toMatchObject({
      sourceContentRetention: "NOT_RETAINED",
      sha256: HASH,
      contentFingerprint: HASH,
      fileSize: 4_096,
      pageCount: 1,
    });
    expect(file).not.toHaveProperty("originalFilename");
    expect(file).not.toHaveProperty("storageReference");
    expect(file).not.toHaveProperty("isImmutableOriginal");

    const document = result.workspace.documents[0];
    expect(document).toMatchObject({
      documentType: "AEAT_ENFORCEMENT_ORDER",
      issueDate: "2026-02-05",
      signatureDate: "2026-02-06",
      subjectParty: {
        displayName: PRIVATE_NAME,
        taxIdNormalized: PRIVATE_TAX_ID,
        matchesBusinessProfile: "UNKNOWN",
      },
      analysisStatus: "NEEDS_REVIEW",
      humanReviewStatus: "PENDING",
      authenticityStatus: "NOT_CHECKED",
    });
    expect(result.workspace.references).toHaveLength(5);
    expect(result.workspace.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          referenceType: "LIQUIDATION_KEY",
          rawValue: "LQ-SYNTH-001",
          normalizedValue: "LQ-SYNTH-001",
          confirmationStatus: "PENDING",
        }),
        expect.objectContaining({
          referenceType: "CSV",
          rawValue: "CSV-SYNTH-004",
          confirmationStatus: "PENDING",
        }),
      ]),
    );

    const snapshot = result.workspace.analysisSnapshots[0];
    expect(snapshot?.structuredData.unknownFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labelRaw: "PRINTED_VOLUNTARY_PERIOD_END_DATE",
          valueRaw: "28/02/2026",
          confidence: "EXACT",
        }),
      ]),
    );
    expect(snapshot?.structuredData.administrativeDomain).toMatchObject({
      status: "REVIEW_REQUIRED",
      requiresHumanReview: true,
      materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
      roleAssertions: [
        expect.objectContaining({
          role: "TAX_DEBTOR",
          assertionType: "EXPLICIT_IN_DOCUMENT",
          confidence: 1,
        }),
      ],
      moneyFacts: [
        expect.objectContaining({
          kind: "OUTSTANDING_PRINCIPAL",
          amountCents: 123_456,
          status: "PROPOSED",
        }),
        expect.objectContaining({
          kind: "EXECUTIVE_SURCHARGE_20",
          amountCents: 24_691,
        }),
        expect.objectContaining({
          kind: "PAYMENT_ON_ACCOUNT",
          amountCents: 0,
        }),
        expect.objectContaining({
          kind: "DOCUMENT_TOTAL",
          amountCents: 148_147,
        }),
      ],
    });
    expect(result.workspace.debts).toEqual([]);
    expect(result.workspace.paymentOptions).toEqual([]);
    expect(result.workspace.paymentPlans).toEqual([]);
    expect(result.workspace.deadlineRules).toEqual([]);
    expect(result.workspace.obligations).toEqual([]);
    expect(result.workspace.accountingDrafts).toEqual([]);
    expect(result.workspace.relations).toEqual([]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(PRIVATE_RAW_PARAGRAPH);
    expect(serialized).not.toMatch(/private-document\.pdf|storage\/path|data:application\/pdf/i);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.workspace)).toBe(true);
    expect(Object.isFrozen(result.workspace.evidence)).toBe(true);
  });

  it("deduplicates the same source hash without changing revision or entities", () => {
    const first = appendAeatEnforcementStructuredReviewV1(input());
    const second = appendAeatEnforcementStructuredReviewV1(
      input({
        reviewId: "review:00000000-0000-4000-8000-000000000042",
        createdAt: "2026-07-14T08:31:00.000Z",
        workspace: first.workspace,
      }),
    );

    expect(second.status).toBe("EXISTING");
    expect(second.documentId).toBe(first.documentId);
    expect(second.workspace.revision).toBe(1);
    expect(second.workspace.documents).toHaveLength(1);
    expect(second.workspace.files).toHaveLength(1);
    expect(second.workspace).toEqual(first.workspace);
    expect(second.workspace).not.toBe(first.workspace);
  });

  it("preserves UNKNOWN currency instead of assuming EUR", () => {
    const analysis = mutable(input().analysis) as unknown as Record<
      string,
      unknown
    >;
    const money = analysis.ephemeralEnforcementMoneyFacts as Record<
      string,
      unknown
    >;
    const facts = money.facts as Record<string, unknown>[];
    facts[0]!.currency = "UNKNOWN";
    const result = appendAeatEnforcementStructuredReviewV1(
      input({
        analysis: analysis as unknown as Parameters<
          typeof appendAeatEnforcementStructuredReviewV1
        >[0]["analysis"],
      }),
    );

    expect(
      result.workspace.analysisSnapshots[0]?.structuredData.administrativeDomain
        ?.moneyFacts[0]?.currency,
    ).toBe("UNKNOWN");
  });

  it("rejects foreign workspaces, stale writes and unknown nested keys", () => {
    const first = appendAeatEnforcementStructuredReviewV1(input());
    const foreign = mutable(first.workspace);
    foreign.ownerScope = "user:foreign";
    expect(() =>
      appendAeatEnforcementStructuredReviewV1(
        input({ workspace: foreign, createdAt: "2026-07-14T08:31:00.000Z" }),
      ),
    ).toThrow(FiscalNotificationStructuredReviewV1Error);

    expect(() =>
      appendAeatEnforcementStructuredReviewV1(
        input({ workspace: first.workspace, createdAt: "2026-07-14T08:29:00.000Z" }),
      ),
    ).toThrow(FiscalNotificationStructuredReviewV1Error);

    const analysis = mutable(input().analysis) as unknown as Record<
      string,
      unknown
    >;
    const technical = analysis.technicalReview as Record<string, unknown>;
    const candidates = technical.candidates as Record<string, unknown>[];
    candidates[0]!.rawText = "PRIVATE_UNKNOWN_VALUE";
    expect(() =>
      appendAeatEnforcementStructuredReviewV1(
        input({
          analysis:
            analysis as unknown as Parameters<
              typeof appendAeatEnforcementStructuredReviewV1
            >[0]["analysis"],
        }),
      ),
    ).toThrow("FISCAL_NOTIFICATION_STRUCTURED_REVIEW_INVALID_INPUT");
  });

  it("does not persist a family gate without exact structured facts", () => {
    const analysis = mutable(input().analysis) as unknown as Record<
      string,
      unknown
    >;
    analysis.ephemeralEnforcementMoneyFacts = null;
    analysis.ephemeralEnforcementExplicitFields = null;
    analysis.ephemeralEnforcementPartyFacts = null;
    const candidate = input({
      analysis: analysis as unknown as Parameters<
        typeof appendAeatEnforcementStructuredReviewV1
      >[0]["analysis"],
    });
    expect(() => appendAeatEnforcementStructuredReviewV1(candidate)).toThrow(
      "FISCAL_NOTIFICATION_STRUCTURED_REVIEW_NO_STRUCTURED_FACTS",
    );
  });

  it("contains no clock, random, network, AI, browser storage or operational action", async () => {
    const sourceCode = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./structured-review-workspace.v1.ts", import.meta.url), "utf8"),
    );
    expect(sourceCode).not.toMatch(
      /\bfetch\s*\(|XMLHttpRequest|WebSocket|OpenAI|Anthropic|localStorage|sessionStorage|indexedDB|Date\.now|Math\.random|crypto\.randomUUID|create.*(?:Debt|Payment|Deadline|Entry)|prepareAccountingDraft/iu,
    );
  });
});
