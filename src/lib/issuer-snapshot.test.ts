import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "./types";
import type { Document } from "./types";
import {
  attachIssuerSnapshot,
  captureIssuerSnapshot,
  hasDistinctFiscalName,
  issuerDisplayName,
  resolveIssuerForDocument,
  resolveIssuerNif,
} from "./issuer-snapshot";

const baseDoc: Document = {
  id: "1",
  type: "factura",
  number: "F-2026-0001",
  date: "2026-06-09",
  client: { name: "Cliente" },
  items: [],
  status: "enviado",
  createdAt: "",
  updatedAt: "",
};

describe("issuer snapshot", () => {
  it("captures profile fields at emission", () => {
    const snapshot = captureIssuerSnapshot({
      ...DEFAULT_PROFILE,
      commercialName: "Taller Visible",
      name: "Juan Pérez",
      nif: "12345678Z",
      vatId: "es12345678z",
      address: "Calle Mayor 1",
      city: "Madrid",
      postalCode: "28001",
      province: "Madrid",
      country: "España",
      website: "https://taller.example",
    });
    expect(snapshot.commercialName).toBe("Taller Visible");
    expect(snapshot.name).toBe("Juan Pérez");
    expect(snapshot.nif).toBe("12345678Z");
    expect(snapshot.vatId).toBe("ES12345678Z");
    expect(snapshot.province).toBe("Madrid");
    expect(snapshot.country).toBe("España");
    expect(snapshot.website).toBe("https://taller.example");
    expect(snapshot.capturedAt).toBeTruthy();
  });

  it("uses commercial name as display name without replacing fiscal identity", () => {
    const issuer = {
      commercialName: "Taller Visible",
      name: "Juan Pérez",
    };

    expect(issuerDisplayName(issuer)).toBe("Taller Visible");
    expect(hasDistinctFiscalName(issuer)).toBe(true);
    expect(
      hasDistinctFiscalName({
        commercialName: " Juan   Pérez ",
        name: "juan pérez",
      }),
    ).toBe(false);
  });

  it("freezes issuer on first emission", () => {
    const profile = {
      ...DEFAULT_PROFILE,
      name: "Nuevo nombre",
      nif: "99999999Z",
    };
    const withIssuer = attachIssuerSnapshot(
      {
        ...baseDoc,
        issuer: {
          name: "Nombre original",
          nif: "12345678Z",
          address: "",
          city: "",
          postalCode: "",
          capturedAt: "2026-01-01",
        },
      },
      profile,
    );
    expect(withIssuer.issuer?.name).toBe("Nombre original");
  });

  it("resolves issuer from snapshot for PDF and Veri*Factu", () => {
    const doc = attachIssuerSnapshot(baseDoc, {
      ...DEFAULT_PROFILE,
      commercialName: "Marca original",
      name: "Emisor",
      nif: "12345678Z",
    });
    expect(resolveIssuerNif(doc, { ...DEFAULT_PROFILE, nif: "00000000A" })).toBe(
      "12345678Z",
    );
    expect(resolveIssuerForDocument(doc, DEFAULT_PROFILE).name).toBe("Emisor");
    expect(resolveIssuerForDocument(doc, DEFAULT_PROFILE).commercialName).toBe(
      "Marca original",
    );
  });

  it("reutiliza el logo actual del perfil si el snapshot no lo guardó", () => {
    const doc: Document = {
      ...baseDoc,
      issuer: {
        name: "Emisor",
        nif: "12345678Z",
        address: "",
        city: "",
        postalCode: "",
        capturedAt: "2026-01-01",
      },
    };
    expect(
      resolveIssuerForDocument(doc, {
        ...DEFAULT_PROFILE,
        logoUrl: "data:image/png;base64,logo",
      }).logoUrl,
    ).toBe("data:image/png;base64,logo");
  });

  it("reutiliza la web actual del perfil si el snapshot no la guardó", () => {
    const doc: Document = {
      ...baseDoc,
      issuer: {
        name: "Emisor",
        nif: "12345678Z",
        address: "",
        city: "",
        postalCode: "",
        capturedAt: "2026-01-01",
      },
    };

    expect(
      resolveIssuerForDocument(doc, {
        ...DEFAULT_PROFILE,
        website: "https://negocio.example",
      }).website,
    ).toBe("https://negocio.example");
  });

  it("aplica el nombre comercial actual a snapshots antiguos que no lo tenían", () => {
    const doc: Document = {
      ...baseDoc,
      issuer: {
        name: "Nombre fiscal congelado",
        nif: "12345678Z",
        address: "Calle original 1",
        city: "Barcelona",
        postalCode: "08001",
        capturedAt: "2026-01-01",
      },
    };

    const issuer = resolveIssuerForDocument(doc, {
      ...DEFAULT_PROFILE,
      commercialName: "Marca visible actual",
      name: "Nombre fiscal nuevo",
      nif: "99999999R",
    });

    expect(issuer.commercialName).toBe("Marca visible actual");
    expect(issuer.name).toBe("Nombre fiscal congelado");
    expect(issuer.nif).toBe("12345678Z");
  });

  it("does not snapshot borradores", () => {
    const draft = attachIssuerSnapshot(
      { ...baseDoc, status: "borrador" },
      DEFAULT_PROFILE,
    );
    expect(draft.issuer).toBeUndefined();
  });
});
