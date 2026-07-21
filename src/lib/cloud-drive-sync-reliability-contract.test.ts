import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("cloud and Drive reliability contract", () => {
  it("serializa subida, pull y descarga completa con un bloqueo liberable", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const operation = source("src/lib/cloud/sync-operation.ts");

    expect(context.match(/runExclusiveSyncOperation\(syncing/g)).toHaveLength(
      3,
    );
    expect(context).toContain("await pushToCloud(workingData, true, options)");
    expect(context).not.toContain("syncing.current = true");
    expect(operation).toContain("finally");
    expect(operation).toContain("lock.current = false");
  });

  it("repara un dispositivo y restaura JSON sin subir primero datos locales", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const store = source("src/context/AppStore.tsx");
    const repair = source("src/lib/cloud/device-repair.ts");
    const ownership = source("src/components/settings/DataOwnershipCard.tsx");
    const account = source("src/components/cloud/CloudAccountCard.tsx");
    const forceRepair = context.slice(
      context.indexOf("const forceDownloadFromCloud"),
      context.indexOf("const schedulePush"),
    );

    expect(forceRepair).toContain("pauseCloudOperationsForRepair(");
    expect(forceRepair.indexOf("pauseCloudOperationsForRepair(")).toBeLessThan(
      forceRepair.indexOf("await ensureCloudReadyForCurrentDevice"),
    );
    expect(forceRepair).toContain("runCloudDeviceRepair<");
    expect(forceRepair).toContain("downloadProtectedBackup(current");
    expect(forceRepair).toContain("requireEncryption: true");
    expect(forceRepair).not.toContain("pushToCloud(");
    expect(forceRepair.indexOf("replaceCloudSnapshotDurably")).toBeLessThan(
      forceRepair.indexOf("clearSyncPending()"),
    );
    expect(store).toContain("commitCloudSnapshotDurably({");
    expect(repair).toContain("input.persist(");
    expect(repair).not.toContain("trackDataDiff");
    expect(ownership).toContain("pauseCloudForLocalRestore()");
    expect(account).toContain(
      "sin subir antes los cambios de este dispositivo",
    );
  });

  it("pausa una divergencia fiscal y dirige a una reparacion explicita", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const appStore = source("src/context/AppStore.tsx");
    const indicator = source(
      "src/components/cloud/CloudSyncIndicator.tsx",
    );
    const account = source("src/components/cloud/CloudAccountCard.tsx");
    const queue = source("src/lib/cloud/sync-queue.ts");
    const errors = source("src/lib/cloud/sync-errors.ts");
    const reviewStorage = source("src/lib/cloud/sync-review-storage.ts");
    const authGuard = source("src/lib/cloud/auth-operation-guard.ts");
    const reviewGuard = source(
      "src/lib/cloud/sync-review-operation-guard.ts",
    );
    const adoption = source(
      "src/lib/cloud/persisted-snapshot-adoption.ts",
    );
    const repair = source("src/lib/cloud/device-repair.ts");
    const adr = source(
      "docs/architecture/ADR-0005-cloud-and-drive-sync-reliability.md",
    );
    const forceRepair = context.slice(
      context.indexOf("const forceDownloadFromCloud"),
      context.indexOf("const schedulePush"),
    );

    expect(context).toContain("activateCloudSyncReviewIssue(reviewIssue)");
    expect(context).toContain("syncIssueRef.current?.automaticRetryBlocked");
    expect(context).toContain("rememberCloudSyncReviewIssue");
    expect(context).toContain("subscribeCloudSyncReviewIssue");
    expect(context).toContain(
      "adoptPersistedCloudSnapshot(snapshot, expectedCurrent)",
    );
    expect(context).toContain("readPersistedDataSnapshot()");
    expect(context).toContain("invalidateSyncReviewOperations(activeUserId)");
    expect(context).toContain("reviewOperationIsCurrent()");
    expect(context).toContain("resolveCloudSyncReviewFromPersistedSnapshot({");
    expect(context).toContain(
      "Resuelve primero el conflicto de sincronización desde Cuenta.",
    );
    expect(context).toContain("uploadMode: uploadPlan.uploadMode");
    expect(context).toContain(
      "containsFiscalWorkspace: uploadPlan.containsFiscalWorkspace",
    );
    expect(forceRepair).toContain("pauseCloudOperationsForRepair(");
    expect(forceRepair).not.toContain("pauseAutomaticCloud(");
    expect(forceRepair).toContain("clearActiveCloudSyncReviewIssue()");
    expect(forceRepair).toContain("captureCloudAuthOperation(");
    expect(forceRepair).toContain("isCloudAuthOperationCurrent(");
    expect(forceRepair).toContain(
      "isOperationCurrent: repairOperationIsCurrent",
    );
    expect(forceRepair.indexOf('repair.status === "operation_invalidated"')).toBeLessThan(
      forceRepair.indexOf("clearSyncPending()"),
    );
    expect(forceRepair.indexOf("captureCloudAuthOperation(")).toBeLessThan(
      forceRepair.indexOf("await ensureCloudReadyForCurrentDevice"),
    );
    expect(indicator).toContain("Resolver conflicto");
    expect(indicator).toContain('href="/cuenta"');
    expect(account).toContain('syncIssue ? "Revisión necesaria"');
    expect(account).toContain("Los reintentos automáticos están en pausa");
    expect(account).toContain("limits.cloudSync && !syncIssue");
    expect(account).toContain(
      "Ahora solo está disponible conservar la copia de la nube",
    );
    expect(account).toMatch(
      /onClick=\{\(\) => void signOut\(\)\}[\s\S]*disabled=\{busy\}/,
    );
    expect(queue).toContain('"full_snapshot_rebuild"');
    expect(errors).toContain('"fiscal_workspace_diverged"');
    expect(reviewStorage).toContain('window.addEventListener("storage"');
    expect(authGuard).toContain("identity.generation === operation.generation");
    expect(reviewGuard).toContain(
      "current.generation === operation.generation",
    );
    expect(reviewGuard).toContain("runCloudSyncReviewMutation");
    expect(appStore).toContain("adoptPersistedSnapshotIfCurrent");
    expect(appStore).toContain("currentMatchesDurableBaseline");
    expect(appStore).toContain("publishMemoryOnly");
    expect(adoption).toContain("persistedMatches(input.candidate)");
    expect(adoption).not.toContain("saveData");
    expect(repair).toContain('status: "operation_invalidated"');
    expect(adr).toContain("estado terminal revisable");
    expect(adr).toContain("Nunca incluye IDs, payloads ni contenido fiscal");
  });

  it("aplica plan y dispositivo activo antes de tocar la nube", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const devices = source("src/lib/cloud/devices.ts");
    const client = source("src/lib/supabase/client.ts");
    const migration = source(
      "supabase/migrations/20260720133000_user_devices.sql",
    );
    const sessionMigration = source(
      "supabase/migrations/20260721190000_cloud_device_session_leases.sql",
    );

    expect(context).toContain("ensureCloudReadyForCurrentDevice");
    expect(context).toContain("registerCurrentCloudDevice");
    expect(context).toContain("retireCurrentCloudDevice");
    expect(context).toContain("releaseCurrentCloudDeviceSession");
    expect(context).toContain(
      'deviceAccess.reason === "device_session_conflict"',
    );
    expect(context).toMatch(
      /await flushPendingUpload\(false\)[\s\S]*await retireCurrentCloudDevice\(\)[\s\S]*supabase\.auth\.signOut\(\)/,
    );
    expect(devices).toContain("cloudDeviceLimitForPlan");
    expect(client).toContain("deviceAwareFetch");
    expect(migration).toContain("cloud_device_access_allowed");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("cloud_device_limit_reached");
    expect(sessionMigration).toContain("claim_cloud_device_session");
    expect(sessionMigration).toContain("auth.jwt() ->> 'session_id'");
    expect(sessionMigration).toContain("return 'session_conflict'");
  });

  it("retira la plaza al borrar un dispositivo y permite el borrado local en Gratis", () => {
    const context = source("src/context/CloudSyncContext.tsx");
    const secureSignOut = context.slice(
      context.indexOf("const signOutAndClearDevice"),
      context.indexOf("const importBackup"),
    );
    const secondaryClear = source("src/lib/security/device-data-clear.ts");

    expect(secureSignOut).toContain(
      "const cloudAccess = await canUseCloudForUser",
    );
    expect(secureSignOut).toMatch(
      /if \(cloudAccess\.allowed\) \{[\s\S]*handoffPausesCloud[\s\S]*retireCurrentCloudDevice/,
    );
    expect(secondaryClear).toContain("CLOUD_DEVICE_TOKEN_STORAGE_KEY");
  });

  it("no confirma Drive sin readback exacto ni permite copias simultaneas", () => {
    const backup = source("src/lib/google-drive/backup.ts");
    const automatic = source("src/components/cloud/GoogleDriveAutoBackup.tsx");
    const manual = source("src/components/cloud/GoogleDriveBackupCard.tsx");
    const callback = source("src/app/drive/callback/page.tsx");
    const tokenRoute = source("src/app/api/google-drive/token/route.ts");

    expect(backup).toContain("readDriveBackupFile");
    expect(backup).toContain("readback !== jsonText");
    expect(backup).toContain("DRIVE_FETCH_TIMEOUT_MS");
    expect(automatic).toContain("runExclusiveDriveBackup");
    expect(automatic).toContain("AUTO_BACKUP_RETRY_MS");
    expect(manual).toContain("runExclusiveDriveBackup");
    expect(callback).toContain("runExclusiveDriveBackup");
    expect(tokenRoute).toContain("GOOGLE_TOKEN_TIMEOUT_MS");
    expect(tokenRoute).toContain("AbortSignal.timeout");
  });

  it("guarda notificaciones solo en Factu y preserva el lector seguro de originales anteriores", () => {
    const intake = source(
      "src/components/fiscal-notifications/FiscalNotificationIntakeView.tsx",
    );
    const archive = source(
      "src/lib/google-drive/fiscal-notification-original-archive.v1.ts",
    );
    const domain = source(
      "src/lib/fiscal-notifications/drive-original-archive.v1.ts",
    );

    expect(intake).not.toContain("Archivar original en Drive");
    expect(intake).not.toContain("runExclusiveDriveOperation");
    expect(intake.replace(/\s+/gu, " ")).toContain(
      "la ficha se guarda en Factu. El PDF original no se conserva",
    );
    expect(archive).toContain("verifyDriveFileHash");
    expect(archive).toContain("SHA256_READBACK_MATCH");
    expect(archive).toContain("Fecha pendiente");
    expect(domain).toContain("sourceSha256");
    expect(domain).not.toMatch(/originalFilename|rawText|accessToken/u);
  });

  it("guarda gastos sin Drive y conserva la verificación de originales anteriores", () => {
    const settings = source("src/lib/google-drive/backup.ts");
    const card = source("src/components/cloud/GoogleDriveBackupCard.tsx");
    const client = source(
      "src/lib/google-drive/expense-original-archive-client.ts",
    );
    const archive = source(
      "src/lib/google-drive/expense-original-archive.v1.ts",
    );
    const form = source("src/app/gastos/nuevo/page.tsx");
    const types = source("src/lib/types.ts");

    expect(settings).toContain("archiveExpenseOriginals");
    expect(card).not.toContain(
      "Guardar en Drive las facturas de gastos escaneadas",
    );
    expect(client).toContain("archiveExpenseOriginalForSavedExpense");
    expect(client).toContain("runExclusiveDriveOperation");
    expect(archive).toContain("Factu - facturas de gastos");
    expect(archive).toContain("verifyDriveFileHash");
    expect(archive).toContain("SHA256_READBACK_MATCH");
    expect(form).not.toContain("prepareExpenseOriginalArchive");
    expect(form).not.toContain("archiveExpenseOriginalForSavedExpense");
    expect(types).toContain("originalArchive?: ExpenseOriginalArchiveV1");
    expect(client).not.toMatch(/originalFilename|rawText|accessToken:/u);
  });

  it("solo envía a la papelera el original exclusivo verificado y puede restaurarlo", () => {
    const library = source(
      "src/components/fiscal-notifications/FiscalNotificationDocumentLibrary.tsx",
    );
    const detail = source(
      "src/components/fiscal-notifications/FiscalNotificationDocumentDetail.tsx",
    );
    const controller = source(
      "src/components/fiscal-notifications/useFiscalNotificationDocumentDeletion.ts",
    );
    const deletion = source(
      "src/lib/google-drive/fiscal-notification-original-delete.v1.ts",
    );

    expect(library).toContain("useFiscalNotificationDocumentDeletion");
    expect(detail).toContain("useFiscalNotificationDocumentDeletion");
    expect(controller).toContain(
      "trashFiscalNotificationOriginalInGoogleDriveV1",
    );
    expect(controller).toContain(
      "restoreFiscalNotificationOriginalInGoogleDriveV1",
    );
    expect(controller).toContain("archive.documentIds.length === 1");
    expect(deletion).toContain("factuSourceSha256");
    expect(deletion).toContain("factuManaged");
    expect(deletion).toContain("JSON.stringify({ trashed })");
    expect(deletion).not.toMatch(/method:\s*["']DELETE["']/u);
  });

  it("mantiene la politica en la raiz y protege sus archivos", () => {
    const agents = source("AGENTS.md");
    const codeowners = source(".github/CODEOWNERS");
    const adr = source(
      "docs/architecture/ADR-0005-cloud-and-drive-sync-reliability.md",
    );

    expect(agents).toContain("ADR-0005-cloud-and-drive-sync-reliability.md");
    expect(agents).toContain("cloud-drive-sync-reliability-contract.test.ts");
    expect(agents).toContain("Pro admite 2 dispositivos activos");
    expect(agents).toContain("Pro+ admite 5");
    expect(codeowners).toContain("/src/context/CloudSyncContext.tsx");
    expect(codeowners).toContain("/src/lib/cloud/**");
    expect(codeowners).toContain("/src/lib/google-drive/**");
    expect(adr).toContain("drive.file");
    expect(adr).toContain("coincide exactamente");
    expect(adr).toContain("trashed: true");
    expect(adr).toContain("persiste únicamente");
    expect(adr).toContain("`AppData` vigente");
    expect(adr).toContain("Se retira la creación de nuevos originales");
    expect(adr).toContain("no borra, mueve ni reescribe");
    expect(adr).toContain("originalArchive");
    expect(adr).toContain("Reparar con la copia de la nube");
    expect(adr).toContain("readback exacto");
    expect(adr).toContain("Pro admite hasta 2 dispositivos activos");
    expect(adr).toContain("Pro+ hasta 5");
    expect(adr).toContain("no pueda saltarse el límite visual");
  });
});
