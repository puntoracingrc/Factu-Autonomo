import fs from "node:fs";
import path from "node:path";

/**
 * Resolves a private fixture only when its environment variable is explicitly set.
 * Relative paths are anchored to the checkout running the test command.
 */
export function resolveOptInFixturePath(environmentVariable, ...segments) {
  const configuredPath = process.env[environmentVariable]?.trim();
  if (!configuredPath) return undefined;
  return path.resolve(configuredPath, ...segments);
}

/**
 * Keeps optional fixtures disabled by default, but fails clearly when an
 * explicitly configured path cannot be read instead of silently skipping it.
 */
export function resolveReadableOptInFixturePath(environmentVariable, ...segments) {
  const resolvedPath = resolveOptInFixturePath(environmentVariable, ...segments);
  if (!resolvedPath) return undefined;

  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
  } catch {
    throw new Error(
      `${environmentVariable} está configurada, pero la ruta no existe o no es legible.`,
    );
  }

  return resolvedPath;
}

/** Keeps externally supplied fixture identifiers inside artifact directories. */
export function validatePrivateFixtureId(value, fallback = "private_fixture") {
  const fixtureId = String(value ?? fallback).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(fixtureId)) {
    throw new Error(
      "fixtureId privado no válido: usa solo letras, números, punto, guion o guion bajo.",
    );
  }
  return fixtureId;
}
