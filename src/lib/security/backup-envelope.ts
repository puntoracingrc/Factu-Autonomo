import { MAX_BACKUP_PREVIEW_BYTES } from "@/lib/backup";

export const ENCRYPTED_BACKUP_FORMAT = "factu-encrypted-backup";
export const ENCRYPTED_BACKUP_VERSION = 1;
export const ENCRYPTED_BACKUP_ALGORITHM = "AES-GCM";
export const MAX_ENCRYPTED_BACKUP_BYTES =
  Math.ceil(((MAX_BACKUP_PREVIEW_BYTES + 16) * 4) / 3) + 64 * 1024;

export interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  envelopeVersion: typeof ENCRYPTED_BACKUP_VERSION;
  algorithm: typeof ENCRYPTED_BACKUP_ALGORITHM;
  keyVersion: number;
  createdAt: string;
  iv: string;
  ciphertext: string;
}

export type EncryptedBackupInspection =
  | { encrypted: false }
  | { encrypted: true; envelope: EncryptedBackupEnvelope }
  | { encrypted: true; error: string };

interface CryptoProvider {
  subtle: SubtleCrypto;
  getRandomValues<T extends ArrayBufferView | null>(array: T): T;
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_KEY_VERSION = 99;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string, maximum: number): Uint8Array | null {
  if (
    !value ||
    value.length % 4 !== 0 ||
    value.length > Math.ceil((maximum * 4) / 3) + 4 ||
    !BASE64_PATTERN.test(value)
  ) {
    return null;
  }

  try {
    const binary = atob(value);
    if (binary.length > maximum) return null;
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function headerFor(envelope: {
  keyVersion: number;
  createdAt: string;
}): string {
  return JSON.stringify({
    format: ENCRYPTED_BACKUP_FORMAT,
    envelopeVersion: ENCRYPTED_BACKUP_VERSION,
    algorithm: ENCRYPTED_BACKUP_ALGORITHM,
    keyVersion: envelope.keyVersion,
    createdAt: envelope.createdAt,
  });
}

function validKeyVersion(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 1 &&
    Number(value) <= MAX_KEY_VERSION
  );
}

function validateEnvelope(raw: Record<string, unknown>): EncryptedBackupEnvelope | null {
  if (
    raw.format !== ENCRYPTED_BACKUP_FORMAT ||
    raw.envelopeVersion !== ENCRYPTED_BACKUP_VERSION ||
    raw.algorithm !== ENCRYPTED_BACKUP_ALGORITHM ||
    !validKeyVersion(raw.keyVersion) ||
    typeof raw.createdAt !== "string" ||
    raw.createdAt.length < 20 ||
    raw.createdAt.length > 40 ||
    !Number.isFinite(Date.parse(raw.createdAt)) ||
    typeof raw.iv !== "string" ||
    typeof raw.ciphertext !== "string"
  ) {
    return null;
  }

  const iv = base64ToBytes(raw.iv, IV_LENGTH_BYTES);
  const ciphertext = base64ToBytes(
    raw.ciphertext,
    MAX_BACKUP_PREVIEW_BYTES + AUTH_TAG_LENGTH_BYTES,
  );
  if (
    !iv ||
    iv.length !== IV_LENGTH_BYTES ||
    !ciphertext ||
    ciphertext.length < AUTH_TAG_LENGTH_BYTES
  ) {
    return null;
  }

  return raw as unknown as EncryptedBackupEnvelope;
}

export function inspectEncryptedBackupText(
  rawText: string,
): EncryptedBackupInspection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { encrypted: false };
  }

  if (!isRecord(parsed) || parsed.format !== ENCRYPTED_BACKUP_FORMAT) {
    return { encrypted: false };
  }

  const envelope = validateEnvelope(parsed);
  return envelope
    ? { encrypted: true, envelope }
    : { encrypted: true, error: "La copia cifrada no tiene una estructura válida." };
}

async function importAesKey(
  keyBase64: string,
  usages: KeyUsage[],
  cryptoProvider: CryptoProvider,
): Promise<CryptoKey> {
  const keyBytes = base64ToBytes(keyBase64, 32);
  if (!keyBytes || keyBytes.length !== 32) {
    throw new Error("invalid_backup_key");
  }
  return cryptoProvider.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: ENCRYPTED_BACKUP_ALGORITHM },
    false,
    usages,
  );
}

export async function encryptBackupText(
  plaintext: string,
  keyBase64: string,
  keyVersion: number,
  createdAt: string,
  cryptoProvider: CryptoProvider = globalThis.crypto,
): Promise<{ envelope: EncryptedBackupEnvelope; text: string }> {
  const plaintextBytes = TEXT_ENCODER.encode(plaintext);
  if (plaintextBytes.byteLength > MAX_BACKUP_PREVIEW_BYTES) {
    throw new Error("backup_plaintext_too_large");
  }
  if (!validKeyVersion(keyVersion) || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("invalid_backup_header");
  }

  const key = await importAesKey(keyBase64, ["encrypt"], cryptoProvider);
  const iv = cryptoProvider.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const additionalData = TEXT_ENCODER.encode(headerFor({ keyVersion, createdAt }));
  const encrypted = await cryptoProvider.subtle.encrypt(
    {
      name: ENCRYPTED_BACKUP_ALGORITHM,
      iv: toArrayBuffer(iv),
      additionalData,
      tagLength: 128,
    },
    key,
    plaintextBytes,
  );
  const envelope: EncryptedBackupEnvelope = {
    format: ENCRYPTED_BACKUP_FORMAT,
    envelopeVersion: ENCRYPTED_BACKUP_VERSION,
    algorithm: ENCRYPTED_BACKUP_ALGORITHM,
    keyVersion,
    createdAt,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
  const text = JSON.stringify(envelope);
  if (new Blob([text]).size > MAX_ENCRYPTED_BACKUP_BYTES) {
    throw new Error("encrypted_backup_too_large");
  }
  return { envelope, text };
}

export async function decryptBackupEnvelope(
  envelope: EncryptedBackupEnvelope,
  keyBase64: string,
  cryptoProvider: CryptoProvider = globalThis.crypto,
): Promise<string> {
  const validated = validateEnvelope(envelope as unknown as Record<string, unknown>);
  if (!validated) throw new Error("invalid_encrypted_backup");

  const iv = base64ToBytes(validated.iv, IV_LENGTH_BYTES);
  const ciphertext = base64ToBytes(
    validated.ciphertext,
    MAX_BACKUP_PREVIEW_BYTES + AUTH_TAG_LENGTH_BYTES,
  );
  if (!iv || !ciphertext) throw new Error("invalid_encrypted_backup");

  const key = await importAesKey(keyBase64, ["decrypt"], cryptoProvider);
  const additionalData = TEXT_ENCODER.encode(headerFor(validated));
  const decrypted = await cryptoProvider.subtle.decrypt(
    {
      name: ENCRYPTED_BACKUP_ALGORITHM,
      iv: toArrayBuffer(iv),
      additionalData,
      tagLength: 128,
    },
    key,
    toArrayBuffer(ciphertext),
  );
  if (decrypted.byteLength > MAX_BACKUP_PREVIEW_BYTES) {
    throw new Error("backup_plaintext_too_large");
  }
  return TEXT_DECODER.decode(decrypted);
}
