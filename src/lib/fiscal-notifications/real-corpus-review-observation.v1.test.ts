import { describe, expect, it } from "vitest";

import {
  canonicalRealCorpusDateType,
  canonicalRealCorpusReferenceType,
} from "./real-corpus-review-observation.v1";

describe("real corpus observed date projection", () => {
  it("keeps dates of cited acts out of the current document chronology", () => {
    expect(canonicalRealCorpusDateType("PROPOSAL_NOTIFICATION_DATE")).toBeNull();
    expect(canonicalRealCorpusDateType("REQUEST_DATE")).toBeNull();
    expect(canonicalRealCorpusDateType("CITED_SEIZURE_DATE")).toBeNull();
  });

  it("retains explicit current-act chronology types", () => {
    expect(canonicalRealCorpusDateType("ISSUE_DATE")).toBe("ISSUE_DATE");
    expect(canonicalRealCorpusDateType("SIGNING_DATE")).toBe("SIGNING_DATE");
    expect(canonicalRealCorpusDateType("EFFECTIVE_NOTIFICATION_DATE")).toBe(
      "EFFECTIVE_NOTIFICATION_DATE",
    );
  });

  it("preserves a printed refund reference as its own strong type", () => {
    expect(canonicalRealCorpusReferenceType("REFUND_REFERENCE")).toBe(
      "REFUND_REFERENCE",
    );
  });
});
