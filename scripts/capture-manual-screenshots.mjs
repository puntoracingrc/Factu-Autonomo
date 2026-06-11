/**
 * Genera capturas del manual en public/ayuda/capturas/
 * Uso: npm run manual:screenshots  (servidor en :3000)
 */
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/ayuda/capturas");
const BASE_URL = process.env.MANUAL_SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const DEMO_DATA = JSON.parse(
  readFileSync(path.join(__dirname, "manual-demo-data.json"), "utf8"),
);

mkdirSync(OUT_DIR, { recursive: true });

async function waitForApp(page) {
  await page.waitForFunction(
    () => !document.body.textContent?.includes("Cargando tus datos"),
    { timeout: 20000 },
  );
  await page.waitForTimeout(500);
}

async function seed(page) {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.evaluate((data) => {
    localStorage.setItem("factura-autonomo-data", JSON.stringify(data));
    localStorage.setItem("factu-daily-greeting", new Date().toISOString().slice(0, 10));
    localStorage.removeItem("factu-reminders-last-seen");
  }, DEMO_DATA);
  await page.reload({ waitUntil: "networkidle" });
  await waitForApp(page);
}

function documentRow(page, number) {
  return page.locator("div.flex.flex-col.gap-4").filter({ hasText: number }).first();
}

async function shot(page, name, options = {}) {
  const filePath = path.join(OUT_DIR, `${name}.png`);
  try {
    if (options.locator) {
      const el =
        typeof options.locator === "string"
          ? page.locator(options.locator).first()
          : options.locator;
      await el.waitFor({ state: "visible", timeout: 15000 });
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await el.screenshot({ path: filePath });
    } else if (options.fullPage) {
      await page.screenshot({ path: filePath, fullPage: true });
    } else {
      await page.screenshot({ path: filePath });
    }
    console.log(`✓ ${name}.png`);
  } catch (error) {
    console.error(`✗ ${name}.png — ${error.message}`);
    await page.screenshot({
      path: path.join(OUT_DIR, `${name}-fallback.png`),
      fullPage: true,
    });
    console.log(`  ↳ guardado ${name}-fallback.png`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 720, height: 1280 },
    deviceScaleFactor: 2,
    locale: "es-ES",
  });
  const page = await context.newPage();
  await seed(page);

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "inicio-recordatorios", {
    locator: "section[aria-labelledby='home-reminders-heading']",
  });
  await shot(page, "inicio-accesos-rapidos", {
    locator: "div.grid.grid-cols-2.gap-3",
  });
  await shot(page, "navegacion-inferior", { locator: "nav.fixed.bottom-0" });

  await page.goto(`${BASE_URL}/avisos`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "avisos-centro", { fullPage: true });

  await page.goto(`${BASE_URL}/impuestos`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await page.getByRole("button", { name: "Trimestre", exact: true }).click();
  await page.waitForTimeout(400);
  await shot(page, "impuestos-trimestre", {
    locator: "text=Ingresos cobrados >> xpath=ancestor::div[contains(@class,'grid')][1]",
  });
  await shot(page, "impuestos-resumen", { fullPage: true });
  await shot(page, "impuestos-csv", { locator: "button:has-text('CSV')" });
  await page.getByRole("button", { name: "Año", exact: true }).click();
  await page.waitForTimeout(400);
  await shot(page, "impuestos-pdf-anual", { locator: "button:has-text('PDF')" });

  await page.goto(`${BASE_URL}/configuracion`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await page.waitForTimeout(1000);
  await shot(page, "ajustes-datos-negocio", {
    locator: "input[value='Estudio López']",
  });
  await shot(page, "ajustes-iva-irpf", {
    locator: "text=Régimen de IVA",
  });
  await shot(page, "ajustes-frases", {
    locator: "text=Frases en documentos",
  });
  await shot(page, "ajustes-numeracion", {
    locator: "h2:text-is('Numeración')",
  });
  await shot(page, "ajustes-copia", {
    locator: "text=¿Dónde están mis datos?",
  });
  await shot(page, "cuenta-nube", {
    locator: "text=Copia de seguridad y cuenta",
  });

  await page.goto(`${BASE_URL}/clientes`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await page.getByRole("button", { name: "Nuevo cliente" }).first().click();
  await page.waitForTimeout(400);
  await shot(page, "clientes-nuevo", { fullPage: true });

  await page.goto(`${BASE_URL}/facturas/nuevo`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "facturas-nueva", { fullPage: true });
  await shot(page, "clientes-seleccion", {
    locator: "text=Datos del cliente",
  });

  await page.goto(`${BASE_URL}/facturas`, { waitUntil: "networkidle" });
  await waitForApp(page);

  const unpaidRow = documentRow(page, "F-2026-0002");
  await shot(page, "facturas-pdf", {
    locator: unpaidRow.getByRole("button", { name: /Descargar PDF/i }),
  });
  await shot(page, "facturas-enviar", {
    locator: unpaidRow.locator(".action-scroll"),
  });
  await shot(page, "facturas-cobrar", {
    locator: unpaidRow.getByRole("button", {
      name: /Marcar como cobrado/i,
    }),
  });

  const rectRow = documentRow(page, "F-2026-0003");
  await shot(page, "facturas-rectificar", {
    locator: rectRow.getByRole("link", { name: "Rectificar" }),
  });

  try {
    await unpaidRow.getByRole("button", { name: /Recordar pago/i }).click();
    await page.waitForSelector("[aria-labelledby='payment-reminder-title']", {
      timeout: 8000,
    });
    await shot(page, "facturas-recordatorio", { locator: "[role='dialog']" });
    await page.getByLabel("Cerrar").click();
  } catch {
    await shot(page, "facturas-recordatorio", { fullPage: true });
  }

  const paidRow = documentRow(page, "F-2026-0001");
  await shot(page, "recibos-automatico", { locator: paidRow });

  await page.goto(`${BASE_URL}/presupuestos/nuevo`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "presupuestos-nuevo", { fullPage: true });

  await page.goto(`${BASE_URL}/presupuestos`, { waitUntil: "networkidle" });
  await waitForApp(page);
  const pendingQuote = documentRow(page, "P-2026-0002");
  await shot(page, "presupuestos-aceptado", {
    locator: pendingQuote.getByRole("button", {
      name: /Marcar presupuesto como aceptado/i,
    }),
  });

  await page.goto(`${BASE_URL}/recibos/nuevo`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "recibos-nuevo", { fullPage: true });

  await page.goto(`${BASE_URL}/gastos`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "gastos-filtros", { fullPage: true });
  await shot(page, "gastos-exportar", { locator: "text=Exportar CSV" });

  await page.goto(`${BASE_URL}/gastos/nuevo`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "gastos-nuevo", { fullPage: true });

  await page.goto(`${BASE_URL}/gastos/fijos`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "gastos-fijos", { fullPage: true });

  await page.goto(`${BASE_URL}/proveedores`, { waitUntil: "networkidle" });
  await waitForApp(page);
  await shot(page, "proveedores-nuevo", { fullPage: true });
  await page.getByRole("button", { name: "Unificar manualmente" }).click();
  await page.waitForTimeout(400);
  await shot(page, "proveedores-unificar", { locator: "text=Unificación manual" });

  await browser.close();
  console.log(`\nCapturas en ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
