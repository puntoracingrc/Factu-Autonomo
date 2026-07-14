import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "../app-data-durability";
import { EMPTY_DATA, type AppData } from "../types";
import { extractAeatEnforcementExplicitFieldsV2 } from "./aeat-enforcement-explicit-fields.v2";
import { extractAeatEnforcementMoneyFacts } from "./aeat-enforcement-money-facts";
import { extractAeatEnforcementPartyFactsV1 } from "./aeat-enforcement-party-facts.v1";
import { extractFiscalNotificationCandidates } from "./extraction-dispatcher";
import type { BoundedDocumentInput } from "./input-contract";
import type {
  FiscalNotificationLocalAnalysisResult,
  FiscalNotificationLocalReviewResult,
} from "./local-review-flow";
import { runSaveFiscalNotificationStructuredReviewCommandV1 } from "./structured-review-save-command.v1";

const OWNER = "user:00000000-0000-4000-8000-000000000071";
const FOREIGN_OWNER = "user:00000000-0000-4000-8000-000000000072";
const REVIEW_ID = "review:00000000-0000-4000-8000-000000000073";
const CREATED_AT = "2026-07-14T10:00:00.000Z";
const HASH = "b".repeat(64);

const DOCUMENT_TEXT = [
  "AGENCIA TRIBUTARIA",
  "sede.agenciatributaria.gob.es",
  "PROVIDENCIA DE APREMIO",
  "IDENTIFICACION DEL DOCUMENTO",
  "IMPORTE DE LA DEUDA",
  "Principal pendiente: 1.234,56 EUR",
  "Recargo de apremio ordinario (20 %): 246,91 EUR",
  "Importe total: 1.481,47 EUR",
  "IDENTIFICACION DEL OBLIGADO AL PAGO",
  "NOMBRE O RAZON SOCIAL: PERSONA SINTETICA",
  "NIF: 12345678Z",
  "Clave de liquidación: LQ-SYNTH-071",
  "Código Seguro de Verificación (CSV): CSV-SYNTH-071",
  "Fecha de emisión: 05/02/2026",
].join("\n");

function documentInput(): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: OWNER,
    documentId: "notification-review:synthetic-save",
    pages: Object.freeze([
      Object.freeze({
        pageNumber: 1,
        text: DOCUMENT_TEXT,
        isBlank: false,
      }),
    ]),
  });
}

