import { describe, expect, it } from "vitest";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { quickCompanyRequestHeaders, quickCompanyScopeProblem } from "./request-scope";

describe("quick workspace pinning across a private enrollment change", () => {
  it("discovers enrollment only at bootstrap", () => {
    expect(quickCompanyRequestHeaders("bootstrap", "previous-company")).toEqual({});
    expect(quickCompanyScopeProblem(null, "current-company", true)).toBeNull();
    expect(quickCompanyScopeProblem("previous-company", "current-company", true)?.status).toBe(403);
  });
  it.each(["issue", "cancel", "search?kind=customer&q=test", "document?operationId=test"])(
    "rejects stale and unpinned %s without moving old form data into the new company", action => {
      const stale = quickCompanyRequestHeaders(action, "previous-company");
      expect(stale).toEqual({ [FACTU_COMPANY_HEADER]: "previous-company" });
      expect(quickCompanyScopeProblem(stale[FACTU_COMPANY_HEADER], "current-company"))
        .toMatchObject({ status: 403, code: "COMPANY_NOT_ALLOWED" });
      expect(quickCompanyScopeProblem(null, "current-company"))
        .toMatchObject({ status: 409, code: "COMPANY_REFRESH_REQUIRED" });
      expect(() => quickCompanyRequestHeaders(action, undefined)).toThrow("empresa habilitada");
      const current = quickCompanyRequestHeaders(action, "current-company");
      expect(quickCompanyScopeProblem(current[FACTU_COMPANY_HEADER], "current-company")).toBeNull();
    },
  );
});
