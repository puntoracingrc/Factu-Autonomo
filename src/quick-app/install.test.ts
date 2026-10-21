import { describe, expect, it, vi } from "vitest";
import { quickInstaller, quickInstallUrl, quickInstallationConfirmed, type QuickInstallPrompt } from "./install";

function offer(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as QuickInstallPrompt;
  event.prompt = vi.fn(async () => undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe("independent quick-app installation", () => {
  it("recognizes the quick app's installed window without confusing the main app", () => {
    expect(quickInstallationConfirmed("https://fast.facturacion-autonomos.app", true)).toBe(true);
    expect(quickInstallationConfirmed("https://facturacion-autonomos.app", true)).toBe(false);
    expect(quickInstallationConfirmed("https://fast.facturacion-autonomos.app", false)).toBe(false);
  });
  it("recognizes only the exact quick app reported by the browser", () => {
    const app = {platform:"webapp",url:"/rapido/manifest.webmanifest",id:"https://fast.facturacion-autonomos.app/rapido/"};
    expect(quickInstallationConfirmed("https://fast.facturacion-autonomos.app", false, [app])).toBe(true);
    expect(quickInstallationConfirmed("https://fast.facturacion-autonomos.app", false, [{...app,id:undefined}])).toBe(true);
    for (const other of [
      {...app,url:"/manifest.json",id:"/"},
      {...app,id:"/"},
      {...app,platform:"play"},
      {...app,url:"https://facturacion-autonomos.app/rapido/manifest.webmanifest"},
      {...app,url:"https://[invalid"},
    ]) expect(quickInstallationConfirmed("https://fast.facturacion-autonomos.app",false,[other])).toBe(false);
  });
  it("separates installation from every public main-app origin", () => {
    for (const host of ["facturacion-autonomos.app", "factu-autonomo.vercel.app", "factu-autonomo-persianas-almar-web-s-projects.vercel.app", "factu-autonomo-git-main-persianas-almar-web-s-projects.vercel.app"]) {
      expect(quickInstallUrl(`https://${host}`)).toBe("https://fast.facturacion-autonomos.app/rapido/index.html");
    }
  });
  it("keeps the independent origin, local development and previews self-contained", () => {
    for (const origin of ["https://fast.facturacion-autonomos.app", "http://127.0.0.1:3100", "https://quick-preview.example"]) {
      expect(quickInstallUrl(origin)).toBe(`${origin}/rapido/index.html`);
    }
  });
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
