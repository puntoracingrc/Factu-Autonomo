import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
  DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY,
  DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
  evaluatePrivateStagingEnvironmentContract,
  summarizePrivateStagingEnvironmentContract,
} from "./private-staging-environment";

describe("private staging environment contract", () => {
  it("queda inactive por defecto", () => {
    const result = evaluatePrivateStagingEnvironmentContract({});
    expect(result.status).toBe("inactive");
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("missing_private_staging_flag");
  });

  it("acepta solo contrato privado de revision interna", () => {
    const result = evaluatePrivateStagingEnvironmentContract({
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
      [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
    });
    expect(result.status).toBe("ready_for_review");
    expect(result.enabled).toBe(true);
  });

  it("rechaza produccion y preview remoto aunque las flags existan", () => {
    const production = evaluatePrivateStagingEnvironmentContract({
      NODE_ENV: "production",
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
      [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
    });
    const preview = evaluatePrivateStagingEnvironmentContract({
      VERCEL_ENV: "preview",
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_PRIVATE_STAGING_MODE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_MODE_REVIEW,
      [DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_KEY]:
        DOCUMENT_SYNC_PRIVATE_STAGING_AUDIENCE_INTERNAL,
    });

    expect(production.status).toBe("rejected");
    expect(production.reason).toBe("production_environment");
    expect(preview.status).toBe("rejected");
    expect(preview.reason).toBe("remote_environment");
  });

  it("rechaza variables publicas y valores materiales", () => {
    const publicValue = evaluatePrivateStagingEnvironmentContract({
      NEXT_PUBLIC_DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED: "true",
    });
    const materialValue = evaluatePrivateStagingEnvironmentContract({
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "token-material",
    });

    expect(publicValue.reason).toBe("public_variable_rejected");
    expect(materialValue.reason).toBe("unsafe_variable_value");
  });

  it("kill switch deja inactive y el summary no incluye material", () => {
    const result = evaluatePrivateStagingEnvironmentContract({
      [DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY]: "true",
      [DOCUMENT_SYNC_PRIVATE_STAGING_KILL_SWITCH_KEY]: "true",
    });
    const summary = summarizePrivateStagingEnvironmentContract(result);
    const serialized = JSON.stringify(summary);

    expect(result.reason).toBe("kill_switch_engaged");
    expect(serialized).toContain(DOCUMENT_SYNC_PRIVATE_STAGING_ENABLED_KEY);
    expect(serialized).not.toContain("token-material");
  });
});
