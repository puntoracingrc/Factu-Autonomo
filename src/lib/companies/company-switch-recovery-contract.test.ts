import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("recuperacion segura al crear y cambiar de empresa", () => {
  it("crea la empresa sin abandonar automaticamente la empresa abierta", () => {
    const context = source("src/context/CompanyContext.tsx");
    const createBlock = context.slice(
      context.indexOf("const createCompany = useCallback"),
      context.indexOf("const renameCompany = useCallback"),
    );

    expect(createBlock).toContain("setCompanies");
    expect(createBlock).not.toContain("setActiveCompanyId(company.id)");
    expect(createBlock).not.toContain("activeCompanyStorageKey");
  });

  it("permite volver a otra empresa desde el error sin borrar datos", () => {
    const gate = source(
      "src/components/workspace/WorkspaceServerAdoptionGate.tsx",
    );

    expect(gate).toContain("alternativeCompanies");
    expect(gate).toContain("selectCompany(company.id)");
    expect(gate).toContain("Cambiar de empresa no borra ni modifica los datos");
    expect(gate).not.toContain("localStorage.clear");
  });
});
