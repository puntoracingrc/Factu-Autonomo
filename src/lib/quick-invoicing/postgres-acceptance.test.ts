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
import { parseQuickIntent } from "./model";
import { buildQuickDocumentPayload } from "./payload";
import { buildCentralBusinessMutationCommand } from "@/lib/central-business-authority/mutation-command";
import { buildCentralBusinessMutationRpcArgs } from "@/lib/central-business-authority/mutation-rpc-adapter";
import { deleteSharedQuote, editSharedQuote } from "@/lib/central-business-authority/shared-business-transitions";
import { intentHash } from "./server";
import { syntheticIntent, syntheticProfile } from "./test-fixtures";
import { quickRenderProfile, quickIssuedDocument } from "./render";
import { quickClientSnapshot } from "./client-snapshot";
import { getCentralInvoiceAuthorityEventThroughRpc, type CentralInvoiceAuthorityEventsRpcClient } from "@/lib/central-invoice-authority/events-rpc-adapter";
import { applyCentralInvoiceAuthorityPulledEventsToDocuments } from "@/lib/central-invoice-authority/events-local-apply";
import { isCollectedDocument } from "@/lib/income";
import { EMPTY_DATA, type Customer, type Document } from "@/lib/types";

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
async function expectFactuGreenCheck(invoiceId: string, collected: boolean) {
  const eventRow = await admin.from("central_invoice_outbox").select("id").eq("document_id", invoiceId).order("created_at", { ascending: false }).limit(1).single();
  expect(eventRow.error).toBeNull();
  const event = await getCentralInvoiceAuthorityEventThroughRpc(admin as unknown as CentralInvoiceAuthorityEventsRpcClient,
    { userId: users[0].id, deviceId: "synthetic-quick-device", eventId: eventRow.data!.id });
  expect(event).not.toBeNull();
  const applied = applyCentralInvoiceAuthorityPulledEventsToDocuments({ documents: [], profile: syntheticProfile, events: [event!] });
  expect(applied.conflicts).toEqual([]); expect(applied.documents).toHaveLength(1);
  // This exact predicate renders Factu's green CheckCircle2.
  expect(isCollectedDocument(applied.documents[0])).toBe(collected);
}
async function fixture(kind: "factura" | "presupuesto" = "factura", nif = "12345678Z", name = "Cliente sintético", paid = kind === "factura", operationId = randomUUID()) {
  const intent = parseQuickIntent({...syntheticIntent(),operationId,kind,client:{...syntheticIntent().client,nif,name},paymentMethod:"transferencia",paid});
  const id = `quick-${intent.operationId}`;
  const payload = buildQuickDocumentPayload(intent, syntheticProfile, now);
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
      delete from public.quick_stripe_payments where user_id in (${ids});
      delete from public.quick_payment_requests where user_id in (${ids});
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
    expect((await fetch(`${appUrl}/api/factu-rapido/search?kind=customer&q=test`,{headers})).status).toBe(409);
  });
  it("returns only matching contacts, no empty-search preload or foreign company data", async () => {
    const id = `quick-search-${randomUUID()}`;
    const own = {user_id:users[0].id,entity_type:"customer",entity_id:id,current_version:1,deleted:false,
      current_payload:{name:"Martínez Búsqueda",nif:"SEARCH25",address:"Dos 2",city:"Barcelona",postalCode:"08002",privateNote:"not-for-quick-search"},content_hash:"synthetic",actor_device_id:"fixture",actor_session_hash:"fixture"};
    const foreign = {...own,user_id:users[1].id,entity_id:`id-foreign-${id}`};
    const headers = {Authorization:`Bearer ${users[0].token}`,"X-Factu-Device-Token":"synthetic-quick-012345678901234567890","X-Factu-Company-Id":users[0].id};
    try {
      expect((await admin.from("central_business_entities").insert([own,foreign])).error).toBeNull();
      const empty = await fetch(`${appUrl}/api/factu-rapido/search?kind=customer&q=`,{headers});
      expect(await empty.json()).toMatchObject({results:[]});
      const searched = await fetch(`${appUrl}/api/factu-rapido/search?kind=customer&q=${encodeURIComponent("martinez busqueda")}`,{headers});
      const body = await searched.json();
      expect(searched.status).toBe(200); expect(body.results).toHaveLength(1);
      expect(body.results[0]).toMatchObject({id,name:own.current_payload.name});
      expect(JSON.stringify(body)).not.toContain("not-for-quick-search");
      expect(body.results[0]).not.toHaveProperty("current_payload");
      expect((await fetch(`${appUrl}/api/factu-rapido/search?kind=customer&q=martinez`,{headers:{...headers,"X-Factu-Company-Id":users[1].id}})).status).toBe(403);
      expect((await fetch(`${appUrl}/api/factu-rapido/search?kind=customer&q=martinez`)).status).toBe(401);
    } finally {
      await admin.from("central_business_entities").delete().in("user_id",users.slice(0,2).map(user => user.id)).in("entity_id",[id,foreign.entity_id]);
    }
  });
  it("guards AI input preparation with real session, enrollment, device and company before any provider call", async () => {
    const headers = {Authorization:`Bearer ${users[0].token}`,"X-Factu-Device-Token":"synthetic-quick-012345678901234567890","X-Factu-Company-Id":users[0].id,"Content-Type":"application/json"};
    const post = (h: Record<string,string>) => fetch(`${appUrl}/api/factu-rapido/autofill`,{method:"POST",headers:h,body:"{}"});
    const allowed = await post(headers);
    expect(allowed.status).toBe(400); // Auth passed; explicit consent/input missing. No live AI key is used in CI.
    expect(await allowed.json()).toMatchObject({code:"AI_CONSENT_REQUIRED"});
    // Next dev replaces transport Cache-Control with no-store, max-age=0.
    // The route's private header is also checked directly by its unit test.
    expect(allowed.headers.get("Cache-Control")).toMatch(/\bno-store\b/);
    expect(allowed.headers.get("Cache-Control")).not.toMatch(/\bpublic\b|s-maxage=[1-9]/);
    expect((await post({"Content-Type":"application/json"})).status).toBe(401);
    expect((await post({...headers,Authorization:`Bearer ${users[2].token}`})).status).toBe(403);
    expect((await post({...headers,"X-Factu-Company-Id":users[1].id})).status).toBe(403);
    const unpinned = {...headers}; delete (unpinned as Record<string,string>)["X-Factu-Company-Id"];
    expect((await post(unpinned)).status).toBe(409);
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
  it("uses the production quote payload through main-program edit, draft, deletion and tombstone recovery",async () => {
    const {args} = await fixture("presupuesto", "", "Cliente prueba de edición");
    const created = await admin.rpc("commit_quick_document_v1",args);
    expect(created.error).toBeNull();
    let quote = created.data.document as Document;
    let version = created.data.document_version as number;
    const originalNumber = quote.number;
    const auth = {userId:users[0].id,deviceId:"synthetic-quick-edit",sessionId:randomUUID(),userIdSource:"test" as const};
    const mutate = (operationKind:"upsert"|"delete", payload:Document|null) => admin.rpc("mutate_central_business_entity_v1",
      buildCentralBusinessMutationRpcArgs(buildCentralBusinessMutationCommand({auth,idempotencyKey:`quick-quote-test:${randomUUID()}`,
        entityType:"quote",entityId:quote.id,expectedVersion:version,operationKind,payload:payload ? JSON.parse(JSON.stringify(payload)) : null})));
    for (const status of ["enviado","borrador"] as const) {
      const changed = editSharedQuote({...EMPTY_DATA,documents:[quote]},{...quote,status,notes:"Corregido desde el programa"},now).value;
      const saved = await mutate("upsert",changed);
      expect(saved.error).toBeNull();
      const canonical = await admin.from("central_business_entities").select("current_version,current_payload")
        .eq("user_id",users[0].id).eq("entity_type","quote").eq("entity_id",quote.id).single();
      expect(canonical.error).toBeNull();
      expect(canonical.data?.current_version).toBe(++version);
      expect(canonical.data?.current_payload).toMatchObject({number:originalNumber,status,notes:changed.notes});
      quote = canonical.data!.current_payload as Document;
    }
    expect(deleteSharedQuote({...EMPTY_DATA,documents:[quote]},quote.id).data.documents).toEqual([]);
    const removed = await mutate("delete",null);
    expect(removed.error).toBeNull();
    const tombstone = await admin.from("central_business_entities").select("deleted,current_version")
      .eq("user_id",users[0].id).eq("entity_type","quote").eq("entity_id",quote.id).single();
    expect(tombstone.data).toMatchObject({deleted:true,current_version:version+1});
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
  it("admits an explicitly enrolled active admin through real HTTP issuance without changing their main-app role",async()=>{
    const actor = users[2];
    const headers = {Authorization:`Bearer ${actor.token}`,"X-Factu-Device-Token":"synthetic-admin-quick-012345678901234567890","X-Factu-Company-Id":users[0].id};
    try {
      expect((await admin.from("quick_invoicing_access").insert({actor_user_id:actor.id,company_id:users[0].id,enabled:true})).error).toBeNull();
      const scope = await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:actor.id});
      expect(scope.error).toBeNull();
      expect(scope.data).toMatchObject({actor_id:actor.id,company_id:users[0].id,user_id:users[0].id,billing_user_id:users[0].id});
      const boot = await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers});
      expect({status:boot.status,body:await boot.json()}).toMatchObject({status:200,body:{actorId:actor.id,companyId:users[0].id}});
      const intent = parseQuickIntent({...syntheticIntent(),operationId:randomUUID()});
      const issued = await fetch(`${appUrl}/api/factu-rapido/issue`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(intent)});
      const body = await issued.json();
      expect({status:issued.status,body}).toMatchObject({status:200,body:{ok:true,receipt:{operationId:intent.operationId}}});
      const replay = await fetch(`${appUrl}/api/factu-rapido/issue`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify(intent)});
      expect((await replay.json()).receipt.document.number).toBe(body.receipt.document.number);
      const operation = await admin.from("quick_document_operations").select("actor_user_id,company_id,user_id").eq("operation_id",intent.operationId).single();
      expect(operation.data).toEqual({actor_user_id:actor.id,company_id:users[0].id,user_id:users[0].id});
      const membership = await admin.from("app_company_members").select("role,status").eq("company_id",users[0].id).eq("user_id",actor.id).single();
      expect(membership.data).toEqual({role:"admin",status:"active"});
      expect((await admin.from("app_company_members").update({status:"revoked"}).eq("company_id",users[0].id).eq("user_id",actor.id)).error).toBeNull();
      expect((await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:actor.id})).error?.code).toBe("42501");
      expect((await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers})).status).toBe(403);
      expect((await fetch(`${appUrl}/api/factu-rapido/autofill`,{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:"{}"})).status).toBe(403);
      expect((await admin.from("app_company_members").update({status:"active"}).eq("company_id",users[0].id).eq("user_id",actor.id)).error).toBeNull();
      expect((await admin.from("quick_invoicing_access").update({enabled:false}).eq("actor_user_id",actor.id)).error).toBeNull();
      expect((await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:actor.id})).error?.code).toBe("42501");
    } finally {
      await admin.from("app_company_members").update({status:"active"}).eq("company_id",users[0].id).eq("user_id",actor.id);
      await admin.from("quick_invoicing_access").delete().eq("actor_user_id",actor.id);
    }
  });
  it("switches private enrollment without reassigning operations or accepting stale and unpinned editors",async()=>{
    const prior = await fixture("presupuesto","","Cambio de empresa sintético");
    const created = await admin.rpc("commit_quick_document_v1",prior.args);
    expect(created.error).toBeNull();
    const headers = {Authorization:`Bearer ${users[0].token}`,"X-Factu-Device-Token":"synthetic-switch-quick-012345678901234567890"};
    try {
      expect((await admin.from("quick_invoicing_access").update({company_id:users[1].id}).eq("actor_user_id",users[0].id)).error).toBeNull();
      const boot = await fetch(`${appUrl}/api/factu-rapido/bootstrap`,{headers});
      expect({status:boot.status,body:await boot.json()}).toMatchObject({status:200,body:{companyId:users[1].id}});
      const scope = await admin.rpc("quick_invoicing_scope_v1",{p_actor_id:users[0].id});
      expect(scope.data).toMatchObject({company_id:users[1].id,user_id:users[1].id,billing_user_id:users[0].id});
      const old = await admin.rpc("read_quick_document_v1",{p_actor_id:users[0].id,p_operation_id:prior.intent.operationId});
      expect(old.error).toBeNull(); expect(old.data).toBeNull();
      expect((await admin.rpc("commit_quick_document_v1",prior.args)).error?.code).toBe("P4504");
      const intent = parseQuickIntent({...syntheticIntent(),operationId:randomUUID()});
      for (const method of ["search?kind=customer&q=test","document?operationId="+prior.intent.operationId,"issue","cancel","autofill"]) {
        const post = method === "issue" || method === "cancel" || method === "autofill";
        for (const [pin,status] of [[undefined,409],[users[0].id,403]] as const) {
          const rejected = await fetch(`${appUrl}/api/factu-rapido/${method}`,{method:post?"POST":"GET",
            headers:{...headers,...(pin?{"X-Factu-Company-Id":pin}:{}),...(post?{"Content-Type":"application/json"}:{})},
            ...(post?{body:JSON.stringify(intent)}:{})});
          expect(rejected.status).toBe(status);
        }
      }
      expect((await admin.from("quick_document_operations").select("operation_id").eq("operation_id",intent.operationId)).data).toHaveLength(0);
      const preserved = await admin.from("quick_document_operations").select("company_id,user_id").eq("operation_id",prior.intent.operationId).single();
      expect(preserved.data).toEqual({company_id:users[0].id,user_id:users[0].id});
      const products = await fetch(`${appUrl}/api/factu-rapido/search?kind=product&q=AL%20PRA1%20R`,{headers:{...headers,"X-Factu-Company-Id":users[1].id}});
      expect(products.status).toBe(200);
      expect((await products.json()).results).toEqual([expect.objectContaining({name:"Producto SL no permitido"})]);
    } finally {
      await admin.from("quick_invoicing_access").update({company_id:users[0].id}).eq("actor_user_id",users[0].id);
    }
  });
  it("Stripe collection is private, concurrent-idempotent and atomic with central invoice events", async () => {
    const f = await fixture("factura", "12345678Z", "Cliente cobro sintético", false);
    const issued = await admin.rpc("commit_quick_document_v1", f.args);
    expect(issued.error).toBeNull();
    const invoiceId = issued.data.invoice_id;
    const original = await admin.from("central_invoice_documents").select("*").eq("id",invoiceId).single();
    expect(original.error).toBeNull();
    const args = {p_actor_id:users[0].id,p_operation_id:f.intent.operationId,p_expected_version:1,p_amount:9680,p_account_id:"acct_synthetic",p_livemode:true};
    expect((await anon.rpc("reserve_quick_stripe_payment_v1",args)).error).not.toBeNull();
    expect((await users[0].client.from("quick_stripe_payments").select("*")).error).not.toBeNull();
    expect((await admin.rpc("reserve_quick_stripe_payment_v1",{...args,p_actor_id:users[2].id})).error).not.toBeNull();
    const results = await Promise.all([admin.rpc("reserve_quick_stripe_payment_v1",args),admin.rpc("reserve_quick_stripe_payment_v1",args)]);
    results.forEach(result => expect(result.error).toBeNull());
    expect(results[0].data.id).toBe(results[1].data.id);
    const paymentId=results[0].data.id, sessionId=`cs_test_${paymentId}`, intentId=`pi_${paymentId}`;
    expect((await admin.rpc("bind_quick_stripe_session_v1",{p_payment_id:paymentId,p_session_id:sessionId,p_url:"https://checkout.stripe.com/c/pay/synthetic"})).error).toBeNull();
    expect((await admin.rpc("bind_quick_stripe_session_v1",{p_payment_id:paymentId,p_session_id:"cs_test_another",p_url:"https://checkout.stripe.com/c/pay/synthetic"})).error).not.toBeNull();
    const confirmation={p_payment_id:paymentId,p_session_id:sessionId,p_account_id:"acct_synthetic",p_livemode:true,p_amount:9680,p_currency:"eur",p_intent_id:intentId,p_paid_at:"2026-10-22T09:00:00Z",p_event_id:`evt_${paymentId}`,p_review_reason:null};
    expect((await admin.rpc("confirm_quick_stripe_payment_v1",{...confirmation,p_amount:1})).error).not.toBeNull();
    expect((await admin.rpc("confirm_quick_stripe_payment_v1",confirmation)).data.status).toBe("paid");
    const after = await admin.from("central_invoice_documents").select("*").eq("id",invoiceId).single();
    expect(after.error).toBeNull();
    expect(after.data.current_payload.document).toMatchObject({status:"pagado",paymentStatus:"paid"});
    expect(after.data.emitted_hash).toBe(original.data.emitted_hash);
    expect(after.data.emitted_snapshot).toEqual(original.data.emitted_snapshot);
    expect(after.data.current_payload.document.items).toEqual(original.data.current_payload.document.items);
    expect(after.data.current_version).toBe(original.data.current_version+1);
    await expectFactuGreenCheck(invoiceId, true);
    expect((await admin.rpc("confirm_quick_stripe_payment_v1",{...confirmation,p_event_id:`check:${sessionId}`})).data.status).toBe("paid");
    expect((await admin.from("central_invoice_documents").select("current_version").eq("id",invoiceId).single()).data?.current_version).toBe(after.data.current_version);
    const flagged=await admin.rpc("confirm_quick_stripe_payment_v1",{...confirmation,p_review_reason:"REFUND_OR_DISPUTE"});
    expect(flagged.error).toBeNull();expect(flagged.data.status).toBe("review");
  });
  it("retains real payment evidence for review if the invoice changed after checkout", async () => {
    const f=await fixture("factura","12345678Z","Cliente edición sintética",false);
    const issued=await admin.rpc("commit_quick_document_v1",f.args);expect(issued.error).toBeNull();
    const reserved=await admin.rpc("reserve_quick_stripe_payment_v1",{p_actor_id:users[0].id,p_operation_id:f.intent.operationId,p_expected_version:1,p_amount:9680,p_account_id:"acct_synthetic",p_livemode:true});
    expect(reserved.error).toBeNull();
    // A synthetic concurrent fiscal edit; never touches a real document.
    sql(`update public.central_invoice_documents set emitted_hash='sha256:synthetic-edited' where id='${issued.data.invoice_id}'::uuid`);
    const result=await admin.rpc("confirm_quick_stripe_payment_v1",{p_payment_id:reserved.data.id,p_session_id:`cs_test_${reserved.data.id}`,p_account_id:"acct_synthetic",p_livemode:true,p_amount:9680,p_currency:"eur",p_intent_id:`pi_${reserved.data.id}`,p_paid_at:"2026-10-22T09:00:00Z",p_event_id:`evt_${reserved.data.id}`,p_review_reason:null});
    expect(result.error).toBeNull();expect(result.data.status).toBe("review");expect(result.data.paid_at).not.toBeNull();
    const invoice=await admin.from("central_invoice_documents").select("current_payload").eq("id",issued.data.invoice_id).single();
    expect(invoice.data?.current_payload.document.paymentStatus).toBe("pending");
  });

  it("never credits test-mode money to an invoice and preserves a separate live checkout slot", async () => {
    const f=await fixture("factura","12345678Z","Cliente pago de prueba",false);
    const issued=await admin.rpc("commit_quick_document_v1",f.args);expect(issued.error).toBeNull();
    const args={p_actor_id:users[0].id,p_operation_id:f.intent.operationId,p_expected_version:1,p_amount:9680,p_account_id:"acct_synthetic",p_livemode:false};
    const reserved=await admin.rpc("reserve_quick_stripe_payment_v1",args);expect(reserved.error).toBeNull();
    const result=await admin.rpc("confirm_quick_stripe_payment_v1",{p_payment_id:reserved.data.id,p_session_id:`cs_test_${reserved.data.id}`,p_account_id:"acct_synthetic",p_livemode:false,p_amount:9680,p_currency:"eur",p_intent_id:`pi_${reserved.data.id}`,p_paid_at:"2026-10-22T09:00:00Z",p_event_id:`evt_${reserved.data.id}`,p_review_reason:null});
    expect(result.error).toBeNull();expect(result.data.status).toBe("paid");
    const invoice=await admin.from("central_invoice_documents").select("current_payload,current_version").eq("id",issued.data.invoice_id).single();
    expect(invoice.data?.current_payload.document.paymentStatus).toBe("pending");expect(invoice.data?.current_version).toBe(1);
    const live=await admin.rpc("reserve_quick_stripe_payment_v1",{...args,p_livemode:true});
    expect(live.error).toBeNull();expect(live.data.id).not.toBe(reserved.data.id);
  });

  it("records payment before any invoice, then links one immutable invoice exactly once", async () => {
    const id = randomUUID(), actor = users[0].id;
    const countBefore = await admin.from("central_invoice_documents").select("id", { count: "exact", head: true }).eq("user_id", actor);
    const create = { p_actor_id: actor, p_id: id, p_amount: 9680, p_description: "Reparación sin factura todavía", p_customer_name: "Cliente de prueba" };
    expect((await anon.rpc("create_quick_payment_request_v1", create)).error).not.toBeNull();
    expect((await users[0].client.from("quick_payment_requests").select("*")).error).not.toBeNull();
    const created = await Promise.all([admin.rpc("create_quick_payment_request_v1", create), admin.rpc("create_quick_payment_request_v1", create)]);
    created.forEach(result => expect(result.error).toBeNull());
    expect(created[0].data.id).toBe(created[1].data.id);
    expect((await admin.rpc("create_quick_payment_request_v1", { ...create, p_amount: 1 })).error).not.toBeNull();
    const reserve = { p_actor_id: actor, p_id: id, p_account_id: "acct_synthetic", p_livemode: true };
    expect((await admin.rpc("reserve_quick_collection_payment_v1", { ...reserve, p_actor_id: users[2].id })).error).not.toBeNull();
    const reserved = await Promise.all([admin.rpc("reserve_quick_collection_payment_v1", reserve), admin.rpc("reserve_quick_collection_payment_v1", reserve)]);
    reserved.forEach(result => expect(result.error).toBeNull());
    expect(reserved[0].data.id).toBe(reserved[1].data.id); expect(reserved[0].data.invoice_id).toBeNull();
    const paymentId = reserved[0].data.id;
    const confirmed = await admin.rpc("confirm_quick_stripe_payment_v1", { p_payment_id: paymentId, p_session_id: `cs_${paymentId}`, p_account_id: "acct_synthetic", p_livemode: true,
      p_amount: 9680, p_currency: "eur", p_intent_id: `pi_${paymentId}`, p_paid_at: "2026-10-20T09:00:00Z", p_event_id: `evt_${paymentId}`, p_review_reason: null });
    expect(confirmed.error).toBeNull(); expect(confirmed.data.status).toBe("paid"); expect(confirmed.data.invoice_id).toBeNull();
    expect((await admin.from("central_invoice_documents").select("id", { count: "exact", head: true }).eq("user_id", actor)).count).toBe(countBefore.count);
    const prepare = { p_actor_id: actor, p_id: id };
    const targets = await Promise.all([admin.rpc("prepare_quick_collection_invoice_v1", prepare), admin.rpc("prepare_quick_collection_invoice_v1", prepare)]);
    targets.forEach(result => expect(result.error).toBeNull());
    const operationId = targets[0].data.invoice_operation_id;
    expect(operationId).toBe(targets[1].data.invoice_operation_id);
    const f = await fixture("factura", "12345678Z", "Cliente cobro anterior", false, operationId);
    const issued = await admin.rpc("commit_quick_document_v1", f.args); expect(issued.error).toBeNull();
    const original = await admin.from("central_invoice_documents").select("*").eq("id", issued.data.invoice_id).single();
    expect(original.data.current_payload.document.paymentStatus).toBe("pending");
    const args = { p_actor_id: actor, p_id: id, p_operation_id: operationId, p_expected_version: 1, p_amount: 9680 };
    expect((await admin.rpc("attach_quick_collection_invoice_v1", { ...args, p_operation_id: randomUUID() })).error).not.toBeNull();
    expect((await admin.rpc("attach_quick_collection_invoice_v1", { ...args, p_amount: 1 })).error).not.toBeNull();
    expect((await admin.rpc("attach_quick_collection_invoice_v1", args)).error).toBeNull();
    const after = await admin.from("central_invoice_documents").select("*").eq("id", issued.data.invoice_id).single();
    expect(after.data.current_payload.document).toMatchObject({ paymentStatus: "paid", paidAt: "2026-10-20T09:00:00+00:00" });
    expect(after.data.emitted_hash).toBe(original.data.emitted_hash); expect(after.data.emitted_snapshot).toEqual(original.data.emitted_snapshot);
    expect(after.data.current_version).toBe(original.data.current_version + 1);
    expect((await admin.rpc("attach_quick_collection_invoice_v1", { ...args, p_expected_version: after.data.current_version })).error).toBeNull();
    expect((await admin.from("central_invoice_documents").select("current_version").eq("id", issued.data.invoice_id).single()).data?.current_version).toBe(after.data.current_version);
  });

  it.each([true, false])("does not block invoice issuance before an independent payment (live=%s)", async livemode => {
    const id = randomUUID(), actor = users[0].id;
    expect((await admin.rpc("create_quick_payment_request_v1", { p_actor_id: actor, p_id: id, p_amount: 9680, p_description: "Pagar más tarde", p_customer_name: "" })).error).toBeNull();
    const reserved = await admin.rpc("reserve_quick_collection_payment_v1", { p_actor_id: actor, p_id: id, p_account_id: "acct_synthetic", p_livemode: livemode });
    expect(reserved.error).toBeNull();
    const target = await admin.rpc("prepare_quick_collection_invoice_v1", { p_actor_id: actor, p_id: id }); expect(target.error).toBeNull();
    const f = await fixture("factura", "12345678Z", "Cliente factura antes de pagar", false, target.data.invoice_operation_id);
    const issued = await admin.rpc("commit_quick_document_v1", f.args); expect(issued.error).toBeNull();
    expect((await admin.rpc("attach_quick_collection_invoice_v1", { p_actor_id: actor, p_id: id, p_operation_id: f.intent.operationId, p_expected_version: 1, p_amount: 9680 })).error).toBeNull();
    const pending = await admin.from("central_invoice_documents").select("current_payload,current_version").eq("id", issued.data.invoice_id).single();
    expect(pending.data?.current_payload.document.paymentStatus).toBe("pending"); expect(pending.data?.current_version).toBe(1);
    await expectFactuGreenCheck(issued.data.invoice_id, false);
    const paymentId = reserved.data.id;
    const paid = await admin.rpc("confirm_quick_stripe_payment_v1", { p_payment_id: paymentId, p_session_id: `cs_${paymentId}`, p_account_id: "acct_synthetic", p_livemode: livemode,
      p_amount: 9680, p_currency: "eur", p_intent_id: `pi_${paymentId}`, p_paid_at: "2026-10-22T09:00:00Z", p_event_id: `evt_${paymentId}`, p_review_reason: null });
    expect(paid.error).toBeNull(); expect(paid.data.status).toBe("paid");
    const after = await admin.from("central_invoice_documents").select("current_payload,current_version").eq("id", issued.data.invoice_id).single();
    expect(after.data?.current_payload.document.paymentStatus).toBe(livemode ? "paid" : "pending");
    expect(after.data?.current_version).toBe(livemode ? 2 : 1);
    await expectFactuGreenCheck(issued.data.invoice_id, livemode);
  });

  it("links a standalone collection to an invoice issued by the main Factu RPC, not by Fast", async () => {
    const actor = users[0].id, id = randomUUID();
    const f = await fixture("factura", "12345678Z", "Factura de Factu principal", false);
    const issued = await admin.rpc("issue_central_invoice_v1", f.args.p_args);
    expect(issued.error).toBeNull();
    const invoiceId = issued.data[0].document_id;
    expect((await admin.from("quick_document_operations").select("operation_id").eq("operation_id", f.intent.operationId)).data).toEqual([]);
    await expectFactuGreenCheck(invoiceId, false);
    expect((await admin.rpc("create_quick_payment_request_v1", { p_actor_id: actor, p_id: id, p_amount: 9680, p_description: "Cobro independiente para Factu", p_customer_name: "" })).error).toBeNull();
    const reserved = await admin.rpc("reserve_quick_collection_payment_v1", { p_actor_id: actor, p_id: id, p_account_id: "acct_synthetic", p_livemode: true });
    expect(reserved.error).toBeNull(); const paymentId = reserved.data.id;
    const paid = await admin.rpc("confirm_quick_stripe_payment_v1", { p_payment_id: paymentId, p_session_id: `cs_${paymentId}`, p_account_id: "acct_synthetic", p_livemode: true,
      p_amount: 9680, p_currency: "eur", p_intent_id: `pi_${paymentId}`, p_paid_at: "2026-10-22T09:00:00Z", p_event_id: `evt_${paymentId}`, p_review_reason: null });
    expect(paid.error).toBeNull();
    const link = { p_actor_id: actor, p_id: id, p_invoice_id: invoiceId, p_expected_version: 1 };
    expect((await anon.rpc("attach_quick_collection_to_invoice_v1", link)).error).not.toBeNull();
    expect((await admin.rpc("attach_quick_collection_to_invoice_v1", { ...link, p_actor_id: users[2].id })).error).not.toBeNull();
    expect((await admin.rpc("attach_quick_collection_to_invoice_v1", { ...link, p_expected_version: 2 })).error).not.toBeNull();
    const linked = await admin.rpc("attach_quick_collection_to_invoice_v1", link);
    expect(linked.error).toBeNull(); expect(linked.data.invoice_id).toBe(invoiceId);
    await expectFactuGreenCheck(invoiceId, true);
    expect((await admin.rpc("attach_quick_collection_to_invoice_v1", link)).error).toBeNull();
    expect((await admin.from("central_invoice_documents").select("current_version").eq("id", invoiceId).single()).data?.current_version).toBe(2);
  });

});
