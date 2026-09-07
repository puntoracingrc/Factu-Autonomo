import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildPersistedAppEntityShadowSnapshot,
  verifyPersistedAppEntityShadowSnapshot,
} from "./persisted-app-entity-shadow";
import { EMPTY_DATA, type AppData } from "./types";

const NOW = "2026-09-07T12:00:00.000Z";

function fixture(): AppData {
  return {
    ...structuredClone(EMPTY_DATA),
    customers: [
      {
        id: "customer-1",
        firstName: "Cliente",
        lastName: "Sintetico",
        name: "Cliente Sintetico",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    documents: [
      {
        id: "document-1",
        type: "factura",
        number: "F-2026-0001",
        date: "2026-09-07",
        customerId: "customer-1",
        client: { name: "Cliente Sintetico" },
        items: [],
        status: "borrador",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    expenses: [
      {
        id: "expense-1",
        date: "2026-09-07",
        supplierName: "Proveedor Sintetico",
        description: "Gasto sintetico",
        amount: 12.1,
        ivaPercent: 21,
        category: "Material",
        paymentMethod: "Transferencia",
        createdAt: NOW,
      },
    ],
    suppliers: [
      {
        id: "supplier-1",
        name: "Proveedor Sintetico",
        createdAt: NOW,
      },
    ],
    products: [
      {
        id: "product-1",
        key: "producto-sintetico",
        name: "Producto Sintetico",
        family: "Pruebas",
        source: "manual",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    meta: { lastModified: NOW },
  };
}

describe("persisted app entity shadow", () => {
  it("separa las cinco colecciones y verifica sus huellas", async () => {
    const snapshot = await buildPersistedAppEntityShadowSnapshot(
      "workspace-a",
      "raw-a",
      fixture(),
    );

    expect(snapshot.manifest.totalEntities).toBe(5);
    expect(snapshot.manifest.collections).toMatchObject({
      customer: { count: 1 },
      document: { count: 1 },
      expense: { count: 1 },
      supplier: { count: 1 },
      product: { count: 1 },
    });
    await expect(
      verifyPersistedAppEntityShadowSnapshot(
        snapshot,
        snapshot.manifest,
        snapshot.records,
      ),
    ).resolves.toMatchObject({ matches: true, reason: "match" });
  });

  it("detecta una entidad corrupta aunque el manifiesto siga intacto", async () => {
    const snapshot = await buildPersistedAppEntityShadowSnapshot(
      "workspace-a",
      "raw-a",
      fixture(),
    );
    const records = structuredClone(snapshot.records);
    const customer = records.find(
      (record) => record.entityType === "customer",
    );
    if (!customer || customer.entityType !== "customer") {
      throw new Error("customer_fixture_missing");
    }
    (customer.payload as AppData["customers"][number]).name =
      "Contenido corrupto";

    await expect(
      verifyPersistedAppEntityShadowSnapshot(
        snapshot,
        snapshot.manifest,
        records,
      ),
    ).resolves.toMatchObject({
      matches: false,
      reason: "entity_fingerprint_mismatch",
    });
  });

  it("rechaza una generacion anterior tras un corte de escritura", async () => {
    const before = await buildPersistedAppEntityShadowSnapshot(
      "workspace-a",
      "raw-anterior",
      fixture(),
    );
    const changed = fixture();
    changed.customers[0] = {
      ...changed.customers[0],
      name: "Cliente posterior al corte",
    };
    const expected = await buildPersistedAppEntityShadowSnapshot(
      "workspace-a",
      "raw-nuevo",
      changed,
    );

    await expect(
      verifyPersistedAppEntityShadowSnapshot(
        expected,
        before.manifest,
        before.records,
      ),
    ).resolves.toMatchObject({
      matches: false,
      reason: "source_mismatch",
    });
  });

  it("mantiene aisladas dos cuentas del mismo navegador", async () => {
    const first = await buildPersistedAppEntityShadowSnapshot(
      "workspace-a",
      "raw-a",
      fixture(),
    );
    const second = await buildPersistedAppEntityShadowSnapshot(
      "workspace-b",
      "raw-b",
      fixture(),
    );

    expect(first.records.map((record) => record.id)).not.toEqual(
      second.records.map((record) => record.id),
    );
    await expect(
      verifyPersistedAppEntityShadowSnapshot(
        first,
        second.manifest,
        second.records,
      ),
    ).resolves.toMatchObject({
      matches: false,
      reason: "manifest_invalid",
    });
  });

  it("pasa por la compuerta por cuenta antes de escribir", () => {
    const workerSource = readFileSync(
      new URL("../workers/persisted-app-data-cache.worker.ts", import.meta.url),
      "utf8",
    );

    expect(workerSource).toContain(
      "evaluatePersistedAppEntityShadowCanary",
    );
    expect(workerSource.indexOf("entityShadowCanary.enabled")).toBeLessThan(
      workerSource.indexOf("writePersistedAppEntityShadow("),
    );
  });
});
