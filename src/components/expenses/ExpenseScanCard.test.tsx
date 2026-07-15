import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./ExpenseScanCard.tsx", import.meta.url),
  "utf8",
);

describe("ExpenseScanCard interaction contract", () => {
  it("queues selected and dropped files without starting analysis automatically", () => {
    expect(source).toContain("onChange={(event) => queueFiles(event.target.files)}");
    expect(source).toContain("queueFiles(event.dataTransfer.files)");
    expect(source).toContain(
      "No analizaremos nada hasta que pulses\n              Analizar.",
    );
    expect(source).not.toContain("void handleFiles(event.target.files)");
  });

  it("exposes one explicit analyze action and a visible removable queue", () => {
    expect(source).toContain("onClick={() => void analyzeQueuedFiles()}");
    expect(source).toContain("Quitar todos");
    expect(source).toContain("Reintentar");
    expect(source).toContain("Preparado");
    expect(source).toContain("Analizando");
    expect(source).toContain("Leído");
    expect(source).toContain("Necesita revisión");
    expect(source).toContain("No reconocido");
  });

  it("keeps the existing public scanner callbacks and payload contract", () => {
    expect(source).toContain("payload: ExpenseScanPayload");
    expect(source).toContain("onScanned(data");
    expect(source).toContain("onScanProgress?.({");
  });
});
