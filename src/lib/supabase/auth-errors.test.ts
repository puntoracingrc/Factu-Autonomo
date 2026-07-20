import { describe, expect, it } from "vitest";

import { friendlyAuthError } from "./auth-errors";

describe("friendlyAuthError", () => {
  it("presenta la confirmacion pendiente como un correo de Factu", () => {
    expect(friendlyAuthError("Email not confirmed")).toBe(
      "Tu cuenta aún no está confirmada. Busca el email de confirmación de Factu y pulsa «Confirmar cuenta».",
    );
  });

  it("mantiene errores no reconocidos sin alterar", () => {
    expect(friendlyAuthError("Invalid login credentials")).toBe(
      "Invalid login credentials",
    );
  });
});
