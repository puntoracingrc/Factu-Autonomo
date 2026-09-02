import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  X509Certificate,
} from "node:crypto";
import { createSecureContext } from "node:tls";

const CERTIFICATE_ENVELOPE_SCHEMA =
  "VERIFACTU_CERTIFICATE_ENVELOPE_V1" as const;
const AES_GCM_IV_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;
const KEK_BYTES = 32;
const MAX_P12_BYTES = 256 * 1024;
const MAX_PASSWORD_BYTES = 1024;
const MAX_ENCRYPTED_PAYLOAD_BYTES = MAX_P12_BYTES + MAX_PASSWORD_BYTES + 4;

export interface VerifactuCertificateEnvelopeBinding {
  bindingId: string;
  userId: string;
  issuerNif: string;
  environment: "test";
}

export interface VerifactuEncryptedCertificateEnvelopeV1 {
  schema: typeof CERTIFICATE_ENVELOPE_SCHEMA;
  algorithm: "A256GCM";
  iv: string;
  ciphertext: string;
  authTag: string;
}

export interface VerifactuCertificateSecret {
  p12Base64: string;
  password: string;
}

export class VerifactuCertificateEnvelopeError extends Error {
  constructor(
    readonly code:
      | "INVALID_KEK"
      | "INVALID_CERTIFICATE"
      | "CERTIFICATE_SCOPE_MISMATCH"
      | "CERTIFICATE_NOT_CURRENT"
      | "INVALID_PASSWORD"
      | "INVALID_ENVELOPE"
      | "DECRYPTION_FAILED",
  ) {
    super(code);
    this.name = "VerifactuCertificateEnvelopeError";
  }
}

export interface VerifactuCertificateInspection {
  fingerprintSha256: string;
  validFrom: string;
  validTo: string;
}

function normalizeBase64(value: string): string {
  return value.replace(/\s+/g, "");
}

function decodeStrictBase64(
  value: string,
  code: "INVALID_KEK" | "INVALID_CERTIFICATE" | "INVALID_ENVELOPE",
): Buffer {
  const normalized = normalizeBase64(value);
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new VerifactuCertificateEnvelopeError(code);
  }
  const decoded = Buffer.from(normalized, "base64");
  const canonicalInput = normalized.replace(/=+$/g, "");
  const canonicalDecoded = decoded.toString("base64").replace(/=+$/g, "");
  if (
    decoded.byteLength === 0 ||
    canonicalInput !== canonicalDecoded
  ) {
    throw new VerifactuCertificateEnvelopeError(code);
  }
  return decoded;
}

function decodeCertificate(value: string): Buffer {
  const decoded = decodeStrictBase64(value, "INVALID_CERTIFICATE");
  if (decoded.byteLength > MAX_P12_BYTES) {
    decoded.fill(0);
    throw new VerifactuCertificateEnvelopeError("INVALID_CERTIFICATE");
  }
  return decoded;
}

function validatePassword(password: string): Buffer {
  const bytes = Buffer.from(password, "utf8");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_PASSWORD_BYTES) {
    throw new VerifactuCertificateEnvelopeError("INVALID_PASSWORD");
  }
  return bytes;
}

function bindingAad(binding: VerifactuCertificateEnvelopeBinding): Buffer {
  if (
    !binding.bindingId.trim() ||
    !binding.userId.trim() ||
    !/^[A-Z0-9]{9}$/.test(binding.issuerNif) ||
    binding.environment !== "test"
  ) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }
  return Buffer.from(
    [
      CERTIFICATE_ENVELOPE_SCHEMA,
      binding.bindingId,
      binding.userId,
      binding.issuerNif,
      binding.environment,
    ].join("\n"),
    "utf8",
  );
}

