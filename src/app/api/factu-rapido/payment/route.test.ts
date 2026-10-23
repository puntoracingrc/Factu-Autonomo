import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET,POST } from "./route";
import { QuickError } from "@/lib/quick-invoicing/server";
const f=vi.hoisted(()=>({auth:vi.fn(),create:vi.fn(),read:vi.fn()}));
vi.mock("@/lib/quick-invoicing/server",()=>({authenticateQuick:f.auth,QuickError:class extends Error{constructor(readonly status:number,readonly code:string,message:string){super(message);}}}));
vi.mock("@/lib/quick-invoicing/payments-server",()=>({createQuickCardPayment:f.create,readQuickCardPayment:f.read}));
const id="a1234567-1234-4123-8123-123456789012",context={scope:{company_id:id}};
const post=(body:string)=>new Request("http://localhost/api/factu-rapido/payment",{method:"POST",body,headers:{"content-type":"application/json"}});
beforeEach(()=>{vi.clearAllMocks();f.auth.mockResolvedValue(context);f.create.mockResolvedValue({status:"open",amount:10000});f.read.mockResolvedValue(null);});
describe("private collection endpoints",()=>{
  it("passes only the operation identity, never a browser-supplied amount or merchant",async()=>{
    const response=await POST(post(JSON.stringify({operationId:id,amount:1,companyId:"forged",paid:true})));
    expect(response.status).toBe(200);expect(f.create).toHaveBeenCalledWith(context,id);
    expect(f.auth).toHaveBeenCalledWith(expect.any(Request),{purpose:"payment"});
  });
  it("checks payment state through the authenticated scope",async()=>{
    const response=await GET(new Request(`http://localhost/api/factu-rapido/payment?operationId=${id}`));
    expect(response.status).toBe(200);expect(f.read).toHaveBeenCalledWith(context,id);expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects an unauthenticated request before accessing a payment",async()=>{
    f.auth.mockRejectedValue(new QuickError(401,"SIGN_IN_REQUIRED","Inicia sesión"));
    expect((await POST(post(JSON.stringify({operationId:id})))).status).toBe(401);expect(f.create).not.toHaveBeenCalled();
  });
  it.each(["not-json",JSON.stringify({operationId:"not-a-uuid"}),"null"])("rejects malformed requests: %s",async body=>{
    expect((await POST(post(body))).status).toBe(400);expect(f.create).not.toHaveBeenCalled();
  });
  it("bounds the request before any checkout call",async()=>{
    expect((await POST(post(JSON.stringify({operationId:id,padding:"x".repeat(1100)})))).status).toBe(413);expect(f.create).not.toHaveBeenCalled();
  });
});
