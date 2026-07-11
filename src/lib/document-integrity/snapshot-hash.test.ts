import { describe, expect, it } from "vitest";
import { legacyFnv1a32, sha256Hex } from "./snapshot-hash";

describe("portable snapshot hashes", () => {
  it("calcula los vectores oficiales conocidos de SHA-256", () => {
    expect(sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("Factura número 1 — €")).toBe(
      "61c723e85029b636a38032053b062f3b3db5a4a3685860a69451e06c3b7eb702",
    );
    expect(sha256Hex("😀")).toBe(
      "f0443a342c5ef54783a111b51ba56c938e474c32324d90c3a60c9c8e3a37e2d9",
    );
    expect(sha256Hex("\ud800")).toBe(
      "83d544ccc223c057d2bf80d3f2a32982c32c3c0db8e2674820da5064783fb097",
    );
  });

  it("conserva el cálculo FNV-1a histórico solo para verificación", () => {
    expect(legacyFnv1a32("hello")).toBe("4f9f2cab");
    expect(legacyFnv1a32("José Álvarez")).toBe("1b064ebf");
    expect(legacyFnv1a32("😀")).toBe("cb31c4b8");
  });
});
