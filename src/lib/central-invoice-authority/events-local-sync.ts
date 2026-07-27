"use client";

import type { BusinessProfile, Document } from "@/lib/types";

import {
  applyCentralInvoiceAuthorityPulledEventsToDocuments,
  type CentralInvoiceAuthorityEventsLocalApplied,
  type CentralInvoiceAuthorityEventsLocalConflict,
  type CentralInvoiceAuthorityEventsLocalSkipped,
} from "./events-local-apply";
import {
  pullCentralInvoiceAuthorityEventsFromBrowser,
  type CentralInvoiceAuthorityEventsCursor,
  type CentralInvoiceAuthorityEventsPullInput,
  type CentralInvoiceAuthorityEventsPullResult,
} from "./events-client";

export const CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC =
  "CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC_V1";

export type CentralInvoiceAuthorityEventsLocalSyncPuller = (
  input: CentralInvoiceAuthorityEventsPullInput,
) => Promise<CentralInvoiceAuthorityEventsPullResult>;

export interface CentralInvoiceAuthorityEventsLocalSyncInput {
  documents: Document[];
  profile: BusinessProfile;
  cursor?: CentralInvoiceAuthorityEventsCursor | null;
  limit?: number | null;
  receivedAt?: string;
}

export interface CentralInvoiceAuthorityEventsLocalSyncDependencies {
  pullEvents?: CentralInvoiceAuthorityEventsLocalSyncPuller;
}

export type CentralInvoiceAuthorityEventsLocalSyncResult =
  | {
      ok: true;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC;
      documents: Document[];
      pulledEvents: number;
      applied: CentralInvoiceAuthorityEventsLocalApplied[];
      skipped: CentralInvoiceAuthorityEventsLocalSkipped[];
      conflicts: [];
      cursorToPersist: CentralInvoiceAuthorityEventsCursor | null;
      serverNextCursor: CentralInvoiceAuthorityEventsCursor | null;
    }
  | {
      ok: false;
      schema: typeof CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC;
      code: string;
      message: string;
      status: number;
      documents: Document[];
      pulledEvents: number;
      applied: [];
      skipped: CentralInvoiceAuthorityEventsLocalSkipped[];
      conflicts: CentralInvoiceAuthorityEventsLocalConflict[];
      cursorToPersist: CentralInvoiceAuthorityEventsCursor | null;
      serverNextCursor: CentralInvoiceAuthorityEventsCursor | null;
    };

function previousCursor(
  cursor: CentralInvoiceAuthorityEventsCursor | null | undefined,
): CentralInvoiceAuthorityEventsCursor | null {
  return cursor ?? null;
}

function successfulCursor(
  input: CentralInvoiceAuthorityEventsLocalSyncInput,
  serverNextCursor: CentralInvoiceAuthorityEventsCursor | null,
): CentralInvoiceAuthorityEventsCursor | null {
  return serverNextCursor ?? previousCursor(input.cursor);
}

function pullInput(
  input: CentralInvoiceAuthorityEventsLocalSyncInput,
): CentralInvoiceAuthorityEventsPullInput {
  return {
    afterCreatedAt: input.cursor?.afterCreatedAt ?? null,
    afterEventId: input.cursor?.afterEventId ?? null,
    limit: input.limit ?? null,
  };
}

export async function syncCentralInvoiceAuthorityPulledEventsIntoDocuments(
  input: CentralInvoiceAuthorityEventsLocalSyncInput,
  dependencies: CentralInvoiceAuthorityEventsLocalSyncDependencies = {},
): Promise<CentralInvoiceAuthorityEventsLocalSyncResult> {
  const pullEvents =
    dependencies.pullEvents ?? pullCentralInvoiceAuthorityEventsFromBrowser;
  const pulled = await pullEvents(pullInput(input));
  const currentCursor = previousCursor(input.cursor);

  if (!pulled.ok) {
    return {
      ok: false,
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
      code: pulled.code,
      message: pulled.message,
      status: pulled.status,
      documents: input.documents,
      pulledEvents: 0,
      applied: [],
      skipped: [],
      conflicts: [],
      cursorToPersist: currentCursor,
      serverNextCursor: null,
    };
  }

  const applied = applyCentralInvoiceAuthorityPulledEventsToDocuments({
    documents: input.documents,
    profile: input.profile,
    events: pulled.events,
    receivedAt: input.receivedAt,
  });

  if (applied.conflicts.length > 0) {
    return {
      ok: false,
      schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
      code: "CENTRAL_AUTHORITY_EVENTS_LOCAL_CONFLICT",
      message:
        "La autoridad central ha detectado facturas que requieren revision antes de actualizar este dispositivo.",
      status: 409,
      documents: input.documents,
      pulledEvents: pulled.events.length,
      applied: [],
      skipped: applied.skipped,
      conflicts: applied.conflicts,
      cursorToPersist: currentCursor,
      serverNextCursor: pulled.nextCursor,
    };
  }

  return {
    ok: true,
    schema: CENTRAL_INVOICE_AUTHORITY_EVENTS_LOCAL_SYNC,
    documents: applied.documents,
    pulledEvents: pulled.events.length,
    applied: applied.applied,
    skipped: applied.skipped,
    conflicts: [],
    cursorToPersist: successfulCursor(input, pulled.nextCursor),
    serverNextCursor: pulled.nextCursor,
  };
}
