import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID,createHash } from "node:crypto";
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

assert(process.argv.includes("--local"),"Pass --local; this harness never accepts a production URL.");
const local = value => { assert(["127.0.0.1","localhost","[::1]"].includes(new URL(value).hostname),"Local synthetic test only"); return value; };
const config = JSON.parse(execFileSync("supabase",["status","-o","json"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}));
local(config.API_URL); local(config.DB_URL);
const appUrl = local(process.env.FACTU_QUICK_TEST_APP_URL ?? "http://127.0.0.1:3038");
const output = path.resolve(process.env.FACTU_QUICK_TEST_OUTPUT ?? "output/quick-ui");
const admin = createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const client = createClient(config.API_URL,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const sha = value => createHash("sha256").update(value).digest("hex");
const profile = {name:"Empresa antigua sintética",commercialName:"Empresa de prueba",nif:"B12345678",address:"Calle de Prueba 1",city:"Barcelona",postalCode:"08001",country:"España",phone:"",email:"",
  iban:"ES0000000000000000000000",iva:{rates:[0,4,10,21],defaultRate:21},vatExempt:false,verifactu:{enabled:false,environment:"test"},quoteValidityDays:30,
  numbering:{year:2026,lastSequence:{factura:0,factura_rectificativa:0,presupuesto:0,recibo:0},formats:{factura:{template:"F-{year}-{num}",padding:4},factura_rectificativa:{template:"FR-{year}-{num}",padding:4},presupuesto:{template:"P-{year}-{num}",padding:4},recibo:{template:"R-{year}-{num}",padding:4}}}};
let userId, browser;
const errors = [];
function sql(query) { return execFileSync("psql",[config.DB_URL,"-X","-v","ON_ERROR_STOP=1","-At","-c",query],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim(); }
async function okay(result) { assert.equal(result.error,null,result.error?.message); return result.data; }
async function savePdf(page,name) {
  await page.locator("#pdf-view iframe").waitFor({state:"visible",timeout:30_000});
  const bytes = await page.locator("#pdf-view iframe").evaluate(async frame => Array.from(new Uint8Array(await (await fetch(frame.src)).arrayBuffer())));
  assert(Buffer.from(bytes).subarray(0,5).equals(Buffer.from("%PDF-")));
  await writeFile(path.join(output,name),Buffer.from(bytes));
}
try {
  await mkdir(output,{recursive:true});
  const email = `quick-mobile-${randomUUID()}@example.test`,password=`Synthetic-${randomUUID()}!`;
  const created = await admin.auth.admin.createUser({email,password,email_confirm:true});
  assert.equal(created.error,null); userId = created.data.user.id;
  await okay(await admin.rpc("list_app_companies_v1",{p_user_id:userId,p_verified_email:email}));
  await okay(await admin.from("app_companies").update({name:"Empresa antigua de prueba"}).eq("id",userId));
  await okay(await admin.from("user_subscriptions").upsert({user_id:userId,plan:"pro",status:"active",current_period_end:"2099-12-31T23:59:59Z"}));
  await okay(await admin.from("central_business_entities").insert({user_id:userId,entity_type:"profile",entity_id:"profile",current_version:1,deleted:false,current_payload:profile,content_hash:"synthetic",actor_device_id:"fixture",actor_session_hash:"fixture"}));
  await okay(await admin.from("quick_invoicing_access").insert({actor_user_id:userId,company_id:userId,enabled:true}));
  const key = sha(userId);
  await okay(await admin.rpc("reconcile_central_invoice_series_v1",{p_user_id:userId,p_device_id:"fixture",p_session_hash:"fixture",p_idempotency_key_hash:key,p_request_hash:key,p_environment:"test",p_issuer_nif:profile.nif,p_series_code:"F-2026",p_fiscal_year:2026,p_observed_max_sequence:0,p_source_document_count:0,p_source_digest:`sha256:${key}`}));
  await okay(await admin.rpc("reconcile_central_business_document_series_v1",{p_user_id:userId,p_device_id:"fixture",p_session_hash:"fixture",p_idempotency_key_hash:key,p_request_hash:key,p_entity_type:"quote",p_number_template:"P-{year}-{num}",p_fiscal_year:2026,p_observed_max_sequence:0,p_source_document_count:0,p_source_digest:`sha256:${key}`}));
  const login = await client.auth.signInWithPassword({email,password}); assert.equal(login.error,null);
  browser = await chromium.launch({channel:"chrome",headless:true});
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await context.addInitScript(({storageKey,session,appOrigin}) => {
    if (window.top !== window.self || location.origin !== appOrigin) return;
    localStorage.setItem(storageKey,JSON.stringify(session));
    localStorage.setItem("main-app-company-sentinel","excluded-company-synthetic");
  },{storageKey:`sb-${new URL(config.API_URL).hostname.split(".")[0]}-auth-token`,session:login.data.session,appOrigin:new URL(appUrl).origin});
  const page = await context.newPage(); page.setDefaultTimeout(15_000);
  page.on("pageerror",error => errors.push(error.message));
  const requests = []; page.on("request",request => requests.push(new URL(request.url()).pathname));
  await page.goto(`${appUrl}/rapido/index.html`);
  await page.getByRole("button",{name:/Crear factura/}).waitFor();
  await page.screenshot({path:path.join(output,"01-inicio.png"),fullPage:true});
  assert(!requests.some(url => url.startsWith("/_next/") || url.includes("cloud/sync")),"The quick shell must not load the full program");
  await page.getByRole("button",{name:/Crear factura/}).click();
  for (const [key,value] of Object.entries({name:"Cliente móvil sintético",nif:"12345678Z",address:"Calle Dos 2",postalCode:"08002",city:"Barcelona"})) await page.locator(`[data-client="${key}"]`).fill(value);
  await page.screenshot({path:path.join(output,"02-cliente.png"),fullPage:true});
  await page.getByRole("button",{name:"Siguiente →"}).click();
  await page.locator('[data-item="description"]').fill("Cambio de motor de persiana");
  await page.locator('[data-item="unitPrice"]').fill("150");
  await page.locator("summary").click(); await page.locator("#notes").fill("Trabajo realizado en la visita de hoy.");
  const alternate = await context.newPage(); await alternate.goto("about:blank"); await page.bringToFront();
  assert.equal(await page.locator('[data-item="description"]').inputValue(),"Cambio de motor de persiana");
  // Browser restart/OS discard simulation: the small local draft and session
  // survive without a global AppData download or a new Google sign-in.
  await page.reload(); await page.getByRole("button",{name:/Continuar documento/}).click();
  assert.equal(await page.locator('[data-item="unitPrice"]').inputValue(),"150");
  await page.screenshot({path:path.join(output,"03-conceptos.png"),fullPage:true});
  await page.getByRole("button",{name:"Siguiente →"}).click();
  assert.deepEqual(await page.locator('input[name="payment"]').evaluateAll(inputs => inputs.map(input => input.value)),["efectivo","tarjeta","transferencia","bizum"]);
  await page.locator('input[value="transferencia"]').check(); await page.locator("#paid").check();
  assert.match(await page.locator("#payment-preview-text").innerText(),/Pagado por transferencia · IBAN: ES00/);
  await page.screenshot({path:path.join(output,"04-pago.png"),fullPage:true});
  let firstResponse;
  await page.route("**/api/factu-rapido/issue",async route => {
    if (!firstResponse) { const response = await route.fetch(); firstResponse = await response.json(); await route.abort("failed"); }
    else await route.continue();
  });
  await page.getByRole("button",{name:/Emitir factura/}).click();
  await page.getByRole("button",{name:"Comprobar y reintentar"}).waitFor();
  assert.equal(firstResponse?.ok,true,JSON.stringify(firstResponse));
  await page.getByRole("button",{name:"Comprobar y reintentar"}).click();
  await page.locator(".result-head h1").waitFor();
  const invoiceNumber = await page.locator(".result-head h1").innerText();
  assert.equal(invoiceNumber,"F-2026-0001");
  await savePdf(page,"factura-transferencia-pagada.pdf");
  await page.screenshot({path:path.join(output,"05-confirmacion.png"),fullPage:true});
  const invoices = await okay(await admin.from("central_invoice_documents").select("current_payload").eq("user_id",userId)); assert.equal(invoices.length,1);
  assert.equal(invoices[0].current_payload.document.status,"pagado");
  for (let attempt=0; attempt<20; attempt++) {
    const jobs = await okay(await admin.from("quick_customer_jobs").select("status").eq("user_id",userId));
    if (jobs.every(job => job.status === "done")) break;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  const customers = await okay(await admin.from("central_business_entities").select("current_payload").eq("user_id",userId).eq("entity_type","customer")); assert.equal(customers.length,1);
  await page.getByRole("button",{name:"Volver al inicio",exact:true}).first().click();
  await page.getByRole("button",{name:/Crear presupuesto/}).click();
  await page.locator("#customer-search").fill("Cliente móvil");
  await page.locator('[data-action="suggestion"]').first().click();
  await page.getByRole("button",{name:"Siguiente →"}).click();
  await page.locator('[data-item="description"]').fill("Sustitución de cinta y puesta a punto");
  await page.locator('[data-item="unitPrice"]').fill("80");
  await page.getByRole("button",{name:"Siguiente →"}).click();
  assert.equal(await page.locator("#paid").count(),0);
  await page.locator('input[value="bizum"]').check();
  await page.getByRole("button",{name:/Crear presupuesto ↗/}).click();
  await page.locator(".result-head h1").waitFor();
  assert.equal(await page.locator(".result-head h1").innerText(),"P-2026-0001");
  await savePdf(page,"presupuesto-bizum.pdf");
  assert.equal(await page.evaluate(() => localStorage.getItem("main-app-company-sentinel")),"excluded-company-synthetic");
  assert.deepEqual(errors,[]);
  await writeFile(path.join(output,"resultado.json"),JSON.stringify({ok:true,syntheticOnly:true,invoiceNumber,quoteNumber:"P-2026-0001",lostResponseRecovered:true,invoiceCount:invoices.length,customers:customers.length,mainAppNotLoaded:true,consoleErrors:errors},null,2));
  console.log("Quick mobile UI passed: persisted session/draft, four methods, paid transfer PDF, lost-response recovery without duplicate, quote and durable customer admission.");
} finally {
  if (browser) await browser.close();
  if (userId) {
    sql(`begin;set local session_replication_role=replica;
      delete from public.quick_customer_jobs where user_id='${userId}';delete from public.quick_document_operations where user_id='${userId}';
      delete from public.quick_cancelled_operations where actor_user_id='${userId}';delete from public.quick_invoicing_access where actor_user_id='${userId}';
      delete from public.central_business_outbox where user_id='${userId}';delete from public.central_business_commands where user_id='${userId}';delete from public.central_business_entities where user_id='${userId}';delete from public.central_business_document_series where user_id='${userId}';
      delete from public.central_invoice_event_wakeups where user_id='${userId}';delete from public.central_invoice_outbox where user_id='${userId}';delete from public.central_invoice_commands where user_id='${userId}';delete from public.central_invoice_document_versions where user_id='${userId}';delete from public.central_invoice_identities where user_id='${userId}';delete from public.central_invoice_documents where user_id='${userId}';delete from public.central_invoice_series_reconciliations where user_id='${userId}';delete from public.central_invoice_series_state where user_id='${userId}';
      delete from public.app_company_access_audit where actor_user_id='${userId}' or company_id='${userId}';delete from public.app_company_members where user_id='${userId}';delete from public.app_companies where id='${userId}';commit;`);
    await client.auth.signOut(); await admin.auth.admin.deleteUser(userId);
  }
}
