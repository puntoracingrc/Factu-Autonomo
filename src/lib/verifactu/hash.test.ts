import { describe, expect, it } from "vitest";
import { buildHashPayload, computeRecordHash } from "./hash";
import { GENESIS_HASH } from "./constants";

describe("verifactu hash chain", () => {
  it("builds deterministic hash payload", () => {
    const payload = buildHashPayload({
      issuerNif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 100,
      recordType: "alta",
      previousHash: GENESIS_HASH,
    });
    expect(payload).toContain("IDEmisorFactura=12345678Z");
    expect(payload).toContain("TipoRegistro=A");
    expect(payload).toContain(`HuellaRegistroAnterior=${GENESIS_HASH}`);
  });

  it("chains hashes across records", async () => {
    const first = await computeRecordHash({
      issuerNif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 100,
      recordType: "alta",
      previousHash: GENESIS_HASH,
    });

    const second = await computeRecordHash({
      issuerNif: "12345678Z",
      numserie: "F-2026-0002",
      fecha: "2026-06-10",
      importe: 50,
      recordType: "alta",
      previousHash: first,
    });

    expect(first).toHaveLength(64);
    expect(second).toHaveLength(64);
    expect(first).not.toBe(second);
  });
});
