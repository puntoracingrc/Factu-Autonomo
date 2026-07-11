import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BusinessProfile, Document } from "../types";
import { finalizeVerifactuDocument } from "./finalize";
import { VerifactuFinalizationError } from "./errors";
import { finalizeSavedVerifactuDocument } from "./save-outcome";

vi.mock("./finalize", () => ({
  finalizeVerifactuDocument: vi.fn(),
}));

const document: Document = {
  id: "saved-invoice",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-07-11",
  client: { name: "Cliente" },
  items: [],
  status: "enviado",
  createdAt: "2026-07-11T00:00:00.000Z",
  updatedAt: "2026-07-11T00:00:00.000Z",
};

const profile = { nif: "12345678Z" } as BusinessProfile;
const registerLocal = vi.fn(async (doc: Document) => doc);

describe("finalizeSavedVerifactuDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve un resultado explícito y conserva el documento si falla después de guardar", async () => {
    vi.mocked(finalizeVerifactuDocument).mockRejectedValue(
      new VerifactuFinalizationError(
        "SUBMISSION_DISABLED",
        "Registro desactivado",
      ),
    );

    const result = await finalizeSavedVerifactuDocument({
      doc: document,
      profile,
      registerLocal,
    });

    expect(result.outcome).toBe("saved_without_registration");
    expect(result.document).toBe(document);
    expect(result).toMatchObject({
      notice: expect.stringContaining("El documento ya está guardado"),
    });
    expect("notice" in result ? result.notice : "").toContain(
      "no lo vuelvas a crear ni repitas el guardado",
    );
    expect("notice" in result ? result.notice : "").not.toMatch(
      /pendiente|prueba de nuevo|inténtalo de nuevo/i,
    );
  });

  it("bloquea la descarga ante un error ajeno al resultado VeriFactu esperado", async () => {
    vi.mocked(finalizeVerifactuDocument).mockRejectedValue(
      new Error("integridad inesperada"),
    );

    const result = await finalizeSavedVerifactuDocument({
      doc: document,
      profile,
      registerLocal,
    });

    expect(result.outcome).toBe("saved_with_safety_block");
    expect("notice" in result ? result.notice : "").toContain(
      "comprobación de seguridad",
    );
    expect("notice" in result ? result.notice : "").toContain(
      "bloqueó los efectos posteriores y la descarga",
    );
  });

  it("no presenta como registrado un guardado sin atestación", async () => {
    vi.mocked(finalizeVerifactuDocument).mockResolvedValue(document);

    const result = await finalizeSavedVerifactuDocument({
      doc: document,
      profile,
      registerLocal,
    });

    expect(result).toEqual({ outcome: "not_registered", document });
  });
});
