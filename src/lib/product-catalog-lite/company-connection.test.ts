import {describe,it,expect} from "vitest";
import {connectedCatalogCompany} from "./company-connection";

const companies=[{id:"owner-original",name:"Empresa original"},{id:"company-connected",name:"Empresa conectada"},{id:"company-other",name:"Otra empresa"}];
describe("single-company catalog connection",()=>{
  it("keeps the explicitly connected company independently of ordering or name",()=>{
    expect(connectedCatalogCompany(companies,"company-connected")).toBe(companies[1]);
    expect(connectedCatalogCompany([...companies].reverse(),"company-connected")).toBe(companies[1]);
  });
  it("requires a choice for a new browser with multiple companies",()=>{
    expect(connectedCatalogCompany(companies,"")).toBeUndefined();
  });
  it("never falls back to a different company when the connection loses access",()=>{
    expect(connectedCatalogCompany(companies,"no-longer-authorized")).toBeUndefined();
    expect(connectedCatalogCompany([companies[0]],"no-longer-authorized")).toBeUndefined();
  });
  it("opens the sole authorized company and leaves an empty account unbound",()=>{
    expect(connectedCatalogCompany([companies[1]],"")).toBe(companies[1]);
    expect(connectedCatalogCompany([],"")).toBeUndefined();
  });
});
