import type { VerifactuEnvironment } from "./types";

export function getServerVerifactuEnvironment(): VerifactuEnvironment {
  return process.env.VERIFACTU_ENVIRONMENT === "production"
    ? "production"
    : "test";
}

export function isAeatSubmitConfigured(): boolean {
  return false;
}
