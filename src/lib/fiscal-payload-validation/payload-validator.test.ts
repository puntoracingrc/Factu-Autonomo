import { describe, expect, it } from "vitest";
import {
  FISCAL_PAYLOAD_CANDIDATE_XML_MARKER,
  type FiscalPayloadCandidate,
} from "@/lib/fiscal-payload-candidate";
import { validateFiscalPayloadCandidate } from "./payload-validator";

const NOW = "2026-06-25T15:10:00.000Z";
const RECORD_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PREVIOUS_HASH =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function candidate(
  overrides: Record<string, unknown> = {},
): FiscalPayloadCandidate & Record<string, unknown> {
  const base: FiscalPayloadCandidate = {
    payloadCandidateId: "payload-candidate:record-1:phase2b4n-o-payload-candidate-v1",
    recordId: "record-1",
    operationId: "operation-1",
    recordType: "alta",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordHash: RECORD_HASH,
    previousRecordId: null,
    previousHash: null,
    recordSequence: 1,
    environment: "test",
    generatedAtCandidate: NOW,
    formatVersionCandidate: "phase2b4n-o-payload-candidate-v1",
    finality: "candidate_not_aeat",
    transportable: false,
    candidateXml: `<FiscalPayloadCandidate marker="${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER}" finality="candidate_not_aeat" transportable="false" />`,
    safeMetadata: {
      source: "local_staging_fiscal_record_chain",
      phase: "PHASE2B4N_O_FISCAL_PAYLOAD_CANDIDATE_LOCAL_ACCEPTANCE_V1",
      aeatReady: false,
      signed: false,
    },
  };
  return {
    ...base,
    ...overrides,
  };
}

function expectRejectedCode(
  payload: unknown,
  code: string,
) {
  const result = validateFiscalPayloadCandidate(payload, { checkedAt: NOW });
  expect(result.status).toBe("rejected");
  if (result.status !== "rejected") return;
  expect(result.errors.map((error) => error.code)).toContain(code);
}

describe("validateFiscalPayloadCandidate", () => {
  it("valida payload candidato valido", () => {
    const result = validateFiscalPayloadCandidate(candidate(), {
      checkedAt: NOW,
    });

    expect(result).toMatchObject({
      status: "valid",
      checkedAt: NOW,
      errors: [],
    });
  });

  it("valida alta y anulacion", () => {
    expect(validateFiscalPayloadCandidate(candidate()).status).toBe("valid");
    expect(
      validateFiscalPayloadCandidate(
        candidate({
          recordId: "record-2",
          operationId: "operation-2",
          recordType: "anulacion",
          previousRecordId: "record-1",
          previousHash: PREVIOUS_HASH,
          recordSequence: 2,
        }),
      ).status,
    ).toBe("valid");
  });

  it("rechaza falta de recordHash", () => {
    expectRejectedCode(candidate({ recordHash: "" }), "record_hash_missing");
  });

  it("rechaza falta de previousHash en secuencia mayor que 1", () => {
    expectRejectedCode(
      candidate({ recordSequence: 2, previousRecordId: "record-1" }),
      "previous_hash_missing",
    );
  });

  it("rechaza hashes no normalizados y cadena de primer registro incoherente", () => {
    expectRejectedCode(
      candidate({ recordHash: "candidate_not_final:sha256:abc" }),
      "record_hash_not_normalized",
    );
    expectRejectedCode(
      candidate({
        previousRecordId: "record-previous",
        previousHash: PREVIOUS_HASH,
      }),
      "first_record_previous_hash_present",
    );
  });

  it("rechaza transportable true y finality incorrecta", () => {
    expectRejectedCode(candidate({ transportable: true }), "transportable_invalid");
    expectRejectedCode(
      candidate({ finality: "aeat_final" }),
      "finality_invalid",
    );
  });

  it("rechaza firma, certificado y endpoint AEAT", () => {
    expectRejectedCode(
      candidate({ candidateXml: `<Signature>${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER}</Signature>` }),
      "signature_detected",
    );
    expectRejectedCode(
      candidate({ candidateXml: `${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER} BEGIN CERTIFICATE` }),
      "certificate_detected",
    );
    expectRejectedCode(
      candidate({ candidateXml: `${FISCAL_PAYLOAD_CANDIDATE_XML_MARKER} agenciatributaria` }),
      "aeat_endpoint_detected",
    );
  });

  it("rechaza XML definitivo o no marcado", () => {
    expectRejectedCode(
      candidate({ candidateXml: "<FiscalPayloadFinal />" }),
      "candidate_xml_unmarked",
    );
  });

  it("rechaza transporte real, secretos y snapshots completos", () => {
    expectRejectedCode(
      candidate({ transportStatus: "ready" }),
      "transport_metadata_detected",
    );
    expectRejectedCode(candidate({ token: "secret-token" }), "secret_detected");
    expectRejectedCode(
      candidate({ documentSnapshot: { full: true } }),
      "document_snapshot_detected",
    );
  });

  it("mantiene errores tipados estables", () => {
    const result = validateFiscalPayloadCandidate(null, { checkedAt: NOW });
    expect(result).toMatchObject({
      status: "rejected",
      errors: [
        {
          code: "payload_missing",
        },
      ],
    });
  });
});
