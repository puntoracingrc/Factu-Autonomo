import { describe, expect, it } from "vitest";
import { FiscalOperationError } from "./errors";
import {
  FiscalOperationRepository,
  type FiscalOperationRepositoryStore,
} from "./repository";
import type {
  FiscalInvoiceIdentityCreateInput,
  FiscalInvoiceIdentityLookupInput,
  FiscalInvoiceIdentityRecord,
  FiscalOperationCreateInput,
  FiscalOperationRecord,
  FiscalOperationType,
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

class MemoryFiscalOperationStore implements FiscalOperationRepositoryStore {
  operations: FiscalOperationRecord[] = [];
  identities: FiscalInvoiceIdentityRecord[] = [];

  async findOperationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<FiscalOperationRecord | null> {
    return (
      this.operations.find(
        (operation) =>
          operation.userId === userId &&
          operation.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async findInvoiceIdentity(
    input: FiscalInvoiceIdentityLookupInput,
  ): Promise<FiscalInvoiceIdentityRecord | null> {
    return (
      this.identities.find(
        (identity) =>
          identity.userId === input.userId &&
          identity.environment === input.environment &&
          identity.issuerNif === input.issuerNif &&
          identity.numserie === input.numserie &&
          identity.fechaExpedicion === input.fechaExpedicion,
      ) ?? null
    );
  }

  async createInvoiceIdentity(
    input: FiscalInvoiceIdentityCreateInput,
  ): Promise<FiscalInvoiceIdentityRecord> {
    const identity = { ...input };
    this.identities.push(identity);
    return identity;
  }

  async createFiscalOperation(
    input: FiscalOperationCreateInput,
  ): Promise<FiscalOperationRecord> {
    const operation: FiscalOperationRecord = {
      id: input.id,
      userId: input.draft.userId,
      serverDocumentId: input.draft.serverDocumentId,
      operationType: input.draft.operationType,
      environment: input.draft.environment,
      idempotencyKey: input.draft.idempotencyKey,
      requestedBy: input.draft.requestedBy,
      requestedAt: input.draft.requestedAt,
      expectedDocumentVersion: input.draft.expectedDocumentVersion,
      documentSnapshotHash: input.draft.documentSnapshotHash,
      status: "requested",
      completedAt: null,
      failedAt: null,
      failureCode: null,
      failureMessage: null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    };
    this.operations.push(operation);
    return operation;
  }
}

function repository(store: MemoryFiscalOperationStore) {
  let next = 1;
  return new FiscalOperationRepository(store, {
    now: () => NOW,
    generateId: () => `generated-${next++}`,
  });
}

function buildInput(overrides: Record<string, unknown> = {}) {
  return {
    serverDocument: serverDocument(),
    operationType: "alta_inicial",
    environment: "test",
    expectedDocumentVersion: 9,
    requestedBy: "user-a",
    requestedAt: NOW,
    ...overrides,
  };
}

describe("FiscalOperationRepository", () => {
  it("prepara operacion nueva y crea identidad fiscal", async () => {
    const store = new MemoryFiscalOperationStore();
    const result = await repository(store).prepareFiscalOperation(buildInput());

    expect(result.status).toBe("created");
    expect(store.operations).toHaveLength(1);
    expect(store.identities).toHaveLength(1);
    expect(result.operation).toMatchObject({
      id: "generated-2",
      userId: "user-a",
      serverDocumentId: "server-doc-1",
      operationType: "alta_inicial",
      environment: "test",
      status: "requested",
      expectedDocumentVersion: 9,
      documentSnapshotHash: "fnv1a32:aaaaaaaa",
    });
    expect(result.invoiceIdentity).toMatchObject({
      id: "generated-1",
      userId: "user-a",
      issuerNif: "B12345678",
      numserie: "F-2026-0009",
      fechaExpedicion: "2026-06-25",
    });
  });

  it("idempotency key existente devuelve operacion existente y no duplica", async () => {
    const store = new MemoryFiscalOperationStore();
    const repo = repository(store);
    const first = await repo.prepareFiscalOperation(buildInput());
    const second = await repo.prepareFiscalOperation(buildInput());

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(second.operation.id).toBe(first.operation.id);
    expect(store.operations).toHaveLength(1);
    expect(store.identities).toHaveLength(1);
  });

  it("reutiliza identidad fiscal si ya existe", async () => {
    const store = new MemoryFiscalOperationStore();
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

    const result = await repository(store).prepareFiscalOperation(buildInput());

    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("Expected created result");
    expect(result.invoiceIdentity.id).toBe("identity-existing");
    expect(store.identities).toHaveLength(1);
    expect(store.operations).toHaveLength(1);
  });

  it("diferencia alta inicial, subsanacion y anulacion", async () => {
    const store = new MemoryFiscalOperationStore();
    const repo = repository(store);
    const types: FiscalOperationType[] = [
      "alta_inicial",
      "alta_subsanacion",
      "anulacion",
    ];

    for (const operationType of types) {
      const result = await repo.prepareFiscalOperation(
        buildInput({ operationType }),
      );
      expect(result.status).toBe("created");
      expect(result.operation.operationType).toBe(operationType);
    }

    expect(store.operations).toHaveLength(3);
    expect(new Set(store.operations.map((entry) => entry.idempotencyKey))).toHaveLength(
      3,
    );
  });

  it("no bloquea operaciones legitimas futuras por misma factura con key distinta", async () => {
    const store = new MemoryFiscalOperationStore();
    const repo = repository(store);

    await repo.prepareFiscalOperation(buildInput({ operationType: "alta_inicial" }));
    await repo.prepareFiscalOperation(
      buildInput({ operationType: "alta_subsanacion" }),
    );

    expect(store.operations).toHaveLength(2);
    expect(store.identities).toHaveLength(1);
  });

  it("rechaza input sin snapshotHash", async () => {
    const store = new MemoryFiscalOperationStore();

    await expect(
      repository(store).prepareFiscalOperation(
        buildInput({
          serverDocument: serverDocument({ snapshotHash: null }),
        }),
      ),
    ).rejects.toMatchObject({
      reason: "snapshot_hash_missing",
    } satisfies Partial<FiscalOperationError>);
    expect(store.operations).toHaveLength(0);
  });

  it("rechaza input sin issuerNif, numserie o issueDate", async () => {
    const cases: Array<Partial<ServerDocumentRecord>> = [
      { issuerNif: "" },
      { numserie: "" },
      { issueDate: "" },
    ];
    const reasons = [
      "issuer_nif_missing",
      "numserie_missing",
      "issue_date_missing",
    ];

    for (const [index, overrides] of cases.entries()) {
      const store = new MemoryFiscalOperationStore();
      await expect(
        repository(store).prepareFiscalOperation(
          buildInput({ serverDocument: serverDocument(overrides) }),
        ),
      ).rejects.toMatchObject({ reason: reasons[index] });
      expect(store.operations).toHaveLength(0);
    }
  });

  it("mantiene errores tipados estables", async () => {
    const store = new MemoryFiscalOperationStore();

    await expect(
      repository(store).prepareFiscalOperation(
        buildInput({
          operationType: "operacion_inventada",
        }),
      ),
    ).rejects.toBeInstanceOf(FiscalOperationError);
  });
});
