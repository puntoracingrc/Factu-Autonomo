import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBackupBlob,
  createBackupFilename,
  createBackupPayload,
  downloadBackup,
  parseBackupJson,
} from "./backup";
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("valida y normaliza una copia con metadata y datos anidados", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Mi negocio",
        },
      },
      NOW,
    );

    const result = parseBackupJson(payload);

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.profile.name).toBe("Mi negocio");
  });

  it("rechaza archivos inválidos", () => {
    const result = parseBackupJson({ foo: "bar" });
    expect(result).toHaveProperty("error");
  });

  it("construye metadata local de copia de seguridad", () => {
    const payload = createBackupPayload(EMPTY_DATA, NOW);

    expect(payload.metadata).toEqual({
      app: "factura-autonomo",
      exportVersion: 1,
      exportedAt: NOW,
      source: "local",
      warning:
        "Copia local generada en el navegador. Puede contener datos personales o fiscales; guárdala de forma segura. No se sube a ningún servidor ni restaura datos automáticamente.",
    });
  });

  it("incluye clientes, documentos y configuración del perfil", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Taller Demo",
          nif: "12345678Z",
        },
        customers: [
          {
            id: "customer-1",
            firstName: "Ana",
            lastName: "López",
            name: "Ana López",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        documents: [
          {
            id: "doc-1",
            type: "factura",
            number: "F-2026-0001",
            date: "2026-06-24",
            client: { name: "Ana López" },
            items: [],
            status: "borrador",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    );

    expect(payload.data.profile.name).toBe("Taller Demo");
    expect(payload.data.customers).toHaveLength(1);
    expect(payload.data.documents).toHaveLength(1);
  });

  it("no exporta metadata interna, secrets ni tokens", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        meta: {
          lastModified: NOW,
          pendingChanges: [
            {
              entityType: "profile",
              entityId: "profile",
              deleted: false,
              updatedAt: NOW,
              payload: {
                accessToken: "SHOULD_NOT_LEAK",
                apiKey: "ALSO_BLOCKED",
              },
            },
          ],
        },
      },
      NOW,
    );
    const serialized = JSON.stringify(payload);

    expect(payload.data.meta).toBeUndefined();
    expect(serialized).not.toContain("SHOULD_NOT_LEAK");
    expect(serialized).not.toContain("ALSO_BLOCKED");
    expect(serialized).not.toMatch(/accessToken|apiKey|secret|password/i);
  });

  it("genera nombre de archivo con fecha", () => {
    expect(createBackupFilename(NOW)).toBe(
      "factu-autonomo-backup-2026-06-24.json",
    );
  });

  it("usa Blob y descarga controlada desde el navegador", () => {
    const click = vi.fn();
    const anchor = {
      href: "",
      download: "",
      rel: "",
      click,
    };
    const createObjectURL = vi.fn(() => "blob:backup");
    const revokeObjectURL = vi.fn();
    const createElement = vi.fn(() => anchor);

    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const result = downloadBackup(EMPTY_DATA, {
      now: () => new Date(NOW),
    });

    expect(result).toEqual({
      ok: true,
      filename: "factu-autonomo-backup-2026-06-24.json",
    });
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createElement).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe("blob:backup");
    expect(anchor.download).toBe("factu-autonomo-backup-2026-06-24.json");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
  });

  it("devuelve feedback seguro si no hay descarga de navegador", () => {
    const result = downloadBackup(EMPTY_DATA, {
      now: () => new Date(NOW),
    });

    expect(result).toEqual({
      ok: false,
      error: "La descarga no está disponible en este navegador.",
    });
  });

  it("expone solo exportación visible en configuración", () => {
    const source = readFileSync(
      new URL("../components/settings/DataOwnershipCard.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Copia de seguridad");
    expect(source).toContain("Exportar copia de seguridad");
    expect(source).not.toContain("Importar");
    expect(source).not.toContain("Restaurar");
  });

  it("la exportación no usa FileReader ni escribe localStorage", () => {
    const helperSource = readFileSync(
      new URL("./backup.ts", import.meta.url),
      "utf8",
    );
    const cardSource = readFileSync(
      new URL("../components/settings/DataOwnershipCard.tsx", import.meta.url),
      "utf8",
    );
    const source = `${helperSource}\n${cardSource}`;

    expect(source).not.toContain("FileReader");
    expect(source).not.toContain("localStorage.setItem");
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

  it("exportar e importar copia conserva vínculos factura-recibo", async () => {
    const blob = createBackupBlob({
      ...EMPTY_DATA,
      documents: [
        {
          id: "invoice-1",
          type: "factura",
          number: "F-2026-0001",
          date: "2026-06-24",
          client: { name: "Ana López" },
          items: [],
          status: "pagado",
          receiptDocumentId: "receipt-1",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
        {
          id: "receipt-1",
          type: "recibo",
          number: "R-2026-0001",
          date: "2026-06-24",
          client: { name: "Ana López" },
          items: [],
          status: "pagado",
          sourceDocumentId: "invoice-1",
          createdAt: "2026-06-24T09:00:00.000Z",
          updatedAt: "2026-06-24T09:00:00.000Z",
        },
      ],
    });

    const result = parseBackupJson(JSON.parse(await blob.text()));

    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.documents[0].receiptDocumentId).toBe("receipt-1");
    expect(result.documents[1].sourceDocumentId).toBe("invoice-1");
  });
});
