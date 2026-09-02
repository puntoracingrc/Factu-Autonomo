import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  certificateP12Sha256,
  certificateSubjectNifs,
  decryptVerifactuCertificate,
  encryptVerifactuCertificate,
  inspectVerifactuCertificate,
  parseVerifactuCertificateEnvelope,
  readVerifactuCertificateKek,
  VerifactuCertificateEnvelopeError,
  type VerifactuCertificateEnvelopeBinding,
} from "./certificate-envelope";

const key = Buffer.alloc(32, 7);
const iv = Buffer.alloc(12, 3);
const binding: VerifactuCertificateEnvelopeBinding = {
  bindingId: "94d47f75-b02a-4b90-9329-72a7f78f9295",
  userId: "1bb4023e-97de-4960-9b35-27a3a8a3a0f5",
  issuerNif: "B12345674",
  environment: "test",
};
const secret = {
  p12Base64: Buffer.from("synthetic-p12-material").toString("base64"),
  password: "synthetic-password",
};

function errorCode(action: () => unknown): string | undefined {
  try {
    action();
    return undefined;
  } catch (error) {
    return error instanceof VerifactuCertificateEnvelopeError
      ? error.code
      : undefined;
  }
}

describe("VeriFactu certificate envelope", () => {
  it("round-trips an encrypted certificate bound to one user and NIF", () => {
    const encrypted = encryptVerifactuCertificate({
      secret,
      binding,
      kek: key,
      iv,
    });

    expect(decryptVerifactuCertificate({ envelope: encrypted, binding, kek: key }))
      .toEqual(secret);
    expect(parseVerifactuCertificateEnvelope(JSON.stringify(encrypted))).toEqual(
      encrypted,
    );
    expect(JSON.stringify(encrypted)).not.toContain(secret.password);
    expect(JSON.stringify(encrypted)).not.toContain(secret.p12Base64);
  });

  it("rejects the same envelope under another tenant, NIF or binding", () => {
    const envelope = encryptVerifactuCertificate({
      secret,
      binding,
      kek: key,
      iv,
    });

    for (const otherBinding of [
      { ...binding, userId: "2bb4023e-97de-4960-9b35-27a3a8a3a0f5" },
      { ...binding, issuerNif: "A76543218" },
      { ...binding, bindingId: "84d47f75-b02a-4b90-9329-72a7f78f9295" },
    ]) {
      expect(
        errorCode(() =>
          decryptVerifactuCertificate({
            envelope,
            binding: otherBinding,
            kek: key,
          }),
        ),
      ).toBe("DECRYPTION_FAILED");
    }
  });

  it("detects ciphertext and authentication-tag tampering", () => {
    const envelope = encryptVerifactuCertificate({
      secret,
      binding,
      kek: key,
      iv,
    });

    for (const tampered of [
      { ...envelope, ciphertext: Buffer.from("tampered").toString("base64") },
      { ...envelope, authTag: Buffer.alloc(16, 9).toString("base64") },
    ]) {
      expect(
        errorCode(() =>
          decryptVerifactuCertificate({
            envelope: tampered,
            binding,
            kek: key,
          }),
        ),
      ).toBe("DECRYPTION_FAILED");
    }
  });

  it("requires a canonical 256-bit KEK and valid certificate bytes", () => {
    expect(readVerifactuCertificateKek(key.toString("base64"))).toEqual(key);
    expect(errorCode(() => readVerifactuCertificateKek("not-base64"))).toBe(
      "INVALID_KEK",
    );
    expect(errorCode(() => readVerifactuCertificateKek(Buffer.alloc(31).toString("base64"))))
      .toBe("INVALID_KEK");
    expect(errorCode(() => certificateP12Sha256("%%%"))).toBe(
      "INVALID_CERTIFICATE",
    );
  });

  it("returns only safe error codes for malformed envelopes", () => {
    expect(errorCode(() => parseVerifactuCertificateEnvelope("{"))).toBe(
      "INVALID_ENVELOPE",
    );
    expect(
      errorCode(() =>
        encryptVerifactuCertificate({
          secret: { ...secret, password: "" },
          binding,
          kek: key,
          iv,
        }),
      ),
    ).toBe("INVALID_PASSWORD");
  });

  it("extracts NIFs only from certificate identity attributes", () => {
    expect(
      certificateSubjectNifs(
        "C=ES\nserialNumber=IDCES-12345678Z\norganizationIdentifier=VATES-B12345674\nCN=Cliente B00000000",
      ),
    ).toEqual(["12345678Z", "B12345674"]);
  });

  it("rejects malformed PKCS#12 material before it can be bound", () => {
    expect(
      errorCode(() =>
        inspectVerifactuCertificate({
          secret,
          issuerNif: binding.issuerNif,
        }),
      ),
    ).toBe("INVALID_CERTIFICATE");
  });

  it("opens a real PKCS#12 and binds it to the NIF in its subject", () => {
    const directory = mkdtempSync(join(tmpdir(), "factu-verifactu-p12-"));
    const privateKey = join(directory, "key.pem");
    const certificate = join(directory, "certificate.pem");
    const p12 = join(directory, "certificate.p12");
    const password = "synthetic-test-password";

    try {
      execFileSync(
        "openssl",
        [
          "req",
          "-x509",
          "-newkey",
          "rsa:2048",
          "-keyout",
          privateKey,
          "-out",
          certificate,
          "-days",
          "2",
          "-nodes",
          "-subj",
          `/C=ES/O=Factu Test/serialNumber=${binding.issuerNif}/CN=Factu Certificate Test`,
        ],
        { stdio: "ignore" },
      );
      execFileSync(
        "openssl",
        [
          "pkcs12",
          "-export",
          "-out",
          p12,
          "-inkey",
          privateKey,
          "-in",
          certificate,
          "-passout",
          `pass:${password}`,
        ],
        { stdio: "ignore" },
      );
      const generatedSecret = {
        p12Base64: readFileSync(p12).toString("base64"),
        password,
      };

      expect(
        inspectVerifactuCertificate({
          secret: generatedSecret,
          issuerNif: binding.issuerNif,
        }),
      ).toMatchObject({
        fingerprintSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        validFrom: expect.any(String),
        validTo: expect.any(String),
      });
      expect(
        errorCode(() =>
          inspectVerifactuCertificate({
            secret: generatedSecret,
            issuerNif: "A76543218",
          }),
        ),
      ).toBe("CERTIFICATE_SCOPE_MISMATCH");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
