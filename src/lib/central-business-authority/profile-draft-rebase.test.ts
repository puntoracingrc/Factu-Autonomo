import { describe, expect, it } from "vitest";

import { DEFAULT_PROFILE } from "@/lib/types";

import { rebaseBusinessProfileDraft } from "./profile-draft-rebase";

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
