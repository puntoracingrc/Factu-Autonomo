import { describe, expect, it } from "vitest";

import {
  CENTRAL_AUTHORITY_DEGRADED_POLL_MS,
  CENTRAL_AUTHORITY_POLL_JITTER_MS,
  CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS,
  centralAuthorityIdlePollDelay,
  centralAuthorityRealtimeStateFromStatus,
  maximumFallbackRequestsPerWindow,
} from "./sync-schedule";

describe("central authority sync schedule", () => {
  it("trata Realtime como camino principal y conserva un respaldo lento", () => {
    expect(centralAuthorityRealtimeStateFromStatus("SUBSCRIBED")).toBe(
      "subscribed",
    );
    expect(centralAuthorityRealtimeStateFromStatus("CHANNEL_ERROR")).toBe(
      "degraded",
    );
    expect(centralAuthorityRealtimeStateFromStatus("TIMED_OUT")).toBe(
      "degraded",
    );
    expect(centralAuthorityIdlePollDelay("subscribed", 0)).toBe(
      CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS,
    );
    expect(centralAuthorityIdlePollDelay("subscribed", 1)).toBe(
      CENTRAL_AUTHORITY_REALTIME_SAFETY_POLL_MS +
        CENTRAL_AUTHORITY_POLL_JITTER_MS,
    );
    expect(centralAuthorityIdlePollDelay("degraded", 0)).toBe(
      CENTRAL_AUTHORITY_DEGRADED_POLL_MS,
    );
  });

  it("mantiene cinco dispositivos por debajo de los limites actuales aun sin Realtime", () => {
    expect(
      maximumFallbackRequestsPerWindow({
        devices: 5,
        windowMs: 10 * 60_000,
      }),
    ).toBe(100);
    expect(100).toBeLessThan(120);
    expect(100).toBeLessThan(180);
  });
});
