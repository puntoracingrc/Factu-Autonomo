import { describe, expect, it } from "vitest";
import { createBackupPayload, parseBackupJson } from "@/lib/backup";
import { applySyncChanges, diffAppData } from "@/lib/cloud/diff";
import { issueDocument } from "@/lib/document-integrity";
import {
  analyzeCustomerDeletion,
  analyzeSupplierDeletion,
  deleteCustomerMasterFromData,
  deleteSupplierMasterFromData,
} from "@/lib/master-record-deletion";
import {
  EMPTY_DATA,
  type AppData,
  type Customer,
  type Document,
  type Expense,
  type Product,
  type Supplier,
  type UserReminder,
} from "@/lib/types";

const NOW = "2026-07-11T01:30:00.000Z";

const customer: Customer = {
  id: "customer-delete",
  mergedCustomerIds: ["customer-legacy", "customer-shared"],
  customerType: "company",
  firstName: "Cliente histórico SL",
  lastName: "",
  name: "Cliente histórico SL",
  nif: "B12345674",
  email: "historico@example.test",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const otherCustomer: Customer = {
  id: "customer-keep",
  mergedCustomerIds: ["customer-shared"],
  firstName: "Cliente",
  lastName: "Conservado",
  name: "Cliente Conservado",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function draftDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "document-draft",
    type: "factura",
    number: "BORRADOR",
    date: "2026-07-11",
    customerId: customer.id,
    client: {
      name: customer.name,
      customerType: customer.customerType,
      nif: customer.nif,
      email: customer.email,
    },
    items: [
      {
        id: "line-1",
        description: "Servicio",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "borrador",
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    createdAt: "2026-07-11T00:00:00.000Z",
    updatedAt: "2026-07-11T00:00:00.000Z",
    ...overrides,
  };
}

function issuedDocument(): Document {
  const issued = issueDocument(
    draftDocument({
      id: "document-issued",
      number: "F-2026-0001",
      customerId: "customer-legacy",
    }),
    {
      ...EMPTY_DATA.profile,
      name: "Emisor de prueba",
      nif: "12345678Z",
      address: "Calle Prueba 1",
      city: "Madrid",
      postalCode: "28001",
      email: "emisor@example.test",
      phone: "600000000",
    },
    NOW,
  );
  return {
    ...issued,
    verifactu: {
      recordHash: "hash-registro-intocable",
      previousHash: "hash-anterior-intocable",
      recordTimestamp: NOW,
      qrUrl: "https://example.test/qr",
      status: "test_registered",
      recordType: "alta",
      environment: "test",
    },
  };
}

function reminder(entityId: string): UserReminder {
  return {
    id: `reminder-${entityId}`,
    text: "Llamar al cliente",
    link: { kind: "customer", entityId },
    target: "self",
    completed: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const supplier: Supplier = {
  id: "supplier-delete",
  name: "Proveedor histórico SL",
  nif: " B76543214 ",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "expense-1",
    date: "2026-07-01",
    supplierId: supplier.id,
    supplierName: supplier.name,
    description: "Compra histórica",
    amount: 250,
    ivaPercent: 21,
    category: "Material",
    paymentMethod: "Transferencia",
    purchaseDocument: {
      invoiceNumber: "PV-42",
      supplierNif: "B00000000",
    },
    purchaseLines: [
      {
        id: "purchase-line-1",
        description: "Perfil",
        quantity: 2,
        unitPrice: 125,
        netUnitPrice: 100,
      },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    key: "perfil",
    name: "Perfil",
    family: "Material",
    supplierId: supplier.id,
    supplierName: supplier.name,
    cost: 100,
    pvp: 125,
    purchase: {
      enabled: true,
      supplierId: supplier.id,
      supplierName: supplier.name,
      netUnitCost: 100,
      listPrice: 125,
      supplierReference: "PER-1",
    },
    source: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function customerData(): AppData {
  return {
    ...EMPTY_DATA,
    customers: [customer, otherCustomer],
    documents: [
      draftDocument(),
      issuedDocument(),
      draftDocument({
        id: "document-shared-alias",
        customerId: "customer-shared",
        client: { name: otherCustomer.name },
      }),
      draftDocument({
        id: "document-other",
        customerId: otherCustomer.id,
        client: { name: otherCustomer.name },
      }),
    ],
    userReminders: [
      reminder(customer.id),
      reminder("customer-legacy"),
      reminder("customer-shared"),
    ],
  };
}

function supplierData(): AppData {
  return {
    ...EMPTY_DATA,
    suppliers: [
      supplier,
      { id: "supplier-keep", name: "Otro proveedor", createdAt: NOW },
    ],
    expenses: [
      expense(),
      expense({
        id: "expense-2",
        supplierName: "",
        purchaseDocument: { invoiceNumber: "PV-43" },
      }),
      expense({
        id: "expense-other",
        supplierId: "supplier-keep",
        supplierName: "Otro proveedor",
      }),
    ],
    products: [
      product({
        supplierName: undefined,
        purchase: {
          enabled: true,
          supplierId: supplier.id,
          supplierName: undefined,
          netUnitCost: 100,
          listPrice: 125,
          supplierReference: "PER-1",
        },
      }),
      product({
        id: "product-purchase-only",
        supplierId: "supplier-keep",
        supplierName: "Otro proveedor",
      }),
      product({
        id: "product-other",
        supplierId: "supplier-keep",
        supplierName: "Otro proveedor",
        purchase: {
          enabled: true,
          supplierId: "supplier-keep",
          supplierName: "Otro proveedor",
          netUnitCost: 90,
        },
      }),
    ],
  };
}

describe("safe master record deletion", () => {
  it("cuenta y desvincula borradores, emitidos y aliases huérfanos sin alterar snapshots ni hashes", () => {
    const before = customerData();
    const beforeJson = JSON.stringify(before);
    const issued = before.documents.find((entry) => entry.id === "document-issued")!;
    const snapshot = issued.documentSnapshot;
    const pdfSnapshot = issued.pdfSnapshot;
    const verifactu = issued.verifactu;

    expect(analyzeCustomerDeletion(before, customer.id)).toEqual({
      customerFound: true,
      documentCount: 2,
      draftDocumentCount: 1,
      historicalDocumentCount: 1,
      reminderCount: 2,
    });

    const after = deleteCustomerMasterFromData(before, customer.id);

    expect(JSON.stringify(before)).toBe(beforeJson);
    expect(after.customers.map((entry) => entry.id)).toEqual([otherCustomer.id]);
    expect(after.documents[0]?.customerId).toBeUndefined();
    expect(after.documents[1]?.customerId).toBeUndefined();
    expect(after.documents[0]?.client).toBe(before.documents[0]?.client);
    expect(after.documents[1]?.client).toBe(issued.client);
    expect(after.documents[1]?.documentSnapshot).toBe(snapshot);
    expect(after.documents[1]?.documentSnapshot?.snapshotHash).toBe(
      snapshot?.snapshotHash,
    );
    expect(after.documents[1]?.pdfSnapshot).toBe(pdfSnapshot);
    expect(after.documents[1]?.pdfSnapshot?.contentHash).toBe(
      pdfSnapshot?.contentHash,
    );
    expect(after.documents[1]?.verifactu).toBe(verifactu);
    expect(after.documents[1]?.verifactu?.recordHash).toBe(
      "hash-registro-intocable",
    );
    expect(after.documents[2]).toBe(before.documents[2]);
    expect(after.documents[2]?.customerId).toBe("customer-shared");
    expect(after.documents[3]).toBe(before.documents[3]);
    expect(after.userReminders.map((entry) => entry.link.kind)).toEqual([
      "none",
      "none",
      "customer",
    ]);
    expect(after.userReminders.map((entry) => entry.text)).toEqual([
      "Llamar al cliente",
      "Llamar al cliente",
      "Llamar al cliente",
    ]);
  });

  it("desvincula gastos y las dos referencias de producto conservando NIF, nombres, líneas y costes", () => {
    const before = supplierData();
    const beforeJson = JSON.stringify(before);

    expect(analyzeSupplierDeletion(before, supplier.id)).toEqual({
      supplierFound: true,
      expenseCount: 2,
      productCount: 2,
      nifSnapshotCount: 1,
    });

    const after = deleteSupplierMasterFromData(before, supplier.id);

    expect(JSON.stringify(before)).toBe(beforeJson);
    expect(after.suppliers.map((entry) => entry.id)).toEqual(["supplier-keep"]);
    expect(after.expenses[0]?.supplierId).toBeUndefined();
    expect(after.expenses[0]?.supplierName).toBe(supplier.name);
    expect(after.expenses[0]?.purchaseDocument).toBe(
      before.expenses[0]?.purchaseDocument,
    );
    expect(after.expenses[0]?.purchaseDocument?.supplierNif).toBe("B00000000");
    expect(after.expenses[0]?.purchaseLines).toBe(before.expenses[0]?.purchaseLines);
    expect(after.expenses[1]?.supplierId).toBeUndefined();
    expect(after.expenses[1]?.supplierName).toBe(supplier.name);
    expect(after.expenses[1]?.purchaseDocument).toEqual({
      invoiceNumber: "PV-43",
      supplierNif: "B76543214",
    });
    expect(after.expenses[2]).toBe(before.expenses[2]);

    expect(after.products[0]?.supplierId).toBeUndefined();
    expect(after.products[0]?.supplierName).toBe(supplier.name);
    expect(after.products[0]?.purchase?.supplierId).toBeUndefined();
    expect(after.products[0]?.purchase?.supplierName).toBe(supplier.name);
    expect(after.products[0]?.cost).toBe(100);
    expect(after.products[0]?.pvp).toBe(125);
    expect(after.products[0]?.purchase?.netUnitCost).toBe(100);
    expect(after.products[0]?.purchase?.listPrice).toBe(125);
    expect(after.products[0]?.purchase?.supplierReference).toBe("PER-1");
    expect(after.products[1]?.supplierId).toBe("supplier-keep");
    expect(after.products[1]?.purchase?.supplierId).toBeUndefined();
    expect(after.products[2]).toBe(before.products[2]);
  });

  it("devuelve la misma referencia y no cambia nada si el maestro ya no existe", () => {
    const data = supplierData();
    expect(deleteSupplierMasterFromData(data, "missing")).toBe(data);
    expect(deleteCustomerMasterFromData(data, "missing")).toBe(data);
    expect(analyzeSupplierDeletion(data, "missing").supplierFound).toBe(false);
    expect(analyzeCustomerDeletion(data, "missing").customerFound).toBe(false);
  });

  it("produce un diff cloud completo y aplicable sin referencias de proveedor colgantes", () => {
    const before = supplierData();
    const after = deleteSupplierMasterFromData(before, supplier.id);
    const changes = diffAppData(before, after);

    expect(
      changes.map((change) => [
        change.entityType,
        change.entityId,
        change.deleted,
      ]),
    ).toEqual([
      ["expense", "expense-1", false],
      ["expense", "expense-2", false],
      ["supplier", supplier.id, true],
      ["product", "product-1", false],
      ["product", "product-purchase-only", false],
    ]);

    const remoteApplied = applySyncChanges(before, changes);
    expect(remoteApplied.suppliers).toEqual(after.suppliers);
    expect(remoteApplied.expenses).toEqual(after.expenses);
    expect(remoteApplied.products).toEqual(after.products);
  });

  it("sincroniza juntos el borrado de cliente, documentos y recordatorios desvinculados", () => {
    const before = customerData();
    const after = deleteCustomerMasterFromData(before, customer.id);
    const changes = diffAppData(before, after);

    expect(
      changes.map((change) => [
        change.entityType,
        change.entityId,
        change.deleted,
      ]),
    ).toEqual([
      ["document", "document-draft", false],
      ["document", "document-issued", false],
      ["customer", customer.id, true],
      ["user_reminder", `reminder-${customer.id}`, false],
      ["user_reminder", "reminder-customer-legacy", false],
    ]);

    const remoteApplied = applySyncChanges(before, changes);
    expect(remoteApplied.customers).toEqual(after.customers);
    expect(remoteApplied.documents).toEqual(after.documents);
    expect(remoteApplied.userReminders).toEqual(after.userReminders);
    expect(
      remoteApplied.documents.find((entry) => entry.id === "document-issued")
        ?.documentSnapshot?.snapshotHash,
    ).toBe(
      before.documents.find((entry) => entry.id === "document-issued")
        ?.documentSnapshot?.snapshotHash,
    );
  });

  it("conserva las desvinculaciones, NIF histórico y hashes al pasar por backup", () => {
    const withoutCustomer = deleteCustomerMasterFromData(
      customerData(),
      customer.id,
    );
    const combined: AppData = {
      ...withoutCustomer,
      suppliers: supplierData().suppliers,
      expenses: supplierData().expenses,
      products: supplierData().products,
    };
    const deleted = deleteSupplierMasterFromData(combined, supplier.id);
    const restored = parseBackupJson(createBackupPayload(deleted, NOW));

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(restored.customers.some((entry) => entry.id === customer.id)).toBe(false);
    expect(restored.documents.find((entry) => entry.id === "document-issued")?.customerId).toBeUndefined();
    expect(restored.documents.find((entry) => entry.id === "document-issued")?.documentSnapshot?.snapshotHash).toBe(
      deleted.documents.find((entry) => entry.id === "document-issued")?.documentSnapshot?.snapshotHash,
    );
    expect(restored.suppliers.some((entry) => entry.id === supplier.id)).toBe(false);
    expect(restored.expenses[1]?.supplierId).toBeUndefined();
    expect(restored.expenses[1]?.purchaseDocument?.supplierNif).toBe("B76543214");
    expect(restored.products[0]?.supplierId).toBeUndefined();
    expect(restored.products[0]?.purchase?.supplierId).toBeUndefined();
    expect(restored.products[0]?.purchase?.netUnitCost).toBe(100);
  });
});
