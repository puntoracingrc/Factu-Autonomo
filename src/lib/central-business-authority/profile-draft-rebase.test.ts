import { describe, expect, it } from "vitest";

import { DEFAULT_APP_PREFERENCES } from "@/lib/app-preferences";
import { DEFAULT_PROFILE } from "@/lib/types";

import {
  findBusinessProfileDraftConflictPaths,
  rebaseBusinessProfileDraft,
} from "./profile-draft-rebase";

describe("rebaseBusinessProfileDraft", () => {
  it("preserves remote fields that the local form did not change", () => {
    const baseline = {
      ...DEFAULT_PROFILE,
      phone: "600000001",
      website: "https://before.example",
    };
    const latest = {
      ...baseline,
      website: "https://remote.example",
    };
    const draft = {
      ...baseline,
      phone: "600000002",
    };

    expect(
      rebaseBusinessProfileDraft({ latest, baseline, draft }),
    ).toMatchObject({
      phone: "600000002",
      website: "https://remote.example",
    });
  });

  it("lets the explicit local save win when both sides changed one field", () => {
    const baseline = { ...DEFAULT_PROFILE, phone: "600000001" };
    const latest = { ...baseline, phone: "600000002" };
    const draft = { ...baseline, phone: "600000003" };

    expect(
      rebaseBusinessProfileDraft({ latest, baseline, draft }).phone,
    ).toBe("600000003");
  });

  it("detects when two devices changed the same field differently", () => {
    const baseline = { ...DEFAULT_PROFILE, phone: "600000001" };
    const latest = { ...baseline, phone: "600000002" };
    const draft = { ...baseline, phone: "600000003" };

    expect(
      findBusinessProfileDraftConflictPaths({ latest, baseline, draft }),
    ).toEqual(["phone"]);
  });

  it("allows independent nested preferences to merge", () => {
    const baseline = {
      ...DEFAULT_PROFILE,
      appPreferences: {
        ...DEFAULT_APP_PREFERENCES,
      },
    };
    const latest = {
      ...baseline,
      appPreferences: {
        ...baseline.appPreferences,
        theme: "dark" as const,
      },
    };
    const draft = {
      ...baseline,
      appPreferences: {
        ...baseline.appPreferences,
        density: "compact" as const,
      },
    };

    expect(
      findBusinessProfileDraftConflictPaths({ latest, baseline, draft }),
    ).toEqual([]);
    expect(
      rebaseBusinessProfileDraft({ latest, baseline, draft }).appPreferences,
    ).toMatchObject({
      theme: "dark",
      density: "compact",
    });
  });

  it("reports the exact nested fiscal setting changed by both devices", () => {
    const baseline = DEFAULT_PROFILE;
    const latest = {
      ...baseline,
      numbering: {
        ...baseline.numbering,
        lastSequence: {
          ...baseline.numbering.lastSequence,
          factura: 20,
        },
      },
    };
    const draft = {
      ...baseline,
      numbering: {
        ...baseline.numbering,
        lastSequence: {
          ...baseline.numbering.lastSequence,
          factura: 21,
        },
      },
    };

    expect(
      findBusinessProfileDraftConflictPaths({ latest, baseline, draft }),
    ).toEqual(["numbering.lastSequence.factura"]);
  });

  it("preserves an explicit removal of an optional field", () => {
    const baseline = {
      ...DEFAULT_PROFILE,
      website: "https://before.example",
    };
    const latest = {
      ...baseline,
      phone: "600000002",
    };
    const draft = {
      ...baseline,
      website: undefined,
    };

    expect(
      rebaseBusinessProfileDraft({ latest, baseline, draft }),
    ).toMatchObject({
      phone: "600000002",
      website: undefined,
    });
  });
});
