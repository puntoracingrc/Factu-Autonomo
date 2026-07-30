import type { CentralBusinessQueuedOperation } from "@/lib/central-business-authority/durable-queue";
import type { CentralBusinessEntityType } from "@/lib/central-business-authority/mutation-command";
import type { AppData } from "@/lib/types";

const AUTOMATIC_SERVER_RESOLUTION_CODES = new Set([
  "CENTRAL_BUSINESS_VERSION_CONFLICT",
  "CENTRAL_BUSINESS_ENTITY_NOT_FOUND",
  "CENTRAL_BUSINESS_REMOTE_EVENT_CONFLICT",
]);

export interface CentralBusinessConflictReviewItem {
  key: string;
  entityType: CentralBusinessEntityType;
  entityId: string;
  label: string;
  operationCount: number;
  operationText: string;
  expectedVersionText: string;
  issue: string;
  canKeepServer: boolean;
}

export interface CentralBusinessBlockedReviewItem {
  key: string;
  retryOperationId: string;
  label: string;
  operationCount: number;
  issue: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function payloadLabel(
  operation: CentralBusinessQueuedOperation,
): string | null {
  const payload = operation.input.payload;
  if (!isObject(payload)) return null;
  for (const key of ["name", "description", "text", "commercialName"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
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
  if (operation.input.entityType === "supplier") {
    return (
      data.suppliers.find(
        (supplier) => supplier.id === operation.input.entityId,
      )?.name ??
      payloadLabel(operation) ??
      "Proveedor sin nombre"
    );
  }
  if (operation.input.entityType === "product") {
    return (
      data.products.find((product) => product.id === operation.input.entityId)
        ?.name ??
      payloadLabel(operation) ??
      "Producto sin nombre"
    );
  }
  if (operation.input.entityType === "expense") {
    const expense = data.expenses.find(
      (entry) => entry.id === operation.input.entityId,
    );
    return (
      expense?.description ??
      expense?.supplierName ??
      payloadLabel(operation) ??
      "Gasto sin descripción"
    );
  }
  if (operation.input.entityType === "recurring_expense") {
    const recurringExpense = data.recurringExpenses.find(
      (entry) => entry.id === operation.input.entityId,
    );
    return (
      recurringExpense?.description ??
      recurringExpense?.supplierName ??
      payloadLabel(operation) ??
      "Gasto recurrente sin descripción"
    );
  }
  if (operation.input.entityType === "user_reminder") {
    return (
      data.userReminders.find(
        (reminder) => reminder.id === operation.input.entityId,
      )?.text ??
      payloadLabel(operation) ??
      "Recordatorio sin texto"
    );
  }
  return (
    data.profile.commercialName ||
    data.profile.name ||
    payloadLabel(operation) ||
    "Datos del negocio"
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
    if (operation.status !== "conflict") continue;
    const key = `${operation.input.entityType}:${operation.input.entityId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), operation]);
  }

  return Array.from(grouped.entries()).map(([key, matching]) => {
    const first = matching[0];
    const codes = matching.map((operation) => operation.lastError?.code ?? "");
    return {
      key,
      entityType: first.input.entityType,
      entityId: first.input.entityId,
      label: localEntityLabel(data, first),
      operationCount: matching.length,
      operationText: operationText(matching),
      expectedVersionText: expectedVersionText(matching),
      issue:
        first.lastError?.message ??
        "El servidor central rechazó este cambio hasta que se revise.",
      canKeepServer:
        matching.every((operation) => !operation.batchId) &&
        codes.every((code) => AUTOMATIC_SERVER_RESOLUTION_CODES.has(code)),
    };
  });
}

export function buildCentralBusinessBlockedReviewItems(
  operations: CentralBusinessQueuedOperation[],
): CentralBusinessBlockedReviewItem[] {
  const grouped = new Map<string, CentralBusinessQueuedOperation[]>();
  for (const operation of operations) {
    if (operation.status !== "blocked") continue;
    const key = operation.batchId ?? operation.operationId;
    grouped.set(key, [...(grouped.get(key) ?? []), operation]);
  }

  return Array.from(grouped.entries()).map(([key, matching]) => {
    const first = matching[0];
    return {
      key,
      retryOperationId: first.operationId,
      label:
        matching.length === 1
          ? "Operación central detenida"
          : `Lote atómico · ${matching.length} fichas`,
      operationCount: matching.length,
      issue:
        first.lastError?.message ??
        "El servidor central rechazó la operación sin aplicar cambios.",
    };
  });
}
