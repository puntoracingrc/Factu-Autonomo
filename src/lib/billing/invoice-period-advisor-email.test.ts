import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, type BusinessProfile } from "@/lib/types";
import { buildInvoicePeriodAdvisorEmail } from "./invoice-period-advisor-email";

const PROFILE: BusinessProfile = {
  ...DEFAULT_PROFILE,
  commercialName: "Taller Sintético",
  advisorContact: {
    firmName: "Gestoría Uno",
    advisorName: "Laura García",
    email: "LAURA@GESTORIA.TEST",
    phone: "600 000 000",
  },
};

describe("invoice period advisor email", () => {
  it("dirige el correo al gestor guardado y describe el ZIP y el resumen", () => {
    const result = buildInvoicePeriodAdvisorEmail(
      PROFILE,
      "Trimestre 2 2026",
      "Facturas Trimestre 2 2026.zip",
      "Resumen Facturas Trimestre 2 2026.pdf",
      12,
    );

    expect(result).not.toBeNull();
    expect(result?.recipient).toBe("laura@gestoria.test");
    expect(result?.subject).toBe(
      "Facturas emitidas · Trimestre 2 2026 · Taller Sintético",
    );
    expect(result?.body).toContain("Hola Laura García");
    expect(result?.body).toContain("12 facturas");
    expect(result?.body).toContain("Facturas Trimestre 2 2026.zip");
    expect(result?.body).toContain("Resumen Facturas Trimestre 2 2026.pdf");
    expect(result?.body).toContain("Adjunta ese archivo");

    const gmail = new URL(result!.gmailComposeUrl);
    expect(gmail.origin).toBe("https://mail.google.com");
    expect(gmail.searchParams.get("view")).toBe("cm");
    expect(gmail.searchParams.get("to")).toBe("laura@gestoria.test");
    expect(gmail.searchParams.get("su")).toBe(result?.subject);
    expect(gmail.searchParams.get("body")).toBe(result?.body);

    const mailto = new URL(result!.mailtoUrl);
    expect(mailto.pathname).toBe("laura@gestoria.test");
    expect(mailto.searchParams.get("subject")).toBe(result?.subject);
    expect(mailto.searchParams.get("body")).toBe(result?.body);
  });

  it("no usa el email del negocio como sustituto si falta un gestor válido", () => {
    expect(
      buildInvoicePeriodAdvisorEmail(
        { ...DEFAULT_PROFILE, email: "negocio@example.com" },
        "Mayo 2026",
        "Facturas Mayo 2026.zip",
        "Resumen Facturas Mayo 2026.pdf",
        1,
      ),
    ).toBeNull();
    expect(
      buildInvoicePeriodAdvisorEmail(
        {
          ...DEFAULT_PROFILE,
          email: "negocio@example.com",
          advisorContact: {
            advisorName: "Gestor",
            email: "correo-invalido",
            phone: "600000000",
          },
        },
        "Mayo 2026",
        "Facturas Mayo 2026.zip",
        "Resumen Facturas Mayo 2026.pdf",
        1,
      ),
    ).toBeNull();
  });
});
