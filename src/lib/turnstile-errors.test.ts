import { describe, expect, it } from "vitest";
import {
  describeTurnstileClientError,
  describeTurnstileSiteKeyIssue,
  isLikelyTurnstileSiteKey,
  normalizeTurnstileClientErrorCode,
} from "@/lib/turnstile-errors";

describe("turnstile error diagnostics", () => {
  it("accepts Cloudflare production and official test sitekey formats", () => {
    expect(
      isLikelyTurnstileSiteKey(
        "0x4AAAAAAabcdefghijklmnopqrstuvwxyz0123456789_-",
      ),
    ).toBe(true);
    expect(isLikelyTurnstileSiteKey("1x00000000000000000000AA")).toBe(true);
  });

  it("flags malformed public sitekeys without exposing the value", () => {
    const issue = describeTurnstileSiteKeyIssue("bad:value");

    expect(issue).toMatchObject({
      code: "invalid-sitekey-format",
      diagnosticCode: "invalid-sitekey-format",
      kind: "configuration",
    });
    expect(issue?.message).not.toContain("bad:value");
  });

  it("normalizes client error codes from Turnstile callback payloads", () => {
    expect(normalizeTurnstileClientErrorCode("110100")).toBe("110100");
    expect(normalizeTurnstileClientErrorCode("error 110200 from widget")).toBe(
      "110200",
    );
    expect(normalizeTurnstileClientErrorCode(200500)).toBe("200500");
    expect(normalizeTurnstileClientErrorCode({ code: "110100" })).toBe(null);
  });

  it("separates configuration errors from transient challenge failures", () => {
    expect(describeTurnstileClientError("110100")).toMatchObject({
      code: "110100",
      kind: "configuration",
    });
    expect(describeTurnstileClientError("110110")).toMatchObject({
      code: "110110",
      kind: "configuration",
    });
    expect(describeTurnstileClientError("110200")).toMatchObject({
      code: "110200",
      kind: "configuration",
    });
    expect(describeTurnstileClientError("200500")).toMatchObject({
      code: "200500",
      kind: "transient",
    });
    expect(describeTurnstileClientError("300123")).toMatchObject({
      code: "300123",
      kind: "transient",
    });
  });
});
