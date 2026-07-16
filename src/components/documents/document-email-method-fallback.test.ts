import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./DocumentShareActions.tsx", import.meta.url),
  "utf8",
);

describe("document email method fallback", () => {
  it("reabre el selector sin emitir ni descargar si Compartir no está disponible", () => {
    const preflightIndex = source.indexOf(
      'method === "native" && !canShareDocumentPdfNatively()',
    );
    const shareFlowIndex = source.indexOf("shareDocumentWithIntegrity({");

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(shareFlowIndex).toBeGreaterThan(preflightIndex);
    expect(source).toContain('setChooser("email")');
    expect(source).toContain(
      "Elige Gmail o Correo del dispositivo.",
    );
    expect(source).toContain("NativeDocumentShareUnavailableError");
  });
});
