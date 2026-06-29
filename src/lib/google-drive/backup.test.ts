import { describe, expect, it } from "vitest";
import {
  buildDriveBackupFileName,
  buildDriveBackupSignature,
  normalizeDriveBackupSettings,
  shouldRunAutomaticDriveBackup,
} from "./backup";
import { DEFAULT_PROFILE, type AppData } from "@/lib/types";

const NOW = new Date("2026-06-29T12:00:00.000Z");

function dataWithDocument(updatedAt: string): AppData {
  return {
    profile: DEFAULT_PROFILE,
    documents: [
      {
        id: "invoice-drive-test",
        type: "factura",
        number: "F-2026-0001",
        date: "2026-06-29",
        client: { name: "Cliente Drive" },
        items: [],
        status: "borrador",
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    expenses: [],
    recurringExpenses: [],
    userReminders: [],
    suppliers: [],
    customers: [],
    counters: {
      factura: 1,
      factura_rectificativa: 0,
      presupuesto: 0,
      recibo: 0,
    },
    meta: {
      lastModified: updatedAt,
    },
  };
}

describe("Google Drive backup", () => {
  it("normaliza ajustes locales sin aceptar valores raros", () => {
    expect(
      normalizeDriveBackupSettings({
        enabled: true,
        frequency: "cada_segundo",
        lastBackupAt: "2026-06-29T10:00:00.000Z",
      }),
    ).toEqual({
      enabled: true,
      frequency: "manual",
      lastBackupAt: "2026-06-29T10:00:00.000Z",
      lastAutoSignature: undefined,
      lastFileId: undefined,
      lastFileName: undefined,
      lastWebViewLink: undefined,
    });
  });

  it("crea nombres de archivo con fecha y hora", () => {
    expect(buildDriveBackupFileName("2026-06-29T12:34:56.000Z")).toBe(
      "factu-autonomo-drive-backup-2026-06-29-1234.json",
    );
  });

  it("evita repetir la copia diaria en el mismo día", () => {
    const data = dataWithDocument("2026-06-29T10:00:00.000Z");
    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "daily",
          lastBackupAt: "2026-06-29T09:00:00.000Z",
        },
        data,
        NOW,
      ).due,
    ).toBe(false);

    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "daily",
          lastBackupAt: "2026-06-28T09:00:00.000Z",
        },
        data,
        NOW,
      ).due,
    ).toBe(true);
  });

  it("detecta cambios importantes en documentos y gastos", () => {
    const data = dataWithDocument("2026-06-29T10:00:00.000Z");
    const signature = buildDriveBackupSignature(data, "important", NOW);

    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "important",
          lastAutoSignature: signature,
        },
        data,
        NOW,
      ).due,
    ).toBe(false);

    const changed = dataWithDocument("2026-06-29T11:00:00.000Z");
    expect(
      shouldRunAutomaticDriveBackup(
        {
          enabled: true,
          frequency: "important",
          lastAutoSignature: signature,
        },
        changed,
        NOW,
      ).due,
    ).toBe(true);
  });
});
