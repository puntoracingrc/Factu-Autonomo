import { describe, expect, it } from "vitest";
import { OFFICIAL_FIELD_MAPPINGS } from "../verifactu-official-alignment";
import { evaluateOfficialAlignedXmlPreflight } from "./official-xml-preflight-gate";

describe("evaluateOfficialAlignedXmlPreflight", () => {
  it("bloquea el estado actual de XML oficial alineado", () => {
    const result = evaluateOfficialAlignedXmlPreflight();

    expect(result.status).toBe("blocked");
    expect(result.canSerializeOfficialAlignedXml).toBe(false);
    expect(result.canValidateOfflineXsd).toBe(false);
    expect(result.canProceedToQr).toBe(false);
    expect(result.canProceedToSignature).toBe(false);
    expect(result.canProceedToTransport).toBe(false);
    expect(result.networkUsed).toBe(false);
    expect(result.supabaseUsed).toBe(false);
    expect(result.transportUsed).toBe(false);
    expect(result.xmlPrinted).toBe(false);
  });

  it("incluye los blockers oficiales esperados", () => {
    const result = evaluateOfficialAlignedXmlPreflight();

    expect(result.blockers).toContain("BLOCKED_XSD_NOT_COMMITTED");
    expect(result.blockers).toContain("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
    expect(result.blockers).toContain(
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    );
  });

  it("mantiene bloqueada la puerta si hay mapping pending o blocked", () => {
    const result = evaluateOfficialAlignedXmlPreflight({
      mappings: OFFICIAL_FIELD_MAPPINGS,
    });

    expect(result.mappingReady).toBe(false);
    expect(result.mappingSummary.pending).toBeGreaterThan(0);
    expect(result.mappingSummary.blocked).toBeGreaterThan(0);
    expect(result.blockers).toContain("BLOCKED_OFFICIAL_FIELD_MAPPING_NOT_READY");
    expect(result.canSerializeOfficialAlignedXml).toBe(false);
  });

  it("mantiene bloqueada la puerta si los datos sinteticos siguen bloqueados", () => {
    const result = evaluateOfficialAlignedXmlPreflight();

    expect(result.syntheticDataReady).toBe(false);
    expect(result.blockers).toContain(
      "BLOCKED_NO_COMPLETE_OFFICIAL_SAFE_SYNTHETIC_DATA",
    );
  });

  it("no usa red ni expone XML en el resultado", () => {
    const result = evaluateOfficialAlignedXmlPreflight();
    const serialized = JSON.stringify(result);

    expect(result.networkUsed).toBe(false);
    expect(serialized).not.toContain("<");
    expect(serialized).not.toMatch(/BEGIN CERTIFICATE|PRIVATE KEY|token/i);
  });
});
