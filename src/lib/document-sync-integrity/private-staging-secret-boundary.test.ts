import { describe, expect, it } from "vitest";
import {
  evaluatePrivateStagingSecretBoundary,
  redactPrivateStagingSecretSummary,
} from "./private-staging-secret-boundary";

describe("private staging secret boundary", () => {
  it("queda empty sin variables", () => {
    const result = evaluatePrivateStagingSecretBoundary([]);
    expect(result.status).toBe("empty");
    expect(result.reason).toBe("no_variables_declared");
  });

  it("acepta solo placeholders y referencias runtime", () => {
    const result = evaluatePrivateStagingSecretBoundary([
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "placeholder_only",
        valuePreview: "PLACEHOLDER_ONLY",
      },
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_RUNTIME_REF",
        valueKind: "runtime_reference_only",
        valuePreview: "RUNTIME_REFERENCE_ONLY",
      },
    ]);

    expect(result.status).toBe("ready_for_review");
    expect(result.valueMaterialPresent).toBe(false);
  });

  it("rechaza material, public exposure y nombres privilegiados", () => {
    const material = evaluatePrivateStagingSecretBoundary([
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "material_value",
        valuePreview: "token-material",
      },
    ]);
    const publicExposure = evaluatePrivateStagingSecretBoundary([
      {
        name: "NEXT_PUBLIC_DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "placeholder_only",
      },
    ]);
    const privilegedName = evaluatePrivateStagingSecretBoundary([
      {
        name: `DOCUMENT_SYNC_${["SERVICE", "ROLE"].join("_")}_KEY`,
        valueKind: "placeholder_only",
      },
    ]);

    expect(material.reason).toBe("material_value_rejected");
    expect(publicExposure.reason).toBe("public_variable_rejected");
    expect(privilegedName.reason).toBe("privileged_role_rejected");
  });

  it("summary redactado no conserva previews", () => {
    const result = evaluatePrivateStagingSecretBoundary([
      {
        name: "DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY",
        valueKind: "placeholder_only",
        valuePreview: "PLACEHOLDER_ONLY",
      },
    ]);
    const serialized = JSON.stringify(redactPrivateStagingSecretSummary(result));

    expect(serialized).toContain("DOCUMENT_SYNC_PRIVATE_STAGING_REVIEW_KEY");
    expect(serialized).not.toContain("PLACEHOLDER_ONLY");
  });
});
