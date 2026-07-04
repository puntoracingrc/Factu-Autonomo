import { afterEach, describe, expect, it } from "vitest";
import { getEmailFromAddress } from "./config";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

describe("email config", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("usa EMAIL_FROM valido si esta configurado", () => {
    process.env.EMAIL_FROM = "Factu <hola@mail.facturacion-autonomos.app>";

    expect(getEmailFromAddress()).toBe(
      "Factu <hola@mail.facturacion-autonomos.app>",
    );
  });

  it("ignora remitentes incompletos y usa un remitente valido", () => {
    process.env.EMAIL_FROM = "";
    process.env.EMAIL_FROM_ADDRESS = "@mail.facturacion-autonomos.app";
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL = "";

    expect(getEmailFromAddress()).toBe(
      "Factu - Facturación Autónomos <hola@mail.facturacion-autonomos.app>",
    );
  });
});
