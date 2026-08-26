import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const accountSource = readFileSync(
  new URL("../../app/cuenta/page.tsx", import.meta.url),
  "utf8",
);
const supportSource = readFileSync(
  new URL("./SupportRecoveryToolsSection.tsx", import.meta.url),
  "utf8",
);
const ownershipSource = readFileSync(
  new URL("./DataOwnershipCard.tsx", import.meta.url),
  "utf8",
);
const adminSource = readFileSync(
  new URL("../admin/AdminUserRecoveryToolsPanel.tsx", import.meta.url),
  "utf8",
);
const adminPageSource = readFileSync(
  new URL("../../app/admin/page.tsx", import.meta.url),
  "utf8",
);

describe("temporary support recovery wiring", () => {
  it("no monta reparaciones directamente en Cuenta", () => {
    expect(accountSource).toContain("<SupportRecoveryToolsSection />");
    expect(accountSource).not.toContain("<ExpenseWorkAllocationRepairCard />");
    expect(accountSource).not.toContain("<ImportedLegacyDocumentRepairCard />");
    expect(accountSource).not.toContain("<AppIssuedDocumentRecoveryCard />");
  });

  it("deja la exportación normal y separa la restauración", () => {
    expect(accountSource).toContain("<DataOwnershipCard />");
    expect(supportSource).toContain("<DataOwnershipCard restoreOnly />");
    expect(ownershipSource).toContain("restoreOnly = false");
    expect(ownershipSource).toContain("{restoreOnly && (");
  });

  it("consulta únicamente la concesión del usuario autenticado", () => {
    expect(supportSource).toContain('fetch("/api/support/recovery-tools"');
    expect(supportSource).toContain("Authorization: `Bearer ${token}`");
    expect(supportSource).not.toContain("userId:");
    expect(supportSource).toContain(
      "if (activeGrants.length === 0) return null",
    );
  });

  it("organiza activación, revocación y bloqueo en Admin", () => {
    expect(adminPageSource).toContain(
      "<AdminUserRecoveryToolsPanel userId={user.id} />",
    );
    expect(adminSource).toContain('action: "grant"');
    expect(adminSource).toContain('action: "revoke"');
    expect(adminSource).toContain("SUPPORT_RECOVERY_DURATION_OPTIONS");
    expect(adminSource).toContain("Historial reciente");
    expect(adminSource).toContain("BLOCKED_RECOVERY_TOOL");
  });
});
