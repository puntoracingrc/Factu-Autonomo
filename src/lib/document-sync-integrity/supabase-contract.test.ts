import { describe, expect, it } from "vitest";
import {
  assertDocumentSyncSupabaseClientLike,
  resolveDocumentSyncSupabaseAdapterOptions,
  DocumentSyncSupabaseSafetyError,
} from "./supabase-contract";

const scope = {
  userId: "SYNTHETIC_ONLY_USER_A",
  scopeId: "SYNTHETIC_ONLY_SCOPE_A",
};

describe("Supabase local/staging sync contract", () => {
  it("exige cliente inyectado fakeable", () => {
    expect(() => assertDocumentSyncSupabaseClientLike(null)).toThrow(
      DocumentSyncSupabaseSafetyError,
    );
    expect(() =>
      assertDocumentSyncSupabaseClientLike({ from: () => ({}) }),
    ).not.toThrow();
  });

  it("usa local_staging_only como modo seguro por defecto", () => {
    const options = resolveDocumentSyncSupabaseAdapterOptions({
      serverScope: scope,
    });

    expect(options.safetyMode).toBe("local_staging_only");
    expect(options.databaseTarget).toBe("local");
    expect(options.remote).toBe(false);
  });

  it("rechaza modo production por runtime guard", () => {
    expect(() =>
      resolveDocumentSyncSupabaseAdapterOptions({
        serverScope: scope,
        databaseTarget: "production" as never,
      }),
    ).toThrow(/rechaza produccion/);
  });

  it("rechaza remote", () => {
    expect(() =>
      resolveDocumentSyncSupabaseAdapterOptions({
        serverScope: scope,
        remote: true as never,
      }),
    ).toThrow(/rechaza conexiones remotas/);
  });

  it("rechaza missing user scope", () => {
    expect(() =>
      resolveDocumentSyncSupabaseAdapterOptions({
        serverScope: { userId: "" },
      }),
    ).toThrow(/usuario derivado/);
  });

  it("no crea cliente real ni lee env vars", () => {
    const runtime = `${resolveDocumentSyncSupabaseAdapterOptions.toString()}\n${assertDocumentSyncSupabaseClientLike.toString()}`;

    expect(runtime).not.toContain("@supabase");
    expect(runtime).not.toContain("createClient");
    expect(runtime).not.toContain("process.env");
  });
});
