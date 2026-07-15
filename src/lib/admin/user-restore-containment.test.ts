import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADMIN_USER_RESTORE_APPLY_BLOCK_CODE,
  ADMIN_USER_RESTORE_APPLY_BLOCK_REASON,
  ADMIN_USER_RESTORE_POINT_MODE,
} from "./user-restore-policy";

const pageSource = readFileSync(
  new URL("../../app/admin/page.tsx", import.meta.url),
  "utf8",
);
const routeSource = readFileSync(
  new URL(
    "../../app/api/admin/users/[userId]/restore-points/route.ts",
    import.meta.url,
  ),
  "utf8",
);

describe("admin user restore fail-closed containment", () => {
  it("publica una política estable de bloqueo transaccional", () => {
    expect(ADMIN_USER_RESTORE_APPLY_BLOCK_CODE).toBe(
      "admin_restore_transaction_required",
    );
    expect(ADMIN_USER_RESTORE_POINT_MODE).toBe("preview_only");
    expect(ADMIN_USER_RESTORE_APPLY_BLOCK_REASON).toContain(
      "operación transaccional",
    );
    expect(ADMIN_USER_RESTORE_APPLY_BLOCK_REASON).toContain(
      "rollback y evidencia indivisible",
    );
  });

  it("retira de la UI el caller destructivo y muestra el bloqueo", () => {
    expect(pageSource).not.toContain('action: "restore"');
    expect(pageSource).not.toContain("confirmEmail");
    expect(pageSource).not.toContain("Restaurar usuario");
    expect(pageSource).toContain("Aplicación de restauraciones bloqueada");
    expect(pageSource).toContain("ADMIN_USER_RESTORE_APPLY_BLOCK_REASON");
    expect(pageSource).toContain("setCurrent(body.current ?? null)");
  });

  it("mantiene la ruta sin apply por chunks ni evento posterior", () => {
    expect(routeSource).toContain('body.action === "restore"');
    expect(routeSource).not.toContain("access.mfa");
    expect(routeSource).toContain("restoreApplyBlockedResponse()");
    expect(routeSource).not.toContain(".upsert(");
    expect(routeSource).not.toContain("admin_user_restore_events");
    expect(routeSource).not.toContain("buildRestoreChangesFromRows");
  });
});
