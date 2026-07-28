import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/components/forms/RectificativaForm.tsx",
  "utf8",
);

describe("RectificativaForm emission validation", () => {
  it("validates the complete rectification payload before issuing", () => {
    const payloadIndex = source.indexOf(
      "const payload = buildRectificativaPayload(statusOverride);",
    );
    const validationIndex = source.indexOf(
      'validateDocumentEmission(\n        payload,\n        historicalProfile,\n        "factura",',
    );
    const saveIndex = source.indexOf(
      "shouldUseCentralInvoiceAuthorityRectificationFormCanary({",
    );

    expect(payloadIndex).toBeGreaterThan(-1);
    expect(validationIndex).toBeGreaterThan(payloadIndex);
    expect(saveIndex).toBeGreaterThan(validationIndex);
  });

  it("does not strip rectification metadata before validation", () => {
    expect(source).not.toContain(
      'validateDocumentEmission(\n        {\n          type: "factura",',
    );
  });
});
