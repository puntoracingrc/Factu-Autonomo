import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AppStore.tsx", import.meta.url), "utf8");
const persistedCommandSource = readFileSync(
  new URL(
    "../lib/fiscal-notifications/persisted-command.v1.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("AppStore fiscal notifications monitoring", () => {
  it("reporta bloqueos de guardado estructurado al log admin sin datos documentales", () => {
    expect(source).toContain(
      'import { reportAppError } from "@/lib/monitoring/client"',
    );
    expect(source).toContain(
      "function reportFiscalNotificationStructuredReviewSaveFailure",
    );
    expect(source).toContain('result.status !== "blocked"');
    expect(source).toContain('area: "fiscal_notifications"');
    expect(source).toContain("structured_review_save_");
    expect(source).toContain(
      "No se pudo guardar una ficha estructurada de notificaciones.",
    );
    expect(source).toContain("stage: result.stage");
    expect(source).toContain("safeCode: result.safeCode");
    expect(source).toContain("reason: result.reason ?? null");
    expect(source).toContain("warningCount: result.warningCodes.length");
    expect(source).toContain(
      "reportFiscalNotificationStructuredReviewSaveFailure(result);",
    );
  });

  it("mantiene fuera del evento campos sensibles del documento", () => {
    const helper = source.slice(
      source.indexOf(
        "function reportFiscalNotificationStructuredReviewSaveFailure",
      ),
      source.indexOf("interface AppStoreValue"),
    );

    expect(helper).not.toMatch(/\b(pdf|fileName|text|rawText|nif|taxId)\b/i);
    expect(helper).not.toMatch(/\b(amount|importe|reference|referencia)\b/i);
    expect(helper).not.toContain("analysis");
  });

  it("guarda y borra Notificaciones sobre el estado vigente de la cuenta", () => {
    expect(source).toContain(
      "runFiscalNotificationCommandAgainstLatestPersistedV1<",
    );
    expect(source).toContain("fallback: dataRef.current,");
    expect(source).toContain("readPersisted: readPersistedDataSnapshot,");
    expect(source).toContain(
      "fiscalNotificationsBaseAwareProjection: true",
    );
    expect(persistedCommandSource).toContain(
      'first.reason !== "stale_precondition"',
    );
    expect(persistedCommandSource).toContain(
      "const refreshed = input.readPersisted();",
    );
    expect(source).not.toContain('reason: "UNSYNCED_WORKSPACE"');
  });

  it("carga los comandos fiscales infrecuentes solo cuando se ejecutan", () => {
    const importPreamble = source.slice(0, source.indexOf("interface AppStoreValue"));
    const compactSource = source.replace(/\s+/g, "");
    const commandModules = [
      "persisted-command.v1",
      "structured-review-save-command.v1",
      "drive-original-archive-command.v1",
      "document-deletion-command.v1",
      "delete-all-documents-command.v1",
      "empty-history-repair.v1",
    ];

    expect(importPreamble).not.toContain(
      "runFiscalNotificationCommandAgainstLatestPersistedV1",
    );
    expect(importPreamble).not.toContain(
      "runSaveFiscalNotificationStructuredReviewCommandV1",
    );
    expect(importPreamble).not.toContain(
      "runFiscalNotificationDriveArchiveCommandV1",
    );
    expect(importPreamble).not.toContain(
      "runDeleteFiscalNotificationDocumentCommandV1",
    );
    expect(importPreamble).not.toContain(
      "runDeleteAllFiscalNotificationDocumentsCommandV1",
    );
    expect(importPreamble).not.toContain(
      "runRepairFiscalNotificationEmptyHistoryCommandV1",
    );
    for (const moduleName of commandModules) {
      expect(compactSource).toContain(
        `import("@/lib/fiscal-notifications/${moduleName}")`,
      );
    }
  });

  it("inmoviliza la base durable si una escritura queda indeterminada", () => {
    const saveCommand = source.slice(
      source.indexOf("const saveFiscalNotificationStructuredReview"),
      source.indexOf("const archiveFiscalNotificationOriginal"),
    );
    const deleteCommand = source.slice(
      source.indexOf("const deleteFiscalNotificationDocument"),
      source.indexOf("const repairFiscalNotificationEmptyHistory"),
    );

    expect(saveCommand).toContain(
      'result.reason === "storage_state_unknown"',
    );
    expect(saveCommand).toContain('status: "indeterminate"');
    expect(deleteCommand).toContain('result.status === "indeterminate"');
    expect(deleteCommand).toContain(
      "durableStorageBaselineRef.current = result",
    );
  });
});
