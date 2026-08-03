import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("carga diferida de herramientas secundarias de clientes", () => {
  it("deja IA, Google Places y confirmacion de borrado fuera de la entrada", () => {
    expect(source).toContain('import dynamic from "next/dynamic";');
    expect(source).not.toContain(
      'import { CustomerAiAutofill } from "@/components/clients/CustomerAiAutofill";',
    );
    expect(source).not.toContain(
      'import { GoogleAddressAutocomplete } from "@/components/places/GoogleAddressAutocomplete";',
    );
    expect(source).not.toContain(
      'import { MasterDeleteConfirmationModal } from "@/components/masters/MasterDeleteConfirmationModal";',
    );
    expect(source).toContain(
      'import("@/components/clients/CustomerAiAutofill").then(',
    );
    expect(source).toContain(
      'import("@/components/places/GoogleAddressAutocomplete").then(',
    );
    expect(source).toContain(
      'import("@/components/masters/MasterDeleteConfirmationModal").then(',
    );
  });

  it("mantiene respuesta visible mientras llegan los chunks", () => {
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("Preparando relleno desde texto...");
    expect(source).toContain("Preparando sugerencias de dirección...");
    expect(source).toContain("Preparando confirmación segura...");
  });
});
