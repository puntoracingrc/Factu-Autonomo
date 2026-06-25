import { describe, expect, it } from "vitest";
import {
  mapFiscalEvidencePersistenceRpcRowToResult,
  SupabaseFiscalEvidencePersistenceStore,
  type SupabaseFiscalEvidencePersistenceClient,
  type SupabaseFiscalEvidencePersistenceQueryResult,
} from "./supabase-store";

const NOW = "2026-06-25T15:30:00.000Z";
const HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const XML_DIGEST =
  "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

interface FakeRpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

class FakeRpcBuilder {
  constructor(
    private readonly result: SupabaseFiscalEvidencePersistenceQueryResult<
      Record<string, unknown> | null
    >,
  ) {}

  async single(): Promise<
    SupabaseFiscalEvidencePersistenceQueryResult<Record<string, unknown> | null>
  > {
    return this.result;
  }
}

class FakeClient implements SupabaseFiscalEvidencePersistenceClient {
  rpcCalls: FakeRpcCall[] = [];
  private rpcResult: SupabaseFiscalEvidencePersistenceQueryResult<
    Record<string, unknown> | null
  > = {
    data: null,
    error: null,
  };

  queueRpc(
    result: SupabaseFiscalEvidencePersistenceQueryResult<
      Record<string, unknown> | null
    >,
  ) {
    this.rpcResult = result;
  }

  rpc(functionName: string, args: Record<string, unknown>): FakeRpcBuilder {
    this.rpcCalls.push({ functionName, args });
    return new FakeRpcBuilder(this.rpcResult);
  }
}

function rpcRow(overrides: Record<string, unknown> = {}) {
  return {
    result_status: "created",
    reason: null,
    message: null,
    atomicity: "postgres_rpc",
    evidence_packet_id: "evidence-row-1",
    evidence_user_id: "user-a",
    evidence_environment: "test",
    evidence_record_id: "record-1",
    evidence_operation_id: "operation-1",
    evidence_record_sequence: 1,
    evidence_record_hash: HASH,
    evidence_previous_hash: null,
    evidence_payload_candidate_id: "payload-1",
    evidence_payload_validation_status: "valid",
    evidence_xml_candidate_digest: XML_DIGEST,
    evidence_finality: "internal_dry_run_evidence",
    evidence_transportable: false,
    evidence_created_at: NOW,
    evidence_metadata_safe: {
      phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
      evidencePacketPhase: "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
      source: "local_staging_internal_evidence",
      includesFullXml: false,
      includesDocumentMaterial: false,
      signed: false,
      aeatReady: false,
      payloadXmlMarkerPresent: true,
    },
    ...overrides,
  };
}

describe("mapFiscalEvidencePersistenceRpcRowToResult", () => {
  it("mapea created sin XML ni snapshots", () => {
    const result = mapFiscalEvidencePersistenceRpcRowToResult(rpcRow());

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.evidence).toMatchObject({
      id: "evidence-row-1",
      recordId: "record-1",
      payloadValidationStatus: "valid",
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("documentSnapshot");
    expect(serialized).not.toContain("service_role");
  });

  it("mapea existing", () => {
    const result = mapFiscalEvidencePersistenceRpcRowToResult(
      rpcRow({ result_status: "existing" }),
    );

    expect(result.status).toBe("existing");
  });

  it("mapea rechazo controlado", () => {
    expect(
      mapFiscalEvidencePersistenceRpcRowToResult({
        result_status: "rejected",
        reason: "metadata_unsafe",
        message: "Unsafe metadata",
      }),
    ).toEqual({
      status: "rejected",
      reason: "metadata_unsafe",
      message: "Unsafe metadata",
    });
  });

  it("mapea conflicto controlado", () => {
    expect(
      mapFiscalEvidencePersistenceRpcRowToResult({
        result_status: "conflict",
        reason: "chain_state_inconsistent",
        message: "Chain mismatch",
      }),
    ).toEqual({
      status: "conflict",
      reason: "chain_state_inconsistent",
      message: "Chain mismatch",
    });
  });
});

describe("SupabaseFiscalEvidencePersistenceStore", () => {
  it("llama a la RPC de evidencia con argumentos seguros", async () => {
    const client = new FakeClient();
    client.queueRpc({ data: rpcRow(), error: null });
    const store = new SupabaseFiscalEvidencePersistenceStore(client);

    const result = await store.createFiscalEvidencePacketLocalStaging({
      userId: "user-a",
      recordId: "record-1",
      payloadCandidateId: "payload-1",
      payloadValidationStatus: "valid",
      xmlCandidateDigest: XML_DIGEST,
      evidenceFinality: "internal_dry_run_evidence",
      transportable: false,
      createdAt: NOW,
      metadataSafe: {
        phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
        evidencePacketPhase: "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
        source: "local_staging_internal_evidence",
        includesFullXml: false,
        includesDocumentMaterial: false,
        signed: false,
        aeatReady: false,
        payloadXmlMarkerPresent: true,
      },
    });

    expect(result.status).toBe("created");
    expect(client.rpcCalls).toEqual([
      {
        functionName: "create_fiscal_evidence_packet_local_staging",
        args: {
          p_user_id: "user-a",
          p_record_id: "record-1",
          p_payload_candidate_id: "payload-1",
          p_payload_validation_status: "valid",
          p_xml_candidate_digest: XML_DIGEST,
          p_evidence_finality: "internal_dry_run_evidence",
          p_transportable: false,
          p_created_at: NOW,
          p_metadata_safe: {
            phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
            evidencePacketPhase:
              "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
            source: "local_staging_internal_evidence",
            includesFullXml: false,
            includesDocumentMaterial: false,
            signed: false,
            aeatReady: false,
            payloadXmlMarkerPresent: true,
          },
        },
      },
    ]);
    const serialized = JSON.stringify(client.rpcCalls);
    expect(serialized).not.toContain("<FiscalPayloadCandidate");
    expect(serialized).not.toContain("document_snapshot");
    expect(serialized).not.toContain("payloadDocument");
    expect(serialized).not.toContain("service_role");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });

  it("convierte errores DB en errores tipados", async () => {
    const client = new FakeClient();
    client.queueRpc({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const store = new SupabaseFiscalEvidencePersistenceStore(client);

    await expect(
      store.createFiscalEvidencePacketLocalStaging({
        userId: "user-a",
        recordId: "record-1",
        payloadCandidateId: "payload-1",
        payloadValidationStatus: "valid",
        xmlCandidateDigest: XML_DIGEST,
        evidenceFinality: "internal_dry_run_evidence",
        transportable: false,
        createdAt: NOW,
        metadataSafe: {
          phase: "PHASE2B4R_S_FISCAL_EVIDENCE_LOCAL_STAGING_PERSISTENCE_V1",
          evidencePacketPhase:
            "PHASE2B4P_Q_FISCAL_PAYLOAD_VALIDATION_EVIDENCE_V1",
          source: "local_staging_internal_evidence",
          includesFullXml: false,
          includesDocumentMaterial: false,
          signed: false,
          aeatReady: false,
          payloadXmlMarkerPresent: true,
        },
      }),
    ).rejects.toMatchObject({
      name: "FiscalEvidencePersistenceStoreError",
      operation: "create_fiscal_evidence_packet_local_staging",
      causeCode: "42501",
    });
  });
});
