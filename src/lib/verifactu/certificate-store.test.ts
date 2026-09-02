import { describe, expect, it } from "vitest";

import type { VerifactuCertificateBindingMetadata } from "./certificate-store";
import {
  provisionVerifactuCertificate,
  resolveVerifactuCertificate,
  revokeVerifactuCertificate,
  VerifactuCertificateStoreError,
  type ActivateVerifactuCertificateBindingInput,
  type VerifactuCertificateRepository,
} from "./certificate-store";

const USER_ID = "1bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const OTHER_USER_ID = "2bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const BINDING_ID = "4bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const ENVELOPE_ID = "3bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const NEXT_ENVELOPE_ID = "5bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const NIF = "B12345674";
const KEK = Buffer.alloc(32, 12);
const SECRET = {
  p12Base64: Buffer.from("synthetic-p12").toString("base64"),
  password: "synthetic-password",
};
const INSPECTION = {
  fingerprintSha256: "c".repeat(64),
  validFrom: "2026-01-01T00:00:00.000Z",
  validTo: "2027-01-01T00:00:00.000Z",
};
const inspectCertificate = () => INSPECTION;

class MemoryCertificateRepository implements VerifactuCertificateRepository {
  readonly objects = new Map<string, string>();
  readonly bindings = new Map<string, VerifactuCertificateBindingMetadata>();
  readonly used: string[] = [];
  readonly removed: string[] = [];
  failActivation = false;
  failRemoval = false;

  async uploadEncryptedEnvelope(path: string, body: string) {
    if (this.objects.has(path)) throw new Error("duplicate object");
    this.objects.set(path, body);
  }

  async removeEncryptedEnvelope(path: string) {
    this.removed.push(path);
    if (this.failRemoval) return false;
    this.objects.delete(path);
    return true;
  }

  async activateBinding(input: ActivateVerifactuCertificateBindingInput) {
    if (this.failActivation) {
      throw new VerifactuCertificateStoreError("ACTIVATION_FAILED");
    }
    const key = `${input.userId}:${input.issuerNif}`;
    const previous = this.bindings.get(key);
    const bindingVersion = (previous?.bindingVersion ?? 0) + 1;
    this.bindings.set(key, {
      id: previous?.id ?? BINDING_ID,
      userId: input.userId,
      issuerNif: input.issuerNif,
      environment: "test",
      certificateChannel: input.certificateChannel,
      envelopeId: input.envelopeId,
      objectPath: input.objectPath,
      p12Sha256: input.p12Sha256,
      certificateFingerprintSha256: input.certificateFingerprintSha256,
      certificateValidFrom: input.certificateValidFrom,
      certificateValidTo: input.certificateValidTo,
      bindingVersion,
      status: "active",
    });
    return {
      bindingId: previous?.id ?? BINDING_ID,
      bindingVersion,
      previousObjectPath: previous?.objectPath ?? null,
    };
  }

  async loadActiveBinding(input: { userId: string; issuerNif: string }) {
    return this.bindings.get(`${input.userId}:${input.issuerNif}`) ?? null;
  }

  async downloadEncryptedEnvelope(path: string) {
    const body = this.objects.get(path);
    if (!body) throw new VerifactuCertificateStoreError("DOWNLOAD_FAILED");
    return body;
  }

  async markBindingUsed(input: { bindingId: string }) {
    this.used.push(input.bindingId);
  }

  async revokeBinding(input: { userId: string; issuerNif: string }) {
    const key = `${input.userId}:${input.issuerNif}`;
    const binding = this.bindings.get(key);
    if (!binding) {
      throw new VerifactuCertificateStoreError("REVOCATION_FAILED");
    }
    this.bindings.set(key, { ...binding, status: "revoked" });
    return { bindingId: binding.id, objectPath: binding.objectPath };
  }
}

async function errorCode(action: () => Promise<unknown>) {
  try {
    await action();
    return undefined;
  } catch (error) {
    return error instanceof VerifactuCertificateStoreError
      ? error.code
      : undefined;
  }
}

