import { describe, expect, it } from "vitest";

import { inspectInvoiceListIntegrity } from "./document-list-integrity-cache";
import { EMPTY_DATA } from "./types";

describe("document list integrity cache", () => {
  it("reutiliza la inspeccion mientras documentos y perfil no cambien", () => {
    const documents = [...EMPTY_DATA.documents];
    const profile = { ...EMPTY_DATA.profile };

    const first = inspectInvoiceListIntegrity(documents, profile);
    const second = inspectInvoiceListIntegrity(documents, profile);

    expect(second).toBe(first);
  });

  it("no reutiliza la inspeccion con otra revision del conjunto", () => {
    const profile = { ...EMPTY_DATA.profile };
    const first = inspectInvoiceListIntegrity([], profile);
    const second = inspectInvoiceListIntegrity([], profile);

    expect(second).not.toBe(first);
  });
});