function analysis(): FiscalNotificationLocalAnalysisResult {
  const input = documentInput();
  const extraction = extractFiscalNotificationCandidates(input);
  const technicalReview: FiscalNotificationLocalReviewResult = Object.freeze({
    schemaVersion: 1,
    flowVersion: "1.0.0",
    status: extraction.status,
    reason: extraction.reason,
    engineId: extraction.engineId,
    engineVersion: extraction.engineVersion,
    pageCount: 1,
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
          matchedAnchors: candidate.matchedAnchors.map((anchor) => ({
            anchorId: anchor.anchorId,
            pageNumbers: [...anchor.pageNumbers],
          })),
          missingRequiredAnchorIds: [...candidate.missingRequiredAnchorIds],
          conflictingAnchorIds: [...candidate.conflictingAnchorIds],
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
  return Object.freeze({
    schemaVersion: 4,
    analysisVersion: "4.0.0",
    technicalReview,
    ephemeralEnforcementMoneyFacts: extractAeatEnforcementMoneyFacts(input),
    ephemeralEnforcementExplicitFields:
      extractAeatEnforcementExplicitFieldsV2(input),
    ephemeralEnforcementPartyFacts: extractAeatEnforcementPartyFactsV1(input),
    sourceContentPolicy: "EPHEMERAL_IN_MEMORY_DO_NOT_PERSIST",
    requiresHumanReview: true,
    materializationPolicy: "PROHIBITED_UNTIL_REVIEW",
  });
}

function commandInput(options?: {
  expected?: AppData;
  ownerScope?: string;
  current?: AppData;
  persistStatus?: "applied" | "blocked" | "indeterminate";
}) {
  const expected = options?.expected ?? structuredClone(EMPTY_DATA);
  const current = options?.current ?? expected;
  const persist = vi.fn(() =>
    options?.persistStatus === "blocked"
      ? ({ status: "blocked", reason: "write_failed" } as const)
      : options?.persistStatus === "indeterminate"
        ? ({ status: "indeterminate", reason: "storage_state_unknown" } as const)
        : ({ status: "applied" } as const),
  );
  const commit = <T>(
    baseline: AppData,
    build: (previous: AppData) => { data: AppData; value: T },
  ) =>
    commitAppDataDurably({
      expected: baseline,
      getCurrent: () => current,
      build,
      persist,
    });
  return {
    persist,
    value: {
      expected,
      ownerScope: options?.ownerScope ?? OWNER,
      reviewId: REVIEW_ID,
      createdAt: CREATED_AT,
      analysis: analysis(),
      commit,
    },
  };
}

describe("structured fiscal notification save command v1", () => {
  it("guarda una única transición durable con los hechos exactos", () => {
    const input = commandInput();
    const before = structuredClone(input.value.expected);

    const result = runSaveFiscalNotificationStructuredReviewCommandV1(
      input.value,
    );

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(false);
    expect(result.value.status).toBe("APPLIED");
    expect(result.data.fiscalNotificationsWorkspace?.documents[0]).toMatchObject({
      titleRaw: "Providencia de apremio AEAT",
      subjectParty: {
        displayName: "PERSONA SINTETICA",
        taxIdNormalized: "12345678Z",
      },
    });
    expect(
      result.data.fiscalNotificationsWorkspace?.analysisSnapshots[0]?.structuredData
        .administrativeDomain?.moneyFacts,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "OUTSTANDING_PRINCIPAL",
          amountCents: 123_456,
        }),
      ]),
    );
    expect(input.persist).toHaveBeenCalledTimes(1);
    expect(input.value.expected).toEqual(before);
    expect(JSON.stringify(result.data)).not.toContain(DOCUMENT_TEXT);
  });

  it("bloquea una precondición obsoleta sin escribir", () => {
    const expected = structuredClone(EMPTY_DATA);
    const input = commandInput({
      expected,
      current: { ...expected, customers: [{ id: "changed" }] as never },
    });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(input.value)).toEqual({
      status: "blocked",
      reason: "stale_precondition",
    });
    expect(input.persist).not.toHaveBeenCalled();
  });

  it("propaga un estado de almacenamiento indeterminado sin afirmar guardado", () => {
    const input = commandInput({ persistStatus: "indeterminate" });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(input.value)).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
  });

  it("rechaza un owner distinto del workspace existente", () => {
    const first = commandInput();
    const applied = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const foreign = commandInput({
      expected: applied.data,
      ownerScope: FOREIGN_OWNER,
    });

    expect(runSaveFiscalNotificationStructuredReviewCommandV1(foreign.value)).toEqual({
      status: "blocked",
      reason: "invalid_structured_review",
    });
    expect(foreign.persist).not.toHaveBeenCalled();
  });

  it("deduplica por huella sin una segunda escritura", () => {
    const first = commandInput();
    const applied = runSaveFiscalNotificationStructuredReviewCommandV1(
      first.value,
    );
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const replay = commandInput({ expected: applied.data });

    const result = runSaveFiscalNotificationStructuredReviewCommandV1({
      ...replay.value,
      reviewId: "review:00000000-0000-4000-8000-000000000074",
      createdAt: "2026-07-14T10:01:00.000Z",
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") return;
    expect(result.replayed).toBe(true);
    expect(result.value.status).toBe("EXISTING");
    expect(result.data).toBe(applied.data);
    expect(replay.persist).not.toHaveBeenCalled();
  });

  it("no guarda una clasificación sin hechos estructurados exactos", () => {
    const input = commandInput();
    const emptyAnalysis: FiscalNotificationLocalAnalysisResult = {
      ...input.value.analysis,
      ephemeralEnforcementMoneyFacts: null,
      ephemeralEnforcementExplicitFields: null,
      ephemeralEnforcementPartyFacts: null,
    };

    expect(
      runSaveFiscalNotificationStructuredReviewCommandV1({
        ...input.value,
        analysis: emptyAnalysis,
      }),
    ).toEqual({ status: "blocked", reason: "no_structured_facts" });
    expect(input.persist).not.toHaveBeenCalled();
  });
});
