import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  new URL("./FormErrorSummary.tsx", import.meta.url),
  "utf8",
);

describe("FormErrorSummary", () => {
  it("no renderiza un aviso cuando el formulario no tiene errores", () => {
    expect(source).toContain("if (errors.length === 0) return null");
  });

  it("anuncia todos los errores y permite enfocar el campo relacionado", () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain("aria-labelledby={titleId}");
    expect(source).toContain("errors.map((error)");
    expect(source).toContain(
      "document.getElementById(error.fieldId)?.focus()",
    );
  });

  it("asocia el mensaje inline mediante un id sin volver a anunciarlo", () => {
    const fieldErrorSource = source.slice(
      source.indexOf("export function FieldError"),
    );

    expect(fieldErrorSource).toContain("<span id={id}");
    expect(fieldErrorSource).not.toContain('role="alert"');
  });
});
