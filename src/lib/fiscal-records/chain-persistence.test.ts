import { describe, expect, it } from "vitest";
import {
  FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION,
  FiscalRecordWithChainLocalStagingRepository,
  type FiscalChainHeadState,
  type FiscalRecordWithChainCreateInput,
  type FiscalRecordWithChainLocalStagingRecord,
  type FiscalRecordWithChainRepositoryStore,
  type FiscalRecordWithChainStoreResult,
} from "./chain-persistence";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "@/lib/fiscal-operations/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T14:20:00.000Z";
const PREVIOUS_HASH =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function operation(
  overrides: Partial<FiscalOperationRecord> = {},
): FiscalOperationRecord {
  return {
    id: "operation-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    idempotencyKey: "key-a",
    requestedBy: "user-a",
    requestedAt: NOW,
    expectedDocumentVersion: 9,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    status: "processing",
    completedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function identity(
  overrides: Partial<FiscalInvoiceIdentityRecord> = {},
): FiscalInvoiceIdentityRecord {
  return {
    id: "identity-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    createdAt: NOW,
    ...overrides,
  };
}

function serverDocument(
  overrides: Partial<ServerDocumentRecord> = {},
): Pick<ServerDocumentRecord, "id" | "snapshotHash" | "pdfContentHash"> {
  return {
    id: "server-doc-1",
    snapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    ...overrides,
  };
}

function chain(
  overrides: Partial<FiscalChainHeadState> = {},
): FiscalChainHeadState {
  return {
    userId: "user-a",
    environment: "test",
    issuerNif: "B12345678",
    lastRecordId: null,
    lastHash: null,
    recordCount: 0,
    updatedAt: NOW,
    ...overrides,
  };
}

function storedRecord(
  input: FiscalRecordWithChainCreateInput,
  head: FiscalChainHeadState | null,
): FiscalRecordWithChainLocalStagingRecord {
  return {
    id: input.operationId.replace("operation", "record"),
    userId: input.userId,
    operationId: input.operationId,
    invoiceIdentityId: "identity-1",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordTypeCandidate: "alta",
    recordSequence: (head?.recordCount ?? 0) + 1,
    previousRecordId: head?.lastRecordId ?? null,
    previousHash: head?.lastHash ?? null,
    recordHash: input.recordHash,
    hashAlgorithm: input.hashAlgorithm,
    recordTimestamp: input.recordTimestamp,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    schemaVersion: input.schemaVersion,
    rendererVersion: input.rendererVersion ?? null,
    createdAt: NOW,
  };
}

class MemoryChainStore implements FiscalRecordWithChainRepositoryStore {
  head: FiscalChainHeadState | null = null;
  calls: FiscalRecordWithChainCreateInput[] = [];
  conflictOnce = false;

  async findFiscalChainHead(): Promise<FiscalChainHeadState | null> {
    return this.head;
  }

  async createFiscalRecordWithChainLocalStaging(
    input: FiscalRecordWithChainCreateInput,
  ): Promise<FiscalRecordWithChainStoreResult> {
    this.calls.push(input);
    if (this.conflictOnce) {
      this.conflictOnce = false;
      this.head = chain({
        lastRecordId: "record-concurrent",
        lastHash: PREVIOUS_HASH,
        recordCount: 1,
      });
      return {
        status: "conflict",
        reason: "record_chain_head_changed",
        message: "Cabecera cambiada",
      };
    }

    const previous = this.head;
    const record = storedRecord(input, previous);
    this.head = chain({
      lastRecordId: record.id,
      lastHash: record.recordHash,
      recordCount: record.recordSequence,
    });
    return {
      status: "created",
      record,
      chain: this.head,
      atomicity: "postgres_rpc",
    };
  }
}

function repository(store: MemoryChainStore) {
  return new FiscalRecordWithChainLocalStagingRepository(store, {
    maxChainRetries: 3,
  });
}

function input(
  overrides: {
    operation?: Partial<FiscalOperationRecord>;
    identity?: Partial<FiscalInvoiceIdentityRecord> | null;
  } = {},
) {
  return {
    operation: operation(overrides.operation),
    invoiceIdentity:
      overrides.identity === null ? null : identity(overrides.identity ?? {}),
    serverDocument: serverDocument(),
    recordTimestamp: NOW,
    rendererVersion: "phase2b4m-test",
  };
}

describe("FiscalRecordWithChainLocalStagingRepository", () => {
  it("crea primer registro y cabecera de cadena", async () => {
    const store = new MemoryChainStore();
    const result = await repository(store).persistFiscalRecordWithChainLocalStaging(
      input(),
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.record.recordSequence).toBe(1);
    expect(result.record.previousRecordId).toBeNull();
    expect(result.record.previousHash).toBeNull();
    expect(result.chain.lastRecordId).toBe(result.record.id);
    expect(result.chain.lastHash).toBe(result.record.recordHash);
    expect(result.chain.recordCount).toBe(1);
    expect(store.calls[0]).toMatchObject({
      expectedPreviousRecordId: null,
      expectedPreviousHash: null,
      hashAlgorithm: "sha256-candidate",
      schemaVersion: FISCAL_RECORD_CHAIN_LOCAL_STAGING_SCHEMA_VERSION,
    });
    expect(JSON.stringify(result)).not.toContain("xml");
    expect(JSON.stringify(result)).not.toContain("AEAT");
  });

  it("encadena segundo registro usando cabecera previa", async () => {
    const store = new MemoryChainStore();
    store.head = chain({
      lastRecordId: "record-previous",
      lastHash: PREVIOUS_HASH,
      recordCount: 1,
    });

    const result = await repository(store).persistFiscalRecordWithChainLocalStaging(
      input({ operation: { id: "operation-2" } }),
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(store.calls[0]).toMatchObject({
      expectedPreviousRecordId: "record-previous",
      expectedPreviousHash: PREVIOUS_HASH,
    });
    expect(result.record.recordSequence).toBe(2);
    expect(result.record.previousRecordId).toBe("record-previous");
    expect(result.record.previousHash).toBe(PREVIOUS_HASH);
    expect(result.chain.recordCount).toBe(2);
  });

  it("reintenta si la cabecera cambia de forma concurrente", async () => {
    const store = new MemoryChainStore();
    store.conflictOnce = true;

    const result = await repository(store).persistFiscalRecordWithChainLocalStaging(
      input(),
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.attempts).toBe(2);
    expect(store.calls).toHaveLength(2);
    expect(store.calls[0]).toMatchObject({
      expectedPreviousRecordId: null,
      expectedPreviousHash: null,
    });
    expect(store.calls[1]).toMatchObject({
      expectedPreviousRecordId: "record-concurrent",
      expectedPreviousHash: PREVIOUS_HASH,
    });
    expect(result.record.recordSequence).toBe(2);
  });

  it("devuelve conflicto si se agotan reintentos", async () => {
    class AlwaysConflictStore extends MemoryChainStore {
      async createFiscalRecordWithChainLocalStaging(
        input: FiscalRecordWithChainCreateInput,
      ): Promise<FiscalRecordWithChainStoreResult> {
        this.calls.push(input);
        return {
          status: "conflict",
          reason: "record_chain_head_changed",
          message: "Cabecera cambiada",
        };
      }
    }
    const store = new AlwaysConflictStore();

    const result = await new FiscalRecordWithChainLocalStagingRepository(store, {
      maxChainRetries: 2,
    }).persistFiscalRecordWithChainLocalStaging(input());

    expect(result).toMatchObject({
      status: "conflict",
      reason: "record_chain_head_changed",
      attempts: 2,
    });
    expect(store.calls).toHaveLength(2);
  });

  it("rechaza antes de llamar RPC si no esta processing", async () => {
    const store = new MemoryChainStore();

    await expect(
      repository(store).persistFiscalRecordWithChainLocalStaging(
        input({ operation: { status: "requested" } }),
      ),
    ).rejects.toMatchObject({
      name: "FiscalRecordMaterialError",
    });
    expect(store.calls).toHaveLength(0);
  });
});
