import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("private route middleware", () => {
  it("adds no-store and noindex headers to matched private app pages", () => {
    const response = middleware();

    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    expect(response.headers.get("CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });
});
