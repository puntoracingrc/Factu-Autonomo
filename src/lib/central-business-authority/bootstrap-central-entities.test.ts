import { readFileSync } from "node:fs";

import { describe, expect, it, vi } from "vitest";

import type { CentralBusinessBootstrapCentralRow } from "./bootstrap-preview";
import { listAllCentralBusinessBootstrapEntities } from "./bootstrap-central-entities";

function rows(count: number): CentralBusinessBootstrapCentralRow[] {
  return Array.from({ length: count }, (_, index) => ({
    entityType:
      index < 998 ? "customer" : index < 1_001 ? "product" : "supplier",
    entityId: `entity-${String(index).padStart(5, "0")}`,
    currentVersion: 1,
    deleted: false,
    contentHash: `hash-${index}`,
  }));
}

describe("central business bootstrap paginated repository", () => {
  it.each(["bootstrap-preview", "bootstrap-commit"])(
    "keeps the production %s route wired to ordered range pages",
    (routeName) => {
      const route = readFileSync(
        new URL(
          `../../app/api/central-business-authority/${routeName}/route.ts`,
          import.meta.url,
        ),
        "utf8",
      );

      expect(route).toContain("listAllCentralBusinessBootstrapEntities");
      expect(route).toContain('.order("entity_type")');
      expect(route).toContain('.order("entity_id")');
      expect(route).toContain(".range(from, to)");
    },
  );

  it("reads every page when Supabase caps each response at 1000 rows", async () => {
    const source = rows(1_007);
    const loadPage = vi.fn(async ({ from, to }) => source.slice(from, to + 1));

    const result = await listAllCentralBusinessBootstrapEntities({
      loadPage,
    });

    expect(result).toEqual(source);
    expect(loadPage).toHaveBeenCalledTimes(2);
    expect(loadPage).toHaveBeenNthCalledWith(1, { from: 0, to: 999 });
    expect(loadPage).toHaveBeenNthCalledWith(2, { from: 1_000, to: 1_999 });
  });

  it("fails closed when a later page cannot be read", async () => {
    const source = rows(1_007);
    const loadPage = vi.fn(async ({ from, to }) =>
      from === 0 ? source.slice(from, to + 1) : null,
    );

    await expect(
      listAllCentralBusinessBootstrapEntities({ loadPage }),
    ).resolves.toBeNull();
  });

  it("fails closed instead of truncating a central state above the limit", async () => {
    const source = rows(5_001);

    await expect(
      listAllCentralBusinessBootstrapEntities({
        loadPage: async ({ from, to }) => source.slice(from, to + 1),
      }),
    ).resolves.toBeNull();
  });
});