describe("VeriFactu certificate store", () => {
  it("stores only a tenant-bound encrypted envelope and resolves it server-side", async () => {
    const repository = new MemoryCertificateRepository();
    const provisioned = await provisionVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      certificateChannel: "personal",
      secret: SECRET,
      reason: "Controlled preproduction test",
      repository,
      kek: KEK,
      envelopeId: ENVELOPE_ID,
      inspectCertificate,
    });

    const serialized = [...repository.objects.values()][0];
    expect(serialized).not.toContain(SECRET.password);
    expect(serialized).not.toContain(SECRET.p12Base64);
    expect(provisioned).toMatchObject({
      bindingId: BINDING_ID,
      bindingVersion: 1,
      issuerNif: NIF,
      staleObjectCleanupPending: false,
    });

    const resolved = await resolveVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      reason: "Submit test record",
      repository,
      kek: KEK,
      inspectCertificate,
    });
    expect(resolved.certificate).toEqual(SECRET);
    expect(resolved.certificateChannel).toBe("personal");
    expect(repository.used).toEqual([BINDING_ID]);
  });

  it("does not resolve a certificate across users", async () => {
    const repository = new MemoryCertificateRepository();
    await provisionVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      certificateChannel: "sello",
      secret: SECRET,
      reason: "Controlled preproduction test",
      repository,
      kek: KEK,
      envelopeId: ENVELOPE_ID,
      inspectCertificate,
    });

    expect(
      await errorCode(() =>
        resolveVerifactuCertificate({
          userId: OTHER_USER_ID,
          issuerNif: NIF,
          reason: "Cross tenant attempt",
          repository,
          kek: KEK,
          inspectCertificate,
        }),
      ),
    ).toBe("BINDING_NOT_FOUND");
  });

  it("removes a newly uploaded object when metadata activation fails", async () => {
    const repository = new MemoryCertificateRepository();
    repository.failActivation = true;

    expect(
      await errorCode(() =>
        provisionVerifactuCertificate({
          userId: USER_ID,
          issuerNif: NIF,
          certificateChannel: "personal",
          secret: SECRET,
          reason: "Controlled preproduction test",
          repository,
          kek: KEK,
          envelopeId: ENVELOPE_ID,
          inspectCertificate,
        }),
      ),
    ).toBe("ACTIVATION_FAILED");
    expect(repository.objects.size).toBe(0);
    expect(repository.removed).toHaveLength(1);
  });

  it("rotates atomically and retires the previous encrypted object", async () => {
    const repository = new MemoryCertificateRepository();
    for (const envelopeId of [ENVELOPE_ID, NEXT_ENVELOPE_ID]) {
      await provisionVerifactuCertificate({
        userId: USER_ID,
        issuerNif: NIF,
        certificateChannel: "personal",
        secret: SECRET,
        reason: "Rotate controlled certificate",
        repository,
        kek: KEK,
        envelopeId,
        inspectCertificate,
      });
    }

    expect(repository.objects.size).toBe(1);
    expect(repository.removed[0]).toContain(ENVELOPE_ID);
    expect(repository.bindings.get(`${USER_ID}:${NIF}`)?.bindingVersion).toBe(2);
  });

  it("fails closed when the encrypted object was replaced", async () => {
    const repository = new MemoryCertificateRepository();
    await provisionVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      certificateChannel: "personal",
      secret: SECRET,
      reason: "Controlled preproduction test",
      repository,
      kek: KEK,
      envelopeId: ENVELOPE_ID,
      inspectCertificate,
    });
    const path = [...repository.objects.keys()][0];
    repository.objects.set(path, '{"schema":"tampered"}');

    expect(
      await errorCode(() =>
        resolveVerifactuCertificate({
          userId: USER_ID,
          issuerNif: NIF,
          reason: "Submit test record",
          repository,
          kek: KEK,
          inspectCertificate,
        }),
      ),
    ).toBe("CERTIFICATE_INTEGRITY_FAILED");
  });

  it("revokes metadata before deleting the encrypted object", async () => {
    const repository = new MemoryCertificateRepository();
    await provisionVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      certificateChannel: "personal",
      secret: SECRET,
      reason: "Controlled preproduction test",
      repository,
      kek: KEK,
      envelopeId: ENVELOPE_ID,
      inspectCertificate,
    });

    const revoked = await revokeVerifactuCertificate({
      userId: USER_ID,
      issuerNif: NIF,
      reason: "Certificate no longer authorized",
      repository,
    });
    expect(revoked.encryptedObjectCleanupPending).toBe(false);
    expect(repository.objects.size).toBe(0);
    expect(repository.bindings.get(`${USER_ID}:${NIF}`)?.status).toBe("revoked");
  });
});