function serializeSecret(input: VerifactuCertificateSecret): Buffer {
  const certificate = decodeCertificate(input.p12Base64);
  const password = validatePassword(input.password);
  try {
    const header = Buffer.allocUnsafe(4);
    header.writeUInt32BE(password.byteLength, 0);
    return Buffer.concat([header, password, certificate]);
  } finally {
    certificate.fill(0);
    password.fill(0);
  }
}

function parseSecret(payload: Buffer): VerifactuCertificateSecret {
  if (payload.byteLength < 5) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }
  const passwordLength = payload.readUInt32BE(0);
  if (
    passwordLength === 0 ||
    passwordLength > MAX_PASSWORD_BYTES ||
    payload.byteLength <= 4 + passwordLength
  ) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }
  const password = payload.subarray(4, 4 + passwordLength).toString("utf8");
  const certificate = payload.subarray(4 + passwordLength);
  if (certificate.byteLength > MAX_P12_BYTES) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }
  return {
    password,
    p12Base64: certificate.toString("base64"),
  };
}

export function readVerifactuCertificateKek(
  value = process.env.VERIFACTU_CERTIFICATE_KEK_BASE64,
): Buffer {
  if (!value) {
    throw new VerifactuCertificateEnvelopeError("INVALID_KEK");
  }
  const key = decodeStrictBase64(value, "INVALID_KEK");
  if (key.byteLength !== KEK_BYTES) {
    key.fill(0);
    throw new VerifactuCertificateEnvelopeError("INVALID_KEK");
  }
  return key;
}

export function certificateP12Sha256(p12Base64: string): string {
  const certificate = decodeCertificate(p12Base64);
  try {
    return createHash("sha256").update(certificate).digest("hex");
  } finally {
    certificate.fill(0);
  }
}

export function certificateSubjectNifs(subject: string): string[] {
  const identifiers = new Set<string>();
  for (const line of subject.split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const attribute = line.slice(0, separator).trim().toLowerCase();
    if (
      attribute !== "serialnumber" &&
      attribute !== "organizationidentifier" &&
      attribute !== "2.5.4.5" &&
      attribute !== "2.5.4.97"
    ) {
      continue;
    }
    const normalized = line
      .slice(separator + 1)
      .trim()
      .toUpperCase()
      .replace(/^(?:IDCES|VATES|NIF)[\s:-]*/, "")
      .replace(/\s+/g, "");
    if (/^[A-Z0-9]{9}$/.test(normalized)) identifiers.add(normalized);
  }
  return [...identifiers];
}

export function inspectVerifactuCertificate(input: {
  secret: VerifactuCertificateSecret;
  issuerNif: string;
  now?: Date;
}): VerifactuCertificateInspection {
  const certificateBytes = decodeCertificate(input.secret.p12Base64);
  const passwordBytes = validatePassword(input.secret.password);
  try {
    let certificate: X509Certificate;
    try {
      const secureContext = createSecureContext({
        pfx: certificateBytes,
        passphrase: input.secret.password,
      });
      const der = secureContext.context.getCertificate() as
        | Buffer
        | undefined;
      if (!der?.byteLength) {
        throw new VerifactuCertificateEnvelopeError("INVALID_CERTIFICATE");
      }
      certificate = new X509Certificate(der);
    } catch (error) {
      if (error instanceof VerifactuCertificateEnvelopeError) throw error;
      throw new VerifactuCertificateEnvelopeError("INVALID_CERTIFICATE");
    }

    if (!certificateSubjectNifs(certificate.subject).includes(input.issuerNif)) {
      throw new VerifactuCertificateEnvelopeError(
        "CERTIFICATE_SCOPE_MISMATCH",
      );
    }
    const validFrom = new Date(certificate.validFrom);
    const validTo = new Date(certificate.validTo);
    const now = input.now ?? new Date();
    if (
      !Number.isFinite(validFrom.getTime()) ||
      !Number.isFinite(validTo.getTime()) ||
      now < validFrom ||
      now >= validTo
    ) {
      throw new VerifactuCertificateEnvelopeError(
        "CERTIFICATE_NOT_CURRENT",
      );
    }

    return {
      fingerprintSha256: certificate.fingerprint256
        .replaceAll(":", "")
        .toLowerCase(),
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
    };
  } finally {
    certificateBytes.fill(0);
    passwordBytes.fill(0);
  }
}

