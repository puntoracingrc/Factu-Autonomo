import { describe, expect, it } from "vitest";
import {
  ADVISOR_CONTACT_LIMITS,
  normalizeAdvisorContact,
  validateAdvisorContact,
} from "./advisor-contact";

describe("advisor contact", () => {
  it("mantiene la sección realmente opcional", () => {
    expect(validateAdvisorContact(undefined)).toEqual({
      active: false,
      valid: true,
      errors: {},
    });
    expect(
      validateAdvisorContact({
        firmName: " ",
        advisorName: "",
        email: "",
        phone: "",
      }),
    ).toEqual({ active: false, valid: true, errors: {} });
    expect(
      normalizeAdvisorContact({
        firmName: "",
        advisorName: "",
        email: "",
        phone: "",
      }),
    ).toBeUndefined();
  });

  it("exige nombre, email y teléfono al rellenar cualquier campo", () => {
    const result = validateAdvisorContact({ firmName: "Gestoría Central" });

    expect(result.active).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual({
      advisorName: "Indica el nombre del gestor.",
      email: "Indica el email del gestor.",
      phone: "Indica el teléfono del gestor.",
    });
  });

  it("normaliza un contacto completo sin mutar la entrada", () => {
    const input = {
      firmName: "  Gestoría Central  ",
      advisorName: "  Laura García  ",
      email: "  LAURA@GESTORIA.ES  ",
      phone: "  +34 600 000 000  ",
    };
    const before = structuredClone(input);

    expect(normalizeAdvisorContact(input)).toEqual({
      firmName: "Gestoría Central",
      advisorName: "Laura García",
      email: "laura@gestoria.es",
      phone: "+34 600 000 000",
    });
    expect(input).toEqual(before);
  });

  it("admite omitir el nombre comercial de la gestoría", () => {
    expect(
      validateAdvisorContact({
        advisorName: "Laura García",
        email: "laura@gestoria.es",
        phone: "600000000",
      }),
    ).toMatchObject({
      active: true,
      valid: true,
      value: {
        firmName: undefined,
        advisorName: "Laura García",
        email: "laura@gestoria.es",
        phone: "600000000",
      },
    });
  });

  it("rechaza formatos, tipos y longitudes inválidos", () => {
    const invalid = validateAdvisorContact({
      firmName: "G".repeat(ADVISOR_CONTACT_LIMITS.firmName + 1),
      advisorName: 123,
      email: "sin-arroba",
      phone: "teléfono",
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.value).toBeUndefined();
    expect(invalid.errors.firmName).toContain("Máximo");
    expect(invalid.errors.advisorName).toBe("Indica el nombre del gestor.");
    expect(invalid.errors.email).toBe("Introduce un email válido.");
    expect(invalid.errors.phone).toBe("Introduce un teléfono válido.");
  });
});
