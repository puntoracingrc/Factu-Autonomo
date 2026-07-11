import { describe, expect, it } from "vitest";
import { chainLinksContainRecordHash } from "./server-db";

describe("VeriFactu persisted chain ancestry", () => {
  it("acredita un registro histórico aunque la cadena haya avanzado", () => {
    const first = "A".repeat(64);
    const second = "B".repeat(64);
    const third = "C".repeat(64);

    expect(
      chainLinksContainRecordHash({
        chain: {
          issuerNif: "12345678Z",
          lastHash: third,
          lastNumSerie: "F-3",
          recordCount: 3,
        },
        targetHash: first,
        links: [
          { recordHash: first, previousHash: "" },
          { recordHash: second, previousHash: first },
          { recordHash: third, previousHash: second },
        ],
      }),
    ).toBe(true);
  });

  it("falla cerrado si falta un eslabón o la cadena contiene un ciclo", () => {
    const first = "A".repeat(64);
    const second = "B".repeat(64);

    expect(
      chainLinksContainRecordHash({
        chain: { issuerNif: "12345678Z", lastHash: second, recordCount: 2 },
        targetHash: first,
        links: [{ recordHash: second, previousHash: "ausente" }],
      }),
    ).toBe(false);
    expect(
      chainLinksContainRecordHash({
        chain: { issuerNif: "12345678Z", lastHash: second, recordCount: 2 },
        targetHash: first,
        links: [{ recordHash: second, previousHash: second }],
      }),
    ).toBe(false);
  });
});
