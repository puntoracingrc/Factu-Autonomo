import { describe, expect, it } from "vitest";
import {
  FiscalNotificationBatchAnalysisIdentityErrorV2,
  reduceFiscalNotificationBatchAnalysisV2,
  selectFiscalNotificationBatchAnalysisByDocumentIdV2,
  type FiscalNotificationBatchAnalysisIdentityV2,
} from "./batch-analysis-identity.v2";

const FIRST = Object.freeze({
  fileId: "file:063904",
  documentId: "document:063904",
  sourceSha256: "9".repeat(64),
});
const SECOND = Object.freeze({
  fileId: "file:063624",
  documentId: "document:063624",
  sourceSha256: "6".repeat(64),
});

function complete(
  identity: FiscalNotificationBatchAnalysisIdentityV2,
  title: string,
) {
  return Object.freeze({ identity, value: Object.freeze({ title }) });
}

describe("fiscal notification batch analysis identity v2", () => {
  it("keeps results attached to their file when the second analysis finishes first", () => {
    const queue = Object.freeze([FIRST, SECOND]);
    const afterSecond = reduceFiscalNotificationBatchAnalysisV2({
      queue,
      current: [],
      completed: complete(SECOND, "PROPUESTA DE LIQUIDACIÓN"),
    });
    const afterFirst = reduceFiscalNotificationBatchAnalysisV2({
      queue,
      current: afterSecond,
      completed: complete(FIRST, "DATOS FISCALES"),
    });

    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        afterFirst,
        FIRST.documentId,
      )?.value.title,
    ).toBe("DATOS FISCALES");
    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        afterFirst,
        SECOND.documentId,
      )?.value.title,
    ).toBe("PROPUESTA DE LIQUIDACIÓN");
  });

  it("switches the active card by documentId without reusing another result", () => {
    const records = [
      complete(FIRST, "DATOS FISCALES"),
      complete(SECOND, "PROPUESTA DE LIQUIDACIÓN"),
    ];
    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        records,
        SECOND.documentId,
      )?.identity.sourceSha256,
    ).toBe(SECOND.sourceSha256);
    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        records,
        FIRST.documentId,
      )?.identity.sourceSha256,
    ).toBe(FIRST.sourceSha256);
  });

  it.each([
    { ...FIRST, fileId: SECOND.fileId },
    { ...FIRST, documentId: SECOND.documentId },
    { ...FIRST, sourceSha256: SECOND.sourceSha256 },
  ])("rejects a completed result whose identity differs", (identity) => {
    expect(() =>
      reduceFiscalNotificationBatchAnalysisV2({
        queue: [FIRST],
        current: [],
        completed: complete(identity, "WRONG RESULT"),
      }),
    ).toThrow(FiscalNotificationBatchAnalysisIdentityErrorV2);
  });

  it("reanalysis replaces only the snapshot for the same documentId", () => {
    const queue = Object.freeze([FIRST, SECOND]);
    const initial = [
      complete(FIRST, "DATOS FISCALES V1"),
      complete(SECOND, "PROPUESTA V1"),
    ];
    const next = reduceFiscalNotificationBatchAnalysisV2({
      queue,
      current: initial,
      completed: complete(FIRST, "DATOS FISCALES V2"),
    });

    expect(next).toHaveLength(2);
    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        next,
        FIRST.documentId,
      )?.value.title,
    ).toBe("DATOS FISCALES V2");
    expect(
      selectFiscalNotificationBatchAnalysisByDocumentIdV2(
        next,
        SECOND.documentId,
      )?.value.title,
    ).toBe("PROPUESTA V1");
  });
});
