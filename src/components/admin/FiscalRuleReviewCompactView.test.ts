import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FiscalRuleReviewCompactView.tsx", import.meta.url),
  "utf8",
);

describe("FiscalRuleReviewCompactView contract", () => {
  it("shows compact evidence and all three human decisions", () => {
    expect(source).toContain("Condiciones y excepciones");
    expect(source).toContain("Pruebas, fuentes e incidencias");
    expect(source).toContain("Hashes revisados");
    expect(source).toContain('APPROVE: "Aprobar revisión"');
    expect(source).toContain('REJECT: "Rechazar"');
    expect(source).toContain('REQUEST_CHANGES: "Solicitar cambios"');
    expect(source).toContain(
      "La revisión nunca aprueba automáticamente la regla.",
    );
  });

  it("delegates decisions without mutating fiscal rule state", () => {
    expect(source).toContain("onDecision?.(decision)");
    expect(source).not.toMatch(/reviewStatus\s*=|resolutionStatus\s*=|EXCLUDE_MODEL/);
  });
});
