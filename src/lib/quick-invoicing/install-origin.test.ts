import { describe, expect, it } from "vitest";
import { getRedirectUrl, unstable_getResponseFromNextConfig } from "next/experimental/testing/server";
import nextConfig from "../../../next.config";

describe("quick-app independent installation origin", () => {
  it("opens only the quick shell from the fast hostname root", async () => {
    const response = await unstable_getResponseFromNextConfig({
      url: "https://fast.facturacion-autonomos.app/",
      nextConfig,
    });
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe("https://fast.facturacion-autonomos.app/rapido/index.html");
  });
  it("does not redirect the main app, previews, APIs or the quick shell itself", async () => {
    for (const url of [
      "https://facturacion-autonomos.app/",
      "https://factu-autonomo.vercel.app/",
      "https://quick-preview.example/",
      "https://fast.facturacion-autonomos.app/rapido/index.html",
      "https://fast.facturacion-autonomos.app/rapido/manifest.webmanifest",
      "https://fast.facturacion-autonomos.app/api/factu-rapido/config",
      "https://fast.facturacion-autonomos.app/api/factu-rapido/issue",
    ]) {
      const response = await unstable_getResponseFromNextConfig({ url, nextConfig });
      expect(getRedirectUrl(response), url).toBeNull();
    }
  });
});
