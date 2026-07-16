import {
  getRedirectUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

const CANONICAL_ORIGIN = "https://facturacion-autonomos.app";
const LEGACY_ORIGIN = "https://factu-autonomo.vercel.app";

describe("legacy Vercel domain redirect", () => {
  it("redirects the exact legacy host permanently and preserves path and query", async () => {
    const response = await unstable_getResponseFromNextConfig({
      url: `${LEGACY_ORIGIN}/auth/callback?code=opaque&next=%2Fcuenta`,
      nextConfig,
    });

    expect(response?.status).toBe(308);
    expect(response && getRedirectUrl(response)).toBe(
      `${CANONICAL_ORIGIN}/auth/callback?code=opaque&next=%2Fcuenta`,
    );
  });

  it("does not redirect the canonical or preview hosts", async () => {
    for (const url of [
      `${CANONICAL_ORIGIN}/auth/callback?code=opaque`,
      "https://factu-autonomo-branch-team.vercel.app/auth/callback?code=opaque",
    ]) {
      const response = await unstable_getResponseFromNextConfig({
        url,
        nextConfig,
      });

      expect(response?.status).toBe(200);
      expect(response?.headers.get("location")).toBeNull();
    }
  });
});
