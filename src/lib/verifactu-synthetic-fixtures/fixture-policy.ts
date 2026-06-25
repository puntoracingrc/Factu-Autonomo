import {
  syntheticFixturePolicyErrorMessage,
  type SyntheticFixturePolicyErrorCode,
} from "./errors";
import {
  SYNTHETIC_FIXTURE_KINDS,
  type SyntheticFixtureDescriptor,
  type SyntheticFixturePolicyError,
  type SyntheticFixturePolicyWarning,
  type SyntheticFixtureRiskFlag,
  type SyntheticFixtureValidationResult,
} from "./types";

const ALLOWED_FIELDS = new Set([
  "id",
  "kind",
  "purpose",
  "syntheticOnly",
  "sourcePhase",
  "expectedFutureValidations",
  "blockedUntil",
  "riskNotes",
  "metadata",
]);

const SYNTHETIC_ID_PREFIX = "SYNTHETIC_ONLY_";

type ForbiddenSignature = {
  readonly code: SyntheticFixturePolicyErrorCode;
  readonly riskFlag: SyntheticFixtureRiskFlag;
  readonly terms: readonly string[];
};

function joinTerms(...parts: string[]): string {
  return parts.join("");
}

const FORBIDDEN_TEXT_SIGNATURES: readonly ForbiddenSignature[] = [
  {
    code: "xml_material_detected",
    riskFlag: "xml_material",
    terms: [
      joinTerms("<", "?xml"),
      joinTerms("<", "Registro"),
      joinTerms("<", "Factura"),
    ],
  },
  {
    code: "certificate_material_detected",
    riskFlag: "certificate_material",
    terms: [
      joinTerms("BEGIN ", "CERTIFICATE"),
      joinTerms("PRIVATE ", "KEY"),
      joinTerms(".", "pfx"),
      joinTerms(".", "p12"),
      joinTerms(".", "pem"),
      joinTerms(".", "key"),
      joinTerms(".", "crt"),
      joinTerms(".", "cer"),
    ],
  },
  {
    code: "aeat_endpoint_detected",
    riskFlag: "aeat_endpoint",
    terms: [
      joinTerms("agencia", "tributaria"),
      joinTerms("sede.", "aeat"),
      joinTerms("www1.", "aeat"),
      joinTerms("www2.", "aeat"),
      "suministrofacturas",
      "suministrolr",
    ],
  },
  {
    code: "secret_material_detected",
    riskFlag: "secret_material",
    terms: [
      joinTerms("service", "_role"),
      joinTerms("SUPABASE", "_SERVICE", "_ROLE"),
      joinTerms("STRIPE", "_SECRET"),
      joinTerms("sb", "_secret"),
      "sk-proj",
      "bearer ",
      "api_key",
      "api-key",
      "authorization",
      "token",
      "secret",
    ],
  },
  {
    code: "transport_material_detected",
    riskFlag: "transport_material",
    terms: [
      "transport",
      "send",
      "aeatsubmission",
      "fiscaltransportattempt",
      joinTerms("fiscal", "_transport", "_attempts"),
    ],
  },
  {
    code: "real_data_material_detected",
    riskFlag: "real_data_material",
    terms: [
      "cliente real",
      "factura real",
      "realcustomer",
      "realinvoice",
      "real data",
    ],
  },
];

const ERROR_RISK_FLAGS: Record<
  SyntheticFixturePolicyErrorCode,
  SyntheticFixtureRiskFlag
> = {
  descriptor_missing: "unsafe_metadata",
  field_not_allowed: "unsafe_metadata",
  id_missing: "non_synthetic_identifier",
  id_prefix_invalid: "non_synthetic_identifier",
  synthetic_only_invalid: "non_synthetic_marker",
  kind_invalid: "unknown_fixture_kind",
  purpose_missing: "empty_purpose",
  source_phase_invalid: "unsupported_source_phase",
  expected_future_validations_invalid: "unsafe_metadata",
  metadata_not_safe: "unsafe_metadata",
  xml_material_detected: "xml_material",
  certificate_material_detected: "certificate_material",
  aeat_endpoint_detected: "aeat_endpoint",
  secret_material_detected: "secret_material",
  transport_material_detected: "transport_material",
  real_data_material_detected: "real_data_material",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isAllowedKind(value: unknown): value is SyntheticFixtureDescriptor["kind"] {
  return (
    typeof value === "string" &&
    SYNTHETIC_FIXTURE_KINDS.includes(
      value as SyntheticFixtureDescriptor["kind"],
    )
  );
}

function isAllowedSourcePhase(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return false;
  if (/2B\.5[CDH](?:\b|[_\s-])/.test(normalized)) return true;

  const match = normalized.match(/2B\.(\d+)([A-Z])?/);
  if (!match) return false;

  const numericPhase = Number(match[1]);
  const phaseLetter = match[2] ?? "";
  if (numericPhase > 6) return true;
  if (numericPhase !== 6) return false;
  return phaseLetter === "" || phaseLetter >= "A";
}

function addError(
  errors: SyntheticFixturePolicyError[],
  code: SyntheticFixturePolicyErrorCode,
  path?: string,
  riskFlag = ERROR_RISK_FLAGS[code],
) {
  errors.push({
    code,
    message: syntheticFixturePolicyErrorMessage(code),
    path,
    riskFlag,
  });
}

function addWarning(
  warnings: SyntheticFixturePolicyWarning[],
  warning: SyntheticFixturePolicyWarning,
) {
  warnings.push(warning);
}

function scanForbiddenText(
  errors: SyntheticFixturePolicyError[],
  text: string,
  path: string,
) {
  const normalized = text.toLowerCase();
  const existingCodes = new Set(errors.map((error) => `${error.code}:${path}`));

  for (const signature of FORBIDDEN_TEXT_SIGNATURES) {
    if (
      signature.terms.some((term) =>
        normalized.includes(term.toLowerCase()),
      )
    ) {
      const duplicateKey = `${signature.code}:${path}`;
      if (!existingCodes.has(duplicateKey)) {
        addError(errors, signature.code, path, signature.riskFlag);
        existingCodes.add(duplicateKey);
      }
    }
  }
}

function validateJsonSafeValue(
  errors: SyntheticFixturePolicyError[],
  value: unknown,
  path: string,
) {
  if (typeof value === "string") {
    scanForbiddenText(errors, value, path);
    return;
  }

  if (
    value === null ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateJsonSafeValue(errors, entry, `${path}[${index}]`),
    );
    return;
  }

  if (isPlainRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      scanForbiddenText(errors, key, `${path}.${key}`);
      validateJsonSafeValue(errors, entry, `${path}.${key}`);
    }
    return;
  }

  addError(errors, "metadata_not_safe", path);
}

