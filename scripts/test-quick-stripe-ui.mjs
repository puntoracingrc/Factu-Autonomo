import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

assert(process.argv.includes("--local"),"This synthetic UI test requires --local and never contacts Stripe or production.");
const root=process.cwd(),temp=await mkdtemp(path.join(os.tmpdir(),"fast-stripe-ui-"));
const output=path.resolve(process.env.FACTU_QUICK_TEST_OUTPUT || "output/quick-stripe-ui");
const fixtureFile=path.join(temp,"fixture.mjs");
await build({stdin:{contents:`import {syntheticIntent,syntheticProfile} from './src/lib/quick-invoicing/test-fixtures';
import {parseQuickIntent} from './src/lib/quick-invoicing/model';
import {buildQuickDocumentPayload} from './src/lib/quick-invoicing/payload';
import {quickIssuedDocument} from './src/lib/quick-invoicing/render';
const intent=parseQuickIntent({...syntheticIntent(),paymentMethod:'stripe'});
export default {operationId:intent.operationId,profile:syntheticProfile,customerPending:false,
 document:quickIssuedDocument({...buildQuickDocumentPayload(intent,syntheticProfile,'2026-10-22T09:00:00Z'),number:'F-2026-0001'},syntheticProfile)};`,resolveDir:root,loader:"ts"},bundle:true,platform:"node",format:"esm",outfile:fixtureFile,tsconfig:path.join(root,"tsconfig.json")});
