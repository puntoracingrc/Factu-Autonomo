import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const component = readFileSync(
  new URL("./CentralBusinessBootstrapCard.tsx", import.meta.url),
  "utf8",
);
const accountPage = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);

describe("central business bootstrap account card", () => {
  it("solo aparece tras comprobar la activacion privada del servidor", () => {
    expect(component).toContain(
      "fetchCentralBusinessAuthorityStatusFromBrowser",
    );
    expect(component).toContain("status?.activation.appliesToUser");
    expect(component).toContain("status?.summary.writesPossible");
    expect(accountPage).toContain("CentralBusinessBootstrapCard");
  });

  it("no depende de que el sincronizador legacy este activo", () => {
    expect(component).not.toContain("cloudEnabled");
    expect(component).toContain("!ownerScope");
    expect(component).toContain("requiresEmailConfirmation");
  });

  it("compara antes de confirmar y revalida el snapshot local", () => {
    expect(component).toContain(
      "previewCentralBusinessBootstrapFromBrowser",
    );
    expect(component).toContain(
      "commitCentralBusinessBootstrapFromBrowser",
    );
    expect(component).toContain(
      "centralBusinessBootstrapSnapshotSignature(currentEntities)",
    );
    expect(component).toContain("!confirmed");
    expect(component).toContain('user_reminder: "Recordatorios"');
    expect(component).toContain('expense: "Gastos"');
    expect(component).toContain('recurring_expense: "Gastos fijos"');
    expect(component).toContain('quote: "Presupuestos"');
    expect(component).toContain('receipt: "Recibos"');
    expect(component).toContain('profile: "Perfil"');
    expect(component).toContain("BOOTSTRAP_ENTITY_TYPES.map");
  });

  it("no migra con cola pendiente y recibe todas las versiones confirmadas", () => {
    expect(component).toContain("loadCentralBusinessDurableQueue");
    expect(component).toContain("queue.operations.length > 0");
    expect(component).toContain("syncCentralBusinessEvents");
    expect(component).toContain("if (!result.hasMore) return null");
    expect(component).toContain(
      "recordCentralBusinessBootstrapCheckpoint",
    );
  });

  it("permite adoptar la copia central en el dispositivo sin escribir servidor", () => {
    expect(component).toContain("adoptCentralBusinessEventsFromServer");
    expect(component).toContain("handleAdoptServerCopy");
    expect(component).toContain("adoptConfirmed");
    expect(component).toContain("canAdoptServerCopy");
    expect(component).toContain("preview.summary.conflict > 0");
    expect(component).toContain("preview.summary.centralOnly > 0");
    expect(component).toContain("canResetDeviceFromServer");
    expect(component).toContain("preview && pendingChangeCount > 0");
    expect(component).toContain("pendingChangeCount > 0");
    expect(component).toContain(
      "previewCentralBusinessBootstrapFromBrowser(restoredEntities)",
    );
    expect(component).toContain("syncAllCentralInvoiceEvents");
    expect(component).toContain("syncCentralInvoiceAuthorityEvents");
    expect(component).toContain(
      "retireLegacyPendingChangesAfterCentralAdoption",
    );
    expect(component).toContain("expectedPendingChangeCount");
    expect(component).toContain("expectedPendingChangesSignature");
    expect(component).toContain("centralAdoptionLegacyQueueSignature");
    expect(component).toContain("isExplicitDeviceReset");
    expect(component).toContain("preview.summary.create");
    expect(component).toContain(
      "expectedPendingChangeCount !== pendingChangeCount",
    );
    expect(component).toContain("La cola antigua se conserva");
    expect(component).toContain("No se ha escrito nada en el servidor");
    expect(component).toContain("ni modifica el contenido de las facturas");
    expect(component).toContain("Usar servidor en este dispositivo");
  });

  it("muestra los IDs bloqueados sin habilitar confirmacion si la preview no es confirmable", () => {
    expect(component).toContain("REVIEW_ENTRY_LIMIT");
    expect(component).toContain("isReviewEntry");
    expect(component).toContain("Entradas que bloquean la migracion");
    expect(component).toContain("reviewStatusLabel(entry)");
    expect(component).toContain("centralVersionLabel(entry)");
    expect(component).toContain("entry.entityId");
    expect(component).toContain("preview?.canCommit");
    expect(component).toContain("!preview.canCommit");
  });
});
