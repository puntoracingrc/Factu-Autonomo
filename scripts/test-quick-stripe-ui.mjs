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
      if(action==="issue"){issueCalls++;assert.equal(body.paymentMethod,"stripe");assert.equal(body.paid,false);return route.fulfill({json:{ok:true,receipt}});}
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
    await page.locator("#paid").check();await page.locator('input[value="stripe"]').check();
    assert.equal(await page.locator("#paid").count(),0);
    await page.screenshot({path:path.join(output,testMode?"form-test.png":"form-live-synthetic.png"),fullPage:true});
    await page.getByRole("button",{name:"Emitir y preparar cobro ↗"}).click();
    await page.getByText("No se pudo confirmar el enlace. Reintenta esta misma factura.").waitFor();
    await page.getByRole("button",{name:"Preparar enlace y QR"}).click();
    await page.getByRole("img",{name:"QR para pagar esta factura"}).waitFor();
    assert.equal(issueCalls,1);assert.equal(createCalls,2);
    assert.equal(await page.locator("#card-payment-url").inputValue(),openPayment.url);
    assert((await page.getByRole("img",{name:"QR para pagar esta factura"}).getAttribute("src")).startsWith("data:image/png;base64,"));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(output,testMode?"qr-test.png":"qr-live-synthetic.png"),fullPage:true});
    await page.getByRole("button",{name:"Comprobar cobro"}).click();await page.getByText("Pendiente de pago",{exact:true}).waitFor();
    paid=true;await page.getByRole("button",{name:"Comprobar cobro"}).click();
    await page.getByText(testMode?"Pago de prueba confirmado. La factura sigue pendiente de cobro real.":"Cobro confirmado por Stripe",{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Preparar enlace y QR"}).count(),0);
    assert.equal(await page.getByRole("img",{name:"QR para pagar esta factura"}).count(),0);
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
    await context.close();
  }
  console.log("Fast card UI passed: native form, link/QR, ambiguous retry without reissue, pending/confirmed states, test-mode distinction, no external requests, no console errors or mobile overflow.");
}finally{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
