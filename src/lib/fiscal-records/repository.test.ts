import { describe, expect, it } from "vitest";
import {
  FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION,
  FiscalRecordLocalStagingRepository,
  type FiscalRecordHeadCandidate,
  type FiscalRecordLocalStagingCreateInput,
  type FiscalRecordLocalStagingRecord,
  type FiscalRecordLocalStagingRepositoryStore,
  type FiscalRecordLocalStagingStoreResult,
} from "./repository";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
  FiscalOperationType,
} from "@/lib/fiscal-operations/types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T13:40:00.000Z";
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

function storedRecord(
  input: FiscalRecordLocalStagingCreateInput,
  overrides: Partial<FiscalRecordLocalStagingRecord> = {},
): FiscalRecordLocalStagingRecord {
  return {
    id: "record-1",
    userId: input.userId,
    operationId: input.operationId,
    invoiceIdentityId: "identity-1",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0001",
    fechaExpedicion: "2026-06-25",
    recordTypeCandidate: "alta",
    recordSequence: input.expectedPreviousRecordId ? 2 : 1,
    previousRecordId: input.expectedPreviousRecordId,
    previousHash: input.expectedPreviousHash,
    recordHash: input.recordHash,
    hashAlgorithm: input.hashAlgorithm,
    recordTimestamp: input.recordTimestamp,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    schemaVersion: input.schemaVersion,
    rendererVersion: input.rendererVersion ?? null,
    createdAt: NOW,
    ...overrides,
  };
}

class MemoryFiscalRecordStore
  implements FiscalRecordLocalStagingRepositoryStore
{
  head: FiscalRecordHeadCandidate | null = null;
  creates: FiscalRecordLocalStagingCreateInput[] = [];
  nextResult:
    | FiscalRecordLocalStagingStoreResult
    | null = null;

  async findLatestFiscalRecordHead(): Promise<FiscalRecordHeadCandidate | null> {
    return this.head;
  }

  async createFiscalRecordLocalStaging(
    input: FiscalRecordLocalStagingCreateInput,
  ): Promise<FiscalRecordLocalStagingStoreResult> {
    this.creates.push(input);
    return this.nextResult ?? {
      status: "created",
      record: storedRecord(input),
      atomicity: "postgres_rpc",
    };
  }
}

function repo(store: MemoryFiscalRecordStore) {
  return new FiscalRecordLocalStagingRepository(store);
}

async function persist(
  store: MemoryFiscalRecordStore,
  overrides: {
    operation?: Partial<FiscalOperationRecord>;
    identity?: Partial<FiscalInvoiceIdentityRecord> | null;
    serverDocument?: Partial<ServerDocumentRecord> | null;
  } = {},
) {
  const op = operation(overrides.operation);
  const id =
    overrides.identity === null ? null : identity(overrides.identity ?? {});
  return repo(store).persistFiscalRecordLocalStaging({
    operation: op,
    invoiceIdentity: id,
    serverDocument:
      overrides.serverDocument === null
        ? null
        : serverDocument(overrides.serverDocument ?? {}),
    recordTimestamp: NOW,
    rendererVersion: "phase2b4l-test-renderer",
  });
}

describe("FiscalRecordLocalStagingRepository", () => {
  it("persiste candidato local de primer registro sin tocar XML en respuesta", async () => {
    const store = new MemoryFiscalRecordStore();
    const result = await persist(store);

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(store.creates).toHaveLength(1);
    expect(store.creates[0]).toMatchObject({
      userId: "user-a",
      operationId: "operation-1",
      expectedPreviousRecordId: null,
      expectedPreviousHash: null,
      hashAlgorithm: "sha256-candidate",
      recordTimestamp: NOW,
      schemaVersion: FISCAL_RECORD_LOCAL_STAGING_SCHEMA_VERSION,
    });
    expect(store.creates[0]?.recordHash).toMatch(
      /^candidate_not_final:sha256:[a-f0-9]{64}$/,
    );
    expect(result.record.recordTypeCandidate).toBe("alta");
    expect(result.material.finality).toBe("preliminary_not_aeat");
    expect(result.recordCandidate.finality).toBe("candidate_not_aeat");
    expect(result.chainLinkCandidate.finality).toBe("candidate_not_final");
    expect(JSON.stringify(result)).not.toContain("xml");
    expect(JSON.stringify(result)).not.toContain("AEAT");
  });

  it("encadena contra la cabecera previa sin tocar fiscal_chain_state", async () => {
    const store = new MemoryFiscalRecordStore();
    store.head = {
      id: "record-previous",
      recordHash: PREVIOUS_HASH,
      recordSequence: 1,
    };

    const result = await persist(store);

    expect(result.status).toBe("created");
    expect(store.creates[0]).toMatchObject({
      expectedPreviousRecordId: "record-previous",
      expectedPreviousHash: PREVIOUS_HASH,
    });
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.record.previousRecordId).toBe("record-previous");
  });

  it("diferencia alta y anulacion desde contratos 2B.4J", async () => {
    const store = new MemoryFiscalRecordStore();
    const operationTypes: FiscalOperationType[] = ["alta_subsanacion", "anulacion"];

    for (const operationType of operationTypes) {
      store.nextResult = null;
      const result = await persist(store, {
        operation: { id: `operation-${operationType}`, operationType },
      });
      expect(result.status).toBe("created");
      if (result.status !== "created") throw new Error("Expected created");
      expect(result.recordCandidate.recordTypeCandidate).toBe(
        operationType === "anulacion" ? "anulacion" : "alta",
      );
    }
  });

  it("propaga rechazo controlado de la RPC", async () => {
    const store = new MemoryFiscalRecordStore();
    store.nextResult = {
      status: "rejected",
      reason: "operation_not_processing",
      message: "No processing",
    };

    await expect(persist(store)).resolves.toEqual({
      status: "rejected",
      reason: "operation_not_processing",
      message: "No processing",
    });
  });

  it("propaga conflicto si la cabecera local cambia", async () => {
    const store = new MemoryFiscalRecordStore();
    store.nextResult = {
      status: "conflict",
      reason: "record_chain_head_changed",
      message: "Cabecera cambiada",
    };

    await expect(persist(store)).resolves.toEqual({
      status: "conflict",
      reason: "record_chain_head_changed",
      message: "Cabecera cambiada",
    });
  });

  it("rechaza antes de persistir si la operacion no esta processing", async () => {
    const store = new MemoryFiscalRecordStore();

    await expect(
      persist(store, { operation: { status: "requested" } }),
    ).rejects.toMatchObject({
      name: "FiscalRecordMaterialError",
    });
    expect(store.creates).toHaveLength(0);
  });

  it("rechaza identidad ausente antes de llamar a la RPC", async () => {
    const store = new MemoryFiscalRecordStore();

    await expect(persist(store, { identity: null })).rejects.toMatchObject({
      name: "FiscalRecordMaterialError",
    });
    expect(store.creates).toHaveLength(0);
  });
});
