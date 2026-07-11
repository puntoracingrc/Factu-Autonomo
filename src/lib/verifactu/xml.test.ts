import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { buildRegistroFacturacionXml } from "./xml";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Autonomo Test",
  nif: "12345678Z",
  verifactu: { enabled: true, environment: "test", optInVersion: 1 },
};

const doc: Document = {
  id: "doc-1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "Cliente Test", nif: "87654321X" },
  items: [
    {
      id: "l1",
      description: "Servicio",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-06-09T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
};

describe("registro facturacion xml", () => {
  it("builds official alta wrapper with breakdown and hash", () => {
    const xml = buildRegistroFacturacionXml({
      doc,
      profile,
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
      vatExempt: false,
    });

    expect(xml).toContain("<sum:RegFactuSistemaFacturacion");
    expect(xml).toContain("<sum1:RegistroAlta>");
    expect(xml).toContain("<sum1:IDVersion>1.0</sum1:IDVersion>");
    expect(xml).toContain("<sum1:TipoFactura>F1</sum1:TipoFactura>");
    expect(xml).toContain("<sum1:CuotaTotal>21.00</sum1:CuotaTotal>");
    expect(xml).toContain("<sum1:NumSerieFactura>F-2026-0001</sum1:NumSerieFactura>");
    expect(xml).toContain("<sum1:PrimerRegistro>S</sum1:PrimerRegistro>");
    expect(xml).toContain("<sum1:Huella>ABC123</sum1:Huella>");
    expect(xml).not.toContain("CodigoSeguroVerificacion");
  });

  it("includes official previous invoice identity when previous hash exists", () => {
    const xml = buildRegistroFacturacionXml({
      doc: { ...doc, id: "doc-2", number: "F-2026-0002", date: "2026-06-10" },
      profile,
      issuerNif: "12345678Z",
      numserie: "F-2026-0002",
      fecha: "2026-06-10",
      importe: 50,
      cuotaTotal: 0,
      tipoFactura: "F1",
      recordType: "alta",
      recordHash: "DEF456",
      previousHash: "ABC123",
      previousNumSerie: "F-2026-0001",
      previousFechaExpedicion: "2026-06-09",
      recordTimestamp: "2026-06-10T11:00:00+02:00",
      vatExempt: false,
    });

    expect(xml).toContain("<sum1:RegistroAnterior>");
    expect(xml).toContain("<sum1:NumSerieFactura>F-2026-0001</sum1:NumSerieFactura>");
    expect(xml).toContain("<sum1:FechaExpedicionFactura>09-06-2026</sum1:FechaExpedicionFactura>");
    expect(xml).toContain("<sum1:Huella>ABC123</sum1:Huella>");
  });

  it("usa el mismo redondeo por línea en desglose y totales fraccionarios", () => {
    const fractional = {
      ...doc,
      items: [
        { ...doc.items[0], id: "fraction-1", unitPrice: 0.025 },
        { ...doc.items[0], id: "fraction-2", unitPrice: 0.025 },
      ],
    };
    const xml = buildRegistroFacturacionXml({
      doc: fractional,
      profile,
      issuerNif: "12345678Z",
      numserie: fractional.number,
      fecha: fractional.date,
      importe: 0.08,
      cuotaTotal: 0.02,
      tipoFactura: "F1",
      recordType: "alta",
      recordHash: "A".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-06-09T11:00:00+02:00",
      vatExempt: false,
    });

    expect(xml).toContain(
      "<sum1:BaseImponibleOimporteNoSujeto>0.06</sum1:BaseImponibleOimporteNoSujeto>",
    );
    expect(xml).toContain(
      "<sum1:CuotaRepercutida>0.02</sum1:CuotaRepercutida>",
    );
    expect(xml).toContain("<sum1:CuotaTotal>0.02</sum1:CuotaTotal>");
    expect(xml).toContain("<sum1:ImporteTotal>0.08</sum1:ImporteTotal>");
  });
});
