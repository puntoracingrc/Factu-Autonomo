import type {
  CentralBusinessQueuedOperation,
} from "@/lib/central-business-authority/durable-queue";
import type { AppData } from "@/lib/types";

const AUTOMATIC_SERVER_RESOLUTION_CODES = new Set([
  "CENTRAL_BUSINESS_VERSION_CONFLICT",
  "CENTRAL_BUSINESS_ENTITY_NOT_FOUND",
  "CENTRAL_BUSINESS_REMOTE_EVENT_CONFLICT",
]);

export interface CentralBusinessConflictReviewItem {
  key: string;
  entityType: "customer" | "product";
  entityId: string;
  label: string;
  operationCount: number;
  operationText: string;
  expectedVersionText: string;
  issue: string;
  canKeepServer: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function payloadLabel(operation: CentralBusinessQueuedOperation): string | null {
  const payload = operation.input.payload;
  if (!isObject(payload)) return null;
  const name = payload.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

function localEntityLabel(
  data: AppData,
  operation: CentralBusinessQueuedOperation,
): string {
  if (operation.input.entityType === "customer") {
    return (
      data.customers.find(
        (customer) => customer.id === operation.input.entityId,
      )?.name ??
      payloadLabel(operation) ??
      "Cliente sin nombre"
    );
  }
  return (
    data.products.find((product) => product.id === operation.input.entityId)
      ?.name ??
    payloadLabel(operation) ??
    "Producto sin nombre"
  );
}

function operationText(operations: CentralBusinessQueuedOperation[]): string {
  const kinds = new Set(
    operations.map((operation) => operation.input.operationKind),
  );
  if (kinds.size > 1) return "varios cambios locales";
  return kinds.has("delete") ? "eliminación local" : "edición local";
}

function expectedVersionText(
  operations: CentralBusinessQueuedOperation[],
): string {
  const versions = Array.from(
    new Set(operations.map((operation) => operation.input.expectedVersion)),
  ).sort((left, right) => left - right);
  return versions.length === 1
    ? `versión ${versions[0]}`
    : `versiones ${versions.join(", ")}`;
}

export function buildCentralBusinessConflictReviewItems(
  data: AppData,
  operations: CentralBusinessQueuedOperation[],
): CentralBusinessConflictReviewItem[] {
  const grouped = new Map<string, CentralBusinessQueuedOperation[]>();
  for (const operation of operations) {
    if (
      operation.status !== "conflict" ||
      (operation.input.entityType !== "customer" &&
        operation.input.entityType !== "product")
    ) {
      continue;
    }
    const key = `${operation.input.entityType}:${operation.input.entityId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), operation]);
  }

  return Array.from(grouped.entries()).map(([key, matching]) => {
    const first = matching[0];
    const codes = matching.map((operation) => operation.lastError?.code ?? "");
    return {
      key,
      entityType: first.input.entityType as "customer" | "product",
      entityId: first.input.entityId,
      label: localEntityLabel(data, first),
      operationCount: matching.length,
      operationText: operationText(matching),
      expectedVersionText: expectedVersionText(matching),
      issue:
        first.lastError?.message ??
        "El servidor central rechazó este cambio hasta que se revise.",
      canKeepServer: codes.every((code) =>
        AUTOMATIC_SERVER_RESOLUTION_CODES.has(code),
      ),
    };
  });
}
