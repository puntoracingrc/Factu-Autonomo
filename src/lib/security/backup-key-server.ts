import { hkdfSync } from "node:crypto";

const ACTIVE_VERSION_ENV = "BACKUP_ENCRYPTION_ACTIVE_VERSION";
const KEY_ENV_PREFIX = "BACKUP_ENCRYPTION_KEY_V";
const HKDF_SALT = Buffer.from("factu-autonomo-backup-hkdf-v1", "utf8");
const VERSION_PATTERN = /^[1-9][0-9]?$/;

export type BackupKeyResult =
  | { ok: true; version: number; keyBase64: string }
  | { ok: false; error: "invalid_version" | "not_configured" };

function parseVersion(value: string | null | undefined): number | null {
  const trimmed = value?.trim() ?? "";
  if (!VERSION_PATTERN.test(trimmed)) return null;
  const version = Number(trimmed);
  return Number.isSafeInteger(version) ? version : null;
}

function readMasterKey(version: number): Buffer | null {
  const encoded = process.env[`${KEY_ENV_PREFIX}${version}`]?.trim();
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64");
    return decoded.length === 32 ? decoded : null;
  } catch {
    return null;
  }
}

export function deriveUserBackupKey(
  userId: string,
  requestedVersion?: string | null,
): BackupKeyResult {
  const activeVersion = parseVersion(process.env[ACTIVE_VERSION_ENV]);
  if (activeVersion === null) return { ok: false, error: "not_configured" };

  const version =
    requestedVersion === undefined || requestedVersion === null
      ? activeVersion
      : parseVersion(requestedVersion);
  if (version === null) return { ok: false, error: "invalid_version" };

  const masterKey = readMasterKey(version);
  if (!masterKey) return { ok: false, error: "not_configured" };

  const info = Buffer.from(
    `factu-autonomo:user-backup:v${version}:${userId}`,
    "utf8",
  );
  const derived = hkdfSync("sha256", masterKey, HKDF_SALT, info, 32);
  return {
    ok: true,
    version,
    keyBase64: Buffer.from(derived).toString("base64"),
  };
}
