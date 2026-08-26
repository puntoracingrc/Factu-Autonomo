import { describe, expect, it } from "vitest";
import {
  activeSupportRecoveryGrants,
  isSupportRecoveryDurationMinutes,
  isSupportRecoveryToolId,
  normalizeSupportRecoveryGrant,
  type SupportRecoveryGrant,
} from "./recovery-tools";

function grant(
  toolId: SupportRecoveryGrant["toolId"],
  overrides: Partial<SupportRecoveryGrant> = {},
): SupportRecoveryGrant {
  return {
    id: `${toolId}-grant`,
    userId: "user-1",
    toolId,
    grantedBy: "admin-1",
    grantedAt: "2026-08-26T10:00:00.000Z",
    expiresAt: "2026-08-26T11:00:00.000Z",
    reason: "Soporte controlado",
    revokedAt: null,
    revokedBy: null,
    revocationReason: null,
    ...overrides,
  };
}

describe("support recovery tools", () => {
  it("acepta solo herramientas y duraciones cerradas", () => {
    expect(isSupportRecoveryToolId("local_backup_restore")).toBe(true);
    expect(isSupportRecoveryToolId("discarded_document_retirement")).toBe(
      false,
    );
    expect(isSupportRecoveryDurationMinutes(30)).toBe(true);
    expect(isSupportRecoveryDurationMinutes(31)).toBe(false);
  });

  it("descarta filas con herramientas desconocidas", () => {
    expect(
      normalizeSupportRecoveryGrant({
        id: "grant-1",
        user_id: "user-1",
        tool_id: "unknown_tool",
        granted_by: "admin-1",
        granted_at: "2026-08-26T10:00:00.000Z",
        expires_at: "2026-08-26T11:00:00.000Z",
        reason: "Soporte",
        revoked_at: null,
        revoked_by: null,
        revocation_reason: null,
      }),
    ).toBeNull();
  });

  it("conserva solo la concesión activa más reciente por herramienta", () => {
    const older = grant("local_backup_restore", {
      id: "older",
      grantedAt: "2026-08-26T09:00:00.000Z",
    });
    const newest = grant("local_backup_restore", { id: "newest" });
    const revoked = grant("legacy_import_repair", {
      revokedAt: "2026-08-26T10:05:00.000Z",
    });
    const expired = grant("issued_document_recovery", {
      expiresAt: "2026-08-26T09:30:00.000Z",
    });

    expect(
      activeSupportRecoveryGrants(
        [older, newest, revoked, expired],
        Date.parse("2026-08-26T10:30:00.000Z"),
      ).map((item) => item.id),
    ).toEqual(["newest"]);
  });
});
