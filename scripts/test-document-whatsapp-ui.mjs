import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";

assert(process.argv.includes("--local"), "Use --local with the synthetic browser fixture.");
const origin = "http://127.0.0.1:8088";
const mocks = {
  "@/context/AppStore": "export const useAppStore = () => window.fixture;",
  "@/context/BillingContext": "export const useBilling = () => ({ billingEnabled: false, isPro: true });",
  "@/context/CloudSyncContext": "export const useCloudSync = () => ({ user: { id: 'fixture' }, emailConfirmed: true });",
  "@/hooks/useCentralProfileMutation": "export const useCentralProfileMutation = () => ({ updateProfile: async () => ({ ok: true }) });",
  "@/hooks/useCentralSharedBusinessMutations": "export const useCentralSharedBusinessMutations = () => ({ markSent: async () => { window.sent++; } });",
  "@/hooks/useDemoWorkspaceMode": "export const useDemoWorkspaceMode = () => false;",
};
const fixture = await build({
  stdin: {
    contents: `
      import React from "react";
      import { createRoot } from "react-dom/client";
      import { DocumentPdfShareActions } from "@/components/documents/DocumentPdfShareActions";
      import { issueDocument } from "@/lib/document-integrity";
      import { DEFAULT_PROFILE } from "@/lib/types";
      const profile = { ...DEFAULT_PROFILE, name: "Empresa de prueba", nif: "12345678Z", address: "Calle Uno 1",
        city: "Barcelona", postalCode: "08001", appPreferences: { documentEmailMethod: "gmail", documentWhatsAppMethod: "direct" } };
      const draft = { id: "synthetic-invoice", type: "factura", status: "borrador", number: "F-2026-0010",
        date: "2026-11-20", createdAt: "2026-11-20", updatedAt: "2026-11-20",
        client: { name: "Laia Prueba", email: "cliente@example.test", phone: "+376 668 856", nif: "12345678Z",
          address: "Calle Dos 2", city: "Barcelona", postalCode: "08002" },
        items: [{ id: "1", description: "Cambiar cinta", quantity: 1, unitPrice: 80, ivaPercent: 21 }] };
      const issued = issueDocument(draft, profile, "2026-11-20T10:00:00Z");
      window.fixture = { data: { profile, customers: [] }, issueDocument: async () => { window.issued++; return issued; } };
      createRoot(document.querySelector("#app")).render(
        <DocumentPdfShareActions doc={location.search === "?draft" ? draft : issued} profile={profile} />
      );
    `,
    loader: "tsx",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [{
    name: "document-fixture-contexts",
    setup(plugin) {
      plugin.onResolve({ filter: /^@\// }, ({ path }) => path in mocks ? { path, namespace: "fixture" } : undefined);
      plugin.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: mocks[path], loader: "js" }));
    },
  }],
});

const browser = await chromium.launch({ channel: "chrome", headless: true });
async function openFixture(mobile, search = "") {
  const context = await browser.newContext({
    viewport: { width: mobile ? 390 : 1200, height: 840 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true,
  });
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, origin, "The fixture never contacts WhatsApp, Gmail or production.");
    if (url.pathname === "/fixture.js") return route.fulfill({ contentType: "application/javascript", body: fixture.outputFiles[0].text });
    return route.fulfill({ contentType: "text/html", body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div style="margin:40px"><div id="app"></div></div><script src="/fixture.js"></script>' });
  });
  await context.addInitScript(() => {
    window.sent = 0;
    window.issued = 0;
    window.external = [];
    window.shareMode = "cancel";
    window.attempts = 0;
    window.open = (url) => {
      if (url !== "about:blank") window.external.push(url);
      const location = { set href(value) { window.external.push(value); } };
      return { location, document: { body: {} }, close() {}, focus() {} };
    };
    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (anchor?.hostname !== "wa.me") return;
      event.preventDefault();
      window.external.push(anchor.href);
    });
    Object.defineProperty(navigator, "canShare", { value: payload => payload.files?.[0]?.type === "application/pdf" });
    Object.defineProperty(navigator, "share", { value: async payload => {
      window.attempts++;
      const active = navigator.userActivation.isActive;
      if (window.shareMode === "cancel") throw new DOMException("Cancelled", "AbortError");
      if (window.shareMode === "reject") throw new DOMException("Unavailable", "NotAllowedError");
      window.attachment = {
        active, fields: Object.keys(payload), name: payload.files[0].name, signature: await payload.files[0].slice(0, 5).text(),
      };
    } });
  });
  const page = await context.newPage();
  page.on("pageerror", error => console.error(error.message));
  page.setDefaultTimeout(12_000);
  await page.goto(origin + search);
  return page;
}

