import { describe, expect, it } from "vitest";

import {
  businessLogoDataUrlBytes,
  fitBusinessLogoDimensions,
  MAX_BUSINESS_LOGO_INPUT_BYTES,
  validateBusinessLogoFile,
} from "./business-logo";

describe("business logo preparation", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])(
    "accepts %s within the source limit",
    (type) => {
      expect(validateBusinessLogoFile({ type, size: 128_000 })).toBeNull();
    },
  );

  it("explains unsupported formats instead of surfacing a queue error", () => {
    expect(
      validateBusinessLogoFile({ type: "image/svg+xml", size: 12_000 }),
    ).toBe(
      "El formato de este logo no es compatible. Usa un archivo PNG, JPG o WebP.",
    );
  });

  it("explains the 2 MB source limit", () => {
    expect(
      validateBusinessLogoFile({
        type: "image/png",
        size: MAX_BUSINESS_LOGO_INPUT_BYTES + 1,
      }),
    ).toBe("El logo supera el máximo de 2 MB. Elige una imagen más ligera.");
  });

  it("fits a large logo without changing its aspect ratio", () => {
    expect(fitBusinessLogoDimensions(1_672, 941, 1_200)).toEqual({
      width: 1_200,
      height: 675,
    });
    expect(fitBusinessLogoDimensions(320, 180, 1_200)).toEqual({
      width: 320,
      height: 180,
    });
  });

  it("measures the actual UTF-8 payload size", () => {
    expect(businessLogoDataUrlBytes("data:image/png;base64,AAAA")).toBe(26);
  });
});
