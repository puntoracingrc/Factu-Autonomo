import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { quickStripeConfig } from "./payments-config";
import { quickCardAmount, stripeCheckoutUrl } from "./payments-model";
import { syntheticIntent, syntheticProfile } from "./test-fixtures";
import type { QuickReceipt } from "./model";
import type { QuickContext } from "./server";
import { createQuickCardPayment, reconcileQuickStripeSession, type StoredQuickPayment, QUICK_COLLECTION_FLOW } from "./payments-server";

const f = vi.hoisted(() => ({ read: vi.fn(), account: vi.fn(), create: vi.fn(), retrieve: vi.fn() }));
vi.mock("./server", () => ({
  QuickError: class extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message); } },
  readQuickDocument: f.read,
}));
vi.mock("stripe", () => ({ default: class { accounts = { retrieve: f.account }; checkout = { sessions: { create: f.create, retrieve: f.retrieve } }; } }));
const company = "a1234567-1234-4123-8123-123456789012";
const env = { QUICK_STRIPE_ENABLED: "true", QUICK_STRIPE_COMPANY_ID: company, QUICK_STRIPE_ACCOUNT_ID: "acct_synthetic",
  QUICK_STRIPE_SECRET_KEY: "sk_test_synthetic", QUICK_STRIPE_WEBHOOK_SECRET: "whsec_synthetic", QUICK_STRIPE_MODE: "test" };
const config = quickStripeConfig(env)!;
const receipt: QuickReceipt = { operationId: company, document: { id:"quick-synthetic",type:"factura",number:"F-2026-0001",date:"2026-10-22",client:syntheticIntent().client,
  items:syntheticIntent().items,status:"enviado",paymentStatus:"pending",createdAt:"2026-10-22T09:00:00Z",updatedAt:"2026-10-22T09:00:00Z",centralInvoiceAuthority:{documentVersion:1} as never }, profile:syntheticProfile,customerPending:false };
function payment(overrides: Partial<StoredQuickPayment> = {}): StoredQuickPayment {
  return { id:"b1234567-1234-4123-8123-123456789012", operation_id:company,company_id:company,user_id:company,invoice_id:company,
    invoice_hash:"sha256:synthetic",invoice_number:"F-2026-0001",amount:9680,currency:"eur",stripe_account_id:"acct_synthetic",livemode:false,
    status:"creating",checkout_session_id:null,checkout_url:null,payment_intent_id:null,created_at:new Date().toISOString(),expires_at:new Date(Date.now()+23*3600_000).toISOString(),paid_at:null,review_reason:null,...overrides };
}
function db(initial: StoredQuickPayment | null, rpcData: StoredQuickPayment = payment({status:"paid"})) {
  const q = {select:vi.fn(),eq:vi.fn(),in:vi.fn(),is:vi.fn(),order:vi.fn(),limit:vi.fn(),update:vi.fn(),maybeSingle:vi.fn().mockResolvedValue({data:initial,error:null})};
  for (const method of [q.select,q.eq,q.in,q.is,q.order,q.limit,q.update]) method.mockReturnValue(q);
  return {from:vi.fn().mockReturnValue(q),rpc:vi.fn().mockResolvedValue({data:rpcData,error:null}),q};
}
function session(row: StoredQuickPayment): Stripe.Checkout.Session {
  return { id:"cs_test_synthetic",mode:"payment",livemode:false,currency:"eur",amount_total:row.amount,client_reference_id:row.id,
    metadata:{flow:QUICK_COLLECTION_FLOW,payment_id:row.id,operation_id:row.operation_id},status:"complete",payment_status:"paid",
    payment_intent:{id:"pi_synthetic",status:"succeeded",amount:row.amount,amount_received:row.amount,currency:"eur",livemode:false,
      metadata:{flow:QUICK_COLLECTION_FLOW,payment_id:row.id},latest_charge:{id:"ch_synthetic",paid:true,captured:true,amount:row.amount,amount_refunded:0,refunded:false,disputed:false,created:1792650000}},
  } as unknown as Stripe.Checkout.Session;
}
beforeEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); for (const [key,value] of Object.entries(env)) vi.stubEnv(key,value); f.read.mockResolvedValue(structuredClone(receipt)); f.account.mockResolvedValue({id:config.accountId,charges_enabled:true}); });

