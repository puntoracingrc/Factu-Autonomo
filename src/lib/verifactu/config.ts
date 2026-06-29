import type { VerifactuEnvironment } from "./types";
import {
  AEAT_VERIFACTU_SOAP_PATH,
  AEAT_WS_HOSTS,
  AEAT_WS_PERSONAL_CERT_HOSTS,
} from "./constants";

export type AeatCertificateChannel = "personal" | "sello";

export interface VerifactuCertificateConfig {
  p12Base64: string;
  password: string;
}

export function getServerVerifactuEnvironment(): VerifactuEnvironment {
  return process.env.VERIFACTU_ENVIRONMENT === "production"
    ? "production"
    : "test";
}

export function getAeatCertificateChannel(): AeatCertificateChannel {
  return process.env.VERIFACTU_AEAT_CERT_CHANNEL === "sello"
    ? "sello"
    : "personal";
}

export function getAeatEndpointUrl(
  environment: VerifactuEnvironment,
): string {
  const override = process.env.VERIFACTU_AEAT_ENDPOINT_URL?.trim();
  if (override) return override;

  const hosts =
    getAeatCertificateChannel() === "sello"
      ? AEAT_WS_HOSTS
      : AEAT_WS_PERSONAL_CERT_HOSTS;
  return `${hosts[environment]}${AEAT_VERIFACTU_SOAP_PATH}`;
}

export function getVerifactuCertificateConfig():
  | VerifactuCertificateConfig
  | null {
  const p12Base64 = process.env.VERIFACTU_CERT_P12_BASE64?.trim();
  const password = process.env.VERIFACTU_CERT_PASSWORD ?? "";
  if (!p12Base64 || !password) return null;
  return { p12Base64, password };
}

export function isAeatSubmitConfigured(): boolean {
  return (
    process.env.VERIFACTU_AEAT_SUBMIT === "true" &&
    getVerifactuCertificateConfig() !== null
  );
}
