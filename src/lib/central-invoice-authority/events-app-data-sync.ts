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

export async function pullCentralInvoiceAuthorityEventsForAppData(
  input: CentralInvoiceAuthorityEventsAppDataPullInput,
  dependencies: CentralInvoiceAuthorityEventsLocalSyncDependencies = {},
): Promise<CentralInvoiceAuthorityEventsAppDataPulledValue> {
  const recordedAt = input.receivedAt ?? new Date().toISOString();
  const localSync = await syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
    {
      documents: input.data.documents,
      profile: input.data.profile,
      cursor: input.data.centralInvoiceAuthorityEventsSync?.cursor ?? null,
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
