// Development acceptance: only synthetic users on an existing localhost DB.
// Never starts, stops, migrates, or resets another task's Supabase instance.
import assert from "node:assert/strict";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {randomUUID} from "node:crypto";
import path from "node:path";
import {createClient} from "@supabase/supabase-js";
import {chromium} from "playwright";
assert(process.argv.includes("--local"),"Synthetic localhost test only");
const env=Object.fromEntries((await readFile(".env.local","utf8")).trim().split("\n").filter(s=>s&&!s.startsWith("#")).map(s=>{const i=s.indexOf("=");return[s.slice(0,i),s.slice(i+1)]}));
assert.equal(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname,"127.0.0.1");
const appUrl="http://127.0.0.1:3048",output=path.resolve("output/catalog-ui");await mkdir(output,{recursive:true});
const admin=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),client=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
let userId,browser;const checks=[],errors=[];const ok=name=>{checks.push(name);console.log("PASS",name)};
const email=`catalog-${randomUUID()}@example.test`,password=`Synthetic-${randomUUID()}!`;
async function must(result){assert.equal(result.error,null,result.error?.message);return result.data}
try{
 const created=await must(await admin.auth.admin.createUser({email,password,email_confirm:true}));userId=created.user.id;
 await must(await admin.rpc("list_app_companies_v1",{p_user_id:userId,p_verified_email:email}));
 await must(await admin.from("app_companies").update({name:"Empresa de prueba · Catálogo"}).eq("id",userId));
 await must(await admin.from("user_subscriptions").upsert({user_id:userId,plan:"pro",status:"active",current_period_end:"2099-12-31T23:59:59Z"}));
 const make=(i)=>({id:`catalog-synthetic-${i}`,key:`synthetic motor ${i}`,name:i===0?"Motor tubular de prueba":"Producto de prueba "+String(i).padStart(2,"0"),sku:`MO-${i} R`,family:i<5?"Motores":"Accesorios",subfamily:i<5?"Tubulares":"Montaje",source:"manual",createdAt:"2026-01-01T00:00:00Z",updatedAt:"2026-01-01T00:00:00Z",sales:{enabled:true,unit:"ud",unitPrice:125+i,ivaPercent:21},purchase:{enabled:true,listPrice:100,discountPercent:20,netUnitCost:80,purchaseToSaleFactor:2,supplierReference:"SUP-50"},cost:80,pvp:100,attributes:[{key:"color",label:"Color",value:"Blanco"}],notes:"Producto sintético"});
 await must(await admin.from("central_business_entities").insert(Array.from({length:35},(_,i)=>({user_id:userId,entity_type:"product",entity_id:make(i).id,current_version:1,deleted:false,current_payload:make(i),content_hash:"synthetic",actor_device_id:"fixture",actor_session_hash:"fixture"}))));
 const login=await must(await client.auth.signInWithPassword({email,password}));
 browser=await chromium.launch({channel:"chrome",headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(({session})=>{if(location.origin!=="http://127.0.0.1:3048")return;localStorage.setItem("sb-127-auth-token",JSON.stringify(session))},{session:login.session});
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on("pageerror",e=>errors.push(e.message));const requests=[];page.on("request",r=>requests.push(new URL(r.url()).pathname));
 await page.goto(appUrl+"/catalogo/index.html");await page.locator(".product").first().waitFor();
 assert.equal(await page.locator(".product").count(),30);assert.equal(await page.locator("#results").innerText().then(s=>s.includes("35 productos")),true);
 assert(!requests.some(p=>p.startsWith("/_next/")||p.includes("sync")||p.includes("invoice")));ok("Independent shell, 30-row page, no main Next/AppData/document traffic");
 assert(await page.locator("button.primary,button.product,button.tabs").count()>0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(output,"01-catalogo-movil.png"),fullPage:false});
 await page.getByRole("button",{name:"Cargar más productos"}).click();await page.waitForFunction(()=>document.querySelectorAll(".product").length===35);ok("Load more covers the complete catalog without duplicates");
 await page.locator("#search").fill("MO-34");await page.waitForFunction(()=>document.querySelectorAll(".product").length===1);assert((await page.locator(".product").innerText()).includes("MO-34 R"));await page.locator("#search").fill("motor");await page.waitForFunction(()=>document.querySelectorAll(".product").length===5);await page.screenshot({path:path.join(output,"02-busqueda-movil.png"),fullPage:true});
 await page.locator(".product").filter({hasText:"Motor tubular de prueba"}).click();await page.locator("#product-form").waitFor();
 assert.equal(await page.locator('[name="salePrice"]').inputValue(),"125");assert.equal(await page.locator('[name="listPrice"]').inputValue(),"100");ok("Selling PVP, supplier list price and net cost are distinct");
 await page.locator('[name="salePrice"]').fill("149,95");await page.locator('[name="cost"]').fill("72,50");await page.locator('[name="family"]').fill("Motores especiales");await page.getByRole("button",{name:"+ Añadir",exact:true}).click();await page.locator('[data-attribute="label"]').last().fill("Potencia");await page.locator('[data-attribute="value"]').last().fill("50");await page.locator('[data-attribute="unit"]').last().fill("Nm");
 await page.screenshot({path:path.join(output,"03-edicion-movil.png"),fullPage:true});await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.getByText("Cambios guardados en Factu.",{exact:true}).waitFor();
 let saved=await must(await admin.from("central_business_entities").select("current_payload,current_version").eq("user_id",userId).eq("entity_type","product").eq("entity_id","catalog-synthetic-0").single());
 assert.equal(saved.current_version,2);assert.equal(saved.current_payload.sales.unitPrice,149.95);assert.equal(saved.current_payload.cost,72.5);assert.equal(saved.current_payload.pvp,100);assert.equal(saved.current_payload.family,"Motores especiales");assert.equal(saved.current_payload.purchase.purchaseToSaleFactor,2);assert.equal(saved.current_payload.attributes[1].unit,"Nm");ok("Browser → authenticated API → versioned transaction → real database confirmation");
 await page.getByRole("button",{name:"Familias",exact:true}).click();await page.getByRole("button",{name:/Motores especiales/}).waitFor();await page.screenshot({path:path.join(output,"04-familias-movil.png"),fullPage:true});await page.getByRole("button",{name:/Motores especiales/}).click();await page.locator(".product").waitFor();await page.locator(".product").click();await page.locator("#product-form").waitFor();
 // Another editor changes the same product after this form opened.
 await must(await admin.from("central_business_entities").update({current_version:3,current_payload:{...saved.current_payload,notes:"Another device"}}).eq("user_id",userId).eq("entity_type","product").eq("entity_id","catalog-synthetic-0"));
 await page.locator('[name="salePrice"]').fill("180");await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.getByRole("alert").filter({hasText:/otro equipo/}).waitFor();
 saved=await must(await admin.from("central_business_entities").select("current_payload,current_version").eq("user_id",userId).eq("entity_type","product").eq("entity_id","catalog-synthetic-0").single());assert.equal(saved.current_payload.sales.unitPrice,149.95);assert.equal(saved.current_version,3);ok("A stale edit is rejected without overwriting another device");
 page.on("dialog",d=>d.accept());await page.getByRole("button",{name:"Volver a cargar la ficha del servidor"}).click();await page.waitForFunction(()=>document.querySelector('[name="notes"]')?.value==="Another device");
 await page.locator('[name="salePrice"]').fill("160");let lost=true,denied=false;const replayBodies=[];await page.route("**/api/central-business-authority/mutate",async route=>{replayBodies.push(route.request().postDataJSON());if(!lost&&!denied){denied=true;await route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({ok:false,error:{code:"DEVICE_SESSION_CONFLICT",message:"Temporary session conflict"}})});return}const response=await route.fetch();if(lost){lost=false;await route.abort("failed")}else await route.fulfill({response})});
 await page.getByRole("button",{name:"Guardar cambios",exact:true}).click();await page.getByRole("button",{name:"Comprobar guardado",exact:true}).waitFor();await page.reload();await page.getByRole("button",{name:"Comprobar guardado",exact:true}).click();await page.getByRole("alert").filter({hasText:/Conservamos la misma operación/}).waitFor();await page.getByRole("button",{name:"Comprobar guardado",exact:true}).click();await page.getByText("Cambios guardados en Factu.",{exact:true}).waitFor();assert.equal(replayBodies.length,3);assert.deepEqual(replayBodies[0],replayBodies[1]);assert.deepEqual(replayBodies[1],replayBodies[2]);
 saved=await must(await admin.from("central_business_entities").select("current_payload,current_version").eq("user_id",userId).eq("entity_type","product").eq("entity_id","catalog-synthetic-0").single());assert.equal(saved.current_version,4);assert.equal(saved.current_payload.sales.unitPrice,160);ok("Lost response + reload + temporary permission failure preserve and replay the exact command once");
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(output,"05-catalogo-escritorio.png"),fullPage:true});
 const anonymous=await fetch(appUrl+"/api/catalogo");assert.equal(anonymous.status,401);assert(anonymous.headers.get("cache-control").includes("no-store"));
 const foreign=await fetch(appUrl+"/api/catalogo",{headers:{Authorization:`Bearer ${login.session.access_token}`,"X-Factu-Company-Id":"00000000-0000-4000-8000-000000000999","X-Factu-Device-Token":randomUUID()}});assert.notEqual(foreign.status,200);ok("Anonymous and foreign-company reads rejected");assert.deepEqual(errors,[]);
 await writeFile(path.join(output,"resultados.json"),JSON.stringify({success:true,checks,errors},null,2));
}finally{if(browser)await browser.close();if(userId)await admin.auth.admin.deleteUser(userId)}
