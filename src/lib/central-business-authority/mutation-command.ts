import { createHash, randomUUID } from "node:crypto";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_MUTATION_COMMAND =
  "CENTRAL_BUSINESS_MUTATION_COMMAND_V1";

export type CentralBusinessEntityType =
  | "customer"
  | "supplier"
  | "product"
  | "expense"
  | "recurring_expense"
  | "user_reminder"
  | "quote"
  | "receipt"
  | "profile";

export type CentralBusinessOperationKind = "upsert" | "delete";
export type CentralBusinessJson =
  | null
  | boolean
  | number
  | string
  | CentralBusinessJson[]
  | { [key: string]: CentralBusinessJson };

export interface CentralBusinessServerAuth {
  userId: string;
  deviceId: string;
  sessionId: string;
  userIdSource: "server" | "test";
}

export interface CentralBusinessMutationInput {
  auth: CentralBusinessServerAuth;
  idempotencyKey: string;
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
}

export interface CentralBusinessMutationCommand {
  schema: typeof CENTRAL_BUSINESS_MUTATION_COMMAND;
  requestId: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  idempotencyKeyHash: string;
  requestHash: string;
  operationKind: CentralBusinessOperationKind;
  entityType: CentralBusinessEntityType;
  entityId: string;
  expectedVersion: number;
  payload: CentralBusinessJson | null;
  contentHash: string;
}

export type CentralBusinessMutationCommandErrorCode =
  | "INVALID_SERVER_AUTH"
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_OPERATION"
  | "INVALID_ENTITY_TYPE"
  | "INVALID_ENTITY_ID"
  | "INVALID_EXPECTED_VERSION"
  | "INVALID_PAYLOAD";

export class CentralBusinessMutationCommandError extends Error {
  readonly code: CentralBusinessMutationCommandErrorCode;

  constructor(code: CentralBusinessMutationCommandErrorCode, message: string) {
    super(message);
    this.name = "CentralBusinessMutationCommandError";
    this.code = code;
  }
}

const ENTITY_TYPES = new Set<CentralBusinessEntityType>([
  "customer",
  "supplier",
  "product",
  "expense",
  "recurring_expense",
  "user_reminder",
  "quote",
  "receipt",
  "profile",
]);

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "Los comandos centrales de negocio solo pueden construirse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isJsonContainer(
  value: CentralBusinessJson | null,
): value is CentralBusinessJson[] | { [key: string]: CentralBusinessJson } {
  return value !== null && typeof value === "object";
}

export function stableCentralBusinessJson(value: CentralBusinessJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableCentralBusinessJson).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, entry]) =>
        `${JSON.stringify(key)}:${stableCentralBusinessJson(entry)}`,
    )
    .join(",")}}`;
}

export function buildCentralBusinessMutationCommand(
  input: CentralBusinessMutationInput,
  requestId: string = randomUUID(),
): CentralBusinessMutationCommand {
  if (
    !input.auth ||
    !input.auth.userId?.trim() ||
    !input.auth.deviceId?.trim() ||
    !input.auth.sessionId?.trim() ||
    (input.auth.userIdSource !== "server" &&
      input.auth.userIdSource !== "test")
  ) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_SERVER_AUTH",
      "La mutacion central requiere usuario, dispositivo y sesion del servidor.",
    );
  }
  if (!/^[a-zA-Z0-9:_-]{12,160}$/.test(input.idempotencyKey)) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_IDEMPOTENCY_KEY",
      "La mutacion central requiere una clave idempotente estable.",
    );
  }
  if (input.operationKind !== "upsert" && input.operationKind !== "delete") {
    throw new CentralBusinessMutationCommandError(
      "INVALID_OPERATION",
      "Operacion central no soportada.",
    );
  }
  if (!ENTITY_TYPES.has(input.entityType)) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_ENTITY_TYPE",
      "Tipo de entidad central no soportado.",
    );
  }

  const entityId = input.entityId?.trim();
  if (
    !entityId ||
    entityId.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(entityId) ||
    (input.entityType === "profile" && entityId !== "profile")
  ) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_ENTITY_ID",
      "Identificador de entidad central no valido.",
    );
  }
  if (
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 0
  ) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_EXPECTED_VERSION",
      "La mutacion central requiere una version esperada valida.",
    );
  }
  if (
    (input.operationKind === "upsert" && !isJsonContainer(input.payload)) ||
    (input.operationKind === "delete" && input.payload !== null)
  ) {
    throw new CentralBusinessMutationCommandError(
      "INVALID_PAYLOAD",
      "El payload no coincide con la operacion central solicitada.",
    );
  }

  const contentHash =
    input.operationKind === "delete"
      ? sha256("central-business-tombstone-v1")
      : sha256(stableCentralBusinessJson(input.payload));
  const idempotencyKeyHash = sha256(input.idempotencyKey);
  const requestHash = sha256(
    stableCentralBusinessJson({
      contentHash,
      entityId,
      entityType: input.entityType,
      expectedVersion: input.expectedVersion,
      operationKind: input.operationKind,
    }),
  );

  return {
    schema: CENTRAL_BUSINESS_MUTATION_COMMAND,
    requestId,
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    sessionId: input.auth.sessionId,
    idempotencyKeyHash,
    requestHash,
    operationKind: input.operationKind,
    entityType: input.entityType,
    entityId,
    expectedVersion: input.expectedVersion,
    payload: input.payload,
    contentHash,
  };
}
