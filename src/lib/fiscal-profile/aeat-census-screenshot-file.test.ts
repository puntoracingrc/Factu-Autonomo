import { describe, expect, it } from "vitest";
import {
  AeatScreenshotFileError,
  MAX_AEAT_SCREENSHOT_BYTES,
  validateAeatScreenshotFile,
} from "./aeat-census-screenshot-file";

describe("AEAT screenshot file validation", () => {
  it("accepts supported local image formats", () => {
    expect(() =>
      validateAeatScreenshotFile(new File(["image"], "captura.png", { type: "image/png" })),
    ).not.toThrow();
  });

  it("rejects documents and oversized images before OCR", () => {
    expect(() =>
      validateAeatScreenshotFile(new File(["pdf"], "captura.pdf", { type: "application/pdf" })),
    ).toThrowError(AeatScreenshotFileError);

    const oversized = {
      name: "captura.png",
      type: "image/png",
      size: MAX_AEAT_SCREENSHOT_BYTES + 1,
    } as File;
    expect(() => validateAeatScreenshotFile(oversized)).toThrow(/8 MB/);
  });
});
