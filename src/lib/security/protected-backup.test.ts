import { describe, expect, it } from "vitest";
import { createBackupArtifact, parseBackupJson } from "@/lib/backup";
import { EMPTY_DATA } from "@/lib/types";
import {
  createProtectedBackupArtifact,
  prepareProtectedBackupCandidate,
  type BackupKeyResolver,
} from "./protected-backup";

const EXPORTED_AT = "2026-07-17T08:00:00.000Z";
const KEY = Buffer.alloc(32, 8).toString("base64");
const resolver: BackupKeyResolver = async () => ({
  status: "ready",
  version: 1,
  keyBase64: KEY,
});

describe("protected backups", () => {
  it("cifra una copia de cuenta y la prepara de nuevo para importar", async () => {
    const artifact = await createProtectedBackupArtifact(EMPTY_DATA, EXPORTED_AT, {
      resolveKey: resolver,
    });
    expect(artifact.encrypted).toBe(true);
    expect(artifact.text).not.toContain('"profile"');

    const prepared = await prepareProtectedBackupCandidate(
      {
        fileName: "factu-autonomo-backup-2026-07-17.json",
        mimeType: "application/json",
        byteLength: artifact.byteLength,
        rawText: artifact.text,
      },
      resolver,
    );
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.encrypted).toBe(true);
    expect(parseBackupJson(JSON.parse(prepared.candidate.rawText))).not.toHaveProperty(
      "error",
    );
  });

  it("mantiene importables las copias JSON anteriores", async () => {
    const artifact = createBackupArtifact(EMPTY_DATA, EXPORTED_AT);
    const prepared = await prepareProtectedBackupCandidate({
      fileName: "factu-autonomo-backup-2026-07-17.json",
      mimeType: "application/json",
      byteLength: artifact.byteLength,
      rawText: artifact.text,
    });
    expect(prepared).toMatchObject({ ok: true, encrypted: false });
  });

  it("permite una copia local legible cuando no existe cuenta", async () => {
    const artifact = await createProtectedBackupArtifact(EMPTY_DATA, EXPORTED_AT, {
      resolveKey: async () => ({ status: "guest" }),
    });
    expect(artifact.encrypted).toBe(false);
    expect(artifact.text).toContain('"metadata"');
  });

  it("falla cerrado para una cuenta si el servicio de cifrado no responde", async () => {
    await expect(
      createProtectedBackupArtifact(EMPTY_DATA, EXPORTED_AT, {
        resolveKey: async () => ({
          status: "error",
          error: "El cifrado de copias no está disponible ahora.",
        }),
      }),
    ).rejects.toThrow("El cifrado de copias no está disponible ahora.");
  });

  it("no sube una copia legible cuando Drive exige cifrado", async () => {
    await expect(
      createProtectedBackupArtifact(EMPTY_DATA, EXPORTED_AT, {
        requireEncryption: true,
        resolveKey: async () => ({ status: "guest" }),
      }),
    ).rejects.toThrow("backup_encryption_requires_account");
  });

  it("no descifra con la clave de otra cuenta", async () => {
    const artifact = await createProtectedBackupArtifact(EMPTY_DATA, EXPORTED_AT, {
      resolveKey: resolver,
    });
    const prepared = await prepareProtectedBackupCandidate(
      {
        fileName: "factu-autonomo-backup-2026-07-17.json",
        byteLength: artifact.byteLength,
        rawText: artifact.text,
      },
      async () => ({
        status: "ready",
        version: 1,
        keyBase64: Buffer.alloc(32, 9).toString("base64"),
      }),
    );
    expect(prepared).toMatchObject({ ok: false });
  });
});
