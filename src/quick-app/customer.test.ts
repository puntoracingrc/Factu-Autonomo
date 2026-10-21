import { describe, expect, it } from "vitest";
import { quickCustomer, quickCustomerCard, quickCustomerStartStep } from "./customer";

const row = { id:"customer-one",name:"Cliente de prueba",nif:"12345678Z",address:"Dos 2",postalCode:"08002",city:"Barcelona",phone:"600000000",email:"cliente@example.test",privateNote:"not-in-document" };
describe("quick customer selection", () => {
  it("copies only customer fields, not private master data", () => {
    const customer = quickCustomer(row);
    expect(customer.id).toBe(row.id);
    expect(customer.client).toMatchObject({name:row.name,nif:row.nif,city:row.city});
    expect(customer.client).not.toHaveProperty("id");
    expect(customer.client).not.toHaveProperty("privateNote");
  });
  it("opens concepts with a complete customer and asks for missing invoice data", () => {
    expect(quickCustomerStartStep("factura",quickCustomer(row))).toBe(2);
    expect(quickCustomerStartStep("presupuesto",quickCustomer({id:"one",name:"Solo nombre"}))).toBe(2);
    expect(quickCustomerStartStep("factura",quickCustomer({id:"one",name:"Solo nombre"}))).toBe(1);
    expect(quickCustomerStartStep("presupuesto",quickCustomer({id:"one"}))).toBe(1);
  });
  it("renders a compact, escaped card with two creation actions", () => {
    const html = quickCustomerCard(quickCustomer({...row,name:'<img src=x onerror="alert(1)">'}));
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).toContain("08002 Barcelona");
    expect(html).toContain('data-action="customer-invoice"');
    expect(html).toContain('data-action="customer-quote"');
    expect(html).not.toContain("not-in-document");
  });
});
