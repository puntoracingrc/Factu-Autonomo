import { describe, expect, it } from "vitest";
import { createBackupBlob, parseBackupJson } from "./backup";
import {
  hasDocumentSnapshot,
  isDocumentIntegrityLocked,
  issueDocument,
} from "./document-integrity";
import { EMPTY_DATA, type Document } from "./types";

const NOW = "2026-06-24T10:00:00.000Z";

function snapshotDocument(): Document {
  return issueDocument(
    {
      id: "doc-snapshot",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-06-24",
      client: { name: "Ana" },
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
      createdAt: "2026-06-24T09:00:00.000Z",
      updatedAt: "2026-06-24T09:00:00.000Z",
    },
    EMPTY_DATA.profile,
    NOW,
  );
}

describe("backup", () => {
  it("valida y normaliza una copia exportada", () => {
    const result = parseBackupJson({
      version: 1,
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        name: "Mi negocio",
      },
    });

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.profile.name).toBe("Mi negocio");
  });

  it("rechaza archivos inválidos", () => {
    const result = parseBackupJson({ foo: "bar" });
    expect(result).toHaveProperty("error");
  });

  it("exportar e importar copia conserva campos de integridad documental", async () => {
    const blob = createBackupBlob({
      ...EMPTY_DATA,
      documents: [
        {
          id: "doc-1",
          type: "factura",
          number: "F-2026-0001",
          date: "2026-06-24",
          client: { name: "Ana" },
          items: [],
          status: "enviado",
          documentLifecycle: "issued",
          integrityLock: "locked",
          deliveryStatus: "not_sent",
          paymentStatus: "pending",
          acceptanceStatus: "not_applicable",
          issuedAt: "2026-06-24T10:00:00.000Z",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T10:00:00.000Z",
        },
      ],
    });

    const result = parseBackupJson(JSON.parse(await blob.text()));

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.documents[0]).toMatchObject({
      documentLifecycle: "issued",
      integrityLock: "locked",
      deliveryStatus: "not_sent",
      paymentStatus: "pending",
      acceptanceStatus: "not_applicable",
      issuedAt: "2026-06-24T10:00:00.000Z",
    });
    expect(isDocumentIntegrityLocked(result.documents[0])).toBe(true);
  });

  it("exportar e importar copia conserva snapshots documentales", async () => {
    const document = {
      ...snapshotDocument(),
      documentSnapshot: {
        ...snapshotDocument().documentSnapshot!,
        futureSnapshotField: { keep: true },
      },
      pdfSnapshot: {
        ...snapshotDocument().pdfSnapshot!,
        futurePdfField: "se conserva",
      },
    } as Document & {
      documentSnapshot: Document["documentSnapshot"] & {
        futureSnapshotField: { keep: boolean };
      };
      pdfSnapshot: Document["pdfSnapshot"] & { futurePdfField: string };
    };
    const blob = createBackupBlob({
      ...EMPTY_DATA,
      documents: [document],
    });

    const result = parseBackupJson(JSON.parse(await blob.text()));

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(hasDocumentSnapshot(result.documents[0])).toBe(true);
    expect(result.documents[0].documentSnapshot?.snapshotHash).toBe(
      document.documentSnapshot?.snapshotHash,
    );
    expect(result.documents[0].pdfSnapshot?.contentHash).toBe(
      document.pdfSnapshot?.contentHash,
    );
    expect(
      (
        result.documents[0].documentSnapshot as Document["documentSnapshot"] & {
          futureSnapshotField?: { keep: boolean };
        }
      )?.futureSnapshotField,
    ).toEqual({ keep: true });
    expect(
      (
        result.documents[0].pdfSnapshot as Document["pdfSnapshot"] & {
          futurePdfField?: string;
        }
      )?.futurePdfField,
    ).toBe("se conserva");
  });

  it("exportar e importar copia conserva customerId y mergedCustomerIds", async () => {
    const blob = createBackupBlob({
      ...EMPTY_DATA,
      customers: [
        {
          id: "customer-1",
          firstName: "Ana",
          lastName: "López",
          name: "Ana López",
          mergedCustomerIds: ["legacy-1"],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      documents: [
        {
          id: "doc-with-customer",
          type: "factura",
          number: "F-2026-0001",
          date: "2026-06-24",
          customerId: "customer-1",
          client: { name: "Ana López" },
          items: [],
          status: "borrador",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
      ],
    });

    const result = parseBackupJson(JSON.parse(await blob.text()));

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.customers[0].mergedCustomerIds).toEqual(["legacy-1"]);
    expect(result.documents[0].customerId).toBe("customer-1");
  });
});
