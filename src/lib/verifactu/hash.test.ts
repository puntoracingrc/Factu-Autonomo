import { describe, expect, it } from "vitest";
import {
  buildRegistroAltaPayload,
  buildRegistroAnulacionPayload,
  computeRegistroAltaHash,
  computeRegistroAnulacionHash,
  type RegistroAltaHashInput,
  type RegistroAnulacionHashInput,
} from "./hash";

type OfficialAltaVector = {
  case: string;
  description: string;
  type: "alta";
  input: RegistroAltaHashInput;
  expectedConcatenation: string;
  expectedHash: string;
};

type OfficialAnulacionVector = {
  case: string;
  description: string;
  type: "anulacion";
  input: RegistroAnulacionHashInput;
  expectedConcatenation: string;
  expectedHash: string;
};

type OfficialVector = OfficialAltaVector | OfficialAnulacionVector;

/** Vectores oficiales AEAT spec huella v0.1.2 (Anexo II). */
const OFFICIAL_VECTORS: OfficialVector[] = [
  {
    case: "1",
    description: "Primer registro de alta (sin huella anterior)",
    type: "alta" as const,
    input: {
      idEmisorFactura: "89890001K",
      numSerieFactura: "12345678/G33",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "12.35",
      importeTotal: "123.45",
      huellaAnterior: null,
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:30+01:00",
    },
    expectedConcatenation:
      "IDEmisorFactura=89890001K&NumSerieFactura=12345678/G33&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=&FechaHoraHusoGenRegistro=2024-01-01T19:20:30+01:00",
    expectedHash:
      "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60",
  },
  {
    case: "2",
    description: "Segundo registro de alta (encadenando con caso 1)",
    type: "alta" as const,
    input: {
      idEmisorFactura: "89890001K",
      numSerieFactura: "12345679/G34",
      fechaExpedicionFactura: "01-01-2024",
      tipoFactura: "F1",
      cuotaTotal: "12.35",
      importeTotal: "123.45",
      huellaAnterior:
        "3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:35+01:00",
    },
    expectedConcatenation:
      "IDEmisorFactura=89890001K&NumSerieFactura=12345679/G34&FechaExpedicionFactura=01-01-2024&TipoFactura=F1&CuotaTotal=12.35&ImporteTotal=123.45&Huella=3C464DAF61ACB827C65FDA19F352A4E3BDC2C640E9E9FC4CC058073F38F12F60&FechaHoraHusoGenRegistro=2024-01-01T19:20:35+01:00",
    expectedHash:
      "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
  },
  {
    case: "3",
    description: "Registro de anulación (encadenando con caso 2)",
    type: "anulacion" as const,
    input: {
      idEmisorFacturaAnulada: "89890001K",
      numSerieFacturaAnulada: "12345679/G34",
      fechaExpedicionFacturaAnulada: "01-01-2024",
      huellaAnterior:
        "F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97",
      fechaHoraHusoGenRegistro: "2024-01-01T19:20:40+01:00",
    },
    expectedConcatenation:
      "IDEmisorFacturaAnulada=89890001K&NumSerieFacturaAnulada=12345679/G34&FechaExpedicionFacturaAnulada=01-01-2024&Huella=F7B94CFD8924EDFF273501B01EE5153E4CE8F259766F88CF6ACB8935802A2B97&FechaHoraHusoGenRegistro=2024-01-01T19:20:40+01:00",
    expectedHash:
      "177547C0D57AC74748561D054A9CEC14B4C4EA23D1BEFD6F2E69E3A388F90C68",
  },
];

function altaVector(caseId: string): OfficialAltaVector {
  const vector = OFFICIAL_VECTORS.find((item) => item.case === caseId);
  if (!vector || vector.type !== "alta") {
    throw new Error(`No existe vector de alta ${caseId}`);
  }
  return vector;
}

describe("verifactu hash AEAT v0.1.2", () => {
  for (const vector of OFFICIAL_VECTORS) {
    it(`caso ${vector.case}: ${vector.description}`, async () => {
      if (vector.type === "alta") {
        expect(buildRegistroAltaPayload(vector.input)).toBe(
          vector.expectedConcatenation,
        );
        expect(await computeRegistroAltaHash(vector.input)).toBe(
          vector.expectedHash,
        );
        return;
      }

      expect(buildRegistroAnulacionPayload(vector.input)).toBe(
        vector.expectedConcatenation,
      );
      expect(await computeRegistroAnulacionHash(vector.input)).toBe(
        vector.expectedHash,
      );
    });
  }

  it("encadena dos altas consecutivas", async () => {
    const firstVector = altaVector("1");
    const secondVector = altaVector("2");
    const first = await computeRegistroAltaHash(firstVector.input);
    const second = await computeRegistroAltaHash({
      ...secondVector.input,
      huellaAnterior: first,
    });
    expect(second).toBe(secondVector.expectedHash);
  });
});
