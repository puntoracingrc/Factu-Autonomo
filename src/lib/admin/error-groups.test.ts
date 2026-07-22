import { describe, expect, it } from "vitest";
import {
  groupAdminErrorsByActor,
  type AdminErrorRow,
} from "./error-groups";

function errorRow(
  overrides: Partial<AdminErrorRow> & Pick<AdminErrorRow, "id" | "created_at">,
): AdminErrorRow {
  return {
    actor: { key: "account-1", kind: "user", email: "ana@example.test" },
    severity: "error",
    area: "sync",
    code: "push_failed",
    message: "La sincronizacion requiere revision",
    route: "/clientes",
    resolved_at: null,
    ...overrides,
  };
}

describe("groupAdminErrorsByActor", () => {
  it("agrupa por actor y conserva cada evento como evidencia", () => {
    const errors = [
      errorRow({ id: "error-2", created_at: "2026-07-21T21:15:00.000Z" }),
      errorRow({ id: "error-1", created_at: "2026-07-21T21:14:00.000Z" }),
    ];

    const groups = groupAdminErrorsByActor(errors);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      key: "account-1",
      label: "ana@example.test",
      latestAt: "2026-07-21T21:15:00.000Z",
      unresolvedCount: 2,
      severity: "error",
    });
    expect(groups[0].errors.map((item) => item.id)).toEqual([
      "error-2",
      "error-1",
    ]);
  });

  it("ordena los grupos por actividad y distingue eventos del sistema", () => {
    const groups = groupAdminErrorsByActor([
      errorRow({ id: "user", created_at: "2026-07-21T20:00:00.000Z" }),
      errorRow({
        id: "system",
        actor: { key: "system", kind: "system", email: null },
        severity: "warning",
        created_at: "2026-07-21T22:00:00.000Z",
      }),
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      "Eventos del sistema",
      "ana@example.test",
    ]);
  });

  it("no cuenta los eventos resueltos como pendientes", () => {
    const [group] = groupAdminErrorsByActor([
      errorRow({
        id: "resolved",
        created_at: "2026-07-21T21:00:00.000Z",
        resolved_at: "2026-07-21T22:00:00.000Z",
      }),
      errorRow({
        id: "warning",
        severity: "warning",
        created_at: "2026-07-21T20:00:00.000Z",
      }),
    ]);

    expect(group.unresolvedCount).toBe(1);
    expect(group.severity).toBe("error");
  });
});
