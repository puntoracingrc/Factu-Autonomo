import { describe, expect, it } from "vitest";
import { createBackupBlob, parseBackupJson } from "./backup";
import { isDocumentIntegrityLocked } from "./document-integrity";
import { EMPTY_DATA } from "./types";

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
});
