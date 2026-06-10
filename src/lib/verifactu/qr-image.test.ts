import { describe, expect, it } from "vitest";
import { generateQrDataUrl } from "./qr-image";
import { buildQrUrl } from "./qr";

describe("qr image", () => {
  it("generates png data url from AEAT validation url", async () => {
    const url = buildQrUrl({
      nif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 121,
      environment: "test",
    });
    const dataUrl = await generateQrDataUrl(url);
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(dataUrl.length).toBeGreaterThan(100);
  });
});
