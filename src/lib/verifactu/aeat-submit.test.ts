import { afterEach, describe, expect, it, vi } from "vitest";
import { submitRegistroToAeat } from "./aeat-submit";

describe("aeat submit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("simulates success when cert is not configured", async () => {
    const result = await submitRegistroToAeat({
      xml: "<RegistroFacturacion/>",
      environment: "test",
    });
    expect(result.ok).toBe(true);
    expect(result.rawResponse).toBe("SIMULATED_TEST_MODE");
  });

  it("does not open a real AEAT request from the current test-mode flow", async () => {
    vi.stubEnv("VERIFACTU_CERT_P12_BASE64", "test-cert-placeholder");
    vi.stubEnv("VERIFACTU_CERT_PASSWORD", "test-password-placeholder");
    vi.stubEnv("VERIFACTU_AEAT_SUBMIT", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await submitRegistroToAeat({
      xml: "<RegistroFacturacion/>",
      environment: "test",
    });

    expect(result.ok).toBe(true);
    expect(result.rawResponse).toBe("SIMULATED_TEST_MODE");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not simulate success for production without real transport", async () => {
    const result = await submitRegistroToAeat({
      xml: "<RegistroFacturacion/>",
      environment: "production",
    });

    expect(result.ok).toBe(false);
    expect(result.rawResponse).toBe("REAL_AEAT_TRANSPORT_NOT_ENABLED");
  });
});
