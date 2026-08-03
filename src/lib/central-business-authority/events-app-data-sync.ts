"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import { appDataDomainEquals } from "@/lib/app-data-durability";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { countersFromDocuments } from "@/lib/documents";
import { migrateCustomer } from "@/lib/customers";
import {
  deleteCustomerMasterFromData,
  deleteSupplierMasterFromData,
} from "@/lib/master-record-deletion";
import { normalizeProductCatalogItem } from "@/lib/purchase-products";
import {
  deleteExpenseFromData,
  deleteRecurringExpenseFromData,
} from "@/lib/recurring-expenses";
import type {
  AppData,
  BusinessProfile,
  Customer,
  Document,
  Expense,
  Product,
  RecurringExpense,
  Supplier,
  UserReminder,
  UserReminderLinkKind,
} from "@/lib/types";

import {
  applyCentralBusinessEventPage,
  loadCentralBusinessDurableQueue,
  resetCentralBusinessEventStateForServerAdoption,
  type CentralBusinessDurableQueueState,
  type CentralBusinessEntityVersion,
  type CentralBusinessQueueStorage,
  withCentralBusinessQueueLock,
} from "./durable-queue";
import {
  pullCentralBusinessEventsFromBrowser,
  type CentralBusinessBrowserEvent,
  type CentralBusinessEventsPullResult,
} from "./events-client";
import {
  parseCentralExpensePayload,
  parseCentralBusinessDocumentPayload,
  parseCentralProfilePayload,
  parseCentralRecurringExpensePayload,
} from "./payload-parsers";
import {
  CentralBusinessReceiptMaterializationError,
  centralBusinessReceiptServerPayload,
  isCentralBusinessReceipt,
  materializeCentralBusinessReceipt,
} from "./central-receipt-materialization";

export const CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC =
  "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1";

function parsedTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function selectCentralBusinessEventsSyncBaseline(input: {
  memory: AppData;
  persisted: AppData | null;
  persistedMatchesMemory: boolean;
}): AppData | null {
  if (input.persistedMatchesMemory) return input.memory;
  if (!input.persisted) return null;
  if (appDataDomainEquals(input.memory, input.persisted)) return input.memory;

  const memoryModified = parsedTimestamp(input.memory.meta?.lastModified);
  const persistedModified = parsedTimestamp(input.persisted.meta?.lastModified);
  if (persistedModified === null && memoryModified === null) return null;
  if (memoryModified === null) return input.persisted;
  if (persistedModified === null) return input.memory;
  if (persistedModified > memoryModified) return input.persisted;
  if (memoryModified > persistedModified) return input.memory;
  return null;
}

function serverAdoptionPreservedProjection(data: AppData): unknown {
  const cleared = clearCentralBusinessLocalProjection(data);
  return {
    ...cleared,
    profile: null,
    counters: {
      ...cleared.counters,
      presupuesto: 0,
      recibo: 0,
    },
  };
}

function matchesServerAdoptionPreservedProjection(
  memory: AppData,
  persisted: AppData,
): boolean {
  return (
    stableStringifySnapshot(serverAdoptionPreservedProjection(memory)) ===
    stableStringifySnapshot(serverAdoptionPreservedProjection(persisted))
  );
}

export function selectCentralBusinessServerAdoptionBaseline(input: {
  memory: AppData;
  persisted: AppData | null;
  persistedMatchesMemory: boolean;
}): AppData | null {
  const baseline = selectCentralBusinessEventsSyncBaseline(input);
  if (baseline) return baseline;
  if (!input.persisted) return null;

  return matchesServerAdoptionPreservedProjection(input.memory, input.persisted)
    ? input.persisted
    : null;
}

type SupportedEntityType =
  | "customer"
  | "supplier"
  | "product"
  | "user_reminder"
  | "expense"
  | "recurring_expense"
  | "quote"
  | "receipt"
  | "profile";

export type CentralBusinessEventLocalAction =
  "added" | "updated" | "deleted" | "unchanged";

export type CentralBusinessEventLocalApplyValue =
  | {
      schema: typeof CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC;
      entityType: SupportedEntityType;
      entityId: string;
      action: CentralBusinessEventLocalAction;
    }
  | {
      schema: typeof CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC;
      action: "adopted_server_snapshot";
      replacedEntityTypes: SupportedEntityType[];
    };

export type CentralBusinessEventsAppDataSyncResult =
  | {
      ok: true;
      schema: typeof CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC;
      pulled: number;
      applied: number;
      skipped: number;
      nextSequence: number;
      hasMore: boolean;
    }
  | {
      ok: false;
      schema: typeof CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC;
      code: string;
      message: string;
      retryable: boolean;
      nextSequence: number;
    };

