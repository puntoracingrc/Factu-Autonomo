import { describe, expect, it } from "vitest";
import { submitRegistroToAeat } from "./aeat-submit";

describe("aeat submit", () => {
  it("simulates success when cert is not configured", async () => {
    const result = await submitRegistroToAeat({
      xml: "<RegistroFacturacion/>",
      environment: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.rawResponse).toBe("SIMULATED_TEST_MODE");
  });
});
