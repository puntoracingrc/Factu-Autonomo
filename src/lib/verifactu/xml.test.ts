import { describe, expect, it } from "vitest";
import { buildRegistroFacturacionXml } from "./xml";
import { GENESIS_HASH } from "./constants";

describe("registro facturacion xml", () => {
  it("builds alta record with hash and invoice ids", () => {
    const xml = buildRegistroFacturacionXml({
      issuerNif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 121,
      recordType: "alta",
      recordHash: "abc123",
      previousHash: GENESIS_HASH,
      recordTimestamp: "2026-06-09T10:00:00.000Z",
      csv: "A-TEST0001",
    });

    expect(xml).toContain("<TipoRegistro>Alta</TipoRegistro>");
    expect(xml).toContain("<NumSerieFactura>F-2026-0001</NumSerieFactura>");
    expect(xml).toContain("<Huella>abc123</Huella>");
    expect(xml).toContain("<CodigoSeguroVerificacion>A-TEST0001</CodigoSeguroVerificacion>");
  });
});
