import type { AdvisorContact } from "./types";

export const ADVISOR_CONTACT_LIMITS = {
  firmName: 160,
  advisorName: 160,
  email: 254,
  phone: 40,
} as const;

export type AdvisorContactField = keyof AdvisorContact;

export interface AdvisorContactValidationResult {
  active: boolean;
  valid: boolean;
  value?: AdvisorContact;
  errors: Partial<Record<AdvisorContactField, string>>;
}

const ADVISOR_CONTACT_FIELDS: AdvisorContactField[] = [
  "firmName",
  "advisorName",
  "email",
  "phone",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function basicEmailIsValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function basicPhoneIsValid(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && /^[+\d\s().-]+$/.test(value);
}

export function validateAdvisorContact(
  value: unknown,
): AdvisorContactValidationResult {
  if (value === undefined || value === null) {
    return { active: false, valid: true, errors: {} };
  }

  if (!isRecord(value)) {
    return {
      active: true,
      valid: false,
      errors: {
        advisorName: "Revisa los datos del gestor.",
        email: "Revisa los datos del gestor.",
        phone: "Revisa los datos del gestor.",
      },
    };
  }

  const errors: Partial<Record<AdvisorContactField, string>> = {};
  const fields = Object.fromEntries(
    ADVISOR_CONTACT_FIELDS.map((field) => {
      const fieldValue = value[field];
      if (fieldValue !== undefined && typeof fieldValue !== "string") {
        errors[field] = "Debe ser texto.";
      }
      return [field, typeof fieldValue === "string" ? fieldValue.trim() : ""];
    }),
  ) as Record<AdvisorContactField, string>;
  const active =
    Object.keys(errors).length > 0 ||
    ADVISOR_CONTACT_FIELDS.some((field) => fields[field].length > 0);

  if (!active) {
    return { active: false, valid: true, errors: {} };
  }

  for (const field of ADVISOR_CONTACT_FIELDS) {
    if (fields[field].length > ADVISOR_CONTACT_LIMITS[field]) {
      errors[field] = `Máximo ${ADVISOR_CONTACT_LIMITS[field]} caracteres.`;
    }
  }

  if (!fields.advisorName) {
    errors.advisorName = "Indica el nombre del gestor.";
  }
  if (!fields.email) {
    errors.email = "Indica el email del gestor.";
  } else if (!basicEmailIsValid(fields.email)) {
    errors.email = "Introduce un email válido.";
  }
  if (!fields.phone) {
    errors.phone = "Indica el teléfono del gestor.";
  } else if (!basicPhoneIsValid(fields.phone)) {
    errors.phone = "Introduce un teléfono válido.";
  }

  if (Object.keys(errors).length > 0) {
    return { active: true, valid: false, errors };
  }

  return {
    active: true,
    valid: true,
    errors: {},
    value: {
      firmName: fields.firmName || undefined,
      advisorName: fields.advisorName,
      email: fields.email.toLowerCase(),
      phone: fields.phone,
    },
  };
}

export function normalizeAdvisorContact(
  value: unknown,
): AdvisorContact | undefined {
  return validateAdvisorContact(value).value;
}
