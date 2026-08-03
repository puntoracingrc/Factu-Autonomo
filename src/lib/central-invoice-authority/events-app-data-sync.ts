"use client";

import type { AppDataTransition } from "@/lib/app-data-durability";
import type {
  AppData,
  CentralInvoiceAuthorityEventsSyncStateV1,
} from "@/lib/types";

import {
  syncCentralInvoiceAuthorityPulledEventsIntoDocuments,
  type CentralInvoiceAuthorityEventsLocalSyncDependencies,
  type CentralInvoiceAuthorityEventsLocalSyncResult,
} from "./events-local-sync";
import { recordCentralInvoiceAuthorityEventsLocalSyncResult } from "./events-sync-state";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC_V1";

export interface CentralInvoiceAuthorityEventsAppDataPullInput {
  data: AppData;
  limit?: number | null;
  receivedAt?: string;
  replayFromStartWhenNoActiveInvoices?: boolean;
}

export interface CentralInvoiceAuthorityEventsAppDataPulledValue {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC;
  localSync: CentralInvoiceAuthorityEventsLocalSyncResult;
  recordedAt: string;
}

export interface CentralInvoiceAuthorityEventsAppDataSyncValue {
  schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC;
  localSync: CentralInvoiceAuthorityEventsLocalSyncResult;
  state: CentralInvoiceAuthorityEventsSyncStateV1;
}

function parsedTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cursorKey(data: AppData): string | null {
  const cursor = data.centralInvoiceAuthorityEventsSync?.cursor;
  if (!cursor) return null;
  return `${cursor.afterCreatedAt}\u0000${cursor.afterEventId}`;
}

export function shouldReplayCentralInvoiceAuthorityEventsFromStart(
  data: AppData,
): boolean {
  if (!data.centralInvoiceAuthorityEventsSync?.cursor) return false;
  if (data.documents.some((document) => document.type === "factura")) {
    return false;
  }
  return !data.testDocumentRetirementBatches?.some((batch) =>
    batch.retiredDocuments.some(
      ({ document }) => document.type === "factura",
    ),
  );
}

export function selectCentralInvoiceAuthorityEventsSyncBaseline(input: {
  memory: AppData;
  persisted: AppData | null;
  persistedMatchesMemory: boolean;
}): AppData | null {
  if (input.persistedMatchesMemory) return input.memory;
  if (!input.persisted) return null;

  const memoryCursor = cursorKey(input.memory);
  const persistedCursor = cursorKey(input.persisted);
  if (
    persistedCursor !== null &&
    (memoryCursor === null || persistedCursor > memoryCursor)
  ) {
    return input.persisted;
  }

  const memoryModified = parsedTimestamp(input.memory.meta?.lastModified);
  const persistedModified = parsedTimestamp(input.persisted.meta?.lastModified);
  if (
    persistedModified !== null &&
    (memoryModified === null || persistedModified > memoryModified)
  ) {
    return input.persisted;
  }

  return null;
}

export async function pullCentralInvoiceAuthorityEventsForAppData(
  input: CentralInvoiceAuthorityEventsAppDataPullInput,
  dependencies: CentralInvoiceAuthorityEventsLocalSyncDependencies = {},
): Promise<CentralInvoiceAuthorityEventsAppDataPulledValue> {
  const recordedAt = input.receivedAt ?? new Date().toISOString();
  const replayFromStart =
    input.replayFromStartWhenNoActiveInvoices === true &&
    shouldReplayCentralInvoiceAuthorityEventsFromStart(input.data);
  const localSync = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
    {
      documents: input.data.documents,
      profile: input.data.profile,
      cursor: replayFromStart
        ? null
        : (input.data.centralInvoiceAuthorityEventsSync?.cursor ?? null),
      limit: input.limit ?? null,
      receivedAt: recordedAt,
    },
    dependencies,
  );

  return {
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
    localSync,
    recordedAt,
  };
}

export function buildCentralInvoiceAuthorityEventsAppDataTransition(input: {
  data: AppData;
  pulled: CentralInvoiceAuthorityEventsAppDataPulledValue;
}): AppDataTransition<CentralInvoiceAuthorityEventsAppDataSyncValue> {
  const transition = recordCentralInvoiceAuthorityEventsLocalSyncResult({
    data: input.data,
    result: input.pulled.localSync,
    recordedAt: input.pulled.recordedAt,
  });

  return {
    data: transition.data,
    value: {
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_APP_DATA_SYNC,
      localSync: input.pulled.localSync,
      state: transition.state,
    },
  };
}

export async function syncCentralInvoiceAuthorityEventsIntoAppData(
  input: CentralInvoiceAuthorityEventsAppDataPullInput,
  dependencies: CentralInvoiceAuthorityEventsLocalSyncDependencies = {},
): Promise<AppDataTransition<CentralInvoiceAuthorityEventsAppDataSyncValue>> {
  const pulled = await pullCentralInvoiceAuthorityEventsForAppData(
    input,
    dependencies,
  );
  return buildCentralInvoiceAuthorityEventsAppDataTransition({
    data: input.data,
    pulled,
  });
}
