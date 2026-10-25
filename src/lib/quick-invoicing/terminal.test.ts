import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileQuickTerminal, quickTerminalLocation, terminalDeviceAction } from "./terminal-server";
import { QUICK_TERMINAL_FLOW, quickTerminalIntent } from "./terminal-model";
import { quickCardPaymentPanel } from "@/quick-app/payments";
import type { StoredQuickPayment } from "./payments-server";

const config={companyId:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",accountId:"acct_synthetic",livemode:true,secretKey:"rk_live_synthetic",webhookSecret:"whsec_synthetic",origin:"https://example.test"};
const row={id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",channel:"terminal",company_id:config.companyId,operation_id:null,collection_id:"collection-synthetic",
  stripe_account_id:config.accountId,livemode:true,amount:1000,currency:"eur",payment_intent_id:"pi_synthetic",status:"open"} as StoredQuickPayment;
const provider=()=>({id:row.payment_intent_id,metadata:{flow:QUICK_TERMINAL_FLOW,payment_id:row.id,operation_id:"",collection_id:row.collection_id},
  amount:1000,amount_received:1000,currency:"eur",livemode:true,capture_method:"automatic",status:"succeeded",payment_method_types:["card_present"],
  latest_charge:{id:"ch_synthetic",payment_intent:row.payment_intent_id,paid:true,captured:true,amount:1000,amount_captured:1000,
    currency:"eur",livemode:true,created:1792735200,refunded:false,amount_refunded:0,disputed:false,payment_method_details:{type:"card_present"}}} as unknown as Stripe.PaymentIntent);
function db(payment=row) {
  const chain={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:payment,error:null})};
  return {from:vi.fn(()=>chain),rpc:vi.fn().mockResolvedValue({data:{...payment,status:"paid"},error:null})};
}
beforeEach(()=>vi.unstubAllEnvs());
describe("NFC: exact provider evidence and a payment-scoped Android handoff",()=>{
  it("does not enable NFC without explicit activation and a valid Terminal location",()=>{
    expect(quickTerminalLocation({})).toBeNull();
    expect(quickTerminalLocation({QUICK_STRIPE_NFC_ENABLED:"true",QUICK_STRIPE_TERMINAL_LOCATION_ID:"forged"})).toBeNull();
    expect(quickTerminalLocation({QUICK_STRIPE_NFC_ENABLED:"true",QUICK_STRIPE_TERMINAL_LOCATION_ID:"tml_synthetic"})).toBe("tml_synthetic");
  });
  it("sends only a short random credential to the explicit native package",()=>{
    expect(quickTerminalIntent("a".repeat(43))).toContain("package=app.factu.fast.nfc;S.grant=");
    for(const input of ["x", "a".repeat(42), "a".repeat(43)+";S.forged=1", "https://example.test"]) expect(()=>quickTerminalIntent(input)).toThrow();
  });
  it("rejects anonymous or malformed native access before any provider request",async()=>{
    await expect(terminalDeviceAction(new Request("https://example.test"),"token")).rejects.toMatchObject({status:401});
    await expect(terminalDeviceAction(new Request("https://example.test",{headers:{Authorization:"Bearer arbitrary"}}),"intent")).rejects.toMatchObject({status:401});
  });
  it("confirms captured card_present money through the existing atomic ledger and central outbox",async()=>{
    const admin=db();
    await expect(reconcileQuickTerminal(admin as unknown as SupabaseClient,{} as Stripe,config,provider(),"evt_synthetic")).resolves.toMatchObject({status:"paid"});
    expect(admin.rpc).toHaveBeenCalledWith("confirm_quick_terminal_payment_v1",expect.objectContaining({p_payment_id:row.id,p_intent_id:"pi_synthetic",p_amount:1000,p_livemode:true}));
  });
  it.each(["company","account","mode","amount","received","currency","origin","intent","flow","method","captured","chargeMode","chargeIntent"])("fails closed for altered %s",async field=>{
    const intent=provider(), admin=db();
    const charge=intent.latest_charge as Stripe.Charge;
    if(field==="company") admin.from=vi.fn(()=>({select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),single:vi.fn().mockResolvedValue({data:{...row,company_id:"other"},error:null})}));
    if(field==="account") row.stripe_account_id="acct_other";
    if(field==="mode") intent.livemode=false;
    if(field==="amount") intent.amount++;
    if(field==="received") intent.amount_received--;
    if(field==="currency") intent.currency="usd";
    if(field==="origin") intent.metadata.collection_id="other";
    if(field==="intent") intent.id="pi_other";
    if(field==="flow") intent.metadata.flow="other";
    if(field==="method") charge.payment_method_details={type:"card"} as Stripe.Charge.PaymentMethodDetails;
    if(field==="captured") charge.captured=false;
    if(field==="chargeMode") charge.livemode=false;
    if(field==="chargeIntent") charge.payment_intent="pi_other";
    try {await expect(reconcileQuickTerminal(admin as unknown as SupabaseClient,{} as Stripe,config,intent,"evt_synthetic")).rejects.toThrow(); expect(admin.rpc).not.toHaveBeenCalled();}
    finally {row.stripe_account_id=config.accountId;}
  });
  it("retains refunds for review without declaring another debt",async()=>{
    const intent=provider(); (intent.latest_charge as Stripe.Charge).amount_refunded=100;
    const admin=db(); await reconcileQuickTerminal(admin as unknown as SupabaseClient,{} as Stripe,config,intent,"evt_refund");
    expect(admin.rpc).toHaveBeenCalledWith("confirm_quick_terminal_payment_v1",expect.objectContaining({p_review_reason:"REFUND_OR_DISPUTE"}));
  });
  it("does not credit a provider authorization or an Android success callback",async()=>{
    const intent=provider(); intent.status="requires_capture";
    const admin=db(); expect((await reconcileQuickTerminal(admin as unknown as SupabaseClient,{} as Stripe,config,intent,"check" )).status).toBe("open");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("only offers native launch to eligible UI and keeps paid/review payments closed",()=>{
    expect(quickCardPaymentPanel(undefined,false)).not.toContain("Cobrar por NFC");
    expect(quickCardPaymentPanel(undefined,false,undefined,false,true)).toContain("Cobrar por NFC");
    expect(quickCardPaymentPanel({status:"paid",amount:1000,testMode:false},false,undefined,false,true)).not.toContain("payment-nfc");
    expect(quickCardPaymentPanel({status:"review",amount:1000,testMode:false},false,undefined,false,true)).not.toContain("payment-nfc");
  });
});
