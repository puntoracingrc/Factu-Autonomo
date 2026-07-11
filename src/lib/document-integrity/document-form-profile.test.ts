import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { issueDocument } from "./index";
import { resolveDocumentFormBusinessProfile } from "./document-form-profile";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "../types";

const NOW = "2026-07-11T10:00:00.000Z";

function originalInvoice(profile: BusinessProfile): Document {
  return issueDocument(
    {
      id: "invoice-original",
      type: "factura",
      number: "F-2026-0001",
      date: "2026-06-01",
      client: { name: "Cliente" },
      items: [
        {
          id: "line-1",
          description: "Servicio",
          quantity: 1,
          unitPrice: 100,
          ivaPercent: profile.iva?.defaultRate ?? 21,
        },
      ],
      status: "borrador",
      createdAt: NOW,
      updatedAt: NOW,
    },
    profile,
    NOW,
  );
}

function correctionDraft(): Document {
  return {
    id: "rectification-draft",
    type: "factura",
    number: "BORRADOR",
    date: "2026-07-11",
    client: { name: "Cliente" },
    items: [],
    status: "borrador",
    rectification: {
      originalDocumentId: "invoice-original",
      originalNumber: "F-2026-0001",
      originalDate: "2026-06-01",
      reason: "Corrección",
      type: "correccion",
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("resolveDocumentFormBusinessProfile", () => {
  it("recupera emisor, exención y configuración de IVA históricos", () => {
    const historicalProfile: BusinessProfile = {
      ...DEFAULT_PROFILE,
      name: "Emisor histórico",
      nif: "11111111H",
      vatExempt: false,
      iva: { rates: [4, 10, 21], defaultRate: 10 },
    };
    const currentProfile: BusinessProfile = {
      ...DEFAULT_PROFILE,
      name: "Emisor actual",
      nif: "11111111H",
      vatExempt: true,
      iva: { rates: [0], defaultRate: 0 },
    };

    const resolution = resolveDocumentFormBusinessProfile(
      correctionDraft(),
      [originalInvoice(historicalProfile)],
      currentProfile,
    );

    expect(resolution.blocked).toBe(false);
    expect(resolution.profile).toMatchObject({
      name: "Emisor histórico",
      nif: "11111111H",
      vatExempt: false,
      iva: { rates: [4, 10, 21], defaultRate: 10 },
    });
  });

  it("bloquea el formulario si la fuente histórica no supera integridad", () => {
    const original = originalInvoice({
      ...DEFAULT_PROFILE,
      nif: "11111111H",
    });
    const corrupt: Document = {
      ...original,
      documentSnapshot: {
        ...original.documentSnapshot!,
        fiscalContext: {
          ...original.documentSnapshot!.fiscalContext,
          vatExempt: !original.documentSnapshot!.fiscalContext.vatExempt,
        },
      },
    };

    expect(
      resolveDocumentFormBusinessProfile(
        correctionDraft(),
        [corrupt],
        { ...DEFAULT_PROFILE, nif: "11111111H" },
      ),
    ).toMatchObject({ blocked: true });
  });

  it("conecta el perfil verificado con todo el flujo del formulario", () => {
    const source = readFileSync(
      new URL(
        "../../components/forms/DocumentForm.tsx",
        import.meta.url,
      ),
      "utf8",
    );

    expect(source).toContain(
      "const vatExempt = isVatExempt(effectiveDocumentProfile)",
    );
    expect(source).toContain("effectiveDocumentProfile.iva?.defaultRate");
    expect(source).toContain(
      "businessProfileMissingDocumentLabels(effectiveDocumentProfile)",
    );
    expect(source).toContain(
      "hasUsualSpanishTaxIdShape(effectiveDocumentProfile.nif)",
    );
    expect(source).toContain(
      "attachIssuerSnapshot(previewDoc, effectiveDocumentProfile)",
    );
    expect(source).toContain(
      "openDocumentPdfPreview(doc, effectiveDocumentProfile, pdfOptions)",
    );
    expect(source).toContain(
      "validateDocumentEmission(\n        { ...payload, type },\n        effectiveDocumentProfile",
    );
    expect(source).toContain("profile: effectiveDocumentProfile");
    expect(source).toContain("rectificationProfileBlocked");
  });
});