function validateExpectedFutureValidations(
  errors: SyntheticFixturePolicyError[],
  value: unknown,
) {
  if (!Array.isArray(value)) {
    addError(
      errors,
      "expected_future_validations_invalid",
      "expectedFutureValidations",
    );
    return;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      addError(
        errors,
        "expected_future_validations_invalid",
        `expectedFutureValidations[${index}]`,
      );
      return;
    }
    scanForbiddenText(errors, entry, `expectedFutureValidations[${index}]`);
  });
}

function validateRiskNotes(
  errors: SyntheticFixturePolicyError[],
  value: unknown,
) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    addError(errors, "metadata_not_safe", "riskNotes");
    return;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      addError(errors, "metadata_not_safe", `riskNotes[${index}]`);
      return;
    }
    scanForbiddenText(errors, entry, `riskNotes[${index}]`);
  });
}

function validateMetadata(
  errors: SyntheticFixturePolicyError[],
  value: unknown,
) {
  if (value === undefined) return;
  if (!isPlainRecord(value)) {
    addError(errors, "metadata_not_safe", "metadata");
    return;
  }
  validateJsonSafeValue(errors, value, "metadata");
}

export function validateSyntheticFixtureDescriptor(
  descriptor: unknown,
): SyntheticFixtureValidationResult {
  const errors: SyntheticFixturePolicyError[] = [];
  const warnings: SyntheticFixturePolicyWarning[] = [];

  if (!isPlainRecord(descriptor)) {
    addError(errors, "descriptor_missing");
    return { status: "rejected", errors, warnings };
  }

  for (const key of Object.keys(descriptor)) {
    scanForbiddenText(errors, key, key);
    if (!ALLOWED_FIELDS.has(key)) {
      addError(errors, "field_not_allowed", key);
    }
  }

  if (typeof descriptor.id !== "string" || !descriptor.id.trim()) {
    addError(errors, "id_missing", "id");
  } else {
    scanForbiddenText(errors, descriptor.id, "id");
    if (!descriptor.id.startsWith(SYNTHETIC_ID_PREFIX)) {
      addError(errors, "id_prefix_invalid", "id");
    }
  }

  if (descriptor.syntheticOnly !== true) {
    addError(errors, "synthetic_only_invalid", "syntheticOnly");
  }

  if (!isAllowedKind(descriptor.kind)) {
    addError(errors, "kind_invalid", "kind");
  }

  if (typeof descriptor.purpose !== "string" || !descriptor.purpose.trim()) {
    addError(errors, "purpose_missing", "purpose");
  } else {
    scanForbiddenText(errors, descriptor.purpose, "purpose");
  }

  if (!isAllowedSourcePhase(descriptor.sourcePhase)) {
    addError(errors, "source_phase_invalid", "sourcePhase");
  } else {
    scanForbiddenText(errors, String(descriptor.sourcePhase), "sourcePhase");
  }

  validateExpectedFutureValidations(
    errors,
    descriptor.expectedFutureValidations,
  );
  validateRiskNotes(errors, descriptor.riskNotes);
  validateMetadata(errors, descriptor.metadata);

  if (typeof descriptor.blockedUntil === "string") {
    scanForbiddenText(errors, descriptor.blockedUntil, "blockedUntil");
  } else if (descriptor.blockedUntil === undefined) {
    addWarning(warnings, {
      code: "descriptor_has_no_blocked_until",
      message: "El descriptor no declara bloqueo temporal externo.",
      path: "blockedUntil",
    });
  } else {
    addError(errors, "metadata_not_safe", "blockedUntil");
  }

  if (Array.isArray(descriptor.riskNotes) && descriptor.riskNotes.length > 0) {
    addWarning(warnings, {
      code: "descriptor_has_risk_notes",
      message: "El descriptor incluye notas de riesgo para revision futura.",
      path: "riskNotes",
    });
  }

  if (errors.length > 0) {
    return { status: "rejected", errors, warnings };
  }

  return {
    status: "accepted",
    descriptor: descriptor as unknown as SyntheticFixtureDescriptor,
    errors: [],
    warnings,
  };
}

export function isSyntheticFixtureDescriptorAccepted(
  descriptor: unknown,
): descriptor is SyntheticFixtureDescriptor {
  return validateSyntheticFixtureDescriptor(descriptor).status === "accepted";
}
