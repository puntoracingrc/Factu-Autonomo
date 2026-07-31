import { createHash, randomUUID } from "node:crypto";

import {
  stableCentralBusinessJson,
  type CentralBusinessJson,
  type CentralBusinessServerAuth,
} from "./mutation-command";

assertServerOnlyModule();

export const CENTRAL_BUSINESS_NUMBERED_DOCUMENT_COMMAND =
  "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_COMMAND_V1";

export type CentralBusinessNumberedDocumentEntityType = "quote" | "receipt";

interface CentralBusinessNumberedDocumentBaseInput {
  auth: CentralBusinessServerAuth;
  idempotencyKey: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  numberTemplate: string;
  fiscalYear: number;
}

export interface CentralBusinessDocumentSeriesReconciliationInput
  extends CentralBusinessNumberedDocumentBaseInput {
  action: "reconcile_series";
  observedMaxSequence: number;
  sourceDocumentCount: number;
  sourceDigest: string;
}

export interface CentralBusinessNumberedDocumentCreateInput
  extends CentralBusinessNumberedDocumentBaseInput {
  action: "create";
  entityId: string;
  padding: number;
  payloadWithoutNumber: CentralBusinessJson;
}

interface CentralBusinessNumberedDocumentCommandBase {
  schema: typeof CENTRAL_BUSINESS_NUMBERED_DOCUMENT_COMMAND;
  requestId: string;
  userId: string;
  deviceId: string;
  sessionId: string;
  idempotencyKeyHash: string;
  requestHash: string;
  entityType: CentralBusinessNumberedDocumentEntityType;
  numberTemplate: string;
  fiscalYear: number;
}

export interface CentralBusinessDocumentSeriesReconciliationCommand
  extends CentralBusinessNumberedDocumentCommandBase {
  action: "reconcile_series";
  observedMaxSequence: number;
  sourceDocumentCount: number;
  sourceDigest: string;
}

export interface CentralBusinessNumberedDocumentCreateCommand
  extends CentralBusinessNumberedDocumentCommandBase {
  action: "create";
  entityId: string;
  padding: number;
  payloadWithoutNumber: CentralBusinessJson;
}

export type CentralBusinessNumberedDocumentCommand =
  | CentralBusinessDocumentSeriesReconciliationCommand
  | CentralBusinessNumberedDocumentCreateCommand;

export type CentralBusinessNumberedDocumentCommandErrorCode =
  | "INVALID_SERVER_AUTH"
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_ACTION"
  | "INVALID_ENTITY_TYPE"
  | "INVALID_NUMBER_TEMPLATE"
  | "INVALID_FISCAL_YEAR"
  | "INVALID_RECONCILIATION"
  | "INVALID_ENTITY_ID"
  | "INVALID_PADDING"
  | "INVALID_PAYLOAD";

export class CentralBusinessNumberedDocumentCommandError extends Error {
  readonly code: CentralBusinessNumberedDocumentCommandErrorCode;

  constructor(
    code: CentralBusinessNumberedDocumentCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CentralBusinessNumberedDocumentCommandError";
    this.code = code;
  }
}

function assertServerOnlyModule() {
  if (typeof window !== "undefined") {
    throw new Error(
      "Los comandos numerados de negocio solo pueden construirse en servidor.",
    );
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateAuth(auth: CentralBusinessServerAuth) {
  if (
    !auth ||
    !auth.userId?.trim() ||
    !auth.deviceId?.trim() ||
    !auth.sessionId?.trim() ||
    (auth.userIdSource !== "server" && auth.userIdSource !== "test")
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_SERVER_AUTH",
      "La operacion numerada requiere usuario, dispositivo y sesion del servidor.",
    );
  }
}

function validateIdempotencyKey(value: string) {
  if (!/^[a-zA-Z0-9:_-]{12,160}$/.test(value)) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_IDEMPOTENCY_KEY",
      "La operacion numerada requiere una clave idempotente estable.",
    );
  }
}

function validateEntityType(
  value: string,
): asserts value is CentralBusinessNumberedDocumentEntityType {
  if (value !== "quote" && value !== "receipt") {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_ENTITY_TYPE",
      "Solo se pueden numerar presupuestos y recibos.",
    );
  }
}

function validateTemplate(value: string) {
  if (
    value.length < 1 ||
    value.length > 120 ||
    !value.includes("{num}") ||
    value.replaceAll("{num}", "").replaceAll("{year}", "").match(/[{}]/) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_NUMBER_TEMPLATE",
      "El formato de numeracion central no es valido.",
    );
  }
}