async function fromMenu(page, channel) {
  await page.getByRole("button", { name: "Compartir, descargar o imprimir", exact: true }).click();
  await page.getByRole("menuitem", { name: new RegExp(`^${channel}`) }).click();
}

try {
  const mobile = await openFixture(true);
  const downloads = [];
  mobile.on("download", download => downloads.push(download));
  await fromMenu(mobile, "WhatsApp");
  const modal = mobile.getByTestId("document-whatsapp-mobile");
  const native = modal.getByRole("button", { name: "Compartir por WhatsApp" });
  await native.waitFor();
  await mobile.evaluate(() => window.dispatchEvent(new Event("resize")));
  assert(await modal.isVisible(), "The share menu must not unmount the mobile dialog on viewport changes.");
  await native.click();
  await mobile.waitForFunction(() => window.attempts === 1);
  assert.equal(await mobile.evaluate(() => window.sent), 0);
  assert.equal(downloads.length, 0);
  await mobile.evaluate(() => { window.shareMode = "reject"; });
  await native.click();
  await modal.getByText(/Descarga «F-2026-0010.pdf»/).waitFor();
  assert.equal(downloads.length, 0);
  assert.deepEqual(await mobile.evaluate(() => window.external), []);
  const pending = mobile.waitForEvent("download");
  await modal.getByRole("link", { name: "Descargar PDF", exact: true }).click();
  const download = await pending;
  assert.equal(download.suggestedFilename(), "F-2026-0010.pdf");
  assert.equal((await readFile(await download.path())).subarray(0, 5).toString(), "%PDF-");
  assert.deepEqual(await mobile.evaluate(() => window.external), [], "Downloading on mobile must not open a preview.");
  await modal.getByRole("link", { name: "Abrir chat en WhatsApp" }).click();
  const chat = new URL(await mobile.evaluate(() => window.external[0]));
  assert.equal(chat.origin + chat.pathname, "https://wa.me/376668856");
  assert.match(chat.searchParams.get("text"), /F-2026-0010/);
  await mobile.evaluate(() => { window.shareMode = "success"; });
  await native.click();
  await modal.waitFor({ state: "hidden" });
  assert.deepEqual(await mobile.evaluate(() => window.attachment), {
    active: true, fields: ["files"], name: "F-2026-0010.pdf", signature: "%PDF-",
  });
  assert.equal(await mobile.evaluate(() => window.sent), 1);

  const draft = await openFixture(true, "?draft");
  await fromMenu(draft, "WhatsApp");
  assert.equal(await draft.evaluate(() => window.issued), 0);
  await draft.getByRole("button", { name: "Emitir y preparar PDF" }).click();
  await draft.getByRole("button", { name: "Compartir por WhatsApp" }).waitFor();
  assert.equal(await draft.evaluate(() => window.issued), 1);

  const desktop = await openFixture(false);
  for (const [channel, destination] of [["WhatsApp", /web\.whatsapp\.com\/send/], ["Email", /mail\.google\.com\/mail/]]) {
    const pendingDownload = desktop.waitForEvent("download");
    await fromMenu(desktop, channel);
    assert.equal((await pendingDownload).suggestedFilename(), "F-2026-0010.pdf");
    assert.match(await desktop.evaluate(() => window.external.at(-1)), destination);
  }
  console.log("WhatsApp mobile file handoff, cancel, fallback and draft preparation passed. Desktop WhatsApp and Gmail passed.");
} finally {
  await browser.close();
}
