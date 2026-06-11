import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectManualScreenshots,
  manualScreenshotPublicPath,
} from "./screenshots";

describe("manual screenshots", () => {
  it("todas las capturas referenciadas existen en public/", () => {
    const screenshots = collectManualScreenshots();
    expect(screenshots.length).toBeGreaterThan(0);

    for (const shot of screenshots) {
      const filePath = join(
        process.cwd(),
        "public",
        manualScreenshotPublicPath(shot.src),
      );
      expect(
        existsSync(filePath),
        `Falta la captura ${shot.src}. Ejecuta: npm run manual:screenshots`,
      ).toBe(true);
    }
  });
});
