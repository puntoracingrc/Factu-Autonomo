// Isolated presentation test. All API responses and auth data are synthetic;
// real authentication, authorization and commits have PostgreSQL acceptance.
import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

assert(process.argv.includes("--local"), "Pass --local; this test never connects to production.");
const output = path.resolve(process.env.FACTU_QUICK_SHELL_OUTPUT ?? "output/quick-shell");
const root = path.resolve("public");
const actor = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
let attempts = 0, configs = 0;
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;
  if (pathname === "/api/factu-rapido/config") {
    configs++; res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ url: "http://127.0.0.1:9090", anonKey: "synthetic-local-only" })); return;
  }
  if (pathname === "/api/factu-rapido/bootstrap") {
    attempts++; res.setHeader("Content-Type", "application/json");
    if (attempts === 1) {
      res.statusCode = 403;
      res.end(JSON.stringify({ ok: false, code: "device_session_conflict", message: "La sesión anterior tarda en liberarse." })); return;
    }
    res.end(JSON.stringify({ actorId: actor, companyId: actor, companyName: "Empresa antigua sintética", defaultVat: 21, vatRates: [0, 4, 10, 21], vatExempt: false, iban: "ES0000000000000000000000" })); return;
  }
  const file = path.resolve(root, `.${pathname}`);
  if (!pathname.startsWith("/rapido/") || !file.startsWith(`${root}${path.sep}`)) { res.statusCode = 404; res.end(); return; }
  try {
    res.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" })[path.extname(file)] ?? "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const exp = Math.floor(Date.now() / 1000) + 3600;
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: actor, session_id: sessionId, exp, aud: "authenticated" })}.c3ludGhldGlj`;
let browser;
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route("**/*", async route => {
    assert.equal(new URL(route.request().url()).origin, origin, "External/OAuth requests are forbidden in this synthetic test");
    await route.continue();
  });
  await context.addInitScript(({ origin, session }) => {
    if (location.origin !== origin || window.top !== window.self) return;
    localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
    localStorage.setItem("main-company-sentinel", "excluded-company-synthetic");
  }, { origin, session: { access_token: token, refresh_token: "synthetic-local-only", expires_at: exp, expires_in: 3600, token_type: "bearer", user: { id: actor, aud: "authenticated", email: "quick-access@example.test" } } });
  const page = await context.newPage();
  const errors = [], requests = [], layouts = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push({ method: request.method(), path: new URL(request.url()).pathname }));
  await page.goto(`${origin}/rapido/index.html`);
  await page.getByRole("button", { name: "Reintentar acceso", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Entrar con Google", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Reintentar acceso", exact: true }).click();
  await page.getByRole("button", { name: "Crear factura", exact: true }).waitFor();
  assert.equal(attempts, 2); assert.equal(configs, 1);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll(".hero-button")];
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, buttons: buttons.map(button => {
        const rect = button.getBoundingClientRect(), title = button.querySelector("span:nth-child(2)"), style = getComputedStyle(title);
        return { y: rect.y, bottom: rect.bottom, height: rect.height, fontSize: parseFloat(style.fontSize), color: style.color };
      }) };
    });
    assert.equal(layout.buttons.length, 2);
    assert(layout.buttons[1].y >= layout.buttons[0].bottom + 10, "Home buttons must always be stacked");
    assert(layout.buttons.every(button => button.fontSize >= 22 && button.height >= 100 && button.color === "rgb(17, 17, 17)"));
    assert(layout.scrollWidth <= width, "No horizontal overflow");
    layouts.push(layout);
    if (width === 390) await page.screenshot({ path: path.join(output, "inicio-sin-esloganes.png"), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Crear factura", exact: true }).click();
  for (const [key, value] of Object.entries({ name: "Cliente sintético", nif: "12345678Z", address: "Calle Dos 2", postalCode: "08002", city: "Barcelona" })) await page.locator(`[data-client="${key}"]`).fill(value);
  await page.screenshot({ path: path.join(output, "cliente-legible.png"), fullPage: true });
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await page.locator('[data-item="description"]').fill("Cambio de cinta de persiana");
  await page.locator('[data-item="unitPrice"]').fill("100");
  await page.getByRole("button", { name: "Siguiente →" }).click();
  for (const method of ["Efectivo", "Tarjeta", "Transferencia", "Bizum"]) assert.equal(await page.getByRole("radio", { name: method, exact: true }).count(), 1);
  await page.getByRole("radio", { name: "Transferencia", exact: true }).check();
  await page.getByRole("checkbox", { name: /Pagado/ }).check();
  await page.screenshot({ path: path.join(output, "pago-legible.png"), fullPage: true });
  assert.equal(await page.evaluate(() => localStorage.getItem("main-company-sentinel")), "excluded-company-synthetic");
  assert(!requests.some(request => request.method === "POST" || request.path.startsWith("/_next/") || request.path.endsWith("/issue")));
  assert.deepEqual(errors, []);
  const result = { ok: true, syntheticOnly: true, bootstrapAttempts: attempts, configRequests: configs, repeatedOAuth: false, layouts, consoleErrors: errors };
  await writeFile(path.join(output, "shell-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