const receipt=(await import(pathToFileURL(fixtureFile).href)).default;
let server,browser;
try {
  server=createServer(async(req,res)=>{
    const pathname=new URL(req.url,"http://localhost").pathname;
    if(!pathname.startsWith("/rapido/") || pathname.includes("..")){res.writeHead(404).end();return;}
    try {const bytes=await readFile(path.join(root,"public",pathname));const ext=path.extname(pathname);
      res.writeHead(200,{"Content-Type":({".js":"text/javascript",".css":"text/css",".html":"text/html",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"})[ext]||"application/octet-stream"});res.end(bytes);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({channel:"chrome",headless:true});
  await mkdir(output,{recursive:true});
  for(const testMode of [false,true]) {
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:"block"});
    const now=Math.floor(Date.now()/1000),user={id:receipt.operationId,email:"synthetic@example.test",aud:"authenticated",app_metadata:{},user_metadata:{}};
    const jwt=`${Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url")}.${Buffer.from(JSON.stringify({sub:user.id,exp:now+3600,iat:now,aud:"authenticated"})).toString("base64url")}.synthetic`;
    await context.addInitScript(({session,origin})=>{if(window.top===window.self && location.origin===origin)localStorage.setItem("sb-synthetic-auth-token",JSON.stringify(session));},{origin,session:{access_token:jwt,token_type:"bearer",refresh_token:"synthetic",expires_at:now+3600,expires_in:3600,user}});
    let issueCalls=0,createCalls=0,paid=false,failFirst=true,delayStatus=false,releaseStatus;
    let standalone,standalonePaid=false,loseStandaloneResponse=true;
    const standaloneCreates=[],mainInvoiceId="c1234567-1234-4123-8123-123456789012";
    const page=await context.newPage();const errors=[];page.on("pageerror",error=>errors.push(error.message));
    const openPayment={status:"open",amount:9680,url:"https://checkout.stripe.com/c/pay/synthetic-only",expiresAt:"2026-12-31T10:00:00Z",testMode};
    await context.route("**/*",async route=>{
      const url=new URL(route.request().url());
      if(!["http:","https:"].includes(url.protocol))return route.continue();
      if(url.origin!==origin){if(url.hostname==="synthetic.supabase.co")return route.fulfill({json:{user}});throw new Error(`Unexpected external UI request: ${url.hostname}`);}
      if(!url.pathname.startsWith("/api/factu-rapido/"))return route.continue();
      const action=url.pathname.split("/").at(-1),body=route.request().postDataJSON();
      if(action==="config")return route.fulfill({json:{url:"https://synthetic.supabase.co",anonKey:"synthetic-public-test-key"}});
      if(action==="bootstrap")return route.fulfill({json:{ok:true,actorId:user.id,companyId:user.id,companyName:"Empresa sintética de prueba",defaultVat:21,vatRates:[0,4,10,21],vatExempt:false,iban:"",cardPaymentsEnabled:true,cardPaymentsTestMode:testMode}});
      if(action==="issue"){issueCalls++;assert(["stripe","pendiente"].includes(body.paymentMethod));assert.equal(body.paid,false);return route.fulfill({json:{ok:true,receipt}});}
      if(action==="collection"){
        const view=()=>({...standalone,payment:{...openPayment,...(standalonePaid?{status:"paid",url:undefined,paidAt:"2026-10-22T10:00:00Z"}:{})}});
        if(route.request().method()==="POST"){
          if(body.action==="create"){
            standaloneCreates.push(body.id);
            if(standalone)assert.equal(body.id,standalone.id);
            standalone={id:body.id,amount:body.amount,description:body.description,customerName:body.customerName,createdAt:"2026-10-22T09:00:00Z",invoiceLinked:false};
            if(loseStandaloneResponse){loseStandaloneResponse=false;return route.fulfill({status:503,json:{ok:false,message:"Respuesta de cobro perdida; recupera la misma operación."}});}
            return route.fulfill({json:{ok:true,collection:standalone}});
          }
          assert.equal(body.id,standalone.id);
          if(body.action==="prepare")return route.fulfill({json:{ok:true,collection:view()}});
          if(body.action==="link"){
            assert.equal(body.invoiceId,mainInvoiceId);assert.equal(body.version,1);
            standalone.invoiceLinked=true;standalone.invoiceNumber="F-2026-0042";standalone.invoiceUrl="https://facturacion-autonomos.app/facturas/main-synthetic";
            return route.fulfill({json:{ok:true,collection:view()}});
          }
          throw new Error("Unexpected collection command");
        }
        if(url.searchParams.get("action")==="invoices")return route.fulfill({json:{ok:true,invoices:[{id:mainInvoiceId,number:"F-2026-0042",customerName:"Cliente de Factu principal",amount:9680,version:1}]}});
        if(url.searchParams.has("id")){assert.equal(url.searchParams.get("id"),standalone.id);return route.fulfill({json:{ok:true,collection:view()}});}
        return route.fulfill({json:{ok:true,collections:standalone?[view()]:[]}});
      }
      if(action==="payment"){
        if(route.request().method()==="POST") {createCalls++;if(failFirst){failFirst=false;return route.fulfill({status:503,json:{ok:false,message:"No se pudo confirmar el enlace. Reintenta esta misma factura."}});}}
        else { assert.equal(url.searchParams.get("operationId"),receipt.operationId); if(delayStatus)await new Promise(resolve=>{releaseStatus=resolve;}); }
        return route.fulfill({json:{ok:true,payment:{...openPayment,...(paid?{status:"paid",url:undefined,paidAt:"2026-10-22T10:00:00Z"}:{})}}});
      }
      if(action==="document")return route.fulfill({json:{ok:true,receipt:paid&&!testMode?{...receipt,document:{...receipt.document,status:"pagado",paymentStatus:"paid",paidAt:"2026-10-22T10:00:00Z"}}:receipt}});
      throw new Error(`Unexpected quick API action ${action}`);
    });
    await page.goto(`${origin}/rapido/index.html`);
    await page.getByRole("button",{name:/Crear factura/}).click();
    for(const [key,value] of Object.entries(receipt.document.client))if(["name","nif","address","postalCode","city"].includes(key))await page.locator(`[data-client="${key}"]`).fill(value);
    await page.getByRole("button",{name:"Siguiente →"}).click();
    await page.locator('[data-item="description"]').fill("Cambio de cinta de persiana");await page.locator('[data-item="unitPrice"]').fill("80");
    await page.getByRole("button",{name:"Siguiente →"}).click();
    await page.locator('input[value="efectivo"]').check();await page.locator("#paid").check();await page.locator('input[value="stripe"]').check();
    assert.equal(await page.locator("#paid").count(),0);
    await page.screenshot({path:path.join(output,testMode?"form-test.png":"form-live-synthetic.png"),fullPage:true});
    await page.getByRole("button",{name:"Emitir y preparar cobro ↗"}).click();
    await page.getByText("No se pudo confirmar el enlace. Reintenta esta misma factura.").waitFor();
    await page.getByRole("button",{name:"Preparar enlace y QR"}).click();
    await page.getByRole("img",{name:"QR para pagar este cobro"}).waitFor();
    assert.equal(issueCalls,1);assert.equal(createCalls,2);
    assert.equal(await page.locator("#card-payment-url").inputValue(),openPayment.url);
    assert((await page.getByRole("img",{name:"QR para pagar este cobro"}).getAttribute("src")).startsWith("data:image/png;base64,"));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(output,testMode?"qr-test.png":"qr-live-synthetic.png"),fullPage:true});
    await page.getByRole("button",{name:"Comprobar cobro"}).click();await page.getByText("Pendiente de pago",{exact:true}).waitFor();
    paid=true;await page.getByRole("button",{name:"Comprobar cobro"}).click();
    await page.getByText(testMode?"Pago de prueba confirmado. No acredita un cobro real.":"Cobro confirmado por Stripe",{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Preparar enlace y QR"}).count(),0);
    assert.equal(await page.getByRole("img",{name:"QR para pagar este cobro"}).count(),0);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:path.join(output,testMode?"confirmed-test.png":"confirmed-live-synthetic.png"),fullPage:true});
    // A slow response for the previous invoice must not erase a new draft.
    delayStatus=true;await page.getByRole("button",{name:"Comprobar cobro"}).click();
    await page.getByText("Comprobando con Stripe…",{exact:true}).waitFor();
    await page.getByRole("button",{name:"Volver al inicio",exact:true}).first().click();
    await page.getByRole("button",{name:/Crear factura/}).click();
    await page.locator('[data-client="name"]').fill("Borrador que debe conservarse");
    assert(releaseStatus,"The old status request must be in flight");
    releaseStatus();
    await page.waitForResponse(response=>new URL(response.url()).pathname.endsWith("/payment"));
    assert.equal(await page.locator('[data-client="name"]').inputValue(),"Borrador que debe conservarse");
    await page.getByRole("button",{name:"Inicio",exact:true}).click();
    await page.getByRole("button",{name:"Cobrar",exact:true}).click();
    await page.getByRole("button",{name:"Nuevo cobro",exact:true}).click();
    await page.locator("#collection-amount").fill("96.80");
    await page.locator("#collection-description").fill("Cobro antes de factura");
    await page.getByRole("button",{name:"Guardar y preparar enlace o QR"}).click();
    await page.getByText("Respuesta de cobro perdida; recupera la misma operación.",{exact:true}).waitFor();
    await page.reload();
    await page.getByRole("button",{name:"Cobrar",exact:true}).click();
    await page.getByRole("button",{name:"Recuperar cobro pendiente de confirmar"}).click();
    await page.getByRole("button",{name:"Comprobar y recuperar cobro"}).click();
    await page.getByRole("img",{name:"QR para pagar este cobro"}).waitFor();
    assert.equal(standaloneCreates.length,2);assert.equal(new Set(standaloneCreates).size,1);assert.equal(issueCalls,1);
    await page.getByRole("button",{name:"Comprobar cobro"}).click();await page.getByText("Pendiente de pago",{exact:true}).waitFor();
    await page.locator("#quick-collections").screenshot({path:path.join(output,testMode?"standalone-test.png":"standalone-live-synthetic.png")});
    standalonePaid=true;await page.getByRole("button",{name:"Comprobar cobro"}).click();
    await page.getByText(testMode?"Pago de prueba confirmado. No acredita un cobro real.":"Cobro confirmado por Stripe",{exact:true}).waitFor();
    await page.locator("#collection-invoice-search").fill("F-2026-0042");
    await page.getByRole("button",{name:"Buscar factura",exact:true}).click();
    await page.getByRole("button",{name:"Vincular F-2026-0042",exact:true}).click();
    await page.getByRole("link",{name:"Abrir factura en Factu ↗"}).waitFor();
    assert.equal(issueCalls,1);assert.equal(await page.getByRole("button",{name:"Preparar factura en Fast"}).count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole("button",{name:"Inicio",exact:true}).click();
    await page.getByRole("button",{name:"Continuar documento sin terminar"}).click();
    assert.equal(await page.locator('[data-client="name"]').inputValue(),"Borrador que debe conservarse");
    for(const [key,value] of Object.entries(receipt.document.client))if(["name","nif","address","postalCode","city"].includes(key))await page.locator(`[data-client="${key}"]`).fill(value);
    await page.getByRole("button",{name:"Siguiente →"}).click();
    await page.locator('[data-item="description"]').fill("Factura para cobrar después");await page.locator('[data-item="unitPrice"]').fill("80");
    await page.getByRole("button",{name:"Siguiente →"}).click();
    assert.equal(await page.locator('input[value="pendiente"]').isChecked(),true);
    assert.equal(await page.locator("#paid").count(),0);
    await page.getByRole("button",{name:"Emitir factura ↗"}).click();
    await page.getByRole("heading",{name:"F-2026-0001",exact:true}).waitFor();
    assert.equal(issueCalls,2);assert.equal(createCalls,2);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log("Fast card UI passed: deferred invoice without payment, independent collection without invoice, lost-response recovery after reload, QR/link, main Factu invoice linking, test/live distinction, draft preserved, no external requests or mobile overflow.");
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
