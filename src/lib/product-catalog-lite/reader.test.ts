import {describe,it,expect,vi} from "vitest";
import type {SupabaseClient} from "@supabase/supabase-js";
import {listCatalogProducts} from "./reader";

function database(){
  const query={select:vi.fn(),eq:vi.fn(),or:vi.fn(),order:vi.fn(),range:vi.fn()};
  for(const method of [query.select,query.eq,query.or,query.order])method.mockReturnValue(query);
  query.range.mockResolvedValue({data:[],count:65,error:null});
  const from=vi.fn().mockReturnValue(query);
  return {query,from,client:{from} as unknown as SupabaseClient};
}
describe("catalog family and subfamily query",()=>{
  it("applies both exact values and the verified owner before pagination and count",async()=>{
    const db=database(),family="Motores & electrónica",subfamily='Radio, "WiFi"';
    const result=await listCatalogProducts(db.client,"verified-owner",{q:"motor",family,subfamily,offset:30});
    expect(db.query.eq).toHaveBeenCalledWith("user_id","verified-owner");
    expect(db.query.eq).toHaveBeenCalledWith("entity_type","product");
    expect(db.query.eq).toHaveBeenCalledWith("deleted",false);
    expect(db.query.eq).toHaveBeenCalledWith("current_payload->>family",family);
    expect(db.query.eq).toHaveBeenCalledWith("current_payload->>subfamily",subfamily);
    expect(db.query.select).toHaveBeenCalledWith(expect.any(String),{count:"exact"});
    expect(db.query.range).toHaveBeenCalledWith(30,59);
    expect(Math.max(...db.query.eq.mock.invocationCallOrder)).toBeLessThan(db.query.range.mock.invocationCallOrder[0]);
    expect(result).toMatchObject({total:65,hasMore:true});
  });
  it("keeps whole-family and unfiltered queries compatible",async()=>{
    const db=database();await listCatalogProducts(db.client,"owner",{q:"",family:"Motores",offset:0});
    expect(db.query.eq.mock.calls.some(([column])=>column==="current_payload->>subfamily")).toBe(false);
    db.query.eq.mockClear();await listCatalogProducts(db.client,"owner",{q:"",family:"",subfamily:"",offset:0});
    expect(db.query.eq.mock.calls.some(([column])=>column==="current_payload->>family")).toBe(false);
  });
  it("refuses an orphan subfamily before accessing the database",async()=>{
    const db=database();await expect(listCatalogProducts(db.client,"owner",{q:"",family:"",subfamily:"Montaje",offset:0})).rejects.toThrow("CATALOG_INVALID_SUBFAMILY_FILTER");
    expect(db.from).not.toHaveBeenCalled();
  });
});
