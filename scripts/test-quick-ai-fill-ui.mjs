// Owned loopback-only UI test. No real session, provider, customer or document.
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

assert(process.argv.includes("--local"), "Use --local; production writes are forbidden.");
const output = path.resolve(process.env.FACTU_QUICK_AI_OUTPUT ?? "output/quick-ai-fill");
const publicRoot = path.resolve("public");
const actor = "00000000-0000-4000-8000-000000000001";
const company = "00000000-0000-4000-8000-000000000003";
let mode = "success", bootstraps = 0;
const aiRequests = [], writes = [];
const suggestion = () => ({ client: { name: "Cliente IA sintético", nif: "12345678Z", address: "Calle Ejemplo 12, 2º 1ª", postalCode: "08001", city: "Barcelona", email: "cliente@example.test", phone: "600000000" }, items: [{ description: "Cambio de motor", quantity: 1, unitPrice: 100, ivaPercent: 21, unit: "ud", priceIncludesVat: false }, { description: "Cambio de cinta", quantity: 2, unitPrice: 25, ivaPercent: 21, unit: "ud", priceIncludesVat: false }], notes: "Avisar antes de venir", date: null, paymentMethod: null, paid: true, number: "NEVER-IMPORT", warnings: [] });
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    res.setHeader("Content-Type", "application/json");
    if (pathname === "/api/factu-rapido/config") { res.end(JSON.stringify({ url: "http://127.0.0.1:9090", anonKey: "synthetic" })); return; }
    if (pathname === "/api/factu-rapido/bootstrap") {
      bootstraps++; res.end(JSON.stringify({ actorId: actor, companyId: company, companyName: "Empresa sintética", defaultVat: 21, vatRates: [0, 10, 21], vatExempt: false, iban: "ES0000000000000000000000" })); return;
    }
    if (req.method !== "GET") {
      writes.push(pathname);
      assert.equal(pathname, "/api/factu-rapido/autofill", "Never issue/save/create anything in this test");
      assert.equal(req.headers["x-factu-company-id"], company);
      assert(req.headers.authorization?.startsWith("Bearer ")); assert(req.headers["x-factu-device-token"]);
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString()); aiRequests.push(body);
      const selectedMode = mode;
      await new Promise(resolve => setTimeout(resolve, selectedMode === "slow" ? 700 : 30));
      if (selectedMode === "failure") { res.statusCode = 422; res.end(JSON.stringify({ ok: false, code: "AI_FILL_FAILED", message: "No se pudo leer la imagen sintética. Tus campos siguen intactos." })); return; }
      const data = suggestion();
      if (selectedMode === "partial") { data.client = { name: "Otra persona sintética" }; data.items = []; data.notes = null; }
      res.end(JSON.stringify({ ok: true, suggestion: data })); return;
    }
    const file = path.resolve(publicRoot, `.${pathname}`);
    if (!pathname.startsWith("/rapido/") || !file.startsWith(`${publicRoot}${path.sep}`)) { res.statusCode = 404; res.end(); return; }
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" })[path.extname(file)] ?? "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.statusCode = 500; res.end("Synthetic server rejected request"); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  await context.route("**/*", async route => { assert.equal(new URL(route.request().url()).origin, origin, "No external network/OAuth/provider calls"); await route.continue(); });
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: actor, session_id: "00000000-0000-4000-8000-000000000002", exp, aud: "authenticated" })}.c3ludGhldGlj`;
  await context.addInitScript(({ origin, actor, token, exp }) => {
    if (location.origin === origin) localStorage.setItem("sb-127-auth-token", JSON.stringify({ access_token: token, refresh_token: "synthetic", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: actor, email: "synthetic@example.test", aud: "authenticated" } }));
  }, { origin, actor, token, exp });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  const client = key => page.locator(`[data-client="${key}"]`);
  const fill = () => page.getByRole("button", { name: "Rellenar", exact: true }).click();
  const applied = () => page.getByText("Campos rellenados. Revísalos antes de continuar.", { exact: true }).waitFor();
  await page.goto(`${origin}/rapido/index.html`);
  await page.getByRole("button", { name: "Crear factura", exact: true }).click();
  assert.equal(await page.locator(".ai-fill").getAttribute("open"), null);
  assert.equal(aiRequests.length, 0);
  await page.locator(".ai-fill>summary").click();
  assert.equal(await page.locator("#quick-ai-text").inputValue(), "");
  await page.screenshot({ path: path.join(output, "rellenar-ia-movil.png"), fullPage: true });
  await page.locator("#quick-ai-text").fill("SOURCE-ONLY-NOT-A-DRAFT: datos de un cliente y dos reparaciones.");
  await fill(); assert.equal(aiRequests.length, 0);
  await page.locator("#quick-ai-consent").check(); await fill(); await applied();
  assert.equal(await client("name").inputValue(), "Cliente IA sintético"); assert.equal(await client("nif").inputValue(), "12345678Z");
  await page.screenshot({ path: path.join(output, "cliente-rellenado-sintetico.png"), fullPage: true });
  await page.getByRole("button", { name: "Siguiente →", exact: true }).click();
  assert.equal(await page.locator('[data-item="description"]').count(), 2);
  assert.equal(await page.locator('[data-item="unitPrice"]').first().inputValue(), "100");
  assert.equal(await page.locator("#notes").inputValue(), "Avisar antes de venir");
  await page.screenshot({ path: path.join(output, "conceptos-rellenados-sinteticos.png"), fullPage: true });
  await page.getByRole("button", { name: "Siguiente →", exact: true }).click();
  assert.equal(await page.locator("#paid").isChecked(), false, "AI must never confirm collection");
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await page.getByRole("button", { name: "Atrás", exact: true }).click();

  // The snapshot is captured at click time, not initial form render. A real edit
  // DURING inference remains untouched until explicit apply + confirmation.
  mode = "slow";
  await page.locator("#quick-ai-text").fill("Más datos de prueba para completar los campos.");
  const pending = page.waitForRequest(request => new URL(request.url()).pathname.endsWith("/autofill"));
  await fill(); await pending;
  await client("address").fill("Dirección escrita mientras interpreta");
  await page.getByRole("button", { name: "Aplicar resultado a los campos", exact: true }).waitFor();
  assert.equal(await client("address").inputValue(), "Dirección escrita mientras interpreta");
  await page.getByRole("button", { name: "Aplicar resultado a los campos", exact: true }).click(); await applied();
  assert.equal(await client("address").inputValue(), "Calle Ejemplo 12, 2º 1ª");

  // Selected file and pasted screenshot are optimized to JPEG; no source image
  // or pasted prompt is persisted in the local document record.
  mode = "failure";
  await page.locator("#quick-ai-file").setInputFiles({ name: "bad.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-synthetic") });
  await page.getByText("Usa una foto JPG, PNG o WebP. Los PDF no se admiten aquí.", { exact: true }).waitFor();
  const png = await readFile("public/icon-128.png");
  await page.locator("#quick-ai-file").setInputFiles({ name: "captura.png", mimeType: "image/png", buffer: png });
  await page.getByRole("img", { name: "Imagen que se analizará", exact: true }).waitFor();
  assert.equal(await page.locator("#quick-ai-camera").getAttribute("capture"), "environment");
  await fill();
  await page.getByText("No se pudo leer la imagen sintética. Tus campos siguen intactos.", { exact: true }).waitFor();
  assert.equal(await client("name").inputValue(), "Cliente IA sintético");
  assert.equal(aiRequests.at(-1).image.mimeType, "image/jpeg");
  assert(aiRequests.at(-1).image.base64.length < 2_100_000);
  await page.screenshot({ path: path.join(output, "foto-revision-error-sintetico.png"), fullPage: true });
  await page.getByRole("button", { name: "Quitar imagen", exact: true }).click();
  await page.locator("#quick-ai-text").evaluate((input, base64) => {
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([Uint8Array.from(atob(base64), char => char.charCodeAt(0))], "pasted.png", { type: "image/png" }));
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
  }, png.toString("base64"));
  await page.getByRole("img", { name: "Imagen que se analizará", exact: true }).waitFor();
  const layouts = [];
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth);
    assert(scroll <= width); layouts.push({ width, scroll });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  // A different recipient cannot retain an old NIF or address.
  mode = "partial"; await page.locator("#quick-ai-target").selectOption("client"); await page.locator("#quick-ai-text").fill("");
  await fill(); await page.getByRole("button", { name: "Aplicar resultado a los campos", exact: true }).click(); await applied();
  assert.equal(await client("name").inputValue(), "Otra persona sintética"); assert.equal(await client("nif").inputValue(), "");
  assert.equal(await client("address").inputValue(), "");
  await page.getByRole("button", { name: "Volver al inicio", exact: true }).click();
  await page.getByRole("button", { name: "Crear presupuesto", exact: true }).click();
  assert.equal(await page.locator(".ai-fill").getAttribute("open"), null);
  await page.locator(".ai-fill>summary").click();
  assert.equal(await page.locator("#quick-ai-text").inputValue(), "");
  mode = "slow"; await page.locator("#quick-ai-text").fill("Presupuesto completo para cliente de prueba");
  const slowRequest = page.waitForRequest(request => new URL(request.url()).pathname.endsWith("/autofill"));
  await fill(); await slowRequest;
  await page.getByRole("button", { name: "Volver al inicio", exact: true }).click();
  await page.getByRole("button", { name: "Crear presupuesto", exact: true }).click();
  await client("name").fill("Nuevo formulario privado");
  await page.waitForLoadState("networkidle");
  assert.equal(await client("name").inputValue(), "Nuevo formulario privado", "Late result must never replace a new form");
  // Same complete-document flow works for a quote, with no paid state or emit.
  mode = "success"; await page.locator(".ai-fill>summary").click(); await page.locator("#quick-ai-text").fill("Datos para el presupuesto sintético");
  await fill(); await page.getByRole("button", { name: "Aplicar resultado a los campos", exact: true }).click(); await applied();
  await page.getByRole("button", { name: "Siguiente →", exact: true }).click();
  assert.equal(await page.locator('[data-item="description"]').count(), 2);
  const description = page.locator('[data-item="description"]').first();
  await description.fill("Texto conservado al salir y volver");
  await page.evaluate(() => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); window.dispatchEvent(new Event("pageshow")); });
  assert.equal(await description.inputValue(), "Texto conservado al salir y volver");
  const stored = await page.evaluate(async key => {
    const db = await new Promise((resolve, reject) => { const req = indexedDB.open("factu-quick-private-v1"); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    try { return await new Promise((resolve, reject) => { const tx = db.transaction("state", "readonly"), req = tx.objectStore("state").get(key); req.onsuccess = () => resolve(JSON.stringify(req.result)); req.onerror = () => reject(req.error); }); }
    finally { db.close(); }
  }, `${actor}:${company}`);
  assert(!String(stored).includes("SOURCE-ONLY-NOT-A-DRAFT")); assert(!String(stored).includes("base64"));
  assert.equal(bootstraps, 1, "No focus refresh or AI-induced application reload");
  assert(writes.every(route => route === "/api/factu-rapido/autofill"));
  assert(aiRequests.some(request => request.kind === "presupuesto"));
  assert.deepEqual(errors, []);
  const result = { ok: true, syntheticOnly: true, noExternalRequests: true, aiCalls: aiRequests.length, emittedDocuments: 0, createdCustomers: 0, collapsedByDefault: true, textAndImageAndClipboard: true, explicitConsent: true, concurrentEditsPreserved: true, lateResultsDiscarded: true, noPaymentStatusFromAi: true, noRawInputInDrafts: true, quoteAndInvoiceAndClient: true, layouts, consoleErrors: errors };
  await writeFile(path.join(output, "ai-ui-result.json"), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
