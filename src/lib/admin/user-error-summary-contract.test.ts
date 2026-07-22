import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync(
  new URL("../../app/admin/page.tsx", import.meta.url),
  "utf8",
);
const usersRoute = readFileSync(
  new URL("../../app/api/admin/users/route.ts", import.meta.url),
  "utf8",
);

describe("admin user error summary", () => {
  it("presenta estados y no confunde el historial con errores activos", () => {
    expect(adminPage).toContain("Sin incidencias pendientes");
    expect(adminPage).toContain("incidencia pendiente");
    expect(adminPage).toContain("incidencias pendientes");
    expect(adminPage).not.toContain("error(es) registrados");
    expect(usersRoute).toContain(
      "user_id,area,message,created_at,resolved_at,archived_at",
    );
  });
});
