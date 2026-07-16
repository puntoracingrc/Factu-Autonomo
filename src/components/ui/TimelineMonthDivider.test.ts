import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./TimelineMonthDivider.tsx", import.meta.url),
  "utf8",
);

describe("TimelineMonthDivider", () => {
  it("destaca el cambio de grupo con una etiqueta y una linea coherentes", () => {
    expect(source).toContain('role="separator"');
    expect(source).toContain("Inicio del grupo: ${label}");
    expect(source).toContain("py-2");
    expect(source).toContain("text-sm");
    expect(source).toContain("bg-blue-100/95");
    expect(source).toContain("bg-blue-300");
  });

  it("conserva accesible la etiqueta completa aunque visualmente se recorte", () => {
    expect(source).toContain("min-w-0 max-w-full truncate");
    expect(source).toContain("title={label}");
    expect(source).toContain("aria-label={`Inicio del grupo: ${label}`}");
  });
});
