import { describe, expect, it } from "vitest";
import {
  assertExpectedDocumentVersionForFiscalOperation,
  buildFiscalOperationTransactionPlan,
  classifyFiscalOperationTransactionResult,
  executeFiscalOperationTransactionContract,
  resolveFiscalOperationReservation,
  validateFiscalOperationTransactionInput,
} from "./transaction-contract";
import { FiscalOperationTransactionError } from "./transaction-errors";
import type {
  FiscalOperationTransactionInput,
  FiscalOperationTransactionScope,
  FiscalOperationTransactionStore,
} from "./transaction-types";
import type {
  FiscalEnvironment,
  FiscalInvoiceIdentityRecord,
  FiscalOperationRecord,
} from "./types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

const NOW = "2026-06-25T09:00:00.000Z";

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
    version: 9,
    payload: { ignored: true },
    documentSnapshot: { number: "F-2026-0009" },
    pdfSnapshot: { renderer: "v1" },
    snapshotHash: "fnv1a32:aaaaaaaa",
    pdfContentHash: "fnv1a32:bbbbbbbb",
    issuerNif: "B12345678",
    numserie: "F-2026-0009",
    issueDate: "2026-06-25",
    createdAt: NOW,
    updatedAt: NOW,
    issuedAt: NOW,
    canceledAt: null,
    ...overrides,
  };
}

function input(
  overrides: Partial<FiscalOperationTransactionInput> = {},
): FiscalOperationTransactionInput {
  return {
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    expectedDocumentVersion: 9,
    requestedBy: "user-a",
    requestedAt: NOW,
    ...overrides,
  };
}

function duplicatedKeyError(): Error & { causeCode: string } {
  return Object.assign(new Error("duplicate key"), { causeCode: "23505" });
}

