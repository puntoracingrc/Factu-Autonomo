import { describe, expect, it, vi } from "vitest";
import type { CentralBusinessEventsAppDataSyncResult as Result } from "./events-app-data-sync";
import { syncCentralBusinessBeforeWrite } from "./sync-before-write";

const page = (nextSequence: number, hasMore = false): Result => ({
  ok: true,
  schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
  pulled: 1,
  applied: 1,
  skipped: 0,
  nextSequence,
  hasMore,
});
const failure = (code: string, retryable = false): Result => ({
  ok: false,
  schema: "CENTRAL_BUSINESS_EVENTS_APP_DATA_SYNC_V1",
  code,
  message: "Synthetic safe sync error",
  retryable,
  nextSequence: 0,
});

describe("bounded prewrite central synchronization", () => {
  it("drains pending pages in order", async () => {
    const sync = vi
      .fn(async () => page(3))
      .mockResolvedValueOnce(page(1, true))
      .mockResolvedValueOnce(page(2, true));
    expect(await syncCentralBusinessBeforeWrite(sync)).toEqual(page(3));
    expect(sync).toHaveBeenCalledTimes(3);
  });
  it("rereads a page if a background read won its local CAS", async () => {
    const sync = vi
      .fn(async () => page(2))
      .mockResolvedValueOnce(
        failure("CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED", true),
      );
    expect((await syncCentralBusinessBeforeWrite(sync)).ok).toBe(true);
    expect(sync).toHaveBeenCalledTimes(2);
  });
  it.each([
    "CENTRAL_BUSINESS_LOCAL_ENTITY_CONFLICT",
    "LOCAL_OPERATION_CONFLICT",
    "CENTRAL_BUSINESS_EVENT_HASH_MISMATCH",
    "CENTRAL_BUSINESS_PENDING_REVIEW",
    "NETWORK_ERROR",
  ])("does not bypass %s", async (code) => {
    const blocked = failure(code);
    const sync = vi.fn(async () => blocked);
    expect(await syncCentralBusinessBeforeWrite(sync)).toEqual(blocked);
    expect(sync).toHaveBeenCalledOnce();
  });
  it("bounds local CAS retries", async () => {
    const blocked = failure("CENTRAL_BUSINESS_LOCAL_WRITE_BLOCKED", true);
    const sync = vi.fn(async () => blocked);
    expect(await syncCentralBusinessBeforeWrite(sync)).toEqual(blocked);
    expect(sync).toHaveBeenCalledTimes(3);
  });
  it("aborts when the company changes while reading", async () => {
    let current = true;
    const sync = vi.fn(async () => {
      current = false;
      return page(1);
    });
    expect(
      await syncCentralBusinessBeforeWrite(sync, () => current),
    ).toMatchObject({ ok: false, code: "WORKSPACE_CHANGED" });
  });
  it("does not spin on a cursor that cannot advance", async () => {
    const sync = vi.fn(async () => page(1, true));
    expect(await syncCentralBusinessBeforeWrite(sync)).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_PREWRITE_NO_PROGRESS",
    });
    expect(sync).toHaveBeenCalledTimes(2);
  });
  it("bounds a continuously growing backlog", async () => {
    let sequence = 0;
    const sync = vi.fn(async () => page(++sequence, true));
    expect(await syncCentralBusinessBeforeWrite(sync)).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_PREWRITE_PAGE_LIMIT",
    });
    expect(sync).toHaveBeenCalledTimes(20);
  });
});
