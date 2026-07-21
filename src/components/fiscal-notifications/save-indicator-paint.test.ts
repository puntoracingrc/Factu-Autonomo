import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForSavingIndicatorPaint } from "./save-indicator-paint";

interface BrowserHarness {
  readonly animationFrames: Map<number, FrameRequestCallback>;
  setVisibility(value: DocumentVisibilityState): void;
  notifyVisibilityChange(): void;
}

function installBrowserHarness(
  initialVisibility: DocumentVisibilityState,
): BrowserHarness {
  let visibilityState = initialVisibility;
  let nextFrameId = 1;
  const animationFrames = new Map<number, FrameRequestCallback>();
  const visibilityListeners = new Set<EventListener>();
  const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    animationFrames.set(id, callback);
    return id;
  });
  const cancelAnimationFrame = vi.fn((id: number) => {
    animationFrames.delete(id);
  });
  const documentStub = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: vi.fn((name: string, listener: EventListener) => {
      if (name === "visibilitychange") visibilityListeners.add(listener);
    }),
    removeEventListener: vi.fn((name: string, listener: EventListener) => {
      if (name === "visibilitychange") visibilityListeners.delete(listener);
    }),
  };

  vi.stubGlobal("window", {
    requestAnimationFrame,
    cancelAnimationFrame,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("document", documentStub);

  return {
    animationFrames,
    setVisibility(value) {
      visibilityState = value;
    },
    notifyVisibilityChange() {
      for (const listener of visibilityListeners) {
        listener(new Event("visibilitychange"));
      }
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("save indicator paint", () => {
  it("yields for two visible frames before resolving", async () => {
    const browser = installBrowserHarness("visible");
    let resolved = false;
    const pending = waitForSavingIndicatorPaint().then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    browser.animationFrames.get(1)?.(0);
    await Promise.resolve();
    expect(resolved).toBe(false);
    browser.animationFrames.get(2)?.(16);
    await pending;
    expect(resolved).toBe(true);
  });

  it("does not delay persistence when the tab is already hidden", async () => {
    const browser = installBrowserHarness("hidden");

    await expect(waitForSavingIndicatorPaint()).resolves.toBeUndefined();
    expect(browser.animationFrames.size).toBe(0);
  });

  it("releases persistence when the visible tab becomes hidden", async () => {
    const browser = installBrowserHarness("visible");
    const pending = waitForSavingIndicatorPaint();

    browser.setVisibility("hidden");
    browser.notifyVisibilityChange();

    await expect(pending).resolves.toBeUndefined();
  });

  it("uses a timer fallback when animation frames do not run", async () => {
    vi.useFakeTimers();
    installBrowserHarness("visible");
    const pending = waitForSavingIndicatorPaint();

    await vi.advanceTimersByTimeAsync(120);

    await expect(pending).resolves.toBeUndefined();
  });
});
