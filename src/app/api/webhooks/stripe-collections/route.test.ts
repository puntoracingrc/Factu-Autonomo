import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { POST } from "./route";
const f=vi.hoisted(()=>({handle:vi.fn(),admin:{},client:null as unknown as Stripe}));
vi.mock("@/lib/supabase/admin",()=>({getSupabaseAdmin:()=>f.admin}));
vi.mock("@/lib/quick-invoicing/payments-server",()=>({quickStripeClient:()=>f.client,handleQuickStripeEvent:f.handle}));
const secret="whsec_synthetic_test_only";
const body=JSON.stringify({id:"evt_synthetic",object:"event",type:"checkout.session.completed",livemode:false,data:{object:{id:"cs_test_synthetic",metadata:{flow:"factu_quick_collection_v1"}}}});
function request(signature?:string) {return new Request("http://localhost/api/webhooks/stripe-collections",{method:"POST",headers:signature?{"stripe-signature":signature}:{},body});}
beforeEach(()=>{
  vi.clearAllMocks();vi.unstubAllEnvs();
  for(const [key,value] of Object.entries({QUICK_STRIPE_ENABLED:"true",QUICK_STRIPE_COMPANY_ID:"a1234567-1234-4123-8123-123456789012",QUICK_STRIPE_ACCOUNT_ID:"acct_synthetic",QUICK_STRIPE_SECRET_KEY:"sk_test_synthetic",QUICK_STRIPE_MODE:"test",QUICK_STRIPE_WEBHOOK_SECRET:secret})) vi.stubEnv(key,value);
  f.client=new Stripe("sk_test_synthetic");f.handle.mockResolvedValue(undefined);
});
describe("signed collection webhook isolated from subscription billing",()=>{
  it("verifies a real SDK-generated Stripe signature before processing",async()=>{
    const signature=f.client.webhooks.generateTestHeaderString({payload:body,secret});
    expect((await POST(request(signature))).status).toBe(200);
    expect(f.handle).toHaveBeenCalledWith(f.admin,f.client,expect.objectContaining({livemode:false}),expect.objectContaining({id:"evt_synthetic"}));
  });
  it.each([undefined,"invalid"])("rejects missing or invalid signature %s",async signature=>{
    expect((await POST(request(signature))).status).toBe(400);expect(f.handle).not.toHaveBeenCalled();
  });
  it("keeps confirmation active when new checkout creation is switched off",async()=>{
    vi.stubEnv("QUICK_STRIPE_ENABLED","false");
    const signature=f.client.webhooks.generateTestHeaderString({payload:body,secret});
    expect((await POST(request(signature))).status).toBe(200);expect(f.handle).toHaveBeenCalledOnce();
  });
  it("returns a retryable failure when persistence fails",async()=>{
    f.handle.mockRejectedValue(new Error("synthetic database outage"));
    const signature=f.client.webhooks.generateTestHeaderString({payload:body,secret});
    expect((await POST(request(signature))).status).toBe(503);
  });
  it("does not accept events without a complete merchant configuration",async()=>{
    vi.stubEnv("QUICK_STRIPE_ACCOUNT_ID","");
    expect((await POST(request())).status).toBe(503);expect(f.handle).not.toHaveBeenCalled();
  });
});
