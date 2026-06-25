import { describe, expect, it } from "vitest";
import {
  buildFiscalOperationDryRunPlan,
  classifyDryRunPipelineResult,
  runFiscalOperationDryRunPipeline,
} from "./dry-run-pipeline";
import type {
  FiscalOperationDryRunLookupStore,
  FiscalOperationDryRunPipelineDependencies,
  FiscalOperationDryRunProcessingStore,
  FiscalOperationDryRunReservationStore,
} from "./types";
import type {
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "@/lib/fiscal-operations/types";
import type { FiscalOperationProcessingResult } from "@/lib/fiscal-operations/processing-types";
import type {
  FiscalOperationTransactionInput,
  FiscalOperationTransactionResult,
} from "@/lib/fiscal-operations/transaction-types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T11:00:00.000Z";

function serverDocument(
  overrides: Partial<ServerDocumentRecord> = {},
): ServerDocumentRecord {
  return {
    id: "server-doc-1",
    userId: "user-a",
    localDocumentId: "local-doc-1",
    documentType: "factura",
    documentKind: "standard",
    documentLifecycle: "issued",
    integrityLock: "locked",
    statusLegacy: "enviado",
    version: 12,
    payload: { ignored: true },
    documentSnapshot: { number: "F-2026-0012" },
    pdfSnapshot: { renderer: "v1" },
    snapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    issuerNif: "B12345678",
    numserie: "F-2026-0012",
    issueDate: "2026-06-25",
    createdAt: NOW,
    updatedAt: NOW,
    issuedAt: NOW,
    canceledAt: null,
    ...overrides,
  };
}

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
    expectedDocumentVersion: 12,
    documentSnapshotHash: "fnv1a32:aaaaaaaa",
    status: "requested",
    completedAt: null,
    failedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function invoiceIdentity(
  overrides: Partial<FiscalInvoiceIdentityRecord> = {},
): FiscalInvoiceIdentityRecord {
  return {
    id: "identity-1",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    environment: "test",
    issuerNif: "B12345678",
    numserie: "F-2026-0012",
    fechaExpedicion: "2026-06-25",
    createdAt: NOW,
    ...overrides,
  };
}

class MemoryReservationStore implements FiscalOperationDryRunReservationStore {
  calls: FiscalOperationTransactionInput[] = [];

  constructor(private readonly result: FiscalOperationTransactionResult) {}

  async reserveFiscalOperation(
    input: FiscalOperationTransactionInput,
  ): Promise<FiscalOperationTransactionResult> {
    this.calls.push(input);
    return this.result;
  }
}

class MemoryProcessingStore implements FiscalOperationDryRunProcessingStore {
  calls: Array<{ userId: string; operationId: string; markedAt?: Date | string }> =
    [];

  constructor(private readonly result: FiscalOperationProcessingResult) {}

  async markFiscalOperationProcessing(input: {
    userId: string;
    operationId: string;
    markedAt?: Date | string;
  }): Promise<FiscalOperationProcessingResult> {
    this.calls.push(input);
    return this.result;
  }
}

class MemoryLookupStore implements FiscalOperationDryRunLookupStore {
  constructor(
    private readonly document: ServerDocumentRecord | null = serverDocument(),
    private readonly identity: FiscalInvoiceIdentityRecord | null =
      invoiceIdentity(),
  ) {}

  async findServerDocumentForFiscalOperation() {
    return this.document;
  }

  async findInvoiceIdentityForMaterial() {
    return this.identity;
  }
}

function input(
  overrides: Partial<FiscalOperationTransactionInput> = {},
): FiscalOperationTransactionInput {
  return {
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    expectedDocumentVersion: 12,
    requestedBy: "user-a",
    requestedAt: NOW,
    ...overrides,
  };
}

function dependencies(
  overrides: Partial<FiscalOperationDryRunPipelineDependencies> = {},
): FiscalOperationDryRunPipelineDependencies {
  return {
    reservationStore: new MemoryReservationStore({
      status: "created",
      operation: operation(),
      invoiceIdentity: invoiceIdentity(),
      atomicity: "postgres_rpc",
    }),
    processingStore: new MemoryProcessingStore({
      status: "processing",
      operation: operation({ status: "processing" }),
      atomicity: "postgres_rpc",
    }),
    lookupStore: new MemoryLookupStore(),
    ...overrides,
  };
}

describe("buildFiscalOperationDryRunPlan", () => {
  it("construye un plan seguro sin payload ni snapshot", () => {
    const plan = buildFiscalOperationDryRunPlan(input());

    expect(plan).toEqual({
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      environment: "test",
      expectedDocumentVersion: 12,
      requestedBy: "user-a",
      dryRun: true,
    });
    expect(JSON.stringify(plan)).not.toContain("payload");
    expect(JSON.stringify(plan)).not.toContain("documentSnapshot");
  });
});

describe("runFiscalOperationDryRunPipeline", () => {
  it("encadena reserva, processing y material dry-run valido", async () => {
    const result = await runFiscalOperationDryRunPipeline(
      {
        ...input(),
        processingAt: NOW,
        materialCreatedAt: NOW,
      },
      dependencies(),
    );

    expect(result.status).toBe("material_built");
    if (result.status !== "material_built") {
      throw new Error("Expected material_built");
    }
    expect(result).toMatchObject({
      reservation: "reserved",
      processing: "processing",
      operationId: "operation-1",
      invoiceIdentityId: "identity-1",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      dryRun: true,
      material: {
        dryRun: true,
        finality: "preliminary_not_aeat",
        schemaVersionCandidate: "phase2b4g-dry-run-v1",
        documentSnapshotHashPresent: true,
        pdfContentHashPresent: true,
      },
    });
    expect(result.material.hashInputCandidateLength).toBeGreaterThan(10);
  });

  it("si la operacion ya existe por idempotencia continua de forma controlada", async () => {
    const reservationStore = new MemoryReservationStore({
      status: "existing",
      operation: operation(),
      invoiceIdentity: null,
      atomicity: "postgres_rpc",
    });
    const processingStore = new MemoryProcessingStore({
      status: "processing",
      operation: operation({ status: "processing" }),
      atomicity: "postgres_rpc",
    });

    const result = await runFiscalOperationDryRunPipeline(
      input(),
      dependencies({
        reservationStore,
        processingStore,
        lookupStore: new MemoryLookupStore(serverDocument(), invoiceIdentity()),
      }),
    );

    expect(result.status).toBe("material_built");
    if (result.status !== "material_built") {
      throw new Error("Expected material_built");
    }
    expect(result.reservation).toBe("existing");
    expect(processingStore.calls).toEqual([
      {
        userId: "user-a",
        operationId: "operation-1",
        markedAt: undefined,
      },
    ]);
  });

  it("un conflicto de version corta el pipeline antes de processing", async () => {
    const reservationStore = new MemoryReservationStore({
      status: "conflict",
      reason: "document_version_conflict",
      message: "Version antigua",
    });
    const processingStore = new MemoryProcessingStore({
      status: "processing",
      operation: operation({ status: "processing" }),
      atomicity: "postgres_rpc",
    });

    const result = await runFiscalOperationDryRunPipeline(
      input({ expectedDocumentVersion: 11 }),
      dependencies({ reservationStore, processingStore }),
    );

    expect(result).toEqual({
      status: "conflict",
      reason: "document_version_conflict",
      message: "Version antigua",
      dryRun: true,
    });
    expect(processingStore.calls).toHaveLength(0);
  });

  it("un documento no elegible corta el pipeline sin material", async () => {
    const reservationStore = new MemoryReservationStore({
      status: "rejected",
      reason: "document_not_eligible",
      message: "No elegible",
    });
    const processingStore = new MemoryProcessingStore({
      status: "processing",
      operation: operation({ status: "processing" }),
      atomicity: "postgres_rpc",
    });

    const result = await runFiscalOperationDryRunPipeline(
      input(),
      dependencies({ reservationStore, processingStore }),
    );

    expect(result).toEqual({
      status: "rejected",
      reason: "document_not_eligible",
      message: "No elegible",
      serverDocumentId: "server-doc-1",
      dryRun: true,
    });
    expect(processingStore.calls).toHaveLength(0);
  });

  it("no devuelve payload, snapshot completo, XML ni tablas fiscales finales", async () => {
    const result = await runFiscalOperationDryRunPipeline(input(), dependencies());
    const serialized = JSON.stringify(result);

    expect(classifyDryRunPipelineResult(result)).toBe("material_built");
    expect(serialized).not.toContain("\"payload\"");
    expect(serialized).not.toContain("\"documentSnapshot\"");
    expect(serialized).not.toContain("xml");
    expect(serialized).not.toContain("AEAT");
    expect(serialized).not.toContain("fiscal_records");
    expect(serialized).not.toContain("fiscal_chain_state");
    expect(serialized).not.toContain("fiscal_transport_attempts");
  });
});
