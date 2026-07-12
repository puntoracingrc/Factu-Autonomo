import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFiscalAiModel,
  getFiscalAiTimeoutMs,
  isFiscalAiFallbackEnabled,
  resolveFiscalAiFallbackFlag,
} from "./server-config";

describe("configuración server-only del fallback fiscal", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("permanece desactivada si no existe activación literal", () => {
    expect(resolveFiscalAiFallbackFlag(undefined)).toBe(false);
    expect(resolveFiscalAiFallbackFlag("false")).toBe(false);
    expect(resolveFiscalAiFallbackFlag("TRUE")).toBe(false);
    expect(resolveFiscalAiFallbackFlag("true")).toBe(true);

    vi.stubEnv("CONSULTOR_FISCAL_AI_FALLBACK_ENABLED", "false");
    expect(isFiscalAiFallbackEnabled()).toBe(false);
  });

  it("centraliza modelo y limita el timeout", () => {
    vi.stubEnv("OPENAI_FISCAL_FALLBACK_MODEL", "modelo-fiscal-prueba");
    vi.stubEnv("OPENAI_FISCAL_FALLBACK_TIMEOUT_MS", "999999");
    expect(getFiscalAiModel()).toBe("modelo-fiscal-prueba");
    expect(getFiscalAiTimeoutMs()).toBe(30_000);

    vi.stubEnv("OPENAI_FISCAL_FALLBACK_TIMEOUT_MS", "no-numero");
    expect(getFiscalAiTimeoutMs()).toBe(15_000);

    vi.stubEnv("OPENAI_FISCAL_FALLBACK_TIMEOUT_MS", "   ");
    expect(getFiscalAiTimeoutMs()).toBe(15_000);
  });
});
