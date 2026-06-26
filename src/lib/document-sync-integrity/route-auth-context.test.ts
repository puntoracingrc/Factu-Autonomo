import { describe, expect, it } from "vitest";
import {
  buildDisabledRouteAuthContext,
  rejectMissingRouteAuthContext,
  summarizeRouteAuthContext,
} from "./route-auth-context";

describe("document sync route auth context adapter", () => {
  it("rechaza identidad llegada desde payload", () => {
    const result = buildDisabledRouteAuthContext({
      requestId: "SYNTHETIC_ONLY_REQUEST_AUTH",
      payload: {
        payloadUserId: "SYNTHETIC_ONLY_USER_FROM_BODY",
      },
    });

    expect(result.status).toBe("missing_auth_context");
    expect(result.safeSummary.payloadIdentityRejected).toBe(true);
  });

  it("missing auth queda rejected seguro", () => {
    const result = rejectMissingRouteAuthContext("SYNTHETIC_ONLY_REQUEST_AUTH");
    expect(result.status).toBe("missing_auth_context");
    expect(result.safeSummary.reason).toBe("auth_not_wired");
  });

  it("acepta synthetic local auth solo con IDs sinteticos", () => {
    const result = buildDisabledRouteAuthContext({
      mode: "synthetic_local_test",
      requestId: "SYNTHETIC_ONLY_REQUEST_AUTH",
      syntheticUserId: "SYNTHETIC_ONLY_USER_AUTH",
      syntheticScopeId: "SYNTHETIC_ONLY_SCOPE_AUTH",
    });

    expect(result.status).toBe("synthetic_local_context");
    expect(result.auth?.userId).toBe("SYNTHETIC_ONLY_USER_AUTH");
  });

  it("no filtra tokens ni cookies en summary", () => {
    const result = buildDisabledRouteAuthContext({
      requestId: "SYNTHETIC_ONLY_REQUEST_AUTH",
      payload: {
        nested: {
          auth: ["tok", "en"].join(""),
          cookie: "session=value",
        },
      },
    });
    const serialized = JSON.stringify(summarizeRouteAuthContext(result));
    expect(serialized).not.toContain("session=value");
    expect(serialized).not.toContain(["tok", "en"].join(""));
  });
});
