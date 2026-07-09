import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PASSWORD_POLICY_HINT,
  MIN_ACCOUNT_PASSWORD_LENGTH,
  validateNewAccountPassword,
} from "./password-policy";

describe("account password policy", () => {
  it("usa una regla de longitud sin composicion obligatoria", () => {
    expect(MIN_ACCOUNT_PASSWORD_LENGTH).toBe(12);
    expect(ACCOUNT_PASSWORD_POLICY_HINT).toContain("Mínimo 12 caracteres");
    expect(validateNewAccountPassword("corta")).toContain("12 caracteres");
    expect(validateNewAccountPassword("frase larga ok")).toBeNull();
    expect(validateNewAccountPassword("sin simbolos raros")).toBeNull();
  });
});
