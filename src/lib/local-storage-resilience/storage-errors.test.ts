import { describe, expect, it } from "vitest";
import {
  classifyLocalStorageResilienceError,
  redactLocalStorageResilienceError,
  summarizeLocalStorageResilienceError,
} from "./storage-errors";

// PHASE2E4_STORAGE_ERROR_TAXONOMY_V1

describe("storage error taxonomy", () => {
  it("classifies common storage failures without exposing payloads", () => {
    expect(classifyLocalStorageResilienceError(new Error("Quota exceeded")).kind).toBe("quota_exceeded");
    expect(classifyLocalStorageResilienceError(new SyntaxError("JSON parse failed")).kind).toBe("parse_error");
    expect(classifyLocalStorageResilienceError("write blocked by policy").kind).toBe("write_blocked");
  });

  it("redacts stack, values and unsafe details", () => {
    const redacted = redactLocalStorageResilienceError(new Error("secret-value should not be copied"));

    expect(JSON.stringify(redacted)).not.toContain("secret-value");
    expect(redacted.exposesPayload).toBe(false);
    expect(redacted.includesStack).toBe(false);
    expect(redacted.safe).toBe(true);
  });

  it("summarizes suspicious key risk safely", () => {
    const summary = summarizeLocalStorageResilienceError("__proto__ pollution");

    expect(summary.kind).toBe("suspicious_key");
    expect(summary.exposesPayload).toBe(false);
  });
});
