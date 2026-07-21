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
    expect(source).toContain("En mantenimiento");
    expect(source).toContain("No reconocido");
  });

  it("keeps provider outages retryable without presenting files as unrecognized", () => {
    expect(source).toContain('body.code === "SCAN_SERVICE_UNAVAILABLE"');
    expect(source).toContain('item.status === "SERVICE_UNAVAILABLE"');
    expect(source).toContain("EXPENSE_SCAN_MAINTENANCE_MESSAGE");
    expect(source).not.toContain("You exceeded your current quota");
  });

  it("keeps the existing public scanner callbacks and payload contract", () => {
    expect(source).toContain("payload: ExpenseScanPayload");
    expect(source).toContain("onScanned(data");
    expect(source).toContain("onScanProgress?.({");
  });

  it("starts the local shadow without delaying or replacing the AI result", () => {
    const localStart = source.indexOf(
      "const localShadow = startExpenseLocalSemanticShadowV1",
    );
    const providerCall = source.indexOf("await scanFile(item.file)");

    expect(localStart).toBeGreaterThan(-1);
    expect(providerCall).toBeGreaterThan(localStart);
    expect(source).toContain("localShadow.dispose();");
    expect(source).toContain("localShadowHandlesRef.current.add(localShadow)");
    expect(source).toContain("handle.dispose()");
    expect(source).toContain("localShadow,");
    expect(source).not.toContain("await startExpenseLocalSemanticShadowV1");
  });
});