export interface CentralBusinessEventsAppDataSyncDependencies {
  getCurrentData(): AppData;
  commit(
    expected: AppData,
    build: (
      previous: AppData,
    ) => AppDataTransition<CentralBusinessEventLocalApplyValue>,
  ): AppDataDurabilityResult<CentralBusinessEventLocalApplyValue>;
  pull?: (input: {
    afterSequence: number;
    limit: number;
  }) => Promise<CentralBusinessEventsPullResult>;
  verifyContentHash?: (event: CentralBusinessBrowserEvent) => Promise<boolean>;
  storage?: CentralBusinessQueueStorage;
}

class CentralBusinessLocalApplyError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "CentralBusinessLocalApplyError";
    this.code = code;
    this.retryable = retryable;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function optionalNumber(value: unknown): value is number | undefined {
  return (
    value === undefined || (typeof value === "number" && Number.isFinite(value))
  );
}

function optionalBoolean(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function parseCustomerPayload(
  payload: CentralBusinessBrowserEvent["payload"],
  entityId: string,
): Customer | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.firstName !== "string" ||
    typeof payload.lastName !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    (payload.customerType !== undefined &&
      payload.customerType !== "person" &&
      payload.customerType !== "company") ||
    !optionalString(payload.contactName) ||
    !optionalString(payload.nif) ||
    !optionalString(payload.email) ||
    !optionalString(payload.phone) ||
    !optionalString(payload.streetType) ||
    !optionalString(payload.addressExtra) ||
    !optionalString(payload.residenceType) ||
    !optionalString(payload.address) ||
    !optionalString(payload.city) ||
    !optionalString(payload.postalCode) ||
    !optionalString(payload.notes) ||
    (payload.mergedCustomerIds !== undefined &&
      (!Array.isArray(payload.mergedCustomerIds) ||
        !payload.mergedCustomerIds.every((value) => typeof value === "string")))
  ) {
    return null;
  }

  try {
    return migrateCustomer({
      id: payload.id,
      customerType: payload.customerType,
      firstName: payload.firstName,
      lastName: payload.lastName,
      name: payload.name,
      contactName: payload.contactName,
      mergedCustomerIds: payload.mergedCustomerIds,
      nif: payload.nif,
      email: payload.email,
      phone: payload.phone,
      streetType: payload.streetType,
      addressExtra: payload.addressExtra,
      residenceType: payload.residenceType as Customer["residenceType"],
      address: payload.address,
      city: payload.city,
      postalCode: payload.postalCode,
      notes: payload.notes,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
  } catch {
    return null;
  }
}

function parseSupplierPayload(
  payload: CentralBusinessBrowserEvent["payload"],
  entityId: string,
): Supplier | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.name !== "string" ||
    !payload.name.trim() ||
    typeof payload.createdAt !== "string" ||
    !optionalString(payload.nif) ||
    !optionalString(payload.email) ||
    !optionalString(payload.phone) ||
    !optionalString(payload.website) ||
    !optionalString(payload.streetType) ||
    !optionalString(payload.address) ||
    !optionalString(payload.city) ||
    !optionalString(payload.postalCode) ||
    !optionalString(payload.category) ||
    !optionalString(payload.notes)
  ) {
    return null;
  }

  return {
    id: payload.id,
    name: payload.name,
    nif: payload.nif,
    email: payload.email,
    phone: payload.phone,
    website: payload.website,
    streetType: payload.streetType,
    address: payload.address,
    city: payload.city,
    postalCode: payload.postalCode,
    category: payload.category,
    notes: payload.notes,
    createdAt: payload.createdAt,
  };
}

function parseProductFacet(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isObject(value)) return false;
  return (
    optionalBoolean(value.enabled) &&
    optionalString(value.description) &&
    optionalString(value.unit) &&
    optionalNumber(value.unitPrice) &&
    optionalNumber(value.listPrice) &&
    optionalNumber(value.discountPercent) &&
    optionalNumber(value.netUnitCost) &&
    optionalNumber(value.ivaPercent) &&
    optionalString(value.supplierId) &&
    optionalString(value.supplierName) &&
    optionalString(value.supplierReference) &&
    optionalNumber(value.purchaseToSaleFactor)
  );
}

function parseProductPayload(
  payload: CentralBusinessBrowserEvent["payload"],
  entityId: string,
): Product | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.key !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.family !== "string" ||
    (payload.source !== "manual" && payload.source !== "detected") ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    (payload.aliases !== undefined &&
      (!Array.isArray(payload.aliases) ||
        !payload.aliases.every((value) => typeof value === "string"))) ||
    !optionalString(payload.subfamily) ||
    !optionalString(payload.sku) ||
    !optionalString(payload.externalId) ||
    !optionalString(payload.unit) ||
    !optionalString(payload.supplierId) ||
    !optionalString(payload.supplierName) ||
    !optionalNumber(payload.pvp) ||
    !optionalNumber(payload.cost) ||
    !optionalNumber(payload.ivaPercent) ||
    !optionalString(payload.notes) ||
    !optionalBoolean(payload.hidden) ||
    !parseProductFacet(payload.sales) ||
    !parseProductFacet(payload.purchase) ||
    (payload.calculation !== undefined &&
      (!isObject(payload.calculation) ||
        !["none", "linear", "area", "volume"].includes(
          String(payload.calculation.kind),
        ) ||
        !optionalString(payload.calculation.unit) ||
        !optionalNumber(payload.calculation.roundingDecimals))) ||
    (payload.attributes !== undefined &&
      (!Array.isArray(payload.attributes) ||
        !payload.attributes.every(
          (attribute) =>
            isObject(attribute) &&
            typeof attribute.key === "string" &&
            typeof attribute.label === "string" &&
            typeof attribute.value === "string" &&
            optionalString(attribute.unit),
        )))
  ) {
    return null;
  }

  try {
    return normalizeProductCatalogItem(payload as unknown as Product);
  } catch {
    return null;
  }
}

