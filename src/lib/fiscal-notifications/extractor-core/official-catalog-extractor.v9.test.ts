import { describe, expect, it } from "vitest";
import type { BoundedDocumentInput } from "../input-contract";
import {
  AEAT_OFFICIAL_CATALOG_PROFILES_V9,
  type AeatOfficialCatalogSectorGateV9,
} from "../knowledge/official-catalog-expansion.v9";
import { extractAeatOfficialCatalogDocumentV9 } from "./official-catalog-extractor.v9";

function document(text: string): BoundedDocumentInput {
  return Object.freeze({
    ownerScope: "owner-v9-synthetic",
    documentId: "document-v9-synthetic",
    pages: Object.freeze([
      Object.freeze({ pageNumber: 1, text, isBlank: text.length === 0 }),
    ]),
  });
}

function gatesFor(profile: (typeof AEAT_OFFICIAL_CATALOG_PROFILES_V9)[number]): readonly AeatOfficialCatalogSectorGateV9[] {
  return profile.sectorGate ? [profile.sectorGate] : [];
}

describe("AEAT official catalog extractor v9", () => {
  it("covers every profile with positive, negative, ambiguous and incomplete synthetic cases", () => {
    for (const [index, profile] of AEAT_OFFICIAL_CATALOG_PROFILES_V9.entries()) {
      const enabledSectorGates = gatesFor(profile);
      const positive = extractAeatOfficialCatalogDocumentV9({
        document: document(`AGENCIA ESTATAL DE ADMINISTRACIÓN TRIBUTARIA\n${profile.nameEs}\nSYNTHETIC_VALUE_NOT_RETAINED`),
        enabledSectorGates,
      });
      expect(positive.status, profile.id).toBe("REVIEW_REQUIRED");
      expect(positive.familyId, profile.id).toBe(profile.id);
      expect(positive.candidate?.maturity, profile.id).toBe("OFFICIAL_ONLY");
      expect(positive.candidate?.strongSignature, profile.id).toBe(false);
      expect(positive.retainedSourceContent, profile.id).toBe("NONE");
      expect(JSON.stringify(positive), profile.id).not.toContain("SYNTHETIC_VALUE_NOT_RETAINED");

      const negative = extractAeatOfficialCatalogDocumentV9({
        document: document(`TESORERÍA GENERAL DE LA SEGURIDAD SOCIAL\n${profile.nameEs}`),
        enabledSectorGates,
      });
      expect(negative.status, profile.id).toBe("BLOCKED");
      expect(negative.familyId, profile.id).toBeNull();

      const incomplete = extractAeatOfficialCatalogDocumentV9({
        document: document(`AGENCIA TRIBUTARIA\n${profile.nameEs.slice(0, -1)}`),
        enabledSectorGates,
      });
      expect(incomplete.status, profile.id).toBe("UNKNOWN");
      expect(incomplete.issues, profile.id).toContain("TITLE_NOT_EXACT");

      const other = AEAT_OFFICIAL_CATALOG_PROFILES_V9[(index + 1) % AEAT_OFFICIAL_CATALOG_PROFILES_V9.length]!;
      const allGates = [
        ...new Set([...gatesFor(profile), ...gatesFor(other)]),
      ];
      const ambiguous = extractAeatOfficialCatalogDocumentV9({
        document: document(`AGENCIA TRIBUTARIA\n${profile.nameEs}\n${other.nameEs}`),
        enabledSectorGates: allGates,
      });
      expect(ambiguous.status, profile.id).toBe("AMBIGUOUS");
      expect(ambiguous.candidates).toHaveLength(2);
      expect(ambiguous.familyId).toBeNull();
    }
  });

  it("keeps all four sector profiles out of primary classification by default", () => {
    for (const profile of AEAT_OFFICIAL_CATALOG_PROFILES_V9.filter((item) => item.priority === "P2")) {
      const disabled = extractAeatOfficialCatalogDocumentV9({
        document: document(`AGENCIA TRIBUTARIA\n${profile.nameEs}`),
      });
      expect(disabled.status, profile.id).toBe("UNKNOWN");
      expect(disabled.issues, profile.id).toEqual(["SECTOR_GATE_REQUIRED"]);
      expect(disabled.familyId, profile.id).toBeNull();
    }
  });

  it("does not promote a request or filing receipt into an administrative decision", () => {
    const extension = extractAeatOfficialCatalogDocumentV9({
      document: document(
        "AGENCIA TRIBUTARIA\nSolicitud o justificante de ampliación de plazo",
      ),
    });
    expect(extension.familyId).toBe("procedure.deadline_extension_request");
    expect(extension.confirmsDeadline).toBe(false);
    expect(extension.materializationPolicy).toBe("PROHIBITED");

    const filing = extractAeatOfficialCatalogDocumentV9({
      document: document(
        "AGENCIA TRIBUTARIA\nJustificante de autoliquidación rectificativa",
      ),
    });
    expect(filing.familyId).toBe("filing.rectifying_self_assessment_receipt");
    expect(filing.confirmsObligation).toBe(false);
    expect(filing.confirmsDebt).toBe(false);
  });
});
