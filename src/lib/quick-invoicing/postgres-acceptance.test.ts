import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildCentralInvoiceAuthorityDocumentFormIssueRequest } from "@/lib/central-invoice-authority/document-form-canary";
import { buildCentralInvoiceAuthorityIssueCommand } from "@/lib/central-invoice-authority/issue-command";
import { buildCentralInvoiceAuthorityIssueRpcArgs } from "@/lib/central-invoice-authority/issue-rpc-adapter";
import { buildCentralBusinessNumberedDocumentCreateCommand } from "@/lib/central-business-authority/numbered-document-command";
import { buildCentralBusinessNumberedDocumentCreateRpcArgs } from "@/lib/central-business-authority/numbered-document-rpc-adapter";
import { migrateCustomer, findCustomerByIdOrMergedId } from "@/lib/customers";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import { quickPdfContext } from "./context";
import { parseQuickIntent, quickPaymentTerms } from "./model";
import { intentHash } from "./server";
import { syntheticIntent, syntheticProfile } from "./test-fixtures";
import { quickRenderProfile, quickIssuedDocument } from "./render";
import { quickClientSnapshot } from "./client-snapshot";
import type { Customer } from "@/lib/types";

const acceptance = process.env.CENTRAL_GLOBAL_SYNTHETIC_LOCAL_ENABLED === "true" ? describe : describe.skip;
const sha = (value: string) => createHash("sha256").update(value).digest("hex");
let admin: SupabaseClient, anon: SupabaseClient;
let dbUrl = "", appUrl = "";
const users: Array<{id:string;email:string;token:string;client:SupabaseClient}> = [];
const now = "2026-10-21T10:00:00.000Z";
function local(value: string) {
  if (!["localhost","127.0.0.1","[::1]"].includes(new URL(value).hostname)) throw new Error("Quick acceptance is localhost-only.");
  return value;
}
function sql(query: string) {
  return execFileSync("psql",[dbUrl,"-X","-v","ON_ERROR_STOP=1","-At","-c",query],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
}
async function fixture(kind: "factura" | "presupuesto" = "factura", nif = "12345678Z", name = "Cliente sintético") {
  const intent = parseQuickIntent({...syntheticIntent(),operationId:randomUUID(),kind,client:{...syntheticIntent().client,nif,name},paymentMethod:"transferencia",paid:kind === "factura"});
  const id = `quick-${intent.operationId}`;
  const payload = {id,type:kind,date:intent.date,client:quickClientSnapshot(intent.client),customerId:id,items:intent.items,notes:intent.notes,
    status:kind === "factura" ? "pagado" as const : "enviado" as const,
    salesTerms:quickPaymentTerms(intent.paymentMethod,intent.paid,syntheticProfile.iban),
    issuer:captureIssuerSnapshot(syntheticProfile,now),quickPdfContext:quickPdfContext(syntheticProfile),createdAt:now,updatedAt:now,issuedAt:now};
  const auth = {userId:users[0].id,deviceId:"synthetic-quick-device",sessionId:randomUUID(),userIdSource:"test" as const};
  let args;
  if (kind === "factura") {
    const form = buildCentralInvoiceAuthorityDocumentFormIssueRequest({localDocumentId:id,payload,profile:syntheticProfile,issuedAt:now});
    args = buildCentralInvoiceAuthorityIssueRpcArgs({command:buildCentralInvoiceAuthorityIssueCommand({...form,auth}),documentPayload:form.documentPayload,emittedSnapshot:form.emittedSnapshot,emittedHash:form.emittedHash});
  } else {
    args = buildCentralBusinessNumberedDocumentCreateRpcArgs(buildCentralBusinessNumberedDocumentCreateCommand({action:"create",auth,idempotencyKey:`QUICK:${intent.operationId}`,entityType:"quote",entityId:id,numberTemplate:"P-{year}-{num}",padding:4,fiscalYear:2026,payloadWithoutNumber:JSON.parse(JSON.stringify(payload))}));
  }
  return { intent, args: {p_actor_id:users[0].id,p_operation_id:intent.operationId,p_intent_hash:intentHash(intent),p_profile_version:1,p_kind:kind,p_args:args,
    p_render_profile:quickRenderProfile(syntheticProfile),p_customer:migrateCustomer({...intent.client,id,firstName:"",lastName:"",createdAt:now,updatedAt:now})} };
}

acceptance("Factu Rápido: real isolated PostgreSQL authority and durable customer jobs",{timeout:60_000},() => {
  beforeAll(async () => {
    const url = local(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    dbUrl = local(process.env.PHASE1_ACCEPTANCE_DATABASE_URL ?? process.env.CENTRAL_GLOBAL_SYNTHETIC_DATABASE_URL ?? "");
    appUrl = local(process.env.PHASE1_ACCEPTANCE_APP_URL ?? "http://127.0.0.1:3000");
    admin = createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    anon = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
    for (let index=0; index<3; index++) {
      const email = `quick-synthetic-${randomUUID()}@example.test`, password = `Synthetic-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({email,password,email_confirm:true});
      if (created.error || !created.data.user) throw created.error;
      const client = createClient(url,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
      const login = await client.auth.signInWithPassword({email,password});
      if (login.error || !login.data.session) throw login.error;
      users.push({id:created.data.user.id,email,token:login.data.session.access_token,client});
    }
    expect((await admin.rpc("list_app_companies_v1",{p_user_id:users[0].id,p_verified_email:users[0].email})).error).toBeNull();
    expect((await admin.from("app_companies").insert({id:users[1].id,data_owner_id:users[1].id,billing_owner_user_id:users[0].id,created_by:users[0].id,name:"Empresa SL sintética excluida",status:"active"})).error).toBeNull();
    expect((await admin.from("app_company_members").insert([
      {company_id:users[1].id,user_id:users[0].id,email:users[0].email,role:"owner",status:"active",added_by:users[0].id},
      {company_id:users[0].id,user_id:users[2].id,email:users[2].email,role:"admin",status:"active",added_by:users[0].id},
    ])).error).toBeNull();
    expect((await admin.from("user_subscriptions").upsert({user_id:users[0].id,plan:"pro",status:"active",current_period_end:"2099-12-31T23:59:59Z"})).error).toBeNull();
    for (const user of users.slice(0,2)) {
      expect((await admin.from("central_business_entities").insert({user_id:user.id,entity_type:"profile",entity_id:"profile",current_version:1,deleted:false,
        current_payload:{...syntheticProfile,taxModelDiagnostic:{secret:"not-in-quick-response"}},content_hash:"synthetic-only",actor_device_id:"fixture",actor_session_hash:"fixture"})).error).toBeNull();
    }
    expect((await admin.from("quick_invoicing_access").insert({actor_user_id:users[0].id,company_id:users[0].id,enabled:true})).error).toBeNull();
    const key = sha(users[0].id);
    expect((await admin.rpc("reconcile_central_invoice_series_v1",{p_user_id:users[0].id,p_device_id:"fixture",p_session_hash:"fixture",
      p_idempotency_key_hash:key,p_request_hash:key,p_environment:"test",p_issuer_nif:syntheticProfile.nif,p_series_code:"F-2026",p_fiscal_year:2026,
      p_observed_max_sequence:0,p_source_document_count:0,p_source_digest:`sha256:${key}`})).error).toBeNull();
    expect((await admin.rpc("reconcile_central_business_document_series_v1",{p_user_id:users[0].id,p_device_id:"fixture",p_session_hash:"fixture",
      p_idempotency_key_hash:key,p_request_hash:key,p_entity_type:"quote",p_number_template:"P-{year}-{num}",p_fiscal_year:2026,
      p_observed_max_sequence:0,p_source_document_count:0,p_source_digest:`sha256:${key}`})).error).toBeNull();
    // Deterministic worker assertions; only our local feature's scheduler is
    // paused, then restored. No production URL is accepted by this suite.
    sql("select cron.alter_job(jobid,active:=false) from cron.job where jobname='factu-quick-customer-admission-v1'");
  },120_000);
  afterAll(async () => {
    if (!admin || !dbUrl || !users.length) return;
    const ids = users.map(user => `'${user.id}'::uuid`).join(",");
    sql(`begin; set local session_replication_role=replica;
      delete from public.quick_customer_jobs where user_id in (${ids});
      delete from public.quick_document_operations where user_id in (${ids});
      delete from public.quick_cancelled_operations where actor_user_id in (${ids});
      delete from public.quick_invoicing_access where actor_user_id in (${ids});
      delete from public.central_business_outbox where user_id in (${ids});
      delete from public.central_business_commands where user_id in (${ids});
      delete from public.central_business_entities where user_id in (${ids});
      delete from public.central_business_document_series where user_id in (${ids});
      delete from public.central_invoice_event_wakeups where user_id in (${ids});
      delete from public.central_invoice_outbox where user_id in (${ids});
      delete from public.central_invoice_commands where user_id in (${ids});
      delete from public.central_invoice_document_versions where user_id in (${ids});
      delete from public.central_invoice_identities where user_id in (${ids});
      delete from public.central_invoice_documents where user_id in (${ids});
      delete from public.central_invoice_series_reconciliations where user_id in (${ids});
      delete from public.central_invoice_series_state where user_id in (${ids});
      delete from public.app_company_access_audit where company_id in (${ids}) or actor_user_id in (${ids});
      delete from public.app_company_members where company_id in (${ids}) or user_id in (${ids});
      delete from public.app_companies where id in (${ids});
      select cron.alter_job(jobid,active:=true) from cron.job where jobname='factu-quick-customer-admission-v1'; commit;`);
    for (const user of users) { await user.client.auth.signOut(); await admin.auth.admin.deleteUser(user.id); }
  });
  it("enforces pilot enrollment in SQL and HTTP, even for another company owned by the same account",async () => {
    const scoped = await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:users[0].id});
    expect(scoped.error).toBeNull(); expect(scoped.data.company_id).toBe(users[0].id);
    expect(scoped.data.profile).not.toHaveProperty("taxModelDiagnostic");
    for (const client of [anon,users[0].client,users[2].client]) {
      expect((await client.rpc("quick_invoicing_scope_v1",{p_actor_id:users[0].id})).error).not.toBeNull();
      expect((await client.from("quick_invoicing_access").select("*")).error).not.toBeNull();
    }
    expect((await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:users[2].id})).error?.code).toBe("42501");
    const headers = {Authorization:`Bearer ${users[0].token}`,"X-Factu-Device-Token":"synthetic-quick-012345678901234567890"};
    const allowed = await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers});
    expect({status:allowed.status,body:await allowed.json()}).toMatchObject({status:200,body:{companyId:users[0].id}});
    expect((await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers:{...headers,"X-Factu-Company-Id":users[1].id}})).status).toBe(403);
    expect((await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers:{...headers,Authorization:`Bearer ${users[2].token}`}})).status).toBe(403);
    expect((await fetch(`${appUrl}/api/factu-rapido/bootstrap`)).status).toBe(401);
  });
  it("pages a minimal customer directory, searches the whole company and denies another company", async () => {
    const prefix = `quick-page-${randomUUID()}`;
    const rows = Array.from({length:26},(_,index) => ({user_id:users[0].id,entity_type:"customer",entity_id:`${prefix}-${index}`,current_version:1,deleted:false,
      current_payload:{name:`Contacto página ${String(index).padStart(2,"0")}`,nif:`PAGE${index}`,address:"Dos 2",city:"Barcelona",postalCode:"08002",privateNote:"not-for-quick-directory"},content_hash:"synthetic",actor_device_id:"fixture",actor_session_hash:"fixture"}));
    const foreign = {...rows[0],user_id:users[1].id,entity_id:`${prefix}-foreign`,current_payload:{...rows[0].current_payload,name:"Otro tenant no visible"}};
    const headers = {Authorization:`Bearer ${users[0].token}`,"X-Factu-Device-Token":"synthetic-quick-012345678901234567890"};
    try {
      expect((await admin.from("central_business_entities").insert([...rows,foreign])).error).toBeNull();
      const first = await fetch(`${appUrl}/api/factu-rapido/customers`,{headers});
      const body = await first.json();
      expect(first.status).toBe(200); expect(body.results).toHaveLength(25); expect(body.hasMore).toBe(true);
      expect(body.results[0]).toMatchObject({id:rows[0].entity_id,name:rows[0].current_payload.name});
      expect(JSON.stringify(body)).not.toMatch(/not-for-quick-directory|Otro tenant/);
      expect(body.results[0]).not.toHaveProperty("current_payload");
      const next = await fetch(`${appUrl}/api/factu-rapido/customers?page=1`,{headers});
      expect(await next.json()).toMatchObject({hasMore:false,results:[{id:rows[25].entity_id}]});
      const searched = await fetch(`${appUrl}/api/factu-rapido/customers?q=${encodeURIComponent("Contacto pagina 25")}`,{headers});
      expect(await searched.json()).toMatchObject({hasMore:false,results:[{id:rows[25].entity_id}]});
      expect((await fetch(`${appUrl}/api/factu-rapido/customers?page=-1`,{headers})).status).toBe(400);
      expect((await fetch(`${appUrl}/api/factu-rapido/customers`,{headers:{...headers,"X-Factu-Company-Id":users[1].id}})).status).toBe(403);
      expect((await fetch(`${appUrl}/api/factu-rapido/customers`)).status).toBe(401);
    } finally {
      await admin.from("central_business_entities").delete().in("user_id",users.slice(0,2).map(user => user.id)).in("entity_id",[...rows.map(row => row.entity_id),foreign.entity_id]);
    }
  });
  it("commits invoice + number + frozen client + pending admission atomically; replay does not reserve a second number",async () => {
    const {intent,args} = await fixture();
    const [first,second] = await Promise.all([admin.rpc("commit_quick_document_v1",args),admin.rpc("commit_quick_document_v1",args)]);
    expect(first.error).toBeNull(); expect(second.error).toBeNull();
    expect(first.data.document.number).toBe(second.data.document.number);
    expect(first.data.document.client).toMatchObject(quickClientSnapshot(intent.client));
    expect(first.data.customer_pending).toBe(true);
    expect(first.data.document.salesTerms).toContain(`Pagado por transferencia · IBAN: ${syntheticProfile.iban}`);
    const materialized = quickIssuedDocument(first.data.document,first.data.render_profile);
    expect(materialized.paymentStatus).toBe("paid");
    expect((await admin.from("central_business_entities").select("entity_id").eq("user_id",users[0].id).eq("entity_type","customer")).data).toHaveLength(0);
    const wrong = await admin.rpc("commit_quick_document_v1",{...args,p_intent_hash:sha("changed")});
    expect(wrong.error?.code).toBe("P4502");
    // Simulates losing the HTTP response and reopening the phone: no profile
    // regeneration or second command is needed to recover the saved document.
    const recovered = await admin.rpc("read_quick_document_v1",{p_actor_id:users[0].id,p_operation_id:intent.operationId,p_intent_hash:args.p_intent_hash});
    expect(recovered.data.document.number).toBe(first.data.document.number);
    expect((await admin.from("quick_document_operations").select("operation_id").eq("operation_id",intent.operationId)).data).toHaveLength(1);
  });
  it("admits new customers after commit, publishes normal realtime events and deduplicates concurrent NIFs with operational aliases",async () => {
    const next = await fixture("presupuesto");
    expect((await admin.rpc("commit_quick_document_v1",next.args)).error).toBeNull();
    const documentsBefore = await admin.from("central_invoice_documents").select("current_payload").eq("user_id",users[0].id);
    const drained = await admin.rpc("process_quick_customer_jobs_v1",{p_limit:10});
    expect(drained.error).toBeNull(); expect(drained.data).toBe(2);
    const customers = await admin.from("central_business_entities").select("current_payload").eq("user_id",users[0].id).eq("entity_type","customer");
    expect(customers.data).toHaveLength(1);
    const customer = customers.data![0].current_payload as Customer;
    expect(findCustomerByIdOrMergedId([customer],`quick-${next.intent.operationId}`)?.id).toBe(customer.id);
    expect((await admin.from("central_invoice_documents").select("current_payload").eq("user_id",users[0].id)).data).toEqual(documentsBefore.data);
    const events = await admin.from("central_business_outbox").select("entity_type,operation_kind").eq("user_id",users[0].id).eq("entity_type","customer");
    expect(events.data?.length).toBeGreaterThan(0);
    expect((await admin.rpc("process_quick_customer_jobs_v1",{p_limit:10})).data).toBe(0);
    expect(sql("select count(*) from cron.job where jobname='factu-quick-customer-admission-v1' and schedule='* * * * *'")).toBe("1");
  });
  it("rolls back a rejected command without an operation, orphan job or consumed number, and refuses a forged target",async () => {
    const {args,intent} = await fixture("factura","87654321X");
    const rejected = await admin.rpc("commit_quick_document_v1",{...args,p_profile_version:999});
    expect(rejected.error?.code).toBe("P4505");
    expect((await admin.from("quick_document_operations").select("operation_id").eq("operation_id",intent.operationId)).data).toHaveLength(0);
    expect((await admin.from("quick_customer_jobs").select("operation_id").eq("operation_id",intent.operationId)).data).toHaveLength(0);
    const forged = await admin.rpc("commit_quick_document_v1",{...args,p_args:{...args.p_args,p_user_id:users[1].id}});
    expect(forged.error?.code).toBe("P4504");
    expect((await admin.from("central_invoice_documents").select("id").eq("user_id",users[1].id)).data).toHaveLength(0);
    const invalid = await admin.rpc("commit_quick_document_v1",{...args,p_args:{...args.p_args,p_series_code:"UNRECONCILED"}});
    expect(invalid.error).not.toBeNull();
    expect((await admin.rpc("commit_quick_document_v1",args)).error).toBeNull();
  });
  it("projects only sale fields and tolerates spaced/hyphenated references without leaking the other company",async () => {
    for (const user of users.slice(0,2)) {
      expect((await admin.from("central_business_entities").insert({user_id:user.id,entity_type:"product",entity_id:randomUUID(),current_version:1,deleted:false,
        current_payload:{id:randomUUID(),sku:"AL-PRA1-R",name:user.id === users[0].id ? "Producto piloto" : "Producto SL no permitido",sales:{unitPrice:42,ivaPercent:21,unit:"ud"},purchase:{netUnitCost:1},imageDataUrl:"private-image",hidden:false},
        content_hash:"synthetic-only",actor_device_id:"fixture",actor_session_hash:"fixture"})).error).toBeNull();
    }
    const result = await admin.rpc("search_quick_catalog_v1",{p_actor_id:users[0].id,p_kind:"product",p_query:"AL PRA1 R"});
    expect(result.error).toBeNull(); expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({sku:"AL-PRA1-R",unitPrice:42});
    expect(result.data[0]).not.toHaveProperty("purchase"); expect(result.data[0]).not.toHaveProperty("imageDataUrl");
  });
  it("does not allow a delayed request to commit after returning permission to edit",async () => {
    const {args} = await fixture();
    const cancelArgs = {p_actor_id:args.p_actor_id,p_operation_id:args.p_operation_id,p_intent_hash:args.p_intent_hash};
    const cancelled = await admin.rpc("cancel_quick_operation_v1",cancelArgs);
    expect(cancelled.error).toBeNull(); expect(cancelled.data.cancelled).toBe(true);
    expect((await admin.rpc("commit_quick_document_v1",args)).error?.code).toBe("P4508");
    expect((await admin.rpc("cancel_quick_operation_v1",cancelArgs)).data.cancelled).toBe(true);
    const race = await fixture();
    const [commit,cancel] = await Promise.all([
      admin.rpc("commit_quick_document_v1",race.args),
      admin.rpc("cancel_quick_operation_v1",{p_actor_id:race.args.p_actor_id,p_operation_id:race.args.p_operation_id,p_intent_hash:race.args.p_intent_hash}),
    ]);
    expect(cancel.error).toBeNull();
    if (cancel.data.cancelled) expect(commit.error?.code).toBe("P4508");
    else { expect(commit.error).toBeNull(); expect(cancel.data.receipt.document.number).toBe(commit.data.document.number); }
  });
  it("does not resurrect a deleted invoice when recovering the old operation",async () => {
    const {args} = await fixture();
    const issued = await admin.rpc("commit_quick_document_v1",args);
    expect(issued.error).toBeNull();
    const row = issued.data;
    const deleted = await admin.rpc("manage_central_invoice_v1",{p_user_id:users[0].id,p_device_id:"fixture",p_session_hash:"fixture",
      p_idempotency_key_hash:sha(randomUUID()),p_request_hash:sha(randomUUID()),p_document_id:row.invoice_id,p_identity_id:row.rpc_result.identity_id,
      p_expected_version:row.document_version,p_action:"delete",p_document_payload:null,p_emitted_snapshot:null});
    expect(deleted.error).toBeNull();
    expect((await admin.rpc("read_quick_document_v1",{p_actor_id:users[0].id,p_operation_id:args.p_operation_id})).error?.code).toBe("P4503");
    expect((await admin.rpc("commit_quick_document_v1",args)).error?.code).toBe("P4503");
  });
  it("never applies compact product-search normalization to customer identities",async()=>{
    const names = ["Juan Carlos","Juancarlos","François","Franois"];
    for(const name of names) {
      const {args} = await fixture("presupuesto","",name);
      expect((await admin.rpc("commit_quick_document_v1",args)).error).toBeNull();
    }
    expect((await admin.rpc("process_quick_customer_jobs_v1",{p_limit:25})).error).toBeNull();
    const rows = await admin.from("central_business_entities").select("current_payload").eq("user_id",users[0].id).eq("entity_type","customer");
    expect(rows.data?.filter(row=>names.includes(row.current_payload.name))).toHaveLength(4);
  });
});