const USER_REMINDER_LINK_KINDS = new Set<UserReminderLinkKind>([
  "none",
  "customer",
  "document",
  "rectify",
  "new_invoice",
  "new_quote",
  "new_receipt",
  "new_expense",
]);

function parseUserReminderPayload(
  payload: CentralBusinessBrowserEvent["payload"],
  entityId: string,
): UserReminder | null {
  if (
    !isObject(payload) ||
    payload.id !== entityId ||
    typeof payload.text !== "string" ||
    !payload.text.trim() ||
    !optionalString(payload.dueDate) ||
    !optionalString(payload.dueTime) ||
    !isObject(payload.link) ||
    !USER_REMINDER_LINK_KINDS.has(
      payload.link.kind as UserReminderLinkKind,
    ) ||
    !optionalString(payload.link.entityId) ||
    (payload.target !== "self" && payload.target !== "office") ||
    (payload.origin !== undefined &&
      payload.origin !== "field" &&
      payload.origin !== "office") ||
    typeof payload.completed !== "boolean" ||
    !optionalString(payload.completedAt) ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string"
  ) {
    return null;
  }

  return JSON.parse(JSON.stringify(payload)) as UserReminder;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

async function sha256(value: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  try {
    const bytes = new TextEncoder().encode(value);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export async function verifyCentralBusinessEventContentHash(
  event: CentralBusinessBrowserEvent,
): Promise<boolean> {
  const canonical =
    event.operationKind === "delete"
      ? "central-business-tombstone-v1"
      : stableJson(event.payload);
  const calculated = await sha256(canonical);
  return calculated !== null && calculated === event.contentHash;
}

function sameEntity(
  left:
    | Customer
    | Supplier
    | Product
    | UserReminder
    | Document
    | Expense
    | RecurringExpense
    | BusinessProfile,
  right:
    | Customer
    | Supplier
    | Product
    | UserReminder
    | Document
    | Expense
    | RecurringExpense
    | BusinessProfile,
) {
  return stableJson(left) === stableJson(right);
}

function localConflict(message: string): never {
  throw new CentralBusinessLocalApplyError(
    "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT",
    message,
  );
}

export function buildCentralBusinessEventAppDataTransition(input: {
  data: AppData;
  event: CentralBusinessBrowserEvent;
  knownVersion?: CentralBusinessEntityVersion;
}): AppDataTransition<CentralBusinessEventLocalApplyValue> {
  const { data, event, knownVersion } = input;
  if (
    event.entityType !== "customer" &&
    event.entityType !== "supplier" &&
    event.entityType !== "product" &&
    event.entityType !== "user_reminder" &&
    event.entityType !== "expense" &&
    event.entityType !== "recurring_expense" &&
    event.entityType !== "quote" &&
    event.entityType !== "receipt" &&
    event.entityType !== "profile"
  ) {
    throw new CentralBusinessLocalApplyError(
      "CENTRAL_BUSINESS_ENTITY_NOT_SUPPORTED",
      "Este dispositivo todavía no puede aplicar este tipo de dato central.",
    );
  }

  const knownPrevious =
    knownVersion &&
    (event.entityVersion === knownVersion.version ||
      event.entityVersion === knownVersion.version + 1);
  const value = (
    action: CentralBusinessEventLocalAction,
  ): CentralBusinessEventLocalApplyValue => ({
    schema: CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC,
    entityType: event.entityType as SupportedEntityType,
    entityId: event.entityId,
    action,
  });

  if (event.entityType === "customer") {
    const existing = data.customers.find(
      (customer) => customer.id === event.entityId,
    );
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (!knownPrevious) {
        return localConflict(
          "El cliente local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: deleteCustomerMasterFromData(data, event.entityId),
        value: value("deleted"),
      };
    }
    const incoming = parseCustomerPayload(event.payload, event.entityId);
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_CUSTOMER_EVENT",
        "El servidor devolvió un cliente incompleto.",
      );
    }
    if (!existing) {
      return {
        data: { ...data, customers: [...data.customers, incoming] },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El cliente local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        customers: data.customers.map((customer) =>
          customer.id === event.entityId ? incoming : customer,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "supplier") {
    const existing = data.suppliers.find(
      (supplier) => supplier.id === event.entityId,
    );
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (!knownPrevious) {
        return localConflict(
          "El proveedor local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: deleteSupplierMasterFromData(data, event.entityId),
        value: value("deleted"),
      };
    }
    const incoming = parseSupplierPayload(event.payload, event.entityId);
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_SUPPLIER_EVENT",
        "El servidor devolvió un proveedor incompleto.",
      );
    }
    if (!existing) {
      return {
        data: { ...data, suppliers: [...data.suppliers, incoming] },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El proveedor local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        suppliers: data.suppliers.map((supplier) =>
          supplier.id === event.entityId ? incoming : supplier,
        ),
        expenses: data.expenses.map((expense) =>
          expense.supplierId === event.entityId
            ? { ...expense, supplierName: incoming.name }
            : expense,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "user_reminder") {
    const existing = data.userReminders.find(
      (reminder) => reminder.id === event.entityId,
    );
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (!knownPrevious) {
        return localConflict(
          "El recordatorio local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: {
          ...data,
          userReminders: data.userReminders.filter(
            (reminder) => reminder.id !== event.entityId,
          ),
        },
        value: value("deleted"),
      };
    }
    const incoming = parseUserReminderPayload(event.payload, event.entityId);
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_USER_REMINDER_EVENT",
        "El servidor devolvió un recordatorio incompleto.",
      );
    }
    if (!existing) {
      return {
        data: {
          ...data,
          userReminders: [...data.userReminders, incoming],
        },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El recordatorio local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        userReminders: data.userReminders.map((reminder) =>
          reminder.id === event.entityId ? incoming : reminder,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "expense") {
    const matches = data.expenses.filter(
      (expense) => expense.id === event.entityId,
    );
    if (matches.length > 1) {
      return localConflict(
        "El gasto local tiene identificadores duplicados y requiere revisión.",
      );
    }
    const existing = matches[0];
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (!knownPrevious) {
        return localConflict(
          "El gasto local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: deleteExpenseFromData(data, event.entityId, event.createdAt),
        value: value("deleted"),
      };
    }
    const incoming = parseCentralExpensePayload(
      event.payload,
      event.entityId,
    );
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_EXPENSE_EVENT",
        "El servidor devolvió un gasto incompleto.",
      );
    }
    if (!existing) {
      return {
        data: { ...data, expenses: [...data.expenses, incoming] },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El gasto local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        expenses: data.expenses.map((expense) =>
          expense.id === event.entityId ? incoming : expense,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "recurring_expense") {
    const matches = data.recurringExpenses.filter(
      (expense) => expense.id === event.entityId,
    );
    if (matches.length > 1) {
      return localConflict(
        "El gasto fijo local tiene identificadores duplicados y requiere revisión.",
      );
    }
    const existing = matches[0];
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (!knownPrevious) {
        return localConflict(
          "El gasto fijo local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: deleteRecurringExpenseFromData(data, event.entityId),
        value: value("deleted"),
      };
    }
    const incoming = parseCentralRecurringExpensePayload(
      event.payload,
      event.entityId,
    );
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_RECURRING_EXPENSE_EVENT",
        "El servidor devolvió un gasto fijo incompleto.",
      );
    }
    if (!existing) {
      return {
        data: {
          ...data,
          recurringExpenses: [...data.recurringExpenses, incoming],
        },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El gasto fijo local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        recurringExpenses: data.recurringExpenses.map((expense) =>
          expense.id === event.entityId ? incoming : expense,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "quote" || event.entityType === "receipt") {
    const matches = data.documents.filter(
      (document) => document.id === event.entityId,
    );
    if (matches.length > 1) {
      return localConflict(
        "El documento local tiene identificadores duplicados y requiere revisión.",
      );
    }
    const existing = matches[0];
    if (event.operationKind === "delete") {
      if (!existing) return { data, value: value("unchanged") };
      if (event.entityType === "receipt" && isCentralBusinessReceipt(existing)) {
        throw new CentralBusinessLocalApplyError(
          "CENTRAL_BUSINESS_RECEIPT_DELETE_NOT_SUPPORTED",
          "Un recibo central emitido no se puede borrar mediante sincronizacion.",
        );
      }
      if (!knownPrevious) {
        return localConflict(
          "El documento local no tiene una versión central confirmada para borrarlo.",
        );
      }
      return {
        data: {
          ...data,
          documents: data.documents.filter(
            (document) => document.id !== event.entityId,
          ),
        },
        value: value("deleted"),
      };
    }
    const incoming = parseCentralBusinessDocumentPayload(
      event.payload,
      event.entityId,
      event.entityType,
    );
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_DOCUMENT_EVENT",
        "El servidor devolvió un presupuesto o recibo incompleto.",
      );
    }
    if (event.entityType === "receipt" && isCentralBusinessReceipt(incoming)) {
      if (existing) {
        if (
          stableJson(centralBusinessReceiptServerPayload(existing)) ===
          stableJson(incoming)
        ) {
          return { data, value: value("unchanged") };
        }
        return localConflict(
          "El recibo central difiere del recibo ya sellado en este dispositivo.",
        );
      }
      try {
        const materialized = materializeCentralBusinessReceipt({
          data,
          receiptPayload: incoming,
        });
        return {
          data: materialized.data,
          value: value("added"),
        };
      } catch (error) {
        if (error instanceof CentralBusinessReceiptMaterializationError) {
          throw new CentralBusinessLocalApplyError(
            `CENTRAL_BUSINESS_${error.code}`,
            error.message,
            error.code === "RECEIPT_SOURCE_MISSING",
          );
        }
        throw error;
      }
    }
    if (
      event.entityType === "receipt" &&
      existing &&
      isCentralBusinessReceipt(existing)
    ) {
      return localConflict(
        "El servidor no puede sustituir un recibo central sellado por un documento sin autoridad.",
      );
    }
    if (!existing) {
      return {
        data: { ...data, documents: [...data.documents, incoming] },
        value: value("added"),
      };
    }
    if (sameEntity(existing, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El documento local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: {
        ...data,
        documents: data.documents.map((document) =>
          document.id === event.entityId ? incoming : document,
        ),
      },
      value: value("updated"),
    };
  }

  if (event.entityType === "profile") {
    if (event.operationKind === "delete") {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_PROFILE_DELETE_NOT_SUPPORTED",
        "El perfil fiscal central no se puede borrar.",
      );
    }
    const incoming = parseCentralProfilePayload(
      event.payload,
      event.entityId,
    );
    if (!incoming) {
      throw new CentralBusinessLocalApplyError(
        "CENTRAL_BUSINESS_INVALID_PROFILE_EVENT",
        "El servidor devolvió un perfil incompleto.",
      );
    }
    if (sameEntity(data.profile, incoming)) {
      return { data, value: value("unchanged") };
    }
    if (!knownPrevious) {
      return localConflict(
        "El perfil local difiere de la primera versión recibida del servidor.",
      );
    }
    return {
      data: { ...data, profile: incoming },
      value: value("updated"),
    };
  }

  const existing = data.products.find(
    (product) => product.id === event.entityId,
  );
  if (event.operationKind === "delete") {
    if (!existing) return { data, value: value("unchanged") };
    if (!knownPrevious) {
      return localConflict(
        "El producto local no tiene una versión central confirmada para borrarlo.",
      );
    }
    return {
      data: {
        ...data,
        products: data.products.filter(
          (product) => product.id !== event.entityId,
        ),
      },
      value: value("deleted"),
    };
  }
  const incoming = parseProductPayload(event.payload, event.entityId);
  if (!incoming) {
    throw new CentralBusinessLocalApplyError(
      "CENTRAL_BUSINESS_INVALID_PRODUCT_EVENT",
      "El servidor devolvió un producto incompleto.",
    );
  }
  if (!existing) {
    return {
      data: { ...data, products: [...data.products, incoming] },
      value: value("added"),
    };
  }
  if (sameEntity(existing, incoming)) {
    return { data, value: value("unchanged") };
  }
  if (!knownPrevious) {
    return localConflict(
      "El producto local difiere de la primera versión recibida del servidor.",
    );
  }
  return {
    data: {
      ...data,
      products: data.products.map((product) =>
        product.id === event.entityId ? incoming : product,
      ),
    },
    value: value("updated"),
  };
}

function failed(
  code: string,
  message: string,
  nextSequence: number,
  retryable = false,
): CentralBusinessEventsAppDataSyncResult {
  return {
    ok: false,
    schema: CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC,
    code,
    message,
    retryable,
    nextSequence,
  };
}

function serverAdoptionValue(): CentralBusinessEventLocalApplyValue {
  return {
    schema: CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC,
    action: "adopted_server_snapshot",
    replacedEntityTypes: [
      "customer",
      "supplier",
      "product",
      "user_reminder",
      "expense",
      "recurring_expense",
      "quote",
      "receipt",
      "profile",
    ],
  };
}

function clearCentralBusinessLocalProjection(data: AppData): AppData {
  return {
    ...data,
    customers: [],
    suppliers: [],
    products: [],
    userReminders: [],
    expenses: [],
    recurringExpenses: [],
    documents: data.documents.filter(
      (document) =>
        document.type !== "presupuesto" && document.type !== "recibo",
    ),
  };
}

function alignCentralBusinessAdoptionCounters(data: AppData): AppData {
  const calculated = countersFromDocuments(
    data.documents,
    data.profile.numbering.year,
    data.profile.numbering,
  );
  return {
    ...data,
    counters: {
      ...data.counters,
      presupuesto: Math.max(
        calculated.presupuesto,
        data.profile.numbering.lastSequence.presupuesto,
      ),
      recibo: Math.max(
        calculated.recibo,
        data.profile.numbering.lastSequence.recibo,
      ),
    },
  };
}

function initialServerAdoptionVersion(
  event: CentralBusinessBrowserEvent,
): CentralBusinessEntityVersion | undefined {
  if (event.entityVersion !== 1) return undefined;
  return {
    entityType: event.entityType,
    entityId: event.entityId,
    version: 0,
    deleted: false,
    contentHash: "",
  };
}

function centralBusinessEventKey(event: CentralBusinessBrowserEvent): string {
  return `${event.entityType}:${event.entityId}`;
}

function shouldPartiallySkipEvent(
  event: CentralBusinessBrowserEvent,
  knownVersion: CentralBusinessEntityVersion | undefined,
): boolean {
  if (!knownVersion) return event.entityVersion !== 1;
  if (event.entityVersion < knownVersion.version) return true;
  if (event.entityVersion === knownVersion.version) {
    return event.contentHash !== knownVersion.contentHash;
  }
  return event.entityVersion !== knownVersion.version + 1;
}

async function applyIndependentEventsFromBlockedPage(input: {
  state: CentralBusinessDurableQueueState;
  events: CentralBusinessBrowserEvent[];
  baseline: AppData;
  commit: CentralBusinessEventsAppDataSyncDependencies["commit"];
  blockedEntityKeys?: ReadonlySet<string>;
}): Promise<{
  applied: number;
  skipped: number;
  error: CentralBusinessLocalApplyError | null;
}> {
  const blockedKeys = new Set<string>(input.blockedEntityKeys);
  const workingVersions = { ...input.state.entityVersions };
  let workingData = input.baseline;
  let locallyApplied = 0;
  let skipped = 0;
  let lastAppliedValue: CentralBusinessEventLocalApplyValue | null = null;

  for (const event of input.events) {
    const key = centralBusinessEventKey(event);
    if (
      blockedKeys.has(key) ||
      shouldPartiallySkipEvent(event, workingVersions[key])
    ) {
      blockedKeys.add(key);
      skipped += 1;
      continue;
    }

    let transition:
      | AppDataTransition<CentralBusinessEventLocalApplyValue>
      | undefined;
    try {
      transition = buildCentralBusinessEventAppDataTransition({
        data: workingData,
        event,
        knownVersion: workingVersions[key],
      });
    } catch (error) {
      if (
        error instanceof CentralBusinessLocalApplyError &&
        error.code === "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT"
      ) {
        blockedKeys.add(key);
        skipped += 1;
        continue;
      }
      return {
        applied: 0,
        skipped,
        error:
          error instanceof CentralBusinessLocalApplyError
            ? error
            : new CentralBusinessLocalApplyError(
                "CENTRAL_BUSINESS_EVENT_TRANSITION_FAILED",
                "No se pudo preparar un cambio central independiente.",
              ),
      };
    }

    if (transition.value.action !== "unchanged") {
      workingData = transition.data;
      lastAppliedValue = transition.value;
      locallyApplied += 1;
    }
    workingVersions[key] = {
      entityType: event.entityType,
      entityId: event.entityId,
      version: event.entityVersion,
      deleted: event.operationKind === "delete",
      contentHash: event.contentHash,
    };
  }

  if (!lastAppliedValue) return { applied: 0, skipped, error: null };

  const committed = input.commit(input.baseline, () => ({
    data: workingData,
    value: lastAppliedValue!,
  }));
  if (committed.status === "applied") {
    return { applied: locallyApplied, skipped, error: null };
  }
  return {
    applied: 0,
    skipped,
    error: new CentralBusinessLocalApplyError(
      committed.status === "indeterminate"
        ? "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN"
        : "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED",
      committed.status === "indeterminate"
        ? "No se pudo confirmar el guardado local de los cambios centrales independientes."
        : "Los datos locales cambiaron mientras se aplicaban cambios centrales independientes.",
      committed.status === "blocked" &&
        committed.reason === "stale_precondition",
    ),
  };
}

export async function syncCentralBusinessEventsIntoAppData(
  input: { ownerScope: string; limit?: number },
  dependencies: CentralBusinessEventsAppDataSyncDependencies,
): Promise<CentralBusinessEventsAppDataSyncResult> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);

  try {
    return await withCentralBusinessQueueLock(input.ownerScope, async () => {
      const state = loadCentralBusinessDurableQueue(
        input.ownerScope,
        dependencies.storage,
      );
      const pulled = await (
        dependencies.pull ?? pullCentralBusinessEventsFromBrowser
      )({
        afterSequence: state.lastAppliedEventSequence,
        limit,
      });
      if (!pulled.ok) {
        return failed(
          pulled.code,
          pulled.message,
          state.lastAppliedEventSequence,
          pulled.retryable,
        );
      }
      const verifyContentHash =
        dependencies.verifyContentHash ?? verifyCentralBusinessEventContentHash;
      for (const event of pulled.events) {
        if (!(await verifyContentHash(event))) {
          return failed(
            "CENTRAL_BUSINESS_EVENT_HASH_MISMATCH",
            "Un evento central no supera la comprobación de integridad.",
            state.lastAppliedEventSequence,
          );
        }
      }

      const localFailure: {
        current: CentralBusinessLocalApplyError | null;
      } = { current: null };
      const baseline = dependencies.getCurrentData();
      let workingData = baseline;
      let locallyApplied = 0;
      let lastAppliedValue: CentralBusinessEventLocalApplyValue | null = null;
      const workingVersions = { ...state.entityVersions };
      const page = await applyCentralBusinessEventPage({
        ownerScope: input.ownerScope,
        events: pulled.events,
        nextSequence: pulled.nextSequence,
        storage: dependencies.storage,
        applyEvent: async (event) => {
          const key = `${event.entityType}:${event.entityId}`;
          let transition:
            AppDataTransition<CentralBusinessEventLocalApplyValue> | undefined;
          try {
            transition = buildCentralBusinessEventAppDataTransition({
              data: workingData,
              event,
              knownVersion: workingVersions[key],
            });
          } catch (error) {
            localFailure.current =
              error instanceof CentralBusinessLocalApplyError
                ? error
                : new CentralBusinessLocalApplyError(
                    "CENTRAL_BUSINESS_EVENT_TRANSITION_FAILED",
                    "No se pudo preparar el cambio central.",
                  );
            throw error;
          }

          if (transition.value.action !== "unchanged") {
            workingData = transition.data;
            lastAppliedValue = transition.value;
            locallyApplied += 1;
          }
          workingVersions[key] = {
            entityType: event.entityType,
            entityId: event.entityId,
            version: event.entityVersion,
            deleted: event.operationKind === "delete",
            contentHash: event.contentHash,
          };
        },
        commitPage: async () => {
          if (!lastAppliedValue) return;
          const committed = dependencies.commit(baseline, () => ({
            data: workingData,
            value: lastAppliedValue!,
          }));
          if (committed.status === "applied") return;
          localFailure.current = new CentralBusinessLocalApplyError(
            committed.status === "indeterminate"
              ? "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN"
              : "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED",
            committed.status === "indeterminate"
              ? "No se pudo confirmar el guardado local de la pagina central."
              : "Los datos locales cambiaron mientras se aplicaba la pagina central.",
            committed.status === "blocked" &&
              committed.reason === "stale_precondition",
          );
          throw localFailure.current;
        },
      });

      if (!page.ok) {
        if (
          localFailure.current?.code ===
            "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT" ||
          page.code === "LOCAL_OPERATION_CONFLICT"
        ) {
          const pendingEntityKeys = new Set(
            page.state.operations
              .filter((operation) => operation.resolution !== "accept_server")
              .map(
                (operation) =>
                  `${operation.input.entityType}:${operation.input.entityId}`,
              ),
          );
          const partial = await applyIndependentEventsFromBlockedPage({
            state: page.state,
            events: pulled.events,
            baseline,
            commit: dependencies.commit,
            blockedEntityKeys: pendingEntityKeys,
          });
          if (partial.error) {
            localFailure.current = partial.error;
          }
        }
        return failed(
          localFailure.current?.code ?? page.code,
          localFailure.current?.message ?? page.message,
          state.lastAppliedEventSequence,
          localFailure.current?.retryable ?? false,
        );
      }

      return {
        ok: true,
        schema: CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC,
        pulled: pulled.events.length,
        applied: locallyApplied,
        skipped: pulled.events.length - locallyApplied,
        nextSequence: page.state.lastAppliedEventSequence,
        hasMore: pulled.hasMore,
      };
    });
  } catch (error) {
    return failed(
      "CENTRAL_BUSINESS_EVENTS_LOCAL_STATE_FAILED",
      error instanceof Error
        ? error.message
        : "No se pudo comprobar el estado central local.",
      0,
    );
  }
}

export async function adoptCentralBusinessEventsFromServerIntoAppData(
  input: { ownerScope: string; limit?: number; maxPages?: number },
  dependencies: CentralBusinessEventsAppDataSyncDependencies,
): Promise<CentralBusinessEventsAppDataSyncResult> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const maxPages = Math.min(Math.max(input.maxPages ?? 100, 1), 100);

  try {
    return await withCentralBusinessQueueLock(input.ownerScope, async () => {
      const initialState = loadCentralBusinessDurableQueue(
        input.ownerScope,
        dependencies.storage,
      );
      if (initialState.operations.length > 0) {
        return failed(
          "CENTRAL_BUSINESS_PENDING_REVIEW",
          "Hay cambios centrales pendientes o en revisión. Resuélvelos antes de adoptar la copia del servidor.",
          initialState.lastAppliedEventSequence,
        );
      }
      resetCentralBusinessEventStateForServerAdoption({
        ownerScope: input.ownerScope,
        storage: dependencies.storage,
      });

      const verifyContentHash =
        dependencies.verifyContentHash ?? verifyCentralBusinessEventContentHash;
      const pull = dependencies.pull ?? pullCentralBusinessEventsFromBrowser;
      let expected = dependencies.getCurrentData();
      let workingData = clearCentralBusinessLocalProjection(expected);
      let pulledCount = 0;
      let appliedCount = 0;
      let skippedCount = 0;
      let nextSequence = 0;
      let firstPage = true;

      for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const state = loadCentralBusinessDurableQueue(
          input.ownerScope,
          dependencies.storage,
        );
        const pulled = await pull({
          afterSequence: state.lastAppliedEventSequence,
          limit,
        });
        if (!pulled.ok) {
          return failed(
            pulled.code,
            pulled.message,
            state.lastAppliedEventSequence,
            pulled.retryable,
          );
        }
        for (const event of pulled.events) {
          if (!(await verifyContentHash(event))) {
            return failed(
              "CENTRAL_BUSINESS_EVENT_HASH_MISMATCH",
              "Un evento central no supera la comprobación de integridad.",
              state.lastAppliedEventSequence,
            );
          }
        }

        const localFailure: {
          current: CentralBusinessLocalApplyError | null;
        } = { current: null };
        const pageBaseline = expected;
        const workingVersions = { ...state.entityVersions };
        let locallyApplied = 0;
        let lastAppliedValue: CentralBusinessEventLocalApplyValue | null =
          null;
        const page = await applyCentralBusinessEventPage({
          ownerScope: input.ownerScope,
          events: pulled.events,
          nextSequence: pulled.nextSequence,
          storage: dependencies.storage,
          applyEvent: async (event) => {
            const key = `${event.entityType}:${event.entityId}`;
            let transition:
              | AppDataTransition<CentralBusinessEventLocalApplyValue>
              | undefined;
            try {
              transition = buildCentralBusinessEventAppDataTransition({
                data: workingData,
                event,
                knownVersion:
                  workingVersions[key] ??
                  initialServerAdoptionVersion(event),
              });
            } catch (error) {
              localFailure.current =
                error instanceof CentralBusinessLocalApplyError
                  ? error
                  : new CentralBusinessLocalApplyError(
                      "CENTRAL_BUSINESS_EVENT_TRANSITION_FAILED",
                      "No se pudo preparar el cambio central.",
                    );
              throw error;
            }

            if (transition.value.action !== "unchanged") {
              workingData = transition.data;
              lastAppliedValue = transition.value;
              locallyApplied += 1;
            }
            workingVersions[key] = {
              entityType: event.entityType,
              entityId: event.entityId,
              version: event.entityVersion,
              deleted: event.operationKind === "delete",
              contentHash: event.contentHash,
            };
          },
          commitPage: async () => {
            if (!firstPage && !lastAppliedValue) return;
            workingData = alignCentralBusinessAdoptionCounters(workingData);
            const committed = dependencies.commit(pageBaseline, () => ({
              data: workingData,
              value: lastAppliedValue ?? serverAdoptionValue(),
            }));
            if (committed.status === "applied") {
              expected = committed.data;
              workingData = committed.data;
              return;
            }
            localFailure.current = new CentralBusinessLocalApplyError(
              committed.status === "indeterminate"
                ? "CENTRAL_BUSINESS_LOCAL_STORAGE_UNKNOWN"
                : "CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED",
              committed.status === "indeterminate"
                ? "No se pudo confirmar el guardado local de la pagina central."
                : "Los datos locales cambiaron mientras se aplicaba la pagina central.",
              committed.status === "blocked" &&
                committed.reason === "stale_precondition",
            );
            throw localFailure.current;
          },
        });

        if (!page.ok) {
          return failed(
            localFailure.current?.code ?? page.code,
            localFailure.current?.message ?? page.message,
            state.lastAppliedEventSequence,
            localFailure.current?.retryable ?? false,
          );
        }
        pulledCount += pulled.events.length;
        appliedCount += locallyApplied;
        skippedCount += pulled.events.length - locallyApplied;
        nextSequence = page.state.lastAppliedEventSequence;
        firstPage = false;
        if (!pulled.hasMore) {
          return {
            ok: true,
            schema: CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC,
            pulled: pulledCount,
            applied: appliedCount,
            skipped: skippedCount,
            nextSequence,
            hasMore: false,
          };
        }
      }

      return failed(
        "CENTRAL_BUSINESS_SERVER_ADOPTION_TOO_MANY_EVENTS",
        "Quedan demasiados eventos centrales por adoptar en una sola operación. Vuelve a intentarlo.",
        nextSequence,
        true,
      );
    });
  } catch (error) {
    return failed(
      "CENTRAL_BUSINESS_EVENTS_LOCAL_STATE_FAILED",
      error instanceof Error
        ? error.message
        : "No se pudo comprobar el estado central local.",
      0,
    );
  }
}