function validateFiscalYear(value: number) {
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_FISCAL_YEAR",
      "El ejercicio de numeracion central no es valido.",
    );
  }
}

function isJsonObject(
  value: CentralBusinessJson,
): value is { [key: string]: CentralBusinessJson } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function baseCommand(
  input: CentralBusinessNumberedDocumentBaseInput,
  requestId: string,
) {
  validateAuth(input.auth);
  validateIdempotencyKey(input.idempotencyKey);
  validateEntityType(input.entityType);
  validateTemplate(input.numberTemplate);
  validateFiscalYear(input.fiscalYear);
  return {
    schema: CENTRAL_BUSINESS_NUMBERED_DOCUMENT_COMMAND,
    requestId,
    userId: input.auth.userId,
    deviceId: input.auth.deviceId,
    sessionId: input.auth.sessionId,
    idempotencyKeyHash: sha256(input.idempotencyKey),
    entityType: input.entityType,
    numberTemplate: input.numberTemplate,
    fiscalYear: input.fiscalYear,
  } as const;
}

export function buildCentralBusinessDocumentSeriesReconciliationCommand(
  input: CentralBusinessDocumentSeriesReconciliationInput,
  requestId: string = randomUUID(),
): CentralBusinessDocumentSeriesReconciliationCommand {
  if (input.action !== "reconcile_series") {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_ACTION",
      "Accion numerada no soportada.",
    );
  }
  const base = baseCommand(input, requestId);
  if (
    !Number.isInteger(input.observedMaxSequence) ||
    input.observedMaxSequence < 0 ||
    input.observedMaxSequence > 999999 ||
    !Number.isInteger(input.sourceDocumentCount) ||
    input.sourceDocumentCount < 0 ||
    !/^sha256:[0-9a-f]{64}$/.test(input.sourceDigest)
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_RECONCILIATION",
      "El inventario usado para conciliar la serie no es valido.",
    );
  }
  const requestHash = sha256(
    stableCentralBusinessJson({
      action: input.action,
      entityType: input.entityType,
      fiscalYear: input.fiscalYear,
      numberTemplate: input.numberTemplate,
      observedMaxSequence: input.observedMaxSequence,
      sourceDigest: input.sourceDigest,
      sourceDocumentCount: input.sourceDocumentCount,
    }),
  );
  return {
    ...base,
    action: input.action,
    requestHash,
    observedMaxSequence: input.observedMaxSequence,
    sourceDocumentCount: input.sourceDocumentCount,
    sourceDigest: input.sourceDigest,
  };
}

export function buildCentralBusinessNumberedDocumentCreateCommand(
  input: CentralBusinessNumberedDocumentCreateInput,
  requestId: string = randomUUID(),
): CentralBusinessNumberedDocumentCreateCommand {
  if (input.action !== "create") {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_ACTION",
      "Accion numerada no soportada.",
    );
  }
  const base = baseCommand(input, requestId);
  const entityId = input.entityId?.trim();
  if (
    !entityId ||
    entityId.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(entityId)
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_ENTITY_ID",
      "El documento necesita un identificador estable.",
    );
  }
  if (
    !Number.isInteger(input.padding) ||
    input.padding < 1 ||
    input.padding > 8
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_PADDING",
      "El relleno de numeracion debe estar entre 1 y 8.",
    );
  }
  if (
    !isJsonObject(input.payloadWithoutNumber) ||
    "number" in input.payloadWithoutNumber ||
    input.payloadWithoutNumber.id !== entityId ||
    input.payloadWithoutNumber.type !==
      (input.entityType === "quote" ? "presupuesto" : "recibo") ||
    typeof input.payloadWithoutNumber.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.payloadWithoutNumber.date) ||
    Number(input.payloadWithoutNumber.date.slice(0, 4)) !== input.fiscalYear ||
    "centralInvoiceAuthority" in input.payloadWithoutNumber ||
    "rectification" in input.payloadWithoutNumber ||
    "verifactu" in input.payloadWithoutNumber
  ) {
    throw new CentralBusinessNumberedDocumentCommandError(
      "INVALID_PAYLOAD",
      "El documento sin numerar no coincide con la serie solicitada.",
    );
  }
  const requestHash = sha256(
    stableCentralBusinessJson({
      action: input.action,
      entityId,
      entityType: input.entityType,
      fiscalYear: input.fiscalYear,
      numberTemplate: input.numberTemplate,
      padding: input.padding,
      payloadWithoutNumber: input.payloadWithoutNumber,
    }),
  );
  return {
    ...base,
    action: input.action,
    requestHash,
    entityId,
    padding: input.padding,
    payloadWithoutNumber: input.payloadWithoutNumber,
  };
}
