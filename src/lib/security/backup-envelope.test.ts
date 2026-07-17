import { describe, expect, it } from "vitest";
import {
  decryptBackupEnvelope,
  encryptBackupText,
  inspectEncryptedBackupText,
} from "./backup-envelope";

const KEY = Buffer.alloc(32, 4).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 5).toString("base64");
const CREATED_AT = "2026-07-17T08:00:00.000Z";

describe("encrypted backup envelope", () => {
  it("cifra y descifra preservando el contenido", async () => {
    const encrypted = await encryptBackupText(
      '{"metadata":{"app":"factura-autonomo"}}',
      KEY,
      1,
      CREATED_AT,
    );
    const inspection = inspectEncryptedBackupText(encrypted.text);
    expect(inspection.encrypted).toBe(true);
    if (!inspection.encrypted || "error" in inspection) return;
    await expect(decryptBackupEnvelope(inspection.envelope, KEY)).resolves.toBe(
      '{"metadata":{"app":"factura-autonomo"}}',
    );
  });

  it("no puede abrirse con la clave de otro usuario", async () => {
    const encrypted = await encryptBackupText("private", KEY, 1, CREATED_AT);
    await expect(
      decryptBackupEnvelope(encrypted.envelope, OTHER_KEY),
    ).rejects.toThrow();
  });

  it("detecta manipulación de metadata autenticada", async () => {
    const encrypted = await encryptBackupText("private", KEY, 1, CREATED_AT);
    await expect(
      decryptBackupEnvelope(
        { ...encrypted.envelope, createdAt: "2026-07-18T08:00:00.000Z" },
        KEY,
      ),
    ).rejects.toThrow();
  });

  it("deja pasar el JSON antiguo como copia no cifrada", () => {
    expect(inspectEncryptedBackupText('{"metadata":{"app":"factura-autonomo"}}'))
      .toEqual({ encrypted: false });
  });
});
