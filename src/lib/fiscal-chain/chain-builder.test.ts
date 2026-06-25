import { describe, expect, it } from "vitest";
import { FiscalChainError } from "./errors";
import {
  assertPreviousHashConsistency,
  buildFiscalChainLinkCandidate,
  buildFiscalChainLinkCandidateResult,
  buildFiscalHashInputCandidate,
  normalizeFiscalHashAlgorithmCandidate,
} from "./index";
import type { FiscalRecordCandidate } from "@/lib/fiscal-records/types";

const PREVIOUS_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function record(
  overrides: Partial<FiscalRecordCandidate> = {},
): FiscalRecordCandidate {
  return {
    candidate: true,
    finality: "candidate_not_aeat",
    operationId: "operation-1",
    invoiceIdentityId: "identity-1",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    recordTypeCandidate: "alta",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    schemaVersionCandidate: "phase2b4j-record-candidate-v1",
    recordTimestampCandidate: "2026-06-25T12:30:00.000Z",
    hashInputCandidate: "{}",
    ...overrides,
  };
}

describe("buildFiscalHashInputCandidate", () => {
  it("construye hash input estable", () => {
    const first = buildFiscalHashInputCandidate({
      record: record(),
      previousRecordId: "record-previous",
      previousHash: PREVIOUS_HASH,
    });
    const second = buildFiscalHashInputCandidate({
      record: record(),
      previousRecordId: "record-previous",
      previousHash: PREVIOUS_HASH,
    });

    expect(first.canonicalInput).toBe(second.canonicalInput);
    expect(first.input).toMatchObject({
      marker: "PHASE2B4K_HASH_INPUT_CANDIDATE",
      issuerNif: "B12345678",
      environment: "test",
      recordTypeCandidate: "alta",
      numserie: "F-2026-0001",
      fechaExpedicion: "2026-06-25",
      operationId: "operation-1",
      documentSnapshotHash: "fnv1a32:aaaaaaaa",
      previousHash: PREVIOUS_HASH,
      hashAlgorithmCandidate: "sha256-candidate",
    });
  });

  it("cambia si cambia previousHash", () => {
    const first = buildFiscalHashInputCandidate({
      record: record(),
      previousRecordId: "record-previous",
      previousHash: PREVIOUS_HASH,
    });
    const second = buildFiscalHashInputCandidate({
      record: record(),
      previousRecordId: "record-previous",
      previousHash:
        "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    expect(first.canonicalInput).not.toBe(second.canonicalInput);
  });

  it("cambia si cambia documentSnapshotHash", () => {
    const first = buildFiscalHashInputCandidate({ record: record() });
    const second = buildFiscalHashInputCandidate({
      record: record({ documentSnapshotHash: "fnv1a32:cccccccc" }),
    });

    expect(first.canonicalInput).not.toBe(second.canonicalInput);
  });

  it("permite primer registro sin previousHash", () => {
    const first = buildFiscalHashInputCandidate({ record: record() });

    expect(first.input.previousRecordId).toBeNull();
    expect(first.input.previousHash).toBeNull();
  });

  it("registro posterior exige previousHash", () => {
    expect(() =>
      buildFiscalHashInputCandidate({
        record: record(),
        previousRecordId: "record-previous",
      }),
    ).toThrow(FiscalChainError);
    expect(
      buildFiscalChainLinkCandidateResult({
        record: record(),
        previousRecordId: "record-previous",
      }),
    ).toMatchObject({
      status: "rejected",
      reason: "previous_hash_missing",
    });
  });

  it("rechaza previousRecordId sin previousHash y previousHash no normalizado", () => {
    expect(() =>
      assertPreviousHashConsistency({ previousRecordId: "record-previous" }),
    ).toThrow(FiscalChainError);
    expect(() =>
      assertPreviousHashConsistency({
        previousHash:
          "sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).toThrow(FiscalChainError);
    expect(
      buildFiscalChainLinkCandidateResult({
        record: record(),
        previousHash:
          "sha256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      }),
    ).toMatchObject({
      status: "rejected",
      reason: "previous_hash_not_normalized",
    });
  });

  it("rechaza issuerNif y timestamp ausentes", () => {
    expect(() =>
      buildFiscalHashInputCandidate({ record: record({ issuerNif: "" }) }),
    ).toThrow(FiscalChainError);
    expect(() =>
      buildFiscalHashInputCandidate({
        record: record({ recordTimestampCandidate: "" }),
      }),
    ).toThrow(FiscalChainError);
  });

  it("normaliza algoritmo candidato soportado", () => {
    expect(normalizeFiscalHashAlgorithmCandidate()).toBe("sha256-candidate");
    expect(() => normalizeFiscalHashAlgorithmCandidate("sha512")).toThrow(
      FiscalChainError,
    );
  });
});

describe("buildFiscalChainLinkCandidate", () => {
  it("construye link con hash tecnico preliminar no final", () => {
    const link = buildFiscalChainLinkCandidate({
      record: record(),
      previousRecordId: "record-previous",
      previousHash: PREVIOUS_HASH,
    });

    expect(link).toMatchObject({
      candidate: true,
      finality: "candidate_not_final",
      operationId: "operation-1",
      recordTypeCandidate: "alta",
      previousRecordId: "record-previous",
      previousHash: PREVIOUS_HASH,
      hashAlgorithmCandidate: "sha256-candidate",
    });
    expect(link.technicalHashCandidate).toMatch(
      /^candidate_not_final:sha256:[a-f0-9]{64}$/,
    );
  });

  it("no escribe DB ni genera XML", () => {
    const link = buildFiscalChainLinkCandidate({ record: record() });
    const serialized = JSON.stringify(link);

    expect(serialized).not.toContain("xml");
    expect(serialized).not.toContain("AEAT");
    expect(serialized).not.toContain("fiscal_chain_state");
    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain(".insert");
    expect(serialized).not.toContain(".update");
  });
});
