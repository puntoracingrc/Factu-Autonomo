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

export function getOfficialAeatEndpointUrl(
  environment: "test" | "production",
  channel: AeatCertificateChannel,
): string {
  const hosts =
    channel === "sello" ? AEAT_WS_HOSTS : AEAT_WS_PERSONAL_CERT_HOSTS;
  return `${hosts[environment]}${AEAT_VERIFACTU_SOAP_PATH}`;
}

export function isOfficialAeatPreproductionEndpoint(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "prewww1.aeat.es" ||
        url.hostname === "prewww10.aeat.es") &&
      url.pathname === AEAT_VERIFACTU_SOAP_PATH &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export type VerifactuPreproductionActivationReason =
  | "enabled_for_exact_scope"
  | "kill_switch"
  | "disabled"
  | "environment_not_test"
  | "scope_not_minimal"
  | "user_not_allowed"
  | "document_not_allowed";

export function evaluateVerifactuPreproductionActivation(input: {
  userId: string;
  localDocumentId: string;
  env?: Record<string, string | undefined>;
}): { enabled: boolean; reason: VerifactuPreproductionActivationReason } {
  const env = input.env ?? process.env;
  if (env.VERIFACTU_AEAT_PREPRODUCTION_KILL_SWITCH === "true") {
    return { enabled: false, reason: "kill_switch" };
  }
  if (env.VERIFACTU_AEAT_PREPRODUCTION_ENABLED !== "true") {
    return { enabled: false, reason: "disabled" };
  }
  if (env.VERIFACTU_ENVIRONMENT !== "test") {
    return { enabled: false, reason: "environment_not_test" };
  }

  const allowedUsers = new Set(
    (env.VERIFACTU_AEAT_PREPRODUCTION_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowedUsers.size !== 1) {
    return { enabled: false, reason: "scope_not_minimal" };
  }
  if (!allowedUsers.has(input.userId.trim().toLowerCase())) {
    return { enabled: false, reason: "user_not_allowed" };
  }

  const allowedDocuments = new Set(
    (env.VERIFACTU_AEAT_PREPRODUCTION_DOCUMENT_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (allowedDocuments.size !== 1) {
    return { enabled: false, reason: "scope_not_minimal" };
  }
  if (!allowedDocuments.has(input.localDocumentId.trim())) {
    return { enabled: false, reason: "document_not_allowed" };
  }
  return { enabled: true, reason: "enabled_for_exact_scope" };
}
