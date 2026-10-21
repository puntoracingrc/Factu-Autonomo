import { describe, expect, it, vi } from "vitest";
import { quickInstaller, type QuickInstallPrompt } from "./install";

function offer(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as QuickInstallPrompt;
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe("independent quick-app installation", () => {
  it("opens and closes manual instructions when the native prompt is unavailable", async () => {
    const changed = vi.fn();
    const installer = quickInstaller(changed);
    await installer.install();
    expect(installer.snapshot()).toEqual({ busy: false, requested: false, help: true });
    installer.closeHelp();
    expect(installer.snapshot().help).toBe(false);
    expect(changed).toHaveBeenCalledTimes(2);
  });
  it("captures the browser prompt and invokes it synchronously only from the user's action", async () => {
    const installer = quickInstaller(vi.fn());
    const event = offer();
    installer.offer(event);
    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();
    const pending = installer.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(installer.snapshot().busy).toBe(true);
    await installer.install();
    await pending;
    await installer.install();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(installer.snapshot().requested).toBe(true);
  });
  it("does not reuse a dismissed prompt or claim installation succeeded", async () => {
    const installer = quickInstaller(vi.fn());
    const dismissed = offer("dismissed");
    installer.offer(dismissed);
    await installer.install();
    expect(installer.snapshot().requested).toBe(false);
    await installer.install();
    expect(installer.snapshot().help).toBe(true);
    expect(dismissed.prompt).toHaveBeenCalledTimes(1);
    const next = offer();
    installer.offer(next);
    await installer.install();
    expect(next.prompt).toHaveBeenCalledTimes(1);
    expect(installer.snapshot().requested).toBe(true);
  });
  it("keeps manual installation available after a browser error", async () => {
    const installer = quickInstaller(vi.fn());
    const event = offer();
    event.prompt = vi.fn(async () => { throw new Error("Unavailable"); });
    installer.offer(event);
    await installer.install();
    expect(installer.snapshot()).toEqual({ busy: false, requested: false, help: true });
  });
  it("handles installation from the browser menu without any business state or reload", () => {
    const installer = quickInstaller(vi.fn());
    installer.offer(offer());
    installer.requested();
    expect(installer.snapshot().requested).toBe(true);
  });
});
