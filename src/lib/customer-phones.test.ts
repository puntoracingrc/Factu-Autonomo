import { describe, expect, it } from "vitest";
import {
  createCustomerInCollection,
  customerPayloadFromInput,
  customerPhoneContacts,
  customerToClient,
  customerToFormValues,
  ensureCustomerForDocument,
  filterCustomers,
  updateCustomerInCollection,
} from "./customers";
import { mergeCustomerRecords } from "./document-integrity/customer-merge";
import type { Customer } from "./types";

const now = "2026-10-24T10:00:00.000Z";
const base: Customer = {
  id: "synthetic-customer",
  firstName: "Cliente",
  lastName: "Sintético",
  name: "Cliente Sintético",
  phone: "600 111 222",
  createdAt: now,
  updatedAt: now,
};
const details = {
  phoneContactName: "  Marta   Pérez  ",
  phone2: "  +34 611   222 333  ",
  phone2ContactName: "  José   Portero  ",
};
const normalized = {
  phoneContactName: "Marta Pérez",
  phone2: "+34 611 222 333",
  phone2ContactName: "José Portero",
};

describe("teléfonos y contactos opcionales del maestro de clientes", () => {
  it("guarda dos teléfonos con personas distintas también en particulares", () => {
    const payload = customerPayloadFromInput({ ...base, ...details });
    const result = createCustomerInCollection([], payload, base.id, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.customer).toMatchObject({ ...base, ...normalized });
    expect(customerToFormValues(result.customer)).toMatchObject(normalized);
    expect(customerPhoneContacts(result.customer)).toEqual([
      { slot: 1, phone: base.phone, name: normalized.phoneContactName },
      { slot: 2, phone: normalized.phone2, name: normalized.phone2ContactName },
    ]);
  });

  it("admite nombres vacíos, un solo teléfono y fichas antiguas sin migrarlas", () => {
    expect(customerPayloadFromInput(base)).not.toHaveProperty("phone2");
    expect(customerToFormValues(base)).toMatchObject({
      phoneContactName: "", phone2: "", phone2ContactName: "",
    });
    const result = createCustomerInCollection([], {
      ...base, phone: undefined, phoneContactName: "", phone2: "611222333", phone2ContactName: "",
    }, base.id, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(customerPhoneContacts(result.customer)).toEqual([
      { slot: 2, phone: "611222333", name: undefined },
    ]);
  });

  it("permite editar y vaciar cada campo sin perder los demás datos", () => {
    const original = { ...base, ...normalized };
    const updated = updateCustomerInCollection([original], {
      ...original,
      ...customerPayloadFromInput({ ...original, phoneContactName: "  Ana  ", phone2: "", phone2ContactName: "" }),
    }, now);
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.customer.phone).toBe(base.phone);
    expect(updated.customer.phoneContactName).toBe("Ana");
    expect(updated.customer.phone2).toBeUndefined();
    expect(updated.customer.phone2ContactName).toBeUndefined();
  });

  it("busca por teléfono secundario formateado y por ambos contactos", () => {
    const customer = { ...base, ...normalized };
    for (const query of ["+34 611 222 333", "611222333", "marta perez", "jose portero"]) {
      expect(filterCustomers([customer], query).map((entry) => entry.id)).toEqual([base.id]);
    }
  });

  it("editar desde un documento no borra los contactos ni los mete en su snapshot fiscal", () => {
    const original = { ...base, ...normalized };
    const snapshotBefore = customerToClient(base);
    expect(customerToClient(original)).toEqual(snapshotBefore);
    const result = ensureCustomerForDocument([original], {
      firstName: base.firstName, lastName: base.lastName, phone: base.phone,
    }, base.id, { now });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.customer).toMatchObject(normalized);
    expect(result.client).not.toHaveProperty("phone2");
    expect(result.client).not.toHaveProperty("phoneContactName");
    expect(result.client).not.toHaveProperty("phone2ContactName");
    expect(original).toMatchObject(normalized);
  });

  it("al fusionar conserva cada nombre con su número, nunca el de otra persona", () => {
    const kept = { ...base, phoneContactName: "Marta" };
    const other = { ...base, id: "synthetic-other", phone: "611222333", phoneContactName: "José", phone2: "622333444", phone2ContactName: "Ana" };
    const result = mergeCustomerRecords([kept, other], kept.id, [other.id], now);
    expect(result?.keep).toMatchObject({ phone: base.phone, phoneContactName: "Marta", phone2: "611222333", phone2ContactName: "José" });
    const twoPhones = { ...kept, phone2: "633444555", phone2ContactName: "Portería" };
    const unchanged = mergeCustomerRecords([twoPhones, other], kept.id, [other.id], now);
    expect(unchanged?.keep).toMatchObject({ phone2: "633444555", phone2ContactName: "Portería" });
    const noPrimary = { ...base, phone: undefined, phoneContactName: "Nombre sin número" };
    const adopted = mergeCustomerRecords([noPrimary, other], base.id, [other.id], now);
    expect(adopted?.keep).toMatchObject({ phone: "611222333", phoneContactName: "José", phone2: "622333444", phone2ContactName: "Ana" });
  });
});
