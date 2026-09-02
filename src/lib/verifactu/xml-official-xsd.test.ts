import { describe, expect, it } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { DEFAULT_PROFILE } from "../types";
import { validateVerifactuXmlOffline } from "./official-xsd-validator";
import {
  buildRegistroFacturacionXml,
  type VerifactuXmlSoftwareIdentity,
} from "./xml";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Empresa emisora sintetica",
  nif: "B00000000",
};

const software: VerifactuXmlSoftwareIdentity = {
  developerName: "Productora sintetica",
  developerNif: "B00000000",
  softwareName: "Factu test XSD",
  softwareId: "FA",
  softwareVersion: "0.2.0-test",
  installationId: "SYNTHETIC-INSTALLATION-1",
  exclusiveVerifactu: false,
  multiTaxpayerSupport: true,
  multipleTaxpayers: true,
};

const baseDocument: Document = {
  id: "synthetic-invoice-1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-09-02",
  client: { name: "Cliente sintetico", nif: "X0000000T" },
  items: [
    {
      id: "synthetic-line-1",
      description: "Servicio sintetico",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt: "2026-09-02T08:00:00.000Z",
};

function buildXml(input: {
  doc?: Document;
  numserie?: string;
  fecha?: string;
  importe?: number;
  cuotaTotal?: number;
  tipoFactura?: string;
  recordType?: "alta" | "anulacion";
  previousHash?: string;
  previousNumSerie?: string;
  previousFechaExpedicion?: string;
} = {}): string {
  const doc = input.doc ?? baseDocument;
  return buildRegistroFacturacionXml({
    doc,
    profile,
    issuerNif: profile.nif,
    numserie: input.numserie ?? doc.number,
    fecha: input.fecha ?? doc.date,
    importe: input.importe ?? 121,
    cuotaTotal: input.cuotaTotal ?? 21,
    tipoFactura: input.tipoFactura ?? "F1",
    recordType: input.recordType ?? "alta",
    recordHash: "A".repeat(64),
    previousHash: input.previousHash ?? "",
    previousNumSerie: input.previousNumSerie,
    previousFechaExpedicion: input.previousFechaExpedicion,
    recordTimestamp: "2026-09-02T10:00:00+02:00",
    vatExempt: false,
    software,
  });
}

async function expectOfficiallyStructured(xml: string): Promise<void> {
  const result = await validateVerifactuXmlOffline({
    xml,
    schema: "registration",
    syntheticOnly: true,
  });
  expect(result, JSON.stringify(result)).toMatchObject({
    status: "accepted",
    accepted: true,
    errors: [],
  });
}

describe("Factu registration XML against official AEAT XSD", () => {
  it("accepts an ordinary first registration", async () => {
    const xml = buildXml();

    expect(xml).not.toContain("TipoRectificativa");
    expect(xml).toContain(
      "<sum1:TipoUsoPosibleSoloVerifactu>N</sum1:TipoUsoPosibleSoloVerifactu>",
    );
    await expectOfficiallyStructured(xml);
  });

  it("accepts a chained registration with several VAT rates", async () => {
    const doc: Document = {
      ...baseDocument,
      id: "synthetic-invoice-2",
      number: "F-2026-0002",
      date: "2026-09-03",
      items: [
        baseDocument.items[0],
        {
          id: "synthetic-line-2",
          description: "Material sintetico",
          quantity: 1,
          unitPrice: 50,
          ivaPercent: 10,
        },
      ],
    };
    const xml = buildXml({
      doc,
      importe: 176,
      cuotaTotal: 26,
      previousHash: "B".repeat(64),
      previousNumSerie: "F-2026-0001",
      previousFechaExpedicion: "2026-09-02",
    });

    expect(xml.match(/<sum1:DetalleDesglose>/g)).toHaveLength(2);
    await expectOfficiallyStructured(xml);
  });

  it("accepts a VAT-exempt registration", async () => {
    const xml = buildRegistroFacturacionXml({
      doc: baseDocument,
      profile,
      issuerNif: profile.nif,
      numserie: baseDocument.number,
      fecha: baseDocument.date,
      importe: 100,
      cuotaTotal: 0,
      tipoFactura: "F1",
      recordType: "alta",
      recordHash: "C".repeat(64),
      previousHash: "",
      recordTimestamp: "2026-09-02T10:00:00+02:00",
      vatExempt: true,
      software,
    });

    expect(xml).toContain("<sum1:OperacionExenta>E1</sum1:OperacionExenta>");
    await expectOfficiallyStructured(xml);
  });

  it("accepts a rectification by difference and identifies its source invoice", async () => {
    const doc: Document = {
      ...baseDocument,
      id: "synthetic-rectification-difference",
      number: "FR-2026-0001",
      date: "2026-09-04",
      items: [
        {
          ...baseDocument.items[0],
          unitPrice: -100,
        },
      ],
      rectification: {
        originalDocumentId: baseDocument.id,
        originalNumber: baseDocument.number,
        originalDate: baseDocument.date,
        reason: "Anulacion sintetica",
        type: "anulacion",
      },
    };
    const xml = buildXml({
      doc,
      importe: -121,
      cuotaTotal: -21,
      tipoFactura: "R1",
    });

    expect(xml).toContain("<sum1:TipoRectificativa>I</sum1:TipoRectificativa>");
    expect(xml).toContain(
      "<sum1:NumSerieFactura>F-2026-0001</sum1:NumSerieFactura>",
    );
    await expectOfficiallyStructured(xml);
  });

  it("accepts a substitutive rectification and identifies its source invoice", async () => {
    const doc: Document = {
      ...baseDocument,
      id: "synthetic-rectification-substitution",
      number: "FR-2026-0002",
      date: "2026-09-05",
      items: [
        {
          ...baseDocument.items[0],
          unitPrice: 80,
        },
      ],
      rectification: {
        originalDocumentId: baseDocument.id,
        originalNumber: baseDocument.number,
        originalDate: baseDocument.date,
        reason: "Correccion sintetica",
        type: "correccion",
      },
    };
    const xml = buildXml({
      doc,
      importe: 96.8,
      cuotaTotal: 16.8,
      tipoFactura: "R4",
    });

    expect(xml).toContain("<sum1:TipoRectificativa>S</sum1:TipoRectificativa>");
    await expectOfficiallyStructured(xml);
  });

  it("accepts an AEAT registration cancellation record", async () => {
    const xml = buildXml({ recordType: "anulacion" });

    expect(xml).toContain("<sum1:RegistroAnulacion>");
    expect(xml).not.toContain("<sum1:ImporteTotal>");
    await expectOfficiallyStructured(xml);
  });

  it("rejects a wrong namespace, issuer NIF or issue date", async () => {
    const validXml = buildXml();
    const invalidDocuments = [
      validXml.replace(
        "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd",
        "urn:invalid:suministro-lr",
      ),
      validXml.replace(
        "<sum1:IDEmisorFactura>B00000000</sum1:IDEmisorFactura>",
        "<sum1:IDEmisorFactura>B0000000</sum1:IDEmisorFactura>",
      ),
      validXml.replace(
        "<sum1:FechaExpedicionFactura>02-09-2026</sum1:FechaExpedicionFactura>",
        "<sum1:FechaExpedicionFactura>2026-09-02</sum1:FechaExpedicionFactura>",
      ),
    ];

    for (const xml of invalidDocuments) {
      const result = await validateVerifactuXmlOffline({
        xml,
        schema: "registration",
        syntheticOnly: true,
      });
      expect(result.status).toBe("rejected");
      expect(result.accepted).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