class MemoryFiscalOperationTransactionStore
  implements FiscalOperationTransactionStore, FiscalOperationTransactionScope
{
  documents: ServerDocumentRecord[] = [serverDocument()];
  operations: FiscalOperationRecord[] = [];
  identities: FiscalInvoiceIdentityRecord[] = [];
  touchedTables: string[] = [];
  transactionCount = 0;
  nextOperationId = 1;
  nextIdentityId = 1;
  operationRace: "none" | "existing" | "missing" = "none";
  identityRace: "none" | "existing" | "missing" = "none";

  async withFiscalOperationTransaction<T>(
    callback: (transaction: FiscalOperationTransactionScope) => Promise<T>,
  ): Promise<T> {
    this.transactionCount += 1;
    return callback(this);
  }

  async findServerDocumentForFiscalOperation(
    userId: string,
    serverDocumentId: string,
  ): Promise<ServerDocumentRecord | null> {
    this.touchedTables.push("server_documents");
    return (
      this.documents.find(
        (document) =>
          document.userId === userId && document.id === serverDocumentId,
      ) ?? null
    );
  }

  async findOperationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<FiscalOperationRecord | null> {
    this.touchedTables.push("fiscal_operations");
    return (
      this.operations.find(
        (operation) =>
          operation.userId === userId &&
          operation.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async findInvoiceIdentity(
    userId: string,
    environment: FiscalEnvironment,
    issuerNif: string,
    numserie: string,
    fechaExpedicion: string,
  ): Promise<FiscalInvoiceIdentityRecord | null> {
    this.touchedTables.push("fiscal_invoice_identities");
    return (
      this.identities.find(
        (identity) =>
          identity.userId === userId &&
          identity.environment === environment &&
          identity.issuerNif === issuerNif &&
          identity.numserie === numserie &&
          identity.fechaExpedicion === fechaExpedicion,
      ) ?? null
    );
  }

  async createInvoiceIdentity(
    identity: Omit<FiscalInvoiceIdentityRecord, "id" | "createdAt">,
  ): Promise<FiscalInvoiceIdentityRecord> {
    this.touchedTables.push("fiscal_invoice_identities");
    const record: FiscalInvoiceIdentityRecord = {
      id: `identity-${this.nextIdentityId++}`,
      createdAt: NOW,
      ...identity,
    };

    if (this.identityRace !== "none") {
      if (this.identityRace === "existing") {
        this.identities.push(record);
      }
      this.identityRace = "none";
      throw duplicatedKeyError();
    }

    this.identities.push(record);
    return record;
  }

  async createFiscalOperation(
    operation: Omit<
      FiscalOperationRecord,
      "id" | "createdAt" | "updatedAt"
    >,
  ): Promise<FiscalOperationRecord> {
    this.touchedTables.push("fiscal_operations");
    const record: FiscalOperationRecord = {
      id: `operation-${this.nextOperationId++}`,
      createdAt: NOW,
      updatedAt: NOW,
      ...operation,
    };

    if (this.operationRace !== "none") {
      if (this.operationRace === "existing") {
        this.operations.push(record);
      }
      this.operationRace = "none";
      throw duplicatedKeyError();
    }

    this.operations.push(record);
    return record;
  }
}

function operationRecord(
  overrides: Partial<FiscalOperationRecord> = {},
): FiscalOperationRecord {
  return {
    id: "operation-existing",
    userId: "user-a",
    serverDocumentId: "server-doc-1",
    operationType: "alta_inicial",
    environment: "test",
    idempotencyKey: "custom-key",
    requestedBy: "user-a",
    requestedAt: NOW,
    expectedDocumentVersion: 9,
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

describe("FiscalOperationTransactionContract", () => {
  it("construye un plan transaccional valido y normalizado", () => {
    const plan = buildFiscalOperationTransactionPlan(
      input({ environment: "TEST" }),
    );

    expect(plan).toMatchObject({
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      environment: "test",
      expectedDocumentVersion: 9,
      requestedBy: "user-a",
    });
  });

  it("rechaza input sin expectedDocumentVersion", () => {
    expect(() =>
      validateFiscalOperationTransactionInput(
        input({ expectedDocumentVersion: undefined }),
      ),
    ).toThrow(FiscalOperationTransactionError);
  });

  it("rechaza expectedDocumentVersion no coincidente", () => {
    expect(() =>
      assertExpectedDocumentVersionForFiscalOperation(serverDocument(), 8),
    ).toThrow(/ha cambiado/);
  });

  it("rechaza documento no elegible", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.documents = [serverDocument({ documentLifecycle: "draft" })];

    const result = await executeFiscalOperationTransactionContract(
      store,
      input(),
      { now: () => NOW },
    );

    expect(result).toMatchObject({
      status: "rejected",
      reason: "document_not_eligible",
    });
  });

  it("crea operacion e identidad fiscal si faltan", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    const result = await executeFiscalOperationTransactionContract(
      store,
      input(),
      { now: () => NOW },
    );

    expect(result.status).toBe("created");
    expect(store.operations).toHaveLength(1);
    expect(store.identities).toHaveLength(1);
    expect(classifyFiscalOperationTransactionResult(result)).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.operation).toMatchObject({
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      status: "requested",
      expectedDocumentVersion: 9,
      documentSnapshotHash: "fnv1a32:aaaaaaaa",
    });
    expect(result.invoiceIdentity).toMatchObject({
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    });
  });

  it("reutiliza operacion existente por idempotencyKey", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.operations.push(operationRecord());

    const result = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "custom-key" }),
      { now: () => NOW },
    );

    expect(result.status).toBe("existing");
    if (result.status !== "existing") throw new Error("Expected existing");
    expect(result.operation.id).toBe("operation-existing");
    expect(store.operations).toHaveLength(1);
    expect(store.identities).toHaveLength(0);
  });

  it("reutiliza identidad fiscal existente", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.identities.push({
      id: "identity-existing",
      userId: "user-a",
      serverDocumentId: "server-doc-prev",
      environment: "test",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
      createdAt: NOW,
    });

    const result = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "new-operation" }),
      { now: () => NOW },
    );

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created");
    expect(result.invoiceIdentity.id).toBe("identity-existing");
    expect(store.identities).toHaveLength(1);
    expect(store.operations).toHaveLength(1);
  });

  it("dos solicitudes con la misma idempotencyKey devuelven created y existing", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    const first = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "same-key" }),
      { now: () => NOW },
    );
    const second = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "same-key" }),
      { now: () => NOW },
    );

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(store.operations).toHaveLength(1);
    expect(store.identities).toHaveLength(1);
  });

  it("dos solicitudes con distinta idempotencyKey y misma identidad crean dos operaciones y una identidad", async () => {
    const store = new MemoryFiscalOperationTransactionStore();

    await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "key-a" }),
      { now: () => NOW },
    );
    await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "key-b" }),
      { now: () => NOW },
    );

    expect(store.operations.map((entry) => entry.idempotencyKey)).toEqual([
      "key-a",
      "key-b",
    ]);
    expect(store.identities).toHaveLength(1);
  });

  it("conflictua si el documento cambio desde expectedDocumentVersion", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.documents = [serverDocument({ version: 10 })];

    const result = await executeFiscalOperationTransactionContract(
      store,
      input({ expectedDocumentVersion: 9 }),
      { now: () => NOW },
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "document_version_conflict",
    });
    expect(store.operations).toHaveLength(0);
  });

  it("permite subsanacion y anulacion sin quedar bloqueadas por alta inicial", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    const first = await executeFiscalOperationTransactionContract(
      store,
      input({ operationType: "alta_inicial" }),
      { now: () => NOW },
    );
    const second = await executeFiscalOperationTransactionContract(
      store,
      input({ operationType: "alta_subsanacion" }),
      { now: () => NOW },
    );
    const third = await executeFiscalOperationTransactionContract(
      store,
      input({ operationType: "anulacion" }),
      { now: () => NOW },
    );

    expect([first.status, second.status, third.status]).toEqual([
      "created",
      "created",
      "created",
    ]);
    expect(store.operations.map((entry) => entry.operationType)).toEqual([
      "alta_inicial",
      "alta_subsanacion",
      "anulacion",
    ]);
    expect(store.identities).toHaveLength(1);
  });

  it("resuelve carrera 23505 de operacion como existing si puede leer la reserva", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.operationRace = "existing";

    const result = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "race-key" }),
      { now: () => NOW },
    );

    expect(result.status).toBe("existing");
    expect(store.operations).toHaveLength(1);
  });

  it("devuelve conflict ante carrera 23505 de operacion no verificable", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.operationRace = "missing";

    const result = await executeFiscalOperationTransactionContract(
      store,
      input({ idempotencyKey: "race-key" }),
      { now: () => NOW },
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "operation_race",
    });
    expect(store.operations).toHaveLength(0);
  });

  it("resuelve carrera 23505 de identidad si puede leer la identidad", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.identityRace = "existing";

    const result = await executeFiscalOperationTransactionContract(
      store,
      input(),
      { now: () => NOW },
    );

    expect(result.status).toBe("created");
    expect(store.identities).toHaveLength(1);
    expect(store.operations).toHaveLength(1);
  });

  it("devuelve conflict ante carrera 23505 de identidad no verificable", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    store.identityRace = "missing";

    const result = await executeFiscalOperationTransactionContract(
      store,
      input(),
      { now: () => NOW },
    );

    expect(result).toMatchObject({
      status: "conflict",
      reason: "identity_race",
    });
    expect(store.operations).toHaveLength(0);
  });

  it("resolveFiscalOperationReservation funciona dentro de un scope transaccional fake", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    const result = await store.withFiscalOperationTransaction((transaction) =>
      resolveFiscalOperationReservation(
        transaction,
        serverDocument(),
        input({ idempotencyKey: "manual-scope" }),
        { now: () => NOW },
      ),
    );

    expect(result.status).toBe("created");
    expect(store.transactionCount).toBe(1);
  });

  it("no toca registros fiscales, cadena, transporte ni XML en el contrato local", async () => {
    const store = new MemoryFiscalOperationTransactionStore();
    await executeFiscalOperationTransactionContract(store, input(), {
      now: () => NOW,
    });

    expect(new Set(store.touchedTables)).toEqual(
      new Set([
        "server_documents",
        "fiscal_operations",
        "fiscal_invoice_identities",
      ]),
    );
    expect(store.touchedTables).not.toContain("fiscal_records");
    expect(store.touchedTables).not.toContain("fiscal_chain_state");
    expect(store.touchedTables).not.toContain("fiscal_transport_attempts");
    expect(JSON.stringify(store)).not.toContain("<");
  });

  it("mantiene errores tipados estables", () => {
    const error = new FiscalOperationTransactionError("identity_race");

    expect(error.name).toBe("FiscalOperationTransactionError");
    expect(error.reason).toBe("identity_race");
    expect(error.message).toContain("concurrente");
  });
});
