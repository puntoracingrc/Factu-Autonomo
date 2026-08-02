import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./AppStore.tsx", import.meta.url), "utf8");

describe("AppStore central authority events sync bridge", () => {
  it("expone un método manual serializado que persiste por el commit durable existente", () => {
    expect(source).toContain("syncCentralInvoiceAuthorityEvents");
    expect(source).toContain("pullCentralInvoiceAuthorityEventsForAppData");
    expect(source).toContain(
      "buildCentralInvoiceAuthorityEventsAppDataTransition",
    );
    expect(source).toContain("runCentralInvoiceAuthorityClientOperation");
    expect(source).toContain(
      "selectCentralInvoiceAuthorityEventsSyncBaseline",
    );
    expect(source).toContain("commitDurableAppData(baseline, (previous) =>");
  });

  it("no activa polling automático ni se engancha al efecto de carga inicial", () => {
    const start = source.indexOf(
      "const syncCentralInvoiceAuthorityEvents = useCallback",
    );
    const end = source.indexOf("const updateProfile = useCallback", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end);

    expect(block).not.toContain("setAppData(");
    expect(block).not.toContain("useEffect");
    expect(block).not.toContain("setInterval");
    expect(block).not.toContain("CloudSyncContext");
  });

  it("confirma cambios de cobro en autoridad central sin ensuciar la cola local", () => {
    const syncStart = source.indexOf(
      "const syncCentralInvoiceCollectionStatus = useCallback",
    );
    const syncEnd = source.indexOf("const markAsCollected = useCallback", syncStart);
    expect(syncStart).toBeGreaterThan(-1);
    expect(syncEnd).toBeGreaterThan(syncStart);
    const syncBlock = source.slice(syncStart, syncEnd);

    expect(syncBlock).toContain(
      'import("@/lib/central-invoice-authority/collection-client")',
    );
    expect(syncBlock).toContain("updateCentralInvoiceCollectionFromBrowser");
    expect(syncBlock).toContain('eventType: "invoice_collection_updated"');
    expect(syncBlock).toContain("{ skipDirty: true }");

    const markStart = source.indexOf("const markAsCollected = useCallback");
    const receiptStart = source.indexOf(
      "const generateReceiptForInvoice = useCallback",
      markStart,
    );
    const markBlock = source.slice(markStart, receiptStart);
    expect(markBlock).toContain("syncCentralInvoiceCollectionStatus(updated);");

    const unmarkStart = source.indexOf("const unmarkAsCollected = useCallback");
    const quoteStart = source.indexOf("const markQuoteAsAccepted = useCallback", unmarkStart);
    const unmarkBlock = source.slice(unmarkStart, quoteStart);
    expect(unmarkBlock).toContain("syncCentralInvoiceCollectionStatus(updated);");
  });
});
