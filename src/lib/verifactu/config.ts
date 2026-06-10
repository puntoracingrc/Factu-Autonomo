import type { VerifactuEnvironment } from "./types";

export function getServerVerifactuEnvironment(): VerifactuEnvironment {
  return process.env.VERIFACTU_ENVIRONMENT === "production"
    ? "production"
    : "test";
}

export function isAeatSubmitConfigured(): boolean {
  return Boolean(
    process.env.VERIFACTU_CERT_P12_BASE64?.trim() &&
      process.env.VERIFACTU_CERT_PASSWORD?.trim() &&
      process.env.VERIFACTU_AEAT_SUBMIT === "true",
  );
}

export function getVerifactuCertConfig(): {
  p12Base64: string;
  password: string;
} | null {
  const p12Base64 = process.env.VERIFACTU_CERT_P12_BASE64?.trim();
  const password = process.env.VERIFACTU_CERT_PASSWORD?.trim();
  if (!p12Base64 || !password) return null;
  return { p12Base64, password };
}
