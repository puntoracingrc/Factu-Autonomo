import { createHash } from "node:crypto";

import type {
  CentralBusinessBootstrapEntityInput,
  CentralBusinessBootstrapPreview,
} from "./bootstrap-preview";
import { stableCentralBusinessJson } from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_BOOTSTRAP_COMMIT =
  "CENTRAL_BUSINESS_BOOTSTRAP_COMMIT_V1";
export const CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION =
  "COMMIT_CENTRAL_BUSINESS_BOOTSTRAP_V1";

export interface CentralBusinessBootstrapCommitInput {
  userId: string;
  deviceId: string;
  sessionId: string;
  idempotencyKey: string;
  confirmation: string;
  entities: CentralBusinessBootstrapEntityInput[];
  preview: CentralBusinessBootstrapPreview;
}

export interface CentralBusinessBootstrapCommitEntity {
  entityType: CentralBusinessBootstrapEntityInput["entityType"];
  entityId: string;
  payload: CentralBusinessBootstrapEntityInput["payload"];
  contentHash: string;
  idempotencyKeyHash: string;
  requestHash: string;
}

export interface CentralBusinessBootstrapCommitCommand {
  schema: typeof CENTRAL_BUSINESS_BOOTSTRAP_COMMIT;
  userId: string;
  deviceId: string;
  sessionId: string;
  idempotencyKeyHash: string;
  requestHash: string;
  snapshotDigest: string;
  centralStateDigest: string;
  previewDigest: string;
  entities: CentralBusinessBootstrapCommitEntity[];
}

export class CentralBusinessBootstrapCommitError extends Error {
  readonly code:
    | "INVALID_BOOTSTRAP_AUTH"
    | "INVALID_BOOTSTRAP_IDEMPOTENCY_KEY"
    | "BOOTSTRAP_CONFIRMATION_REQUIRED"
    | "BOOTSTRAP_PREVIEW_NOT_COMMITTABLE";

  constructor(
    code: CentralBusinessBootstrapCommitError["code"],
    message: string,
  ) {
    super(message);
    this.name = "CentralBusinessBootstrapCommitError";
    this.code = code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "El commit del bootstrap central solo puede construirse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function payloadHash(
  payload: CentralBusinessBootstrapEntityInput["payload"],
): string {
  return sha256(stableCentralBusinessJson(payload));
}

function compareEntities(
  left: Pick<CentralBusinessBootstrapEntityInput, "entityType" | "entityId">,
  right: Pick<CentralBusinessBootstrapEntityInput, "entityType" | "entityId">,
): number {
  return (
    left.entityType.localeCompare(right.entityType) ||
    left.entityId.localeCompare(right.entityId)
  );
}

export function buildCentralBusinessBootstrapCommitCommand(
  input: CentralBusinessBootstrapCommitInput,
): CentralBusinessBootstrapCommitCommand {
  if (!input.userId?.trim() || !input.deviceId?.trim() || !input.sessionId) {
    throw new CentralBusinessBootstrapCommitError(
      "INVALID_BOOTSTRAP_AUTH",
      "El bootstrap requiere usuario, dispositivo y sesion del servidor.",
    );
  }
  if (!/^[a-zA-Z0-9:_-]{12,160}$/.test(input.idempotencyKey)) {
    throw new CentralBusinessBootstrapCommitError(
      "INVALID_BOOTSTRAP_IDEMPOTENCY_KEY",
      "El bootstrap requiere una clave idempotente estable.",
    );
  }
  if (input.confirmation !== CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION) {
    throw new CentralBusinessBootstrapCommitError(
      "BOOTSTRAP_CONFIRMATION_REQUIRED",
      "El commit requiere confirmacion explicita.",
    );
  }
  if (!input.preview.canCommit) {
    throw new CentralBusinessBootstrapCommitError(
      "BOOTSTRAP_PREVIEW_NOT_COMMITTABLE",
      "La vista previa contiene conflictos o registros solo centrales.",
    );
  }

  const idempotencyKeyHash = sha256(input.idempotencyKey);
  const entities = [...input.entities].sort(compareEntities).map((entity) => {
    const contentHash = payloadHash(entity.payload);
    return {
      entityType: entity.entityType,
      entityId: entity.entityId,
      payload: entity.payload,
      contentHash,
      idempotencyKeyHash: sha256(
        stableCentralBusinessJson({
          bootstrap: idempotencyKeyHash,
          entityId: entity.entityId,
          entityType: entity.entityType,
        }),
      ),
      requestHash: sha256(
        stableCentralBusinessJson({
          contentHash,
          entityId: entity.entityId,
          entityType: entity.entityType,
          expectedVersion: 0,
          operationKind: "upsert",
        }),
      ),
    };
  });
  const requestHash = sha256(
    stableCentralBusinessJson({
      centralStateDigest: input.preview.centralStateDigest,
      entities: entities.map((entity) => ({
        contentHash: entity.contentHash,
        entityId: entity.entityId,
        entityType: entity.entityType,
      })),
      previewDigest: input.preview.previewDigest,
      snapshotDigest: input.preview.snapshotDigest,
      userId: input.userId,
    }),
  );

  return {
    schema: CENTRAL_BUSINESS_BOOTSTRAP_COMMIT,
    userId: input.userId,
    deviceId: input.deviceId,
    sessionId: input.sessionId,
    idempotencyKeyHash,
    requestHash,
    snapshotDigest: input.preview.snapshotDigest,
    centralStateDigest: input.preview.centralStateDigest,
    previewDigest: input.preview.previewDigest,
    entities,
  };
}
