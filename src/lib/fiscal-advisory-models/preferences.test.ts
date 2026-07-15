import { describe, expect, it } from "vitest";
import {
  normalizeFiscalAdvisoryModelPreferencesV1,
  setManualFiscalAdvisoryModelSelectionV1,
} from "./preferences";

describe("fiscal advisory model preferences", () => {
  it("keeps only an exact, unique, versioned selection", () => {
    expect(
      normalizeFiscalAdvisoryModelPreferencesV1({
        schemaVersion: 1,
        manualModelCodes: ["036", "303", "A22"],
      }),
    ).toEqual({
      schemaVersion: 1,
      manualModelCodes: ["036", "303", "A22"],
    });
    expect(
      normalizeFiscalAdvisoryModelPreferencesV1({
        schemaVersion: 1,
        manualModelCodes: ["303", "303"],
      }),
    ).toBeUndefined();
  });

  it.each([
    [" 303"],
    ["303 "],
    ["iva"],
    ["303/390"],
    ["9999"],
    ["%33%30%33"],
  ])("rejects non-canonical persisted code %s", (modelCode) => {
    expect(
      normalizeFiscalAdvisoryModelPreferencesV1({
        schemaVersion: 1,
        manualModelCodes: [modelCode],
      }),
    ).toBeUndefined();
  });

  it("adds and removes only codes present in the deployed catalog", () => {
    const allowedModelCodes = ["036", "303", "390"];
    const added = setManualFiscalAdvisoryModelSelectionV1({
      current: undefined,
      modelCode: "303",
      selected: true,
      allowedModelCodes,
    });
    expect(added).toEqual({ schemaVersion: 1, manualModelCodes: ["303"] });
    expect(
      setManualFiscalAdvisoryModelSelectionV1({
        current: added,
        modelCode: "303",
        selected: false,
        allowedModelCodes,
      }),
    ).toEqual({ schemaVersion: 1, manualModelCodes: [] });
    expect(
      setManualFiscalAdvisoryModelSelectionV1({
        current: added,
        modelCode: "999",
        selected: true,
        allowedModelCodes,
      }),
    ).toBeNull();
  });
});
