import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createBackupBlob,
  createBackupFilename,
  createBackupPayload,
  buildBackupImportPreview,
  buildBackupRestoreDraft,
  downloadBackup,
  getBackupRestoreBlocker,
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

  it("conserva las exclusiones de ocurrencias al exportar y restaurar", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        recurringExpenses: [
          {
            id: "recurring-backup",
            supplierName: "Proveedor",
            description: "Servicio mensual",
            amount: 30,
            ivaPercent: 21,
            category: "Servicios",
            paymentMethod: "Domiciliación",
            frequency: "monthly",
            dueTiming: { kind: "end_of_month" },
            duration: { kind: "indefinite" },
            startDate: "2026-01-01",
            enabled: true,
            occurrenceExclusions: [
              {
                key: "recurring-backup:2026-02-28",
                excludedAt: NOW,
              },
            ],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    );

    const restored = parseBackupJson(payload);

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(restored.recurringExpenses[0]?.occurrenceExclusions).toEqual([
      {
        key: "recurring-backup:2026-02-28",
        excludedAt: NOW,
      },
    ]);
  });

  it("conserva la evidencia anidada de recargo al exportar y restaurar", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        expenses: [
          {
            id: "expense-re",
            date: "2026-04-01",
            supplierName: "Proveedor Recargo SL",
            description: "Compra con recargo",
            amount: 100,
            ivaPercent: 21,
            category: "Material",
            paymentMethod: "Tarjeta",
            providerSummary: {
              status: "pending_original",
              summaryId: "summary-re",
              importedAt: NOW,
              summaryInvoiceTotal: 126.2,
              summaryIvaPercent: 21,
              summaryIvaAmount: 21,
              summaryRecargoPercent: 5.2,
              summaryRecargoAmount: 5.2,
            },
            createdAt: NOW,
          },
        ],
      },
      NOW,
    );
    const restored = parseBackupJson(payload);

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(restored.expenses[0]?.providerSummary).toMatchObject({
      summaryIvaPercent: 21,
      summaryRecargoPercent: 5.2,
      summaryRecargoAmount: 5.2,
      summaryInvoiceTotal: 126.2,
    });
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
        "Copia local generada en el navegador. Puede contener datos personales o fiscales; guárdala de forma segura. No restaura datos automáticamente. No incluye los datos y ajustes de Rentabilidad Real guardados solo en este navegador.",
    });
  });

  it("incluye clientes, documentos, gastos, proveedores y configuración del perfil", () => {
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
        suppliers: [
          {
            id: "supplier-1",
            name: "Proveedor Demo",
            createdAt: NOW,
          },
        ],
        expenses: [
          {
            id: "expense-1",
            date: "2026-06-24",
            supplierId: "supplier-1",
            supplierName: "Proveedor Demo",
            description: "Material",
            amount: 100,
            ivaPercent: 21,
            category: "Material",
            paymentMethod: "Tarjeta",
            createdAt: NOW,
          },
        ],
      },
      NOW,
    );

    expect(payload.data.profile.name).toBe("Taller Demo");
    expect(payload.data.customers).toHaveLength(1);
    expect(payload.data.documents).toHaveLength(1);
    expect(payload.data.suppliers).toHaveLength(1);
    expect(payload.data.expenses).toHaveLength(1);
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

  it("expone exportación e importación en vista previa sin restaurar", () => {
    const source = readFileSync(
      new URL("../components/settings/DataOwnershipCard.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("Copia de seguridad");
    expect(source).toContain("Exportar copia de seguridad");
    expect(source).toContain("Importar copia de seguridad");
    expect(source).toContain("Seleccionar archivo de copia");
    expect(source).toContain("Restaurar copia");
  });

  it("la exportación no usa FileReader ni escribe localStorage", () => {
    const helperSource = readFileSync(
      new URL("./backup.ts", import.meta.url),
      "utf8",
    );

    expect(helperSource).not.toContain("FileReader");
    expect(helperSource).not.toContain("localStorage.setItem");
  });

  it("genera vista previa segura de un JSON válido", () => {
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
            id: "quote-1",
            type: "presupuesto",
            number: "P-2026-0001",
            date: "2026-06-24",
            client: { name: "Ana López" },
            items: [],
            status: "borrador",
            createdAt: NOW,
            updatedAt: NOW,
          },
          {
            id: "invoice-1",
            type: "factura",
            number: "F-2026-0001",
            date: "2026-06-24",
            client: { name: "Ana López" },
            items: [],
            status: "pagado",
            documentLifecycle: "issued",
            paymentStatus: "paid",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        suppliers: [
          {
            id: "supplier-1",
            name: "Proveedor Demo",
            createdAt: NOW,
          },
        ],
        expenses: [
          {
            id: "expense-1",
            date: "2026-06-24",
            supplierId: "supplier-1",
            supplierName: "Proveedor Demo",
            description: "Material",
            amount: 100,
            ivaPercent: 21,
            category: "Material",
            paymentMethod: "Tarjeta",
            createdAt: NOW,
          },
        ],
      },
      NOW,
    );

    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 1024,
      rawText: JSON.stringify(payload),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview).toMatchObject({
      exportedAt: NOW,
      exportVersion: 1,
      source: "local",
      hasIssuerProfile: true,
      counts: {
        customers: 1,
        documents: 2,
        quotes: 1,
        invoices: 1,
        issuedInvoices: 1,
        paidInvoices: 1,
        expenses: 1,
        suppliers: 1,
      },
    });
  });

  it("muestra error seguro con JSON inválido", () => {
    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 12,
      rawText: "{ nope",
    });

    expect(result).toEqual({
      ok: false,
      error: "No se pudo leer el JSON de la copia.",
    });
  });

  it("rechaza extensiones prohibidas", () => {
    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup.zip",
      mimeType: "application/json",
      byteLength: 12,
      rawText: "{}",
    });

    expect(result).toEqual({
      ok: false,
      error: "Selecciona una copia en formato JSON.",
    });
  });

  it("rechaza backups sin metadata", () => {
    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 12,
      rawText: JSON.stringify(EMPTY_DATA),
    });

    expect(result).toEqual({
      ok: false,
      error: "La copia no incluye metadata y datos válidos.",
    });
  });

  it("rechaza campos de prototype pollution", () => {
    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 256,
      rawText:
        '{"metadata":{"app":"factura-autonomo","exportVersion":1,"exportedAt":"2026-06-24T10:00:00.000Z","source":"local"},"data":{"profile":{},"customers":[],"documents":[],"__proto__":{"polluted":true}}}',
    });

    expect(result).toEqual({
      ok: false,
      error: "La copia contiene campos no permitidos.",
    });
  });

  it("rechaza campos de token o secreto sin exponerlos", () => {
    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 256,
      rawText: JSON.stringify({
        metadata: {
          app: "factura-autonomo",
          exportVersion: 1,
          exportedAt: NOW,
          source: "local",
        },
        data: {
          profile: {},
          customers: [],
          documents: [],
          accessToken: "SHOULD_NOT_LEAK",
        },
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("La copia contiene campos privados no permitidos.");
    expect(result.error).not.toContain("SHOULD_NOT_LEAK");
    expect(result.error).not.toContain("accessToken");
  });

  it("la vista previa no muestra payload completo", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        customers: [
          {
            id: "customer-1",
            firstName: "Ana",
            lastName: "Secreta",
            name: "Ana Secreta",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    );

    const result = buildBackupImportPreview({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "",
      byteLength: 1024,
      rawText: JSON.stringify(payload),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.stringify(result.preview)).not.toContain("Ana Secreta");
    expect(result.preview.counts.customers).toBe(1);
  });

  it("no escribe localStorage directo ni llama servicios remotos para restaurar", () => {
    const helperSource = readFileSync(
      new URL("./backup.ts", import.meta.url),
      "utf8",
    );
    const cardSource = readFileSync(
      new URL("../components/settings/DataOwnershipCard.tsx", import.meta.url),
      "utf8",
    );

    expect(`${helperSource}\n${cardSource}`).not.toContain("localStorage.setItem");
    expect(cardSource).toContain("replaceData(restoreDraft.data");
    expect(cardSource).not.toContain("getSupabase");
    expect(cardSource).not.toContain("fiscal_transport_attempts");
    expect(cardSource).not.toContain("api/verifactu");
  });

  it("FileReader se limita a la UI de selección de copia", () => {
    const helperSource = readFileSync(
      new URL("./backup.ts", import.meta.url),
      "utf8",
    );
    const cardSource = readFileSync(
      new URL("../components/settings/DataOwnershipCard.tsx", import.meta.url),
      "utf8",
    );

    expect(helperSource).not.toContain("FileReader");
    expect(cardSource).toContain("new FileReader()");
    expect(cardSource).toContain("reader.readAsText(file)");
  });

  it("bloquea restore sin preview", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: false,
        currentBackupReady: true,
        confirmedReplacement: true,
        confirmedCurrentBackup: true,
      }),
    ).toBe("Primero revisa una copia válida.");
  });

  it("bloquea restore sin confirmaciones", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        currentBackupReady: true,
        confirmedReplacement: false,
        confirmedCurrentBackup: true,
      }),
    ).toBe("Confirma que entiendes que se reemplazarán los datos locales.");
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        currentBackupReady: true,
        confirmedReplacement: true,
        confirmedCurrentBackup: false,
      }),
    ).toBe("Confirma que has descargado una copia actual.");
  });

  it("bloquea restore si no hay backup previo actual", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        currentBackupReady: false,
        confirmedReplacement: true,
        confirmedCurrentBackup: true,
      }),
    ).toBe("Descarga antes una copia de seguridad actual.");
  });

  it("permite restore solo con todas las condiciones listas", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        currentBackupReady: true,
        confirmedReplacement: true,
        confirmedCurrentBackup: true,
      }),
    ).toBeNull();
  });

  it("prepara datos restaurables y reemplaza un store en memoria", () => {
    const backupA = createBackupPayload(
      {
        ...EMPTY_DATA,
        profile: {
          ...EMPTY_DATA.profile,
          name: "Datos A",
        },
        customers: [
          {
            id: "customer-a",
            firstName: "Ana",
            lastName: "A",
            name: "Ana A",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    );
    let inMemoryStore = {
      ...EMPTY_DATA,
      profile: {
        ...EMPTY_DATA.profile,
        name: "Datos B",
      },
      customers: [
        {
          id: "customer-b",
          firstName: "Bruno",
          lastName: "B",
          name: "Bruno B",
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
    };

    const draft = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 1024,
      rawText: JSON.stringify(backupA),
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    inMemoryStore = draft.draft.data;
    expect(inMemoryStore.profile.name).toBe("Datos A");
    expect(inMemoryStore.customers.map((customer) => customer.id)).toEqual([
      "customer-a",
    ]);
  });

  it("la restauración preserva estructura esperada", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        documents: [
          {
            id: "invoice-restore",
            type: "factura",
            number: "F-2026-0001",
            date: "2026-06-24",
            client: { name: "Ana" },
            items: [],
            status: "pagado",
            documentLifecycle: "issued",
            paymentStatus: "paid",
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      },
      NOW,
    );

    const draft = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 1024,
      rawText: JSON.stringify(payload),
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.draft.data.documents[0]).toMatchObject({
      id: "invoice-restore",
      type: "factura",
      status: "pagado",
      documentLifecycle: "issued",
      paymentStatus: "paid",
    });
    expect(draft.draft.preview.counts.paidInvoices).toBe(1);
  });

  it("la restauración preserva gastos y proveedores", () => {
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        suppliers: [
          {
            id: "supplier-restore",
            name: "Proveedor Restore",
            nif: "B12345678",
            createdAt: NOW,
          },
        ],
        expenses: [
          {
            id: "expense-restore",
            date: "2026-06-24",
            supplierId: "supplier-restore",
            supplierName: "Proveedor Restore",
            description: "Material",
            amount: 100,
            ivaPercent: 21,
            category: "Material",
            paymentMethod: "Tarjeta",
            createdAt: NOW,
          },
          {
            id: "expense-no-supplier",
            date: "2026-06-25",
            supplierName: "Sin proveedor",
            description: "Peaje",
            amount: 10,
            ivaPercent: 0,
            category: "Transporte",
            paymentMethod: "Tarjeta",
            createdAt: NOW,
          },
        ],
      },
      NOW,
    );

    const draft = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 1024,
      rawText: JSON.stringify(payload),
    });

    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.draft.preview.counts.suppliers).toBe(1);
    expect(draft.draft.preview.counts.expenses).toBe(2);
    expect(draft.draft.data.suppliers[0]).toMatchObject({
      id: "supplier-restore",
      name: "Proveedor Restore",
    });
    expect(draft.draft.data.expenses.map((expense) => expense.id)).toEqual([
      "expense-restore",
      "expense-no-supplier",
    ]);
  });

  it("bloquea JSON malicioso antes de restaurar", () => {
    const draft = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 256,
      rawText:
        '{"metadata":{"app":"factura-autonomo","exportVersion":1,"exportedAt":"2026-06-24T10:00:00.000Z","source":"local"},"data":{"profile":{},"customers":[],"documents":[],"constructor":{"prototype":{"polluted":true}}}}',
    });

    expect(draft).toEqual({
      ok: false,
      error: "La copia contiene campos no permitidos.",
    });
  });

  it("no expone tokens o secrets en errores de restore", () => {
    const draft = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-2026-06-24.json",
      mimeType: "application/json",
      byteLength: 256,
      rawText: JSON.stringify({
        metadata: {
          app: "factura-autonomo",
          exportVersion: 1,
          exportedAt: NOW,
          source: "local",
        },
        data: {
          profile: {},
          customers: [],
          documents: [],
          privateKey: "SHOULD_NOT_LEAK",
        },
      }),
    });

    expect(draft.ok).toBe(false);
    if (draft.ok) return;
    expect(draft.error).toBe("La copia contiene campos privados no permitidos.");
    expect(draft.error).not.toContain("SHOULD_NOT_LEAK");
    expect(draft.error).not.toContain("privateKey");
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
