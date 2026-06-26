import { describe, expect, it } from "vitest";
import { createBlockedOfflineXsdValidator } from "./offline-xsd-validator-contract";

describe("createBlockedOfflineXsdValidator", () => {
  it("siempre devuelve un adapter bloqueado", () => {
    const adapter = createBlockedOfflineXsdValidator();

    expect(adapter.status).toBe("blocked");
    expect(adapter.capabilities).toEqual({
      canValidateOffline: false,
      usesNetwork: false,
      usesJava: false,
      usesNativeBinary: false,
      printsXml: false,
    });
    expect(adapter.blockers).toEqual([
      "BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR",
      "BLOCKED_XSD_NOT_COMMITTED",
    ]);
  });

  it("nunca acepta una validacion ni genera falso positivo", () => {
    const adapter = createBlockedOfflineXsdValidator();
    const result = adapter.validate({
      xml: "REDACT_ME_AS_XML_INPUT",
      schemaArtifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
      syntheticOnly: true,
    });

    expect(result.status).toBe("blocked");
    expect(result.accepted).toBe(false);
    if (result.status !== "blocked") {
      throw new Error("Blocked validator unexpectedly accepted validation.");
    }
    expect(result.blockers).toContain("BLOCKED_NO_SAFE_OFFLINE_XSD_VALIDATOR");
  });

  it("no devuelve XML de entrada en errores o JSON", () => {
    const adapter = createBlockedOfflineXsdValidator();
    const result = adapter.validate({
      xml: "REDACT_ME_AS_XML_INPUT_HIDDEN",
      schemaArtifactId: "AEAT_VERIFACTU_SUMINISTRO_LR_XSD_TIKE_V1_0",
      syntheticOnly: true,
    });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("REDACT_ME_AS_XML_INPUT_HIDDEN");
    expect(serialized).not.toContain("<");
  });
});
