import { describe, expect, it } from "vitest";
import { buildRegistroFacturacionXml } from "./xml";

describe("registro facturacion xml", () => {
  it("builds alta record with TipoFactura, CuotaTotal and hash", () => {
    const xml = buildRegistroFacturacionXml({
      issuerNif: "12345678Z",
      numserie: "F-2026-0001",
      fecha: "2026-06-09",
      importe: 121,
      cuotaTotal: 21,
      tipoFactura: "F1",
      recordType: "alta",
      recordHash: "ABC123",
      previousHash: "",
      recordTimestamp: "2026-06-09T11:00:00+02:00",
      csv: "A-TEST0001",
    });

    expect(xml).toContain("<TipoFactura>F1</TipoFactura>");
    expect(xml).toContain("<CuotaTotal>21.00</CuotaTotal>");
    expect(xml).toContain("<NumSerieFactura>F-2026-0001</NumSerieFactura>");
    expect(xml).toContain("<Huella>ABC123</Huella>");
    expect(xml).not.toContain("<Encadenamiento>");
    expect(xml).toContain("<CodigoSeguroVerificacion>A-TEST0001</CodigoSeguroVerificacion>");
  });

  it("includes encadenamiento when previous hash exists", () => {
    const xml = buildRegistroFacturacionXml({
      issuerNif: "12345678Z",
      numserie: "F-2026-0002",
      fecha: "2026-06-10",
      importe: 50,
      cuotaTotal: 0,
      tipoFactura: "F1",
      recordType: "alta",
      recordHash: "DEF456",
      previousHash: "ABC123",
      recordTimestamp: "2026-06-10T11:00:00+02:00",
    });

    expect(xml).toContain("<Encadenamiento>");
    expect(xml).toContain("<Huella>ABC123</Huella>");
  });
});
