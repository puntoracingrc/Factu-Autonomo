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
  MAX_BACKUP_PREVIEW_BYTES,
  parseBackupJson,
  PORTABLE_BACKUP_VERSION,
} from "./backup";
import {
  buildDocumentPdfSnapshot,
  buildDocumentSnapshot,
  hashDocumentPdfSnapshot,
  hashDocumentSnapshot,
  hasDocumentSnapshot,
  inspectDocumentSnapshotsIntegrity,
  isDocumentIntegrityLocked,
  issueDocument,
  markDocumentPaid,
} from "./document-integrity";
import {
  applyAppIssuedDocumentRecovery,
  buildAppIssuedDocumentRecoveryPreview,
  inspectAppIssuedDocumentRecovery,
} from "./document-integrity/app-issued-recovery";
import {
  applyLegacyImportRepair,
  buildLegacyImportRepairPreview,
  inspectLegacyImportAttestation,
} from "./document-integrity/legacy-import-attestation";
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

function attestedHistoricalDocuments(
  options: { count?: number; notes?: string; logoUrl?: string } = {},
): Document[] {
  const capturedAt = "2024-04-01T10:00:00.000Z";
  const profile = {
    ...EMPTY_DATA.profile,
    name: "Negocio histórico",
    nif: "12345678Z",
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
    email: "negocio@example.test",
  };
  const imported = Array.from(
    { length: options.count ?? 1 },
    (_, index): Document => {
      const sequence = String(index + 1).padStart(4, "0");
      return {
        id: `pcfacturacion:factura:F-2024-${sequence}`,
        type: "factura",
        number: `F-2024-${sequence}`,
        date: "2024-04-01",
        client: {
          name: "",
          nif: "",
          address: "",
          city: "",
          postalCode: "",
        },
        items: [
          {
            id: `line-${sequence}`,
            description: "",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        notes: options.notes,
        status: "enviado",
        issuer: {
          name: "",
          nif: "",
          address: "",
          city: "",
          postalCode: "",
          email: "",
          logoUrl: options.logoUrl,
          capturedAt,
        },
        documentLifecycle: "issued",
        integrityLock: "locked",
        snapshotIntegrityRequired: true,
        snapshotIntegrity: {
          status: "blocked",
          issues: [
            "document_snapshot_missing",
            "pdf_snapshot_missing",
            "snapshot_seal_missing",
          ],
        },
        createdAt: capturedAt,
        updatedAt: capturedAt,
      };
    },
  );
  const data = {
    ...EMPTY_DATA,
    profile,
    documents: imported,
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    NOW,
  );
  if (result.status !== "applied") {
    throw new Error("No se pudo construir el fixture histórico atestado.");
  }
  return result.data.documents;
}

function attestedHistoricalDocument(
  options: { notes?: string; logoUrl?: string } = {},
): Document {
  return attestedHistoricalDocuments(options)[0]!;
}

function attestedHistoricalReceiptDocuments(): Document[] {
  const invoiceId = "pcfacturacion:factura:F-2024-0001";
  const receiptId = "pcfacturacion:recibo:R-2024-0001";
  const profile = {
    ...EMPTY_DATA.profile,
    name: "Negocio historico",
    nif: "12345678Z",
    address: "Calle Mayor 1",
    city: "Madrid",
    postalCode: "28001",
  };
  const historical = (
    id: string,
    type: Document["type"],
    number: string,
    date: string,
  ): Document => ({
    id,
    type,
    number,
    date,
    client: { name: "Cliente historico" },
    items: [
      {
        id: `${id}:line:1`,
        description: "Servicio historico",
        quantity: 1,
        unitPrice: 100,
        ivaPercent: 21,
      },
    ],
    status: "pagado",
    issuer: {
      name: profile.name,
      nif: profile.nif,
      address: profile.address,
      city: profile.city,
      postalCode: profile.postalCode,
      capturedAt: `${date}T10:00:00.000Z`,
    },
    documentLifecycle: "issued",
    integrityLock: "locked",
    snapshotIntegrityRequired: true,
    snapshotIntegrity: {
      status: "blocked",
      issues: [
        "document_snapshot_missing",
        "pdf_snapshot_missing",
        "snapshot_seal_missing",
      ],
    },
    createdAt: `${date}T10:00:00.000Z`,
    updatedAt: `${date}T10:00:00.000Z`,
  });
  const data = {
    ...EMPTY_DATA,
    profile,
    documents: [
      {
        ...historical(invoiceId, "factura", "F-2024-0001", "2024-04-01"),
        receiptDocumentId: receiptId,
      },
      {
        ...historical(receiptId, "recibo", "R-2024-0001", "2024-04-02"),
        sourceDocumentId: invoiceId,
      },
    ],
    snapshotIntegrityVersion: 1 as const,
  };
  const result = applyLegacyImportRepair(
    data,
    buildLegacyImportRepairPreview(data),
    "2026-07-13T08:00:00.000Z",
  );
  if (result.status !== "applied") {
    throw new Error(`No se pudo atestar el recibo historico: ${result.reason}`);
  }
  return result.data.documents;
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

  it("conserva el antes/después reversible de una reparación de repartos", () => {
    const beforeAllocation = {
      workDocumentId: "doc-work",
      amount: 100,
      includedLineIds: ["line-1"],
      allocatedAt: NOW,
    };
    const afterAllocation = {
      ...beforeAllocation,
      amount: 126.2,
      fullAmountAtAllocation: 126.2,
    };
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        expenses: [
          {
            id: "expense-repair",
            date: "2026-04-01",
            supplierName: "Proveedor Recargo SL",
            description: "Compra repartida",
            amount: 100,
            ivaPercent: 21,
            category: "Material",
            paymentMethod: "Tarjeta",
            workDocumentId: "doc-work",
            workAllocations: [afterAllocation],
            workAllocationCostRepair: {
              schemaVersion: 1,
              kind: "provider_summary_equivalence_surcharge_v1",
              repairId: "aud-p2-26-work-allocation:expense-repair:v1",
              status: "applied",
              legacyOperatingCost: 100,
              canonicalOperatingCost: 126.2,
              beforeFingerprint: "before",
              afterFingerprint: "after",
              beforeAllocations: [beforeAllocation],
              afterAllocations: [afterAllocation],
              events: [{ action: "applied", at: NOW }],
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
    expect(restored.expenses[0]?.workAllocations).toEqual([afterAllocation]);
    expect(restored.expenses[0]?.workAllocationCostRepair).toMatchObject({
      beforeAllocations: [beforeAllocation],
      afterAllocations: [afterAllocation],
      events: [{ action: "applied", at: NOW }],
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
    expect(createBackupFilename(NOW, "pre_restore")).toBe(
      "factu-autonomo-backup-antes-restaurar-2026-06-24-10-00-00.json",
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
    expect(result.error).toBe(
      "La copia contiene campos privados no permitidos.",
    );
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

    expect(`${helperSource}\n${cardSource}`).not.toContain(
      "localStorage.setItem",
    );
    expect(cardSource).toContain("runBackupRestoreWithSafetyCopy");
    expect(cardSource).toContain("getCurrent: getCurrentData");
    expect(cardSource).toContain('purpose: "pre_restore"');
    expect(cardSource).toContain("restore: restoreBackupData");
    expect(cardSource).toContain('result.status === "indeterminate"');
    expect(cardSource).toContain('result.status === "blocked"');
    expect(cardSource).toContain('result.reason === "stale_precondition"');
    expect(cardSource).not.toContain("currentBackupData");
    expect(cardSource).not.toContain("confirmedCurrentBackup");
    expect(cardSource).not.toContain("window.setTimeout");
    expect(cardSource).toContain("window.requestAnimationFrame");
    expect(cardSource).toContain("} finally {");
    expect(cardSource).toContain("restoreLockRef.current");
    expect(cardSource).not.toContain("getSupabase");
    expect(cardSource).not.toContain("fiscal_transport_attempts");
    expect(cardSource).not.toContain("api/verifactu");

    const restoreHandler = cardSource.slice(
      cardSource.indexOf("async function handleRestoreBackup"),
    );
    expect(restoreHandler.indexOf("window.requestAnimationFrame")).toBeLessThan(
      restoreHandler.indexOf("runBackupRestoreWithSafetyCopy({"),
    );
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
        confirmedReplacement: true,
      }),
    ).toBe("Primero revisa una copia válida.");
  });

  it("bloquea restore sin confirmaciones", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        confirmedReplacement: false,
      }),
    ).toBe("Confirma que entiendes que se reemplazarán los datos locales.");
  });

  it("permite restore solo con todas las condiciones listas", () => {
    expect(
      getBackupRestoreBlocker({
        draftReady: true,
        confirmedReplacement: true,
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
    expect(draft.error).toBe(
      "La copia contiene campos privados no permitidos.",
    );
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

  it("exportar e importar conserva exactamente la atestación histórica", () => {
    const document = attestedHistoricalDocument();
    const expectedAttestation = document.legacyImportAttestation;
    expect(expectedAttestation).toMatchObject({
      schemaVersion: 2,
      acceptanceBasis: "amounts_as_filed_user_attested",
      amountOrigin: "persisted_lines_user_confirmed",
      sourceRecord: {
        client: { name: "", nif: "" },
        issuer: { name: "", nif: "" },
        items: [{ description: "" }],
      },
      sourceRecordHash: expect.stringMatching(/^sha256:/),
      acceptedTaxSummary: { subtotal: 100, iva: 21, total: 121 },
      acceptedContentPolicy: {
        kind: "stored_fiscal_content_user_authoritative",
        completenessExceptions: [
          "issuer_name_missing",
          "issuer_nif_missing_or_nonstandard",
          "issuer_address_missing",
          "issuer_city_missing",
          "issuer_postal_code_missing",
          "customer_name_missing",
          "customer_nif_missing_or_nonstandard",
          "customer_address_missing",
          "customer_city_missing",
          "customer_postal_code_missing",
          "line_description_missing",
        ],
      },
    });
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        documents: [document],
        snapshotIntegrityVersion: 1,
      },
      NOW,
    );

    const restored = parseBackupJson(JSON.parse(JSON.stringify(payload)));

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(restored.documents[0]?.legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(restored.documents[0]?.documentSnapshot).toEqual(
      document.documentSnapshot,
    );
    expect(restored.documents[0]?.pdfSnapshot).toBeUndefined();
    expect(restored.documents[0]?.snapshotSeal).toBeUndefined();
    expect(inspectLegacyImportAttestation(restored.documents[0]!).ok).toBe(
      true,
    );
  });

  it("exportar e importar conserva exactamente una relación histórica V3", () => {
    const documents = attestedHistoricalReceiptDocuments();
    const expected = documents.map((document) => ({
      id: document.id,
      attestation: document.legacyImportAttestation,
      snapshot: document.documentSnapshot,
    }));
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        documents,
        snapshotIntegrityVersion: 1,
      },
      NOW,
    );

    const restored = parseBackupJson(JSON.parse(JSON.stringify(payload)));

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(
      restored.documents.map((document) => ({
        id: document.id,
        attestation: document.legacyImportAttestation,
        snapshot: document.documentSnapshot,
      })),
    ).toEqual(expected);
    expect(restored.documents[0].receiptDocumentId).toBe(
      restored.documents[1].id,
    );
    expect(restored.documents[1].sourceDocumentId).toBe(
      restored.documents[0].id,
    );
    expect(
      restored.documents.every(
        (document) => inspectLegacyImportAttestation(document).ok,
      ),
    ).toBe(true);
  });

  it("exportar e importar conserva exactamente una recuperación V2 con evidencia TEST local", async () => {
    const documentId = "11111111-2222-4333-8444-555555555555";
    const profile = {
      ...EMPTY_DATA.profile,
      name: "Negocio sintético",
      nif: "B12345678",
      address: "Calle Prueba 1",
      city: "Madrid",
      postalCode: "28001",
    };
    const issued = markDocumentPaid(
      issueDocument(
        {
          id: documentId,
          type: "factura",
          number: "F-TEST-0002",
          date: "2026-07-06",
          client: {
            name: "Cliente sintético",
            nif: "B87654321",
            address: "Calle Cliente 2",
            city: "Madrid",
            postalCode: "28002",
          },
          items: [
            {
              id: "line-test-v2",
              description: "Servicio sintético",
              quantity: 1,
              unitPrice: 90,
              ivaPercent: 21,
            },
          ],
          status: "borrador",
          documentLifecycle: "draft",
          integrityLock: "unlocked",
          createdAt: NOW,
          updatedAt: NOW,
        },
        profile,
        NOW,
      ),
      NOW,
    );
    const originalVerifactu = {
      recordHash: "a".repeat(64),
      previousHash: "",
      recordTimestamp: NOW,
      qrUrl: "https://example.invalid/verifactu-test",
      status: "test_registered" as const,
      recordType: "alta" as const,
      environment: "test" as const,
      tipoFactura: "F1",
      cuotaTotal: "18.90",
      importeTotal: "108.90",
      csv: "TEST-SYNTHETIC-CSV",
      submittedAt: NOW,
    };
    const snapshotBeforeTestArtifact = buildDocumentSnapshot(issued, profile, {
      capturedAt: NOW,
      source: "legacy_backfill",
      issuer: issued.documentSnapshot!.issuer,
    });
    const pdfBeforeTestArtifact = buildDocumentPdfSnapshot(
      snapshotBeforeTestArtifact,
      profile,
      NOW,
    );
    const snapshotContent = {
      ...snapshotBeforeTestArtifact,
      verifactu: originalVerifactu,
    };
    const originalSnapshot = {
      ...snapshotContent,
      snapshotHash: hashDocumentSnapshot(snapshotContent),
    };
    const originalPdfSnapshot = {
      ...pdfBeforeTestArtifact,
      contentHash: hashDocumentPdfSnapshot({
        ...pdfBeforeTestArtifact,
        documentSnapshotHash: originalSnapshot.snapshotHash,
      }),
    };
    const recoverable: Document = {
      ...issued,
      documentSnapshot: originalSnapshot,
      pdfSnapshot: originalPdfSnapshot,
      snapshotSeal: undefined,
      snapshotIntegrityRequired: undefined,
      snapshotIntegrity: {
        status: "blocked",
        issues: ["document_snapshot_semantic_invalid"],
      },
      verifactu: originalVerifactu,
      verifactuPersistence: "legacy_unverified",
    };
    const data = {
      ...EMPTY_DATA,
      profile,
      documents: [recoverable],
      snapshotIntegrityVersion: 1 as const,
    };
    const originalIntegrity = inspectDocumentSnapshotsIntegrity(recoverable, {
      requireDocumentSnapshot: true,
      requirePdfSnapshot: true,
    });
    expect(originalIntegrity.documentSnapshot.status).toBe("verified");
    expect(originalIntegrity.pdfSnapshot.status).toBe("verified");
    expect(originalIntegrity.issues).toEqual([
      "document_snapshot_semantic_invalid",
    ]);
    const pending = buildAppIssuedDocumentRecoveryPreview(data);
    const recoveredSnapshot = pending.candidates[0]?.members[0]
      ?.recoveredSnapshot;
    expect(pending.requiredPdfDocumentIds).toEqual([documentId]);
    expect(recoveredSnapshot).toBeDefined();
    if (!recoveredSnapshot) return;

    const preview = buildAppIssuedDocumentRecoveryPreview(data, {
      [documentId]: {
        kind: "external_pdf_user_confirmed",
        sha256: "b".repeat(64),
        byteLength: 42_000,
        mediaType: "application/pdf",
        preservation: "user_managed",
        confirmedSummary: {
          number: recoveredSnapshot.number,
          date: recoveredSnapshot.date,
          subtotal: recoveredSnapshot.taxSummary.subtotal,
          iva: recoveredSnapshot.taxSummary.iva,
          total: recoveredSnapshot.taxSummary.total,
          confirmedFiscalContentHash: recoveredSnapshot.snapshotHash,
        },
      },
    });
    const applied = applyAppIssuedDocumentRecovery(data, preview, NOW);
    expect(applied.status).toBe("applied");
    if (applied.status !== "applied") return;
    const recoveredDocument = applied.data.documents[0]!;
    const expectedAttestation = recoveredDocument.appIssuedRecoveryAttestation;
    expect(expectedAttestation).toMatchObject({
      schemaVersion: 2,
      recoveryKind: "pre_seal_snapshot_pdf_gap_v1",
      counterpartDocumentId: null,
      verifactuDisposition: "preserved_unattested_test_artifact",
      beforeEvidence: {
        snapshotSeal: { present: false },
        snapshotIntegrityRequired: { present: false },
        snapshotIntegrity: {
          present: true,
          value: {
            status: "blocked",
            issues: ["document_snapshot_semantic_invalid"],
          },
        },
        verifactu: { present: true, value: originalVerifactu },
        verifactuPersistence: {
          present: true,
          value: "legacy_unverified",
        },
      },
    });
    expect(inspectAppIssuedDocumentRecovery(recoveredDocument)).toMatchObject({
      ok: true,
      active: true,
      kind: "pre_seal_snapshot_pdf_gap_v1",
    });

    const blob = createBackupBlob(applied.data, NOW);
    const restored = parseBackupJson(JSON.parse(await blob.text()));

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    const restoredDocument = restored.documents[0]!;
    expect(restoredDocument.appIssuedRecoveryAttestation).toEqual(
      expectedAttestation,
    );
    expect(restoredDocument.documentSnapshot).toEqual(originalSnapshot);
    expect(restoredDocument.pdfSnapshot).toEqual(originalPdfSnapshot);
    expect(restoredDocument.snapshotSeal).toBeUndefined();
    expect(restoredDocument.verifactu).toEqual(originalVerifactu);
    expect(restoredDocument.verifactuPersistence).toBe("legacy_unverified");
    expect(
      restoredDocument.appIssuedRecoveryAttestation?.beforeEvidence
        .documentSnapshot,
    ).toEqual({ present: true, value: originalSnapshot });
    expect(
      restoredDocument.appIssuedRecoveryAttestation?.beforeEvidence.pdfSnapshot,
    ).toEqual({ present: true, value: originalPdfSnapshot });
    expect(
      restoredDocument.appIssuedRecoveryAttestation?.recoveredSnapshot
        ?.verifactu,
    ).toBeUndefined();
    expect(inspectAppIssuedDocumentRecovery(restoredDocument)).toMatchObject({
      ok: true,
      active: true,
      kind: "pre_seal_snapshot_pdf_gap_v1",
    });
  });

  it("restaura una copia V2 válida mayor de 5 MiB sin perder su atestación", () => {
    const document = attestedHistoricalDocument({
      notes: "evidencia-historica-".repeat(100_000),
    });
    const expectedAttestation = document.legacyImportAttestation;
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        documents: [document],
        snapshotIntegrityVersion: 1,
      },
      NOW,
    );
    const rawText = JSON.stringify(payload);
    const byteLength = new TextEncoder().encode(rawText).byteLength;

    expect(byteLength).toBeGreaterThan(5 * 1024 * 1024);
    expect(byteLength).toBeLessThan(MAX_BACKUP_PREVIEW_BYTES);

    const restored = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-historico-grande.json",
      mimeType: "application/json",
      byteLength,
      rawText,
    });

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    const restoredDocument = restored.draft.data.documents[0]!;
    expect(restoredDocument.legacyImportAttestation).toEqual(
      expectedAttestation,
    );
    expect(inspectLegacyImportAttestation(restoredDocument).ok).toBe(true);
  }, 15_000);

  it("rechaza una copia mayor del límite antes de intentar leer el JSON", () => {
    const result = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-demasiado-grande.json",
      mimeType: "application/json",
      byteLength: MAX_BACKUP_PREVIEW_BYTES + 1,
      rawText: "JSON deliberadamente inválido",
    });

    expect(result).toEqual({
      ok: false,
      error: "El archivo es demasiado grande para revisarlo.",
    });
  });

  it("deduplica el logo repetido de 748 históricos V2 y lo restaura exactamente", async () => {
    const logoUrl = `data:image/png;base64,${"A".repeat(20 * 1024)}`;
    const template = attestedHistoricalDocument({ logoUrl });
    // El objetivo de este corpus es el tamaño/rehidratación del formato
    // portable. Las 748 entradas repiten deliberadamente el mismo ID para no
    // gastar el timeout recalculando atestaciones; el restore debe conservar
    // los assets y, por separado, bloquear correctamente esos duplicados.
    const documents = Array.from({ length: 748 }, () => template);
    const data = {
      ...EMPTY_DATA,
      documents,
      snapshotIntegrityVersion: 1 as const,
    };
    const legacyRawText = JSON.stringify(createBackupPayload(data, NOW));

    expect(new TextEncoder().encode(legacyRawText).byteLength).toBeGreaterThan(
      MAX_BACKUP_PREVIEW_BYTES,
    );

    const blob = createBackupBlob(data, NOW);
    const portableRawText = await blob.text();
    const portable = JSON.parse(portableRawText) as {
      metadata: { exportVersion: number };
      assets: Record<string, string>;
    };

    expect(portable.metadata.exportVersion).toBe(PORTABLE_BACKUP_VERSION);
    expect(Object.values(portable.assets)).toEqual([logoUrl]);
    expect(blob.size).toBeLessThan(MAX_BACKUP_PREVIEW_BYTES);

    const restored = buildBackupRestoreDraft({
      fileName: "factu-autonomo-backup-748-historicos.json",
      mimeType: "application/json",
      byteLength: blob.size,
      rawText: portableRawText,
    });

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.draft.data.documents).toHaveLength(748);
    expect(
      restored.draft.data.documents.every(
        (document) =>
          document.issuer?.logoUrl === logoUrl &&
          document.documentSnapshot?.issuer.logoUrl === logoUrl &&
          document.legacyImportAttestation?.schemaVersion === 2 &&
          document.legacyImportAttestation.sourceRecord.issuer.logoUrl ===
            logoUrl,
      ),
    ).toBe(true);
    expect(
      restored.draft.data.documents.every((document) =>
        document.snapshotIntegrity?.issues.includes(
          "document_relationship_invalid",
        ),
      ),
    ).toBe(true);
  }, 20_000);

  it("rehidrata assets V2 en preview, restore y lectura directa", async () => {
    const logoUrl = "data:image/png;base64,QUJDRA==";
    const blob = createBackupBlob(
      {
        ...EMPTY_DATA,
        profile: { ...EMPTY_DATA.profile, logoUrl },
      },
      NOW,
    );
    const rawText = await blob.text();
    const candidate = {
      fileName: "factu-autonomo-backup-portable.json",
      mimeType: "application/json",
      byteLength: blob.size,
      rawText,
    };

    expect(buildBackupImportPreview(candidate).ok).toBe(true);
    const draft = buildBackupRestoreDraft(candidate);
    expect(draft.ok && draft.draft.data.profile.logoUrl).toBe(logoUrl);

    const parsed = parseBackupJson(JSON.parse(rawText));
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.profile.logoUrl).toBe(logoUrl);
  });

  it.each(["missing", "corrupt"] as const)(
    "bloquea una referencia portable %s antes de normalizar",
    async (failure) => {
      const blob = createBackupBlob(
        {
          ...EMPTY_DATA,
          profile: {
            ...EMPTY_DATA.profile,
            logoUrl: "data:image/png;base64,QUJDRA==",
          },
        },
        NOW,
      );
      const portable = JSON.parse(await blob.text()) as {
        assets: Record<string, string>;
      };
      const assetId = Object.keys(portable.assets)[0]!;
      if (failure === "missing") {
        delete portable.assets[assetId];
      } else {
        portable.assets[assetId] = `${portable.assets[assetId]}A`;
      }
      const rawText = JSON.stringify(portable);
      const candidate = {
        fileName: "factu-autonomo-backup-portable-corrupto.json",
        mimeType: "application/json",
        byteLength: new TextEncoder().encode(rawText).byteLength,
        rawText,
      };

      expect(buildBackupImportPreview(candidate)).toEqual({
        ok: false,
        error: "La copia portable contiene referencias de assets no válidas.",
      });
      expect(buildBackupRestoreDraft(candidate)).toEqual({
        ok: false,
        error: "La copia portable contiene referencias de assets no válidas.",
      });
      expect(parseBackupJson(portable)).toEqual({
        error: "La copia portable contiene referencias de assets no válidas.",
      });
    },
  );

  it("no convierte en válida una atestación corrupta al restaurar", () => {
    const valid = attestedHistoricalDocument();
    const corrupt: Document = {
      ...valid,
      legacyImportAttestation: {
        ...valid.legacyImportAttestation!,
        attestationHash: "sha256:corrupt",
      },
    };
    const payload = createBackupPayload(
      {
        ...EMPTY_DATA,
        documents: [corrupt],
        snapshotIntegrityVersion: 1,
      },
      NOW,
    );

    const restored = parseBackupJson(JSON.parse(JSON.stringify(payload)));

    expect("error" in restored).toBe(false);
    if ("error" in restored) return;
    expect(restored.documents[0]?.legacyImportAttestation).toEqual(
      corrupt.legacyImportAttestation,
    );
    expect(inspectLegacyImportAttestation(restored.documents[0]!).ok).toBe(
      false,
    );
    expect(restored.documents[0]?.snapshotIntegrity).toMatchObject({
      status: "blocked",
      issues: expect.arrayContaining(["legacy_import_attestation_invalid"]),
    });
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
