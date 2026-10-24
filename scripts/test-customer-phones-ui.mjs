// Isolated loopback fixture: real shared component/CSS, no account or business API.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "playwright";

const root = process.cwd();
const output = process.env.CUSTOMER_PHONES_UI_OUTPUT;
assert(output && path.isAbsolute(output), "Set an absolute evidence directory outside the worktree");
const bundle = await build({
  stdin: {
    contents: `import React, {useState} from "react";
      import {createRoot} from "react-dom/client";
      import {CustomerPhoneFields} from "./src/components/clients/CustomerPhoneFields";
      function Fixture() {
        const empty={phone:"",phoneContactName:"",phone2:"",phone2ContactName:""};
        const [values,setValues]=useState(empty),[saved,setSaved]=useState(empty);
        return <main className="mx-auto max-w-3xl p-4"><h1 className="mb-6 text-xl font-bold">Contactos del cliente · prueba local</h1>
          <form onSubmit={event=>{event.preventDefault();setSaved({...values})}} className="grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
            <CustomerPhoneFields values={values} onChange={(key,value)=>setValues(current=>({...current,[key]:value}))}/>
            <button type="submit">Guardar en la prueba</button>
            <button type="button" onClick={()=>setValues({...saved})}>Reabrir ficha</button>
          </form><output>{JSON.stringify(saved)}</output></main>;
      } createRoot(document.getElementById("root")).render(<Fixture/>);`,
    resolveDir: root, loader: "tsx",
  },
  bundle: true, write: false, platform: "browser", jsx: "automatic",
  alias: { "@": path.join(root, "src") },
});
const css = (await postcss([tailwind({ base: root })]).process(
  await readFile(path.join(root, "src/app/globals.css"), "utf8"),
  { from: path.join(root, "src/app/globals.css") },
)).css;
const html = `<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>`;
const server = http.createServer((req, res) => {
  if (req.method !== "GET") { res.writeHead(405).end(); return; }
  const pathname = new URL(req.url, "http://localhost").pathname;
  const body = pathname === "/app.js" ? bundle.outputFiles[0].contents : pathname === "/app.css" ? css : html;
  res.setHeader("Content-Type", pathname === "/app.js" ? "text/javascript" : pathname === "/app.css" ? "text/css" : "text/html");
  res.end(body);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [], widths = [];
  for (const width of [320, 390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/*", async route => {
      assert.equal(new URL(route.request().url()).origin, origin, "No external requests");
      await route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(origin);
    const phone1 = page.getByLabel("Teléfono 1", { exact: true });
    const name1 = page.getByLabel("Contacto 1 (opcional)", { exact: true });
    const phone2 = page.getByLabel("Teléfono 2", { exact: true });
    const name2 = page.getByLabel("Contacto 2 (opcional)", { exact: true });
    for (const input of [phone1, name1, phone2, name2]) assert.equal(await input.getAttribute("required"), null);
    await phone1.fill("600 111 222"); await name1.fill("Marta · propietaria");
    await phone2.fill("611 222 333"); await name2.fill("José · portería");
    await page.getByRole("button", { name: "Guardar en la prueba" }).click();
    await name1.fill("Cambio sin guardar");
    await page.getByRole("button", { name: "Reabrir ficha" }).click();
    assert.equal(await name1.inputValue(), "Marta · propietaria");
    assert.equal(await name2.inputValue(), "José · portería");
    const first = await phone1.boundingBox(), contact = await name1.boundingBox();
    assert(first && contact && Math.abs(first.y - contact.y) < 2 && contact.x > first.x, "Contact field stays beside its phone");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false, `No overflow at ${width}px`);
    await page.screenshot({ path: path.join(output, `contactos-${width}.png`), fullPage: true });
    await name1.fill(""); await name2.fill(""); await phone2.fill("");
    await page.getByRole("button", { name: "Guardar en la prueba" }).click();
    await page.getByRole("button", { name: "Reabrir ficha" }).click();
    assert.equal(await phone1.inputValue(), "600 111 222");
    assert.equal(await phone2.inputValue(), ""); assert.equal(await name1.inputValue(), "");
    widths.push(width); await context.close();
  }
  assert.deepEqual(errors, []);
  const result = { ok: true, widths, errors, externalRequests: 0, businessWrites: 0, fixture: "shared component and production CSS; local synthetic state only" };
  await writeFile(path.join(output, "ui-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
