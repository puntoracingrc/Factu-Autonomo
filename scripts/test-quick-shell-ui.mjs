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
let attempts = 0, configs = 0, directoryQueries = 0;
const nextCompany = "00000000-0000-4000-8000-000000000003";
let enrolledCompany = actor;
const contacts = ["Alfa","Beta","Gamma"].map((name,index) => ({id:`contact-${index}`,name:`Cliente ${name}`,nif:`SYN00${index}`,address:"Calle Dos 2",postalCode:"08002",city:"Barcelona",email:`cliente-${index}@example.test`,phone:"600000000"}));
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
    res.end(JSON.stringify({ actorId: actor, companyId: enrolledCompany, companyName: enrolledCompany === actor ? "Empresa antigua sintética" : "Empresa SL sintética", defaultVat: 21, vatRates: [0, 4, 10, 21], vatExempt: false, iban: "ES0000000000000000000000" })); return;
  }
  if (pathname === "/api/factu-rapido/search") {
    directoryQueries++; res.setHeader("Content-Type", "application/json");
    if (req.headers["x-factu-company-id"] !== enrolledCompany) {
      res.statusCode = req.headers["x-factu-company-id"] ? 403 : 409;
      res.end(JSON.stringify({ok:false,code:"COMPANY_NOT_ALLOWED",message:"La empresa abierta ya no está habilitada."})); return;
    }
    const params = new URL(req.url,"http://127.0.0.1").searchParams;
    const query = (params.get("q") ?? "").toLowerCase();
    const matches = contacts.filter(contact => `${contact.name} ${contact.nif}`.toLowerCase().includes(query));
    res.end(JSON.stringify({results:query.length >= 2 ? matches : []})); return;
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
  page.on("dialog",dialog => dialog.accept()); // Only this disposable synthetic context.
  const errors = [], requests = [], layouts = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => requests.push({ method: request.method(), path: new URL(request.url()).pathname }));
  await page.goto(`${origin}/rapido/index.html`);
  await page.getByRole("button", { name: "Reintentar acceso", exact: true }).waitFor();
  await page.getByRole("button", { name: "Instalar en el móvil", exact: true }).click();
  await page.getByRole("heading", { name: "Poner el icono de Factu Rápido", exact: true }).waitFor();
  assert.equal(await page.locator(".quick-install-url").inputValue(), `${origin}/rapido/index.html`);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
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
    assert.equal(layout.buttons.length, 3);
    assert(layout.buttons.slice(1).every((button,index) => button.y >= layout.buttons[index].bottom + 10), "Home buttons must always be stacked");
    assert(layout.buttons.every(button => button.fontSize >= 22 && button.height >= 100 && button.color === "rgb(17, 17, 17)"));
    assert(layout.scrollWidth <= width, "No horizontal overflow");
    const installPosition = await page.locator(".quick-install-button").boundingBox();
    const appPosition = await page.locator(".topbar").boundingBox();
    assert(installPosition.height >= 44 && installPosition.y + installPosition.height <= appPosition.y, "Install action stays at the top with a mobile-size tap target");
    layouts.push(layout);
    if (width === 390) await page.screenshot({ path: path.join(output, "inicio-sin-esloganes.png"), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Crear factura", exact: true }).click();
  for (const [key, value] of Object.entries({ name: "Cliente sintético", nif: "12345678Z", address: "Calle Dos 2", postalCode: "08002", city: "Barcelona" })) await page.locator(`[data-client="${key}"]`).fill(value);
  const accessCounts = { attempts, configs };
  // Synthetic browser events affect only installation UI, not the open form.
  await page.locator('[data-client="address"]').focus();
  await page.evaluate(() => {
    window.quickInstallCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt: async () => { window.quickInstallCalls++; }, userChoice: Promise.resolve({ outcome: "dismissed" }) });
    window.dispatchEvent(event);
    if (!event.defaultPrevented) throw new Error("Install prompt was not captured");
  });
  assert.equal(await page.locator('[data-client="address"]').evaluate(input => input === document.activeElement), true);
  await page.getByRole("button", { name: "Instalar en el móvil", exact: true }).click();
  await page.getByRole("button", { name: "Instalar en el móvil", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.quickInstallCalls), 1);
  await page.getByRole("button", { name: "Instalar en el móvil", exact: true }).click();
  await page.getByRole("heading", { name: "Poner el icono de Factu Rápido", exact: true }).waitFor();
  assert.equal(await page.locator('[data-client="address"]').inputValue(), "Calle Dos 2");
  await page.screenshot({ path: path.join(output, "instalar-sin-perder-formulario.png"), fullPage: true });
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  assert.equal(await page.locator("#quick-install").isHidden(), true);
  assert.equal(await page.locator('[data-client="name"]').inputValue(), "Cliente sintético");
  assert.equal(await page.locator('[data-client="address"]').inputValue(), "Calle Dos 2");
  assert.deepEqual({ attempts, configs }, accessCounts, "Installation must not reinitialize access or reload the app");
  await page.screenshot({ path: path.join(output, "cliente-legible.png"), fullPage: true });
  await page.getByRole("button", { name: "Siguiente →" }).click();
  await page.locator('[data-item="description"]').fill("Cambio de cinta de persiana");
  await page.locator('[data-item="unitPrice"]').fill("100");
  await page.getByRole("button", { name: "Siguiente →" }).click();
  for (const method of ["Efectivo", "Tarjeta", "Transferencia", "Bizum"]) assert.equal(await page.getByRole("radio", { name: method, exact: true }).count(), 1);
  await page.getByRole("radio", { name: "Transferencia", exact: true }).check();
  await page.getByRole("checkbox", { name: /Pagado/ }).check();
  await page.screenshot({ path: path.join(output, "pago-legible.png"), fullPage: true });
  assert.equal(directoryQueries,0,"The home/form must not eagerly load the customer directory");
  await page.getByRole("button",{name:"Volver al inicio",exact:true}).click();
  await page.getByRole("button",{name:"Buscar cliente",exact:true}).click();
  await page.waitForLoadState("networkidle");
  assert.equal(directoryQueries,0,"Opening customer search must not preload or list contacts");
  assert.equal(await page.locator(".customer-item").count(),0);
  await page.locator("#directory-search").fill("Alfa");
  await page.getByRole("button",{name:/Cliente Alfa/}).waitFor();
  assert.equal(await page.locator(".customer-item").count(),1);
  assert.equal(await page.getByRole("button",{name:/Cliente Beta/}).count(),0);
  await page.locator("#directory-search").fill("Beta");
  await page.getByRole("button",{name:/Cliente Beta/}).click();
  await page.getByRole("heading",{name:"Cliente Beta",exact:true}).waitFor();
  await page.screenshot({path:path.join(output,"ficha-cliente.png"),fullPage:true});
  await page.getByRole("button",{name:"Crear factura",exact:true}).click();
  await page.getByRole("heading",{name:"Cliente",exact:true}).waitFor();
  assert.equal(await page.locator('[data-client="name"]').inputValue(),"Cliente Beta");
  assert.equal(await page.locator('[data-client="nif"]').inputValue(),"SYN001");
  await page.getByRole("button",{name:"Siguiente →"}).click();
  await page.getByRole("heading",{name:"Conceptos y notas",exact:true}).waitFor();
  await page.getByRole("button",{name:"Volver al inicio",exact:true}).click();
  await page.getByRole("button",{name:"Buscar cliente",exact:true}).click();
  await page.locator("#directory-search").fill("Beta");
  await page.getByRole("button",{name:/Cliente Beta/}).click();
  await page.getByRole("button",{name:"Crear presupuesto",exact:true}).click();
  await page.getByRole("heading",{name:"Cliente",exact:true}).waitFor();
  assert.equal(await page.locator('[data-client="name"]').inputValue(),"Cliente Beta");
  await page.locator('[data-client="address"]').fill("Dirección corregida para el documento");
  await page.getByRole("button",{name:"Siguiente →"}).click();
  await page.getByRole("heading",{name:"Conceptos y notas",exact:true}).waitFor();
  await page.getByRole("button",{name:"Atrás",exact:true}).click();
  assert.equal(await page.locator('[data-client="address"]').inputValue(),"Dirección corregida para el documento");
  // A stale editor remains pinned to its old company, not silently reassigned.
  enrolledCompany = nextCompany;
  await page.getByRole("button",{name:"Volver al inicio",exact:true}).click();
  await page.getByRole("button",{name:"Buscar cliente",exact:true}).click();
  await page.locator("#directory-search").fill("Alfa");
  await page.getByText("La empresa abierta ya no está habilitada.",{exact:true}).waitFor();
  await page.reload();
  await page.getByRole("button",{name:"Crear factura",exact:true}).waitFor();
  assert.equal(await page.locator(".company").innerText(),"Empresa SL sintética");
  assert.equal(await page.getByRole("button",{name:/Continuar documento sin terminar/}).count(),0);
  await page.screenshot({path:path.join(output,"empresa-activa-sl.png"),fullPage:true});
  // Switching back restores, rather than erases or moves, the prior form.
  enrolledCompany = actor;
  await page.reload();
  await page.getByRole("button",{name:/Continuar documento sin terminar/}).click();
  assert.equal(await page.locator('[data-client="name"]').inputValue(),"Cliente Beta");
  assert.equal(await page.locator('[data-client="address"]').inputValue(),"Dirección corregida para el documento");
  assert.equal(await page.evaluate(() => localStorage.getItem("main-company-sentinel")), "excluded-company-synthetic");
  // A first visit with no account/session can install the public shell too.
  const guest = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await guest.route("**/*", async route => {
    assert.equal(new URL(route.request().url()).origin, origin);
    await route.continue();
  });
  const guestPage = await guest.newPage();
  guestPage.on("pageerror", error => errors.push(error.message));
  await guestPage.goto(`${origin}/rapido/index.html`);
  await guestPage.getByRole("button", { name: "Entrar con Google", exact: true }).waitFor();
  await guestPage.getByRole("button", { name: "Instalar en el móvil", exact: true }).click();
  await guestPage.getByRole("heading", { name: "Poner el icono de Factu Rápido", exact: true }).waitFor();
  assert.equal(await guestPage.locator(".quick-install-url").inputValue(), `${origin}/rapido/index.html`);
  await guest.close();
  // Simulate the old public hostname with loopback responses only. No real
  // site, OAuth flow, service worker or business data is contacted here.
  const oldOrigin = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  await oldOrigin.addInitScript(() => {
    const nativeMatch = window.matchMedia.bind(window);
    window.matchMedia = query => {
      const result = nativeMatch(query);
      if (query === "(display-mode: standalone)") Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  await oldOrigin.route("**/*", async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, "https://facturacion-autonomos.app");
    assert.equal(route.request().method(), "GET");
    const response = await fetch(`${origin}${url.pathname}${url.search}`);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  const oldPage = await oldOrigin.newPage();
  await oldPage.goto("https://facturacion-autonomos.app/rapido/index.html?synthetic=not-copied#not-copied");
  await oldPage.getByRole("button", { name: "Entrar con Google", exact: true }).waitFor();
  await oldPage.evaluate(() => {
    window.quickInstallCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt: async () => { window.quickInstallCalls++; }, userChoice: Promise.resolve({ outcome: "accepted" }) });
    window.dispatchEvent(event);
    window.dispatchEvent(new Event("appinstalled"));
  });
  await oldPage.getByRole("button", { name: "Instalar en el móvil", exact: true }).click();
  assert.equal(await oldPage.locator(".quick-install-url").inputValue(), "https://fast.facturacion-autonomos.app/rapido/index.html");
  const separateLink = oldPage.getByRole("link", { name: "Abrir para instalar", exact: true });
  assert.equal(await separateLink.getAttribute("href"), "https://fast.facturacion-autonomos.app/rapido/index.html");
  assert.equal(await separateLink.getAttribute("target"), "_blank");
  assert.equal(await oldPage.evaluate(() => window.quickInstallCalls), 0, "Never offer the enclosing main PWA as the quick app");
  await oldPage.screenshot({ path: path.join(output, "instalacion-origen-independiente.png"), fullPage: true });
  await oldOrigin.close();
  for (const mode of ["standalone", "browser-installed", "other-app", "api-error"]) {
    const installed = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await installed.route("**/*", async route => {
      const url = new URL(route.request().url());
      assert.equal(url.origin, "https://fast.facturacion-autonomos.app");
      assert.equal(route.request().method(), "GET");
      const response = await fetch(`${origin}${url.pathname}${url.search}`);
      await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
    });
    await installed.addInitScript(mode => {
      const nativeMatch = window.matchMedia.bind(window);
      window.matchMedia = query => {
        const result = nativeMatch(query);
        if (query === "(display-mode: standalone)") Object.defineProperty(result, "matches", { value: mode === "standalone" });
        return result;
      };
      Object.defineProperty(navigator, "getInstalledRelatedApps", { value: async () => {
        if (mode === "api-error") throw new Error("Synthetic unavailable browser API");
        return [{platform:"webapp",url:mode === "browser-installed" ? "/rapido/manifest.webmanifest" : "/manifest.json",id:mode === "browser-installed" ? "/rapido/" : "/"}];
      } });
    }, mode);
    const installedPage = await installed.newPage();
    installedPage.on("pageerror", error => errors.push(error.message));
    await installedPage.goto("https://fast.facturacion-autonomos.app/rapido/index.html");
    await installedPage.getByRole("button", { name: "Entrar con Google", exact: true }).waitFor();
    const expectedHidden = mode === "standalone" || mode === "browser-installed";
    assert.equal(await installedPage.locator("#quick-install").isHidden(), expectedHidden, mode);
    if (mode === "standalone") await installedPage.screenshot({ path: path.join(output, "sin-aviso-app-instalada-sintetica.png"), fullPage: true });
    await installed.close();
  }
  assert(!requests.some(request => request.method === "POST" || request.path.startsWith("/_next/") || request.path.endsWith("/issue")));
  assert.deepEqual(errors, []);
  const result = { ok: true, syntheticOnly: true, bootstrapAttempts: attempts, configRequests: configs, repeatedOAuth: false, installation:{nativePromptOnce:true,manualInstructions:true,visibleBeforeLogin:true,formAndFocusPreserved:true,noAccessReload:true,independentOrigin:true,mainAppPromptRejected:true,hiddenInInstalledWindow:true,hiddenWhenBrowserConfirms:true,unrelatedAppNotHidden:true,optionalApiFailureSafe:true},customerDirectoryQueries:directoryQueries,customerFlows:["selected-customer-invoice","selected-customer-quote"],staleCompanyRejected:true,companyDraftsIsolatedAndPreserved:true,layouts, consoleErrors: errors };
  await writeFile(path.join(output, "shell-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
