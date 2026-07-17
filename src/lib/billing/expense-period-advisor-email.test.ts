import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE } from "@/lib/types";
import { buildExpensePeriodAdvisorEmail } from "./expense-period-advisor-email";

describe("expense period advisor email", () => {
  it("uses the configured advisor and explains originals missing from Drive", () => {
    const result = buildExpensePeriodAdvisorEmail(
      {
        ...DEFAULT_PROFILE,
        commercialName: "Taller Sintético",
        advisorContact: {
          advisorName: "Laura García",
          email: "LAURA@GESTORIA.TEST",
          phone: "600000000",
        },
      },
      "Trimestre 2 2026",
      "Gastos Trimestre 2 2026.zip",
      "Resumen Gastos Trimestre 2 2026.pdf",
      12,
      10,
    );

    expect(result).not.toBeNull();
    expect(result?.recipient).toBe("laura@gestoria.test");
    expect(result?.subject).toBe(
      "Gastos y compras · Trimestre 2 2026 · Taller Sintético",
    );
    expect(result?.body).toContain("10 originales archivados");
    expect(result?.body).toContain("2 gastos sin original archivado");
    expect(new URL(result!.gmailComposeUrl).searchParams.get("to")).toBe(
      "laura@gestoria.test",
    );
    expect(new URL(result!.mailtoUrl).searchParams.get("body")).toBe(
      result?.body,
    );
  });

  it("does not fall back to the business email", () => {
    expect(
      buildExpensePeriodAdvisorEmail(
        { ...DEFAULT_PROFILE, email: "business@example.test" },
        "Abril 2026",
        "Gastos Abril 2026.zip",
        "Resumen Gastos Abril 2026.pdf",
        1,
        1,
      ),
    ).toBeNull();
  });
});
