import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyAdminErrorArchive,
  groupAdminErrorsByActor,
  type AdminErrorRow,
} from "./error-groups";

const adminPageSource = readFileSync(
  new URL("../../app/admin/page.tsx", import.meta.url),
  "utf8",
);

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
      resolvedCount: 0,
      unresolvedCount: 2,
      resolutionStatus: "pending",
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
    expect(group.resolvedCount).toBe(1);
    expect(group.resolutionStatus).toBe("partial");
    expect(group.severity).toBe("error");
  });

  it("solo declara solucionado cuando todos los eventos tienen confirmacion", () => {
    const [group] = groupAdminErrorsByActor([
      errorRow({
        id: "resolved-1",
        created_at: "2026-07-21T21:00:00.000Z",
        resolved_at: "2026-07-21T22:00:00.000Z",
      }),
      errorRow({
        id: "resolved-2",
        created_at: "2026-07-21T20:00:00.000Z",
        resolved_at: "2026-07-21T22:05:00.000Z",
      }),
    ]);

    expect(group).toMatchObject({
      resolvedCount: 2,
      unresolvedCount: 0,
      resolutionStatus: "resolved",
    });
  });

  it("mueve al archivo solo tras un readback completo y canonico", () => {
    const first = errorRow({
      id: "first",
      created_at: "2026-07-21T21:00:00.000Z",
    });
    const second = errorRow({
      id: "second",
      created_at: "2026-07-21T20:00:00.000Z",
    });
    const resolvedAt = "2026-07-22T08:00:00.000Z";

    const archived = applyAdminErrorArchive(
      [first, second],
      [],
      [first.id, second.id],
      [
        { id: first.id, resolved_at: resolvedAt },
        { id: second.id, resolved_at: resolvedAt },
      ],
    );

    expect(archived?.errors).toEqual([]);
    expect(archived?.archivedErrors).toEqual([
      { ...first, resolved_at: resolvedAt },
      { ...second, resolved_at: resolvedAt },
    ]);
  });

  it("mantiene la lista intacta si falta una confirmacion", () => {
    const first = errorRow({
      id: "first",
      created_at: "2026-07-21T21:00:00.000Z",
    });
    const second = errorRow({
      id: "second",
      created_at: "2026-07-21T20:00:00.000Z",
    });

    expect(
      applyAdminErrorArchive(
        [first, second],
        [],
        [first.id, second.id],
        [{ id: first.id, resolved_at: "2026-07-22T08:00:00.000Z" }],
      ),
    ).toBeNull();
  });

  it("integra vistas separadas y archiva mediante la API Admin", () => {
    expect(adminPageSource).toContain("Pendientes ({errors.length})");
    expect(adminPageSource).toContain("Archivados ({archivedErrors.length})");
    expect(adminPageSource).toContain("Resolver y archivar");
    expect(adminPageSource).toContain(
      'fetchAdminResponse("/api/admin/errors", {',
    );
    expect(adminPageSource).toContain('method: "PATCH"');
    expect(adminPageSource).toContain("applyAdminErrorArchive(");
    expect(adminPageSource).toContain("status=pending");
    expect(adminPageSource).toContain("status=resolved");
  });
});
