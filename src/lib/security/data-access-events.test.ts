import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DATA_ACCESS_EVENT_NAME,
  dispatchDataAccessEvent,
} from "./data-access-events";

describe("data access events", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("conserva tamaños grandes sin mezclar el límite de registros", () => {
    const dispatchEvent = vi.fn();
    class TestCustomEvent<T> {
      constructor(
        public type: string,
        public init: { detail: T },
      ) {}

      get detail(): T {
        return this.init.detail;
      }
    }

    vi.stubGlobal("window", { dispatchEvent });
    vi.stubGlobal("CustomEvent", TestCustomEvent);

    dispatchDataAccessEvent({
      type: "backup_local",
      itemCount: 7,
      byteLength: 12 * 1024 * 1024,
    });

    expect(dispatchEvent).toHaveBeenCalledTimes(1);
    const event = dispatchEvent.mock.calls[0]?.[0] as TestCustomEvent<{
      itemCount: number;
      byteLength: number;
    }>;
    expect(event.type).toBe(DATA_ACCESS_EVENT_NAME);
    expect(event.detail).toMatchObject({
      itemCount: 7,
      byteLength: 12 * 1024 * 1024,
    });
  });
});
