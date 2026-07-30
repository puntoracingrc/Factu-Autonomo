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

  it("restaura fichas solo centrales releyendo el historial sin escribir servidor", () => {
    expect(component).toContain("reconcileCentralBusinessEvents");
    expect(component).toContain("handleRestoreCentralOnly");
    expect(component).toContain("preview.summary.conflict === 0");
    expect(component).toContain("preview.summary.centralOnly > 0");
    expect(component).toContain(
      "previewCentralBusinessBootstrapFromBrowser(restoredEntities)",
    );
    expect(component).toContain("Restaurar ${preview.summary.centralOnly}");
  });
});