export function encryptVerifactuCertificate(input: {
  secret: VerifactuCertificateSecret;
  binding: VerifactuCertificateEnvelopeBinding;
  kek?: Buffer;
  iv?: Buffer;
}): VerifactuEncryptedCertificateEnvelopeV1 {
  const key = input.kek ?? readVerifactuCertificateKek();
  const iv = input.iv ?? randomBytes(AES_GCM_IV_BYTES);
  if (key.byteLength !== KEK_BYTES) {
    throw new VerifactuCertificateEnvelopeError("INVALID_KEK");
  }
  if (iv.byteLength !== AES_GCM_IV_BYTES) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }

  const plaintext = serializeSecret(input.secret);
  try {
    const cipher = createCipheriv("aes-256-gcm", key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    cipher.setAAD(bindingAad(input.binding));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      schema: CERTIFICATE_ENVELOPE_SCHEMA,
      algorithm: "A256GCM",
      iv: iv.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
    };
  } finally {
    plaintext.fill(0);
  }
}

export function decryptVerifactuCertificate(input: {
  envelope: VerifactuEncryptedCertificateEnvelopeV1;
  binding: VerifactuCertificateEnvelopeBinding;
  kek?: Buffer;
}): VerifactuCertificateSecret {
  const key = input.kek ?? readVerifactuCertificateKek();
  const envelope = input.envelope;
  if (key.byteLength !== KEK_BYTES) {
    throw new VerifactuCertificateEnvelopeError("INVALID_KEK");
  }
  if (
    envelope.schema !== CERTIFICATE_ENVELOPE_SCHEMA ||
    envelope.algorithm !== "A256GCM"
  ) {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }

  try {
    const iv = decodeStrictBase64(envelope.iv, "INVALID_ENVELOPE");
    const ciphertext = decodeStrictBase64(
      envelope.ciphertext,
      "INVALID_ENVELOPE",
    );
    const authTag = decodeStrictBase64(envelope.authTag, "INVALID_ENVELOPE");
    if (
      iv.byteLength !== AES_GCM_IV_BYTES ||
      authTag.byteLength !== AES_GCM_TAG_BYTES ||
      ciphertext.byteLength === 0 ||
      ciphertext.byteLength > MAX_ENCRYPTED_PAYLOAD_BYTES
    ) {
      throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
    }
    const decipher = createDecipheriv("aes-256-gcm", key, iv, {
      authTagLength: AES_GCM_TAG_BYTES,
    });
    decipher.setAAD(bindingAad(input.binding));
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    try {
      return parseSecret(plaintext);
    } finally {
      plaintext.fill(0);
    }
  } catch (error) {
    if (
      error instanceof VerifactuCertificateEnvelopeError &&
      error.code === "INVALID_ENVELOPE"
    ) {
      throw error;
    }
    throw new VerifactuCertificateEnvelopeError("DECRYPTION_FAILED");
  }
}

export function parseVerifactuCertificateEnvelope(
  value: string,
): VerifactuEncryptedCertificateEnvelopeV1 {
  try {
    const parsed = JSON.parse(value) as Partial<VerifactuEncryptedCertificateEnvelopeV1>;
    if (
      parsed.schema !== CERTIFICATE_ENVELOPE_SCHEMA ||
      parsed.algorithm !== "A256GCM" ||
      typeof parsed.iv !== "string" ||
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.authTag !== "string"
    ) {
      throw new Error("invalid");
    }
    return parsed as VerifactuEncryptedCertificateEnvelopeV1;
  } catch {
    throw new VerifactuCertificateEnvelopeError("INVALID_ENVELOPE");
  }
}
