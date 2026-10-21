import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readQuickCustomerPage, type QuickContext } from "./server";
import { syntheticProfile } from "./test-fixtures";

function fixture() {
  const rows = Array.from({length:26},(_,index) => ({id:`client-${index}`,name:`Cliente ${index}`}));
  const builder = { select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),range:vi.fn().mockResolvedValue({data:rows,error:null}) };
  const admin = {from:vi.fn().mockReturnValue(builder),rpc:vi.fn().mockResolvedValue({data:[rows[0]],error:null})};
  const context: QuickContext = {admin:admin as unknown as SupabaseClient,scope:{actor_id:"actor",company_id:"old-company",user_id:"old-data-owner",billing_user_id:"billing-account",company_name:"Old company",profile_version:1,profile:syntheticProfile},deviceId:"device",sessionId:"session"};
  return {rows,builder,admin,context};
}
describe("private quick customer pages", () => {
  it("reads 25 contacts plus a sentinel row from the verified data owner, never the actor or billing owner", async () => {
    const {context,builder,admin} = fixture();
    const result = await readQuickCustomerPage(context,"","1");
    expect(admin.from).toHaveBeenCalledWith("central_business_entities");
    expect(builder.eq).toHaveBeenCalledWith("user_id","old-data-owner");
    expect(builder.eq).toHaveBeenCalledWith("entity_type","customer");
    expect(builder.eq).toHaveBeenCalledWith("deleted",false);
    expect(builder.range).toHaveBeenCalledWith(25,50);
    const projection = builder.select.mock.calls[0][0];
    expect(projection).toContain("name:current_payload->>name");
    expect(projection).not.toMatch(/(^|,)current_payload(,|$)/);
    expect(result.results).toHaveLength(25);
    expect(result).toMatchObject({hasMore:true,nextPage:2});
  });
  it("uses the existing scoped normalized search rather than filtering only the loaded page", async () => {
    const {context,admin} = fixture();
    const result = await readQuickCustomerPage(context,"José B123","0");
    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.rpc).toHaveBeenCalledWith("search_quick_catalog_v1",{p_actor_id:"actor",p_kind:"customer",p_query:"José B123"});
    expect(result.hasMore).toBe(false);
  });
  it.each(["-1","01","401","1e2","0;select"])("rejects an invalid page %s", async page => {
    const {context,admin} = fixture();
    await expect(readQuickCustomerPage(context,"",page)).rejects.toMatchObject({status:400,code:"INVALID_PAGE"});
    expect(admin.from).not.toHaveBeenCalled();
  });
});
