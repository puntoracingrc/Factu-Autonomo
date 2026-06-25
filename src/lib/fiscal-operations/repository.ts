import { buildFiscalOperationDraft } from "./operation-builder";
import type {
  FiscalInvoiceIdentityCreateInput,
  FiscalInvoiceIdentityLookupInput,
  FiscalInvoiceIdentityRecord,
  FiscalOperationBuildInput,
  FiscalOperationCreateInput,
  FiscalOperationRecord,
  FiscalOperationRepositoryResult,
} from "./types";

export interface FiscalOperationRepositoryStore {
  findOperationByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<FiscalOperationRecord | null>;
  findInvoiceIdentity(
    input: FiscalInvoiceIdentityLookupInput,
  ): Promise<FiscalInvoiceIdentityRecord | null>;
  createInvoiceIdentity(
    input: FiscalInvoiceIdentityCreateInput,
  ): Promise<FiscalInvoiceIdentityRecord>;
  createFiscalOperation(
    input: FiscalOperationCreateInput,
  ): Promise<FiscalOperationRecord>;
}

export interface FiscalOperationRepositoryOptions {
  now?: () => string;
  generateId?: () => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultId(): string {
  return crypto.randomUUID();
}

export class FiscalOperationRepository {
  private readonly now: () => string;
  private readonly generateId: () => string;

  constructor(
    private readonly store: FiscalOperationRepositoryStore,
    options: FiscalOperationRepositoryOptions = {},
  ) {
    this.now = options.now ?? defaultNow;
    this.generateId = options.generateId ?? defaultId;
  }

  async prepareFiscalOperation(
    input: FiscalOperationBuildInput,
  ): Promise<FiscalOperationRepositoryResult> {
    const draft = buildFiscalOperationDraft(input);
    const existing = await this.store.findOperationByIdempotencyKey(
      draft.userId,
      draft.idempotencyKey,
    );

    if (existing) {
      return {
        status: "existing",
        operation: existing,
        invoiceIdentity: null,
      };
    }

    const invoiceIdentityLookup: FiscalInvoiceIdentityLookupInput = {
      userId: draft.userId,
      ...draft.invoiceIdentity,
    };
    const invoiceIdentity =
      (await this.store.findInvoiceIdentity(invoiceIdentityLookup)) ??
      (await this.store.createInvoiceIdentity({
        ...invoiceIdentityLookup,
        id: this.generateId(),
        serverDocumentId: draft.serverDocumentId,
        createdAt: this.now(),
      }));

    const timestamp = this.now();
    const operation = await this.store.createFiscalOperation({
      id: this.generateId(),
      draft,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      status: "created",
      operation,
      invoiceIdentity,
    };
  }
}
