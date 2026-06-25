import {
  ServerDocumentError,
  serverDocumentErrorMessage,
} from "./errors";
import {
  buildDocumentConflictReason,
  canMutateServerDocument,
  shouldCreateDocumentConflict,
} from "./guards";
import type {
  JsonValue,
  ServerDocumentChangeType,
  ServerDocumentConflictReason,
  ServerDocumentConflictRecord,
  ServerDocumentCreateDraftInput,
  ServerDocumentMutationDecision,
  ServerDocumentMutationInput,
  ServerDocumentRecord,
  ServerDocumentVersionRecord,
} from "./types";

export interface ServerDocumentRepositoryStore {
  findDocumentById(id: string): Promise<ServerDocumentRecord | null>;
  findDocumentByLocalId(
    userId: string,
    localDocumentId: string,
  ): Promise<ServerDocumentRecord | null>;
  insertDocument(document: ServerDocumentRecord): Promise<ServerDocumentRecord>;
  updateDocument(
    document: ServerDocumentRecord,
    expectedVersion: number,
  ): Promise<ServerDocumentRecord>;
  insertDocumentVersion(version: ServerDocumentVersionRecord): Promise<void>;
  insertDocumentConflict(conflict: ServerDocumentConflictRecord): Promise<void>;
}

export interface ServerDocumentRepositoryOptions {
  now?: () => string;
  generateId?: () => string;
}

function defaultNow(): string {
  return new Date().toISOString();
}

function defaultId(): string {
  return crypto.randomUUID();
}

function stableStringify(value: JsonValue | undefined): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function contentHash(value: JsonValue | undefined): string {
  return `json:${stableStringify(value)}`;
}

function changedFields(input: ServerDocumentMutationInput): string[] {
  return Object.keys(input)
    .filter((key) => key !== "expectedVersion")
    .sort();
}

function decisionRejected(
  reason: ServerDocumentConflictReason,
): ServerDocumentMutationDecision {
  return {
    status: "rejected",
    reason,
    message: serverDocumentErrorMessage(reason),
  };
}

export class ServerDocumentRepository {
  private readonly now: () => string;
  private readonly generateId: () => string;

  constructor(
    private readonly store: ServerDocumentRepositoryStore,
    options: ServerDocumentRepositoryOptions = {},
  ) {
    this.now = options.now ?? defaultNow;
    this.generateId = options.generateId ?? defaultId;
  }

  async readDocumentById(
    userId: string,
    id: string,
  ): Promise<ServerDocumentRecord | null> {
    const document = await this.store.findDocumentById(id);
    if (!document) return null;
    if (document.userId !== userId) {
      throw new ServerDocumentError("FORBIDDEN_USER_SCOPE");
    }
    return document;
  }

  async readDocumentByLocalId(
    userId: string,
    localDocumentId: string,
  ): Promise<ServerDocumentRecord | null> {
    return this.store.findDocumentByLocalId(userId, localDocumentId);
  }

  async createDraft(
    userId: string,
    input: ServerDocumentCreateDraftInput,
  ): Promise<ServerDocumentMutationDecision> {
    const existing = await this.readDocumentByLocalId(
      userId,
      input.localDocumentId,
    );
    if (existing) {
      const conflict = await this.persistConflict(
        "duplicate_local_document_id",
        existing,
        { payload: input.payload },
      );
      return {
        status: "conflict",
        reason: "duplicate_local_document_id",
        message: serverDocumentErrorMessage("duplicate_local_document_id"),
        conflict,
      };
    }

    const timestamp = this.now();
    const document: ServerDocumentRecord = {
      id: this.generateId(),
      userId,
      localDocumentId: input.localDocumentId,
      documentType: input.documentType,
      documentKind: input.documentKind,
      documentLifecycle: "draft",
      integrityLock: "unlocked",
      statusLegacy: input.statusLegacy,
      version: 1,
      payload: input.payload,
      documentSnapshot: null,
      pdfSnapshot: null,
      snapshotHash: null,
      pdfContentHash: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const inserted = await this.store.insertDocument(document);
    const version = await this.persistVersion(inserted, "create", null, null, [
      "payload",
    ]);

    return {
      status: "accepted",
      document: inserted,
      version,
    };
  }

  async updateDraft(
    userId: string,
    id: string,
    input: ServerDocumentMutationInput,
  ): Promise<ServerDocumentMutationDecision> {
    const current = await this.readDocumentById(userId, id);
    if (!current) return decisionRejected("not_found");

    const reason = buildDocumentConflictReason(current, input);
    if (reason) {
      if (shouldCreateDocumentConflict(current, input)) {
        const conflict = await this.persistConflict(reason, current, input);
        return {
          status: "conflict",
          reason,
          message: serverDocumentErrorMessage(reason),
          conflict,
        };
      }
      return decisionRejected(reason);
    }

    try {
      canMutateServerDocument(current, input.expectedVersion);
    } catch (error) {
      if (error instanceof ServerDocumentError) {
        return decisionRejected(error.reason);
      }
      throw error;
    }

    const timestamp = this.now();
    const next: ServerDocumentRecord = {
      ...current,
      payload: input.payload ?? current.payload,
      statusLegacy: input.statusLegacy ?? current.statusLegacy,
      documentLifecycle:
        input.documentLifecycle ?? current.documentLifecycle,
      integrityLock: input.integrityLock ?? current.integrityLock,
      version: current.version + 1,
      updatedAt: timestamp,
    };

    let updated: ServerDocumentRecord;
    try {
      updated = await this.store.updateDocument(next, current.version);
    } catch (error) {
      if (
        error instanceof ServerDocumentError &&
        error.reason === "version_mismatch"
      ) {
        const conflict = await this.persistConflict(
          "version_mismatch",
          current,
          input,
        );
        return {
          status: "conflict",
          reason: "version_mismatch",
          message: serverDocumentErrorMessage("version_mismatch"),
          conflict,
        };
      }
      throw error;
    }
    const version = await this.persistVersion(
      updated,
      "update",
      current.payload,
      updated.payload,
      changedFields(input),
    );

    return {
      status: "accepted",
      document: updated,
      version,
    };
  }

  private async persistVersion(
    document: ServerDocumentRecord,
    changeType: ServerDocumentChangeType,
    before: JsonValue | null,
    after: JsonValue | null,
    fields: string[],
  ): Promise<ServerDocumentVersionRecord> {
    const version: ServerDocumentVersionRecord = {
      id: this.generateId(),
      serverDocumentId: document.id,
      userId: document.userId,
      version: document.version,
      changeType,
      payloadBeforeHash: before ? contentHash(before) : null,
      payloadAfterHash: after ? contentHash(after) : contentHash(document.payload),
      changedFields: fields,
      actorType: "server",
      createdAt: this.now(),
    };
    await this.store.insertDocumentVersion(version);
    return version;
  }

  private async persistConflict(
    reason: ServerDocumentConflictReason,
    current: ServerDocumentRecord,
    incoming: ServerDocumentMutationInput | { payload: JsonValue },
  ): Promise<ServerDocumentConflictRecord> {
    const conflict: ServerDocumentConflictRecord = {
      id: this.generateId(),
      userId: current.userId,
      serverDocumentId: current.id,
      localDocumentId: current.localDocumentId,
      conflictType: reason,
      incomingPayloadHash: contentHash(incoming.payload),
      serverPayloadHash: contentHash(current.payload),
      resolutionStatus: "open",
      createdAt: this.now(),
    };
    await this.store.insertDocumentConflict(conflict);
    return conflict;
  }
}