describe("Quick card payment scope, amounts and provider confirmations", () => {
  it("does not enable a merchant implicitly or expose test/live credentials across environments", () => {
    expect(quickStripeConfig({})).toBeNull();
    expect(quickStripeConfig({...env,QUICK_STRIPE_MODE:"live"})).toBeNull();
    expect(quickStripeConfig({...env,QUICK_STRIPE_MODE:"live",QUICK_STRIPE_SECRET_KEY:"sk_live_synthetic",VERCEL_ENV:"preview"})).toBeNull();
    expect(quickStripeConfig({...env,QUICK_STRIPE_RETURN_ORIGIN:"https://example.test/path"})).toBeNull();
    expect(quickStripeConfig({...env,QUICK_STRIPE_ENABLED:"false"})).toBeNull();
    expect(quickStripeConfig({...env,QUICK_STRIPE_ENABLED:"false"},true)).not.toBeNull();
  });
  it("computes the VAT-inclusive invoice amount and rejects quotes, settled or canceled invoices", () => {
    expect(quickCardAmount(receipt)).toBe(9680);
    for (const changes of [{type:"presupuesto"},{paymentStatus:"paid"},{status:"anulada"},{status:"rectificada"},{receiptDocumentId:"receipt"}]) {
      expect(() => quickCardAmount({...receipt,document:{...receipt.document,...changes} as typeof receipt.document})).toThrow();
    }
    expect(quickCardAmount({...receipt,profile:{...receipt.profile,vatExempt:true}})).toBe(8000);
  });
  it.each(["javascript:alert(1)","https://checkout.stripe.com.evil.test/pay","https://user@checkout.stripe.com/pay","http://checkout.stripe.com/pay"])("never renders an untrusted checkout URL: %s", value => expect(stripeCheckoutUrl(value)).toBeUndefined());
  it("creates an immutable single-use checkout using server amount, stable expiry and a durable idempotency key", async () => {
    const row=payment(), admin=db(null,row);
    admin.rpc.mockResolvedValueOnce({data:row,error:null}).mockResolvedValueOnce({data:{...row,status:"open",checkout_url:"https://checkout.stripe.com/c/pay/synthetic"},error:null});
    f.create.mockResolvedValue({id:"cs_test_synthetic",url:"https://checkout.stripe.com/c/pay/synthetic",livemode:false,amount_total:9680});
    const context={admin,scope:{actor_id:company,company_id:company}} as unknown as QuickContext;
    const result=await createQuickCardPayment(context,company);
    expect(result.status).toBe("open");
    expect(f.create).toHaveBeenCalledWith(expect.objectContaining({mode:"payment",payment_method_types:["card"],client_reference_id:row.id,
      line_items:[{quantity:1,price_data:{currency:"eur",unit_amount:9680,product_data:{name:"Factura F-2026-0001"}}}],
      invoice_creation:{enabled:false},automatic_tax:{enabled:false},expires_at:Math.floor(new Date(row.expires_at).getTime()/1000)}),{idempotencyKey:`quick-collection:${row.id}`});
    expect(f.account).toHaveBeenCalledWith(null);
    expect(admin.rpc).toHaveBeenCalledWith("reserve_quick_stripe_payment_v1",expect.objectContaining({p_amount:9680,p_expected_version:1}));
  });
  it("rejects another company before contacting Stripe or writing a reservation", async () => {
    const admin=db(null);
    await expect(createQuickCardPayment({admin,scope:{company_id:"different"}} as unknown as QuickContext,company)).rejects.toMatchObject({code:"CARD_PAYMENTS_UNAVAILABLE"});
    expect(f.account).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("rejects a provider account mismatch before reserving a payment", async () => {
    const admin=db(null); f.account.mockResolvedValue({id:"acct_other"});
    await expect(createQuickCardPayment({admin,scope:{company_id:company}} as unknown as QuickContext,company)).rejects.toMatchObject({code:"STRIPE_ACCOUNT_MISMATCH"});
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("does not reuse an old ambiguous idempotency key after the safe window", async () => {
    const row=payment({created_at:new Date(Date.now()-21*3600_000).toISOString()}),admin=db(row,row);
    await expect(createQuickCardPayment({admin,scope:{company_id:company,actor_id:company}} as unknown as QuickContext,company)).rejects.toMatchObject({code:"PAYMENT_NEEDS_REVIEW"});
    expect(f.create).not.toHaveBeenCalled();
  });
  it("commits only verified paid sessions and records the actual charge timestamp", async () => {
    const row=payment(),admin=db(row);
    await reconcileQuickStripeSession(admin as unknown as SupabaseClient,{} as Stripe,config,session(row),"evt_synthetic");
    expect(admin.rpc).toHaveBeenCalledWith("confirm_quick_stripe_payment_v1",expect.objectContaining({p_amount:9680,p_intent_id:"pi_synthetic",p_review_reason:null,p_paid_at:new Date(1792650000*1000).toISOString()}));
  });
  it.each(["wrong_amount","wrong_company","wrong_mode","wrong_reference","wrong_intent","uncaptured"])("rejects mismatched payment evidence: %s",async kind => {
    const row=payment(),admin=db(row),s=session(row);
    if(kind==="wrong_amount") s.amount_total=1;
    if(kind==="wrong_company") row.company_id="other";
    if(kind==="wrong_mode") s.livemode=true;
    if(kind==="wrong_reference") s.client_reference_id="other";
    if(kind==="wrong_intent") (s.payment_intent as Stripe.PaymentIntent).amount_received=1;
    if(kind==="uncaptured") ((s.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge).captured=false;
    await expect(reconcileQuickStripeSession(admin as unknown as SupabaseClient,{} as Stripe,config,s,"evt_synthetic")).rejects.toThrow();
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("does not credit an unpaid or merely visited checkout", async () => {
    const row=payment(),admin=db(row),s=session(row);s.status="open";s.payment_status="unpaid";
    await reconcileQuickStripeSession(admin as unknown as SupabaseClient,{} as Stripe,config,s,"evt_synthetic");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("sends refunded or disputed money to review instead of crediting a changed invoice", async () => {
    const row=payment(),admin=db(row),s=session(row);
    ((s.payment_intent as Stripe.PaymentIntent).latest_charge as Stripe.Charge).amount_refunded=10;
    await reconcileQuickStripeSession(admin as unknown as SupabaseClient,{} as Stripe,config,s,"evt_synthetic");
    expect(admin.rpc).toHaveBeenCalledWith("confirm_quick_stripe_payment_v1",expect.objectContaining({p_review_reason:"REFUND_OR_DISPUTE"}));
  });
  it("propagates failed database confirmation so the webhook can retry", async () => {
    const row=payment(),admin=db(row);admin.rpc.mockResolvedValue({data:null,error:{code:"connection_failed"}});
    await expect(reconcileQuickStripeSession(admin as unknown as SupabaseClient,{} as Stripe,config,session(row),"evt_synthetic")).rejects.toThrow();
  });
});
