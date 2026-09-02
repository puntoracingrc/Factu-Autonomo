import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

import {
  certificateP12Sha256,
  decryptVerifactuCertificate,
  encryptVerifactuCertificate,
  inspectVerifactuCertificate,
  parseVerifactuCertificateEnvelope,
  type VerifactuCertificateInspection,
  type VerifactuCertificateSecret,
} from "./certificate-envelope";
import type {
  AeatCertificateChannel,
  VerifactuCertificateConfig,
} from "./config";
import { normalizeIssuerNif } from "./qr";

const CERTIFICATE_BUCKET = "verifactu-certificates";
const CERTIFICATE_CONTENT_TYPE = "application/octet-stream";
const MAX_ENVELOPE_BYTES = 512 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface VerifactuCertificateBindingMetadata {
  id: string;
  userId: string;
  issuerNif: string;
  environment: "test";
  certificateChannel: AeatCertificateChannel;
  envelopeId: string;
  objectPath: string;
  p12Sha256: string;
  certificateFingerprintSha256: string;
  certificateValidFrom: string;
  certificateValidTo: string;
  bindingVersion: number;
  status: "active" | "revoked";
}

export interface ActivateVerifactuCertificateBindingInput {
  userId: string;
  issuerNif: string;
  certificateChannel: AeatCertificateChannel;
  envelopeId: string;
  objectPath: string;
  p12Sha256: string;
  certificateFingerprintSha256: string;
  certificateValidFrom: string;
  certificateValidTo: string;
  reason: string;
}

export interface VerifactuCertificateRepository {
  uploadEncryptedEnvelope(path: string, body: string): Promise<void>;
  removeEncryptedEnvelope(path: string): Promise<boolean>;
  activateBinding(
    input: ActivateVerifactuCertificateBindingInput,
  ): Promise<{
    bindingId: string;
    bindingVersion: number;
    previousObjectPath: string | null;
  }>;
  loadActiveBinding(input: {
    userId: string;
    issuerNif: string;
  }): Promise<VerifactuCertificateBindingMetadata | null>;
  downloadEncryptedEnvelope(path: string): Promise<string>;
  markBindingUsed(input: {
    bindingId: string;
    userId: string;
    issuerNif: string;
    reason: string;
  }): Promise<void>;
  revokeBinding(input: {
    userId: string;
    issuerNif: string;
    reason: string;
  }): Promise<{ bindingId: string; objectPath: string }>;
}

export type VerifactuCertificateStoreErrorCode =
  | "INVALID_SCOPE"
  | "INVALID_REASON"
  | "STORE_UNAVAILABLE"
  | "UPLOAD_FAILED"
  | "ACTIVATION_FAILED"
  | "BINDING_NOT_FOUND"
  | "BINDING_INVALID"
  | "DOWNLOAD_FAILED"
  | "CERTIFICATE_INTEGRITY_FAILED"
  | "AUDIT_FAILED"
  | "REVOCATION_FAILED";

export class VerifactuCertificateStoreError extends Error {
  constructor(readonly code: VerifactuCertificateStoreErrorCode) {
    super(code);
    this.name = "VerifactuCertificateStoreError";
  }
}

function normalizeScope(input: { userId: string; issuerNif: string }) {
  if (!UUID_PATTERN.test(input.userId)) {
    throw new VerifactuCertificateStoreError("INVALID_SCOPE");
  }
  try {
    return {
      userId: input.userId.toLowerCase(),
      issuerNif: normalizeIssuerNif(input.issuerNif),
    };
  } catch {
    throw new VerifactuCertificateStoreError("INVALID_SCOPE");
  }
}

function normalizeReason(reason: string): string {
  const value = reason.trim();
  if (value.length < 3 || value.length > 500) {
    throw new VerifactuCertificateStoreError("INVALID_REASON");
  }
  return value;
}

function expectedObjectPath(input: {
  userId: string;
  issuerNif: string;
  envelopeId: string;
}): string {
  return `${input.userId}/${input.issuerNif}/test/${input.envelopeId}.vfce`;
}

function parseBindingRow(value: unknown): VerifactuCertificateBindingMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new VerifactuCertificateStoreError("BINDING_INVALID");
  }
  const row = value as Record<string, unknown>;
  const metadata: VerifactuCertificateBindingMetadata = {
    id: String(row.id ?? ""),
    userId: String(row.user_id ?? ""),
    issuerNif: String(row.issuer_nif ?? ""),
    environment: row.environment as "test",
    certificateChannel: row.certificate_channel as AeatCertificateChannel,
    envelopeId: String(row.envelope_id ?? ""),
    objectPath: String(row.object_path ?? ""),
    p12Sha256: String(row.p12_sha256 ?? ""),
    certificateFingerprintSha256: String(
      row.certificate_fingerprint_sha256 ?? "",
    ),
    certificateValidFrom: String(row.certificate_valid_from ?? ""),
    certificateValidTo: String(row.certificate_valid_to ?? ""),
    bindingVersion: Number(row.binding_version),
    status: row.status as "active" | "revoked",
  };
  if (
    !UUID_PATTERN.test(metadata.id) ||
    !UUID_PATTERN.test(metadata.userId) ||
    !UUID_PATTERN.test(metadata.envelopeId) ||
    metadata.environment !== "test" ||
    !["personal", "sello"].includes(metadata.certificateChannel) ||
    metadata.status !== "active" ||
    !/^[A-Z0-9]{9}$/.test(metadata.issuerNif) ||
    !/^[a-f0-9]{64}$/.test(metadata.p12Sha256) ||
    !/^[a-f0-9]{64}$/.test(metadata.certificateFingerprintSha256) ||
    !Number.isFinite(Date.parse(metadata.certificateValidFrom)) ||
    !Number.isFinite(Date.parse(metadata.certificateValidTo)) ||
    Date.parse(metadata.certificateValidFrom) >=
      Date.parse(metadata.certificateValidTo) ||
    !Number.isSafeInteger(metadata.bindingVersion) ||
    metadata.bindingVersion < 1 ||
    metadata.objectPath !== expectedObjectPath(metadata)
  ) {
    throw new VerifactuCertificateStoreError("BINDING_INVALID");
  }
  return metadata;
}

function firstRpcRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new VerifactuCertificateStoreError("BINDING_INVALID");
  }
  return row as Record<string, unknown>;
}

export function createSupabaseVerifactuCertificateRepository(
  admin: SupabaseClient | null = getSupabaseAdmin(),
): VerifactuCertificateRepository {
  if (!admin) {
    throw new VerifactuCertificateStoreError("STORE_UNAVAILABLE");
  }

  return {
    async uploadEncryptedEnvelope(path, body) {
      const { error } = await admin.storage
        .from(CERTIFICATE_BUCKET)
        .upload(path, body, {
          contentType: CERTIFICATE_CONTENT_TYPE,
          upsert: false,
        });
      if (error) throw new VerifactuCertificateStoreError("UPLOAD_FAILED");
    },

    async removeEncryptedEnvelope(path) {
      const { error } = await admin.storage
        .from(CERTIFICATE_BUCKET)
        .remove([path]);
      return !error;
    },

    async activateBinding(input) {
      const { data, error } = await admin.rpc(
        "activate_verifactu_certificate_binding_v1",
        {
          p_user_id: input.userId,
          p_issuer_nif: input.issuerNif,
          p_environment: "test",
          p_certificate_channel: input.certificateChannel,
          p_envelope_id: input.envelopeId,
          p_object_path: input.objectPath,
          p_p12_sha256: input.p12Sha256,
          p_certificate_fingerprint_sha256:
            input.certificateFingerprintSha256,
          p_certificate_valid_from: input.certificateValidFrom,
          p_certificate_valid_to: input.certificateValidTo,
          p_reason: input.reason,
        },
      );
      if (error) {
        throw new VerifactuCertificateStoreError("ACTIVATION_FAILED");
      }
      const row = firstRpcRow(data);
      const bindingId = String(row.binding_id ?? "");
      const bindingVersion = Number(row.binding_version);
      const previousObjectPath =
        row.previous_object_path === null || row.previous_object_path === undefined
          ? null
          : String(row.previous_object_path);
      if (
        !UUID_PATTERN.test(bindingId) ||
        !Number.isSafeInteger(bindingVersion) ||
        bindingVersion < 1
      ) {
        throw new VerifactuCertificateStoreError("BINDING_INVALID");
      }
      return { bindingId, bindingVersion, previousObjectPath };
    },

    async loadActiveBinding(input) {
      const { data, error } = await admin
        .from("verifactu_certificate_bindings")
        .select(
          "id,user_id,issuer_nif,environment,certificate_channel,envelope_id,object_path,p12_sha256,certificate_fingerprint_sha256,certificate_valid_from,certificate_valid_to,binding_version,status",
        )
        .eq("user_id", input.userId)
        .eq("issuer_nif", input.issuerNif)
        .eq("environment", "test")
        .eq("status", "active")
        .maybeSingle();
      if (error) throw new VerifactuCertificateStoreError("BINDING_INVALID");
      return data ? parseBindingRow(data) : null;
    },

    async downloadEncryptedEnvelope(path) {
      const { data, error } = await admin.storage
        .from(CERTIFICATE_BUCKET)
        .download(path);
      if (error || !data) {
        throw new VerifactuCertificateStoreError("DOWNLOAD_FAILED");
      }
      const body = await data.text();
      if (!body || Buffer.byteLength(body, "utf8") > MAX_ENVELOPE_BYTES) {
        throw new VerifactuCertificateStoreError("DOWNLOAD_FAILED");
      }
      return body;
    },

    async markBindingUsed(input) {
      const { error } = await admin.rpc(
        "mark_verifactu_certificate_binding_used_v1",
        {
          p_binding_id: input.bindingId,
          p_user_id: input.userId,
          p_issuer_nif: input.issuerNif,
          p_reason: input.reason,
        },
      );
      if (error) throw new VerifactuCertificateStoreError("AUDIT_FAILED");
    },

    async revokeBinding(input) {
      const { data, error } = await admin.rpc(
        "revoke_verifactu_certificate_binding_v1",
        {
          p_user_id: input.userId,
          p_issuer_nif: input.issuerNif,
          p_reason: input.reason,
        },
      );
      if (error) {
        throw new VerifactuCertificateStoreError("REVOCATION_FAILED");
      }
      const row = firstRpcRow(data);
      const bindingId = String(row.binding_id ?? "");
      const objectPath = String(row.revoked_object_path ?? "");
      if (!UUID_PATTERN.test(bindingId) || !objectPath) {
        throw new VerifactuCertificateStoreError("BINDING_INVALID");
      }
      return { bindingId, objectPath };
    },
  };
}

export async function provisionVerifactuCertificate(input: {
  userId: string;
  issuerNif: string;
  certificateChannel: AeatCertificateChannel;
  secret: VerifactuCertificateSecret;
  reason: string;
  repository?: VerifactuCertificateRepository;
  kek?: Buffer;
  envelopeId?: string;
  now?: Date;
  inspectCertificate?: (input: {
    secret: VerifactuCertificateSecret;
    issuerNif: string;
    now?: Date;
  }) => VerifactuCertificateInspection;
}): Promise<{
  bindingId: string;
  bindingVersion: number;
  issuerNif: string;
  staleObjectCleanupPending: boolean;
}> {
  const scope = normalizeScope(input);
  const reason = normalizeReason(input.reason);
  const envelopeId = input.envelopeId ?? randomUUID();
  if (!UUID_PATTERN.test(envelopeId)) {
    throw new VerifactuCertificateStoreError("INVALID_SCOPE");
  }
  if (input.certificateChannel !== "personal" && input.certificateChannel !== "sello") {
    throw new VerifactuCertificateStoreError("INVALID_SCOPE");
  }
  const repository =
    input.repository ?? createSupabaseVerifactuCertificateRepository();
  const objectPath = expectedObjectPath({ ...scope, envelopeId });
  const p12Sha256 = certificateP12Sha256(input.secret.p12Base64);
  const inspection = (
    input.inspectCertificate ?? inspectVerifactuCertificate
  )({
    secret: input.secret,
    issuerNif: scope.issuerNif,
    now: input.now,
  });
  const envelope = encryptVerifactuCertificate({
    secret: input.secret,
    binding: {
      bindingId: envelopeId,
      ...scope,
      environment: "test",
    },
    kek: input.kek,
  });

  await repository.uploadEncryptedEnvelope(objectPath, JSON.stringify(envelope));
  let activation;
  try {
    activation = await repository.activateBinding({
      ...scope,
      certificateChannel: input.certificateChannel,
      envelopeId,
      objectPath,
      p12Sha256,
      certificateFingerprintSha256: inspection.fingerprintSha256,
      certificateValidFrom: inspection.validFrom,
      certificateValidTo: inspection.validTo,
      reason,
    });
  } catch (error) {
    await repository.removeEncryptedEnvelope(objectPath);
    if (error instanceof VerifactuCertificateStoreError) throw error;
    throw new VerifactuCertificateStoreError("ACTIVATION_FAILED");
  }

  const staleObjectCleanupPending = Boolean(
    activation.previousObjectPath &&
      activation.previousObjectPath !== objectPath &&
      !(await repository.removeEncryptedEnvelope(activation.previousObjectPath)),
  );
  return {
    bindingId: activation.bindingId,
    bindingVersion: activation.bindingVersion,
    issuerNif: scope.issuerNif,
    staleObjectCleanupPending,
  };
}

export async function resolveVerifactuCertificate(input: {
  userId: string;
  issuerNif: string;
  reason: string;
  repository?: VerifactuCertificateRepository;
  kek?: Buffer;
  now?: Date;
  inspectCertificate?: (input: {
    secret: VerifactuCertificateSecret;
    issuerNif: string;
    now?: Date;
  }) => VerifactuCertificateInspection;
}): Promise<{
  bindingId: string;
  bindingVersion: number;
  certificateChannel: AeatCertificateChannel;
  certificate: VerifactuCertificateConfig;
}> {
  const scope = normalizeScope(input);
  const reason = normalizeReason(input.reason);
  const repository =
    input.repository ?? createSupabaseVerifactuCertificateRepository();
  const metadata = await repository.loadActiveBinding(scope);
  if (!metadata) {
    throw new VerifactuCertificateStoreError("BINDING_NOT_FOUND");
  }
  if (
    metadata.userId.toLowerCase() !== scope.userId ||
    metadata.issuerNif !== scope.issuerNif
  ) {
    throw new VerifactuCertificateStoreError("BINDING_INVALID");
  }

  const serialized = await repository.downloadEncryptedEnvelope(
    metadata.objectPath,
  );
  let certificate: VerifactuCertificateConfig;
  try {
    certificate = decryptVerifactuCertificate({
      envelope: parseVerifactuCertificateEnvelope(serialized),
      binding: {
        bindingId: metadata.envelopeId,
        ...scope,
        environment: "test",
      },
      kek: input.kek,
    });
  } catch {
    throw new VerifactuCertificateStoreError("CERTIFICATE_INTEGRITY_FAILED");
  }
  if (certificateP12Sha256(certificate.p12Base64) !== metadata.p12Sha256) {
    throw new VerifactuCertificateStoreError("CERTIFICATE_INTEGRITY_FAILED");
  }
  let inspection: VerifactuCertificateInspection;
  try {
    inspection = (input.inspectCertificate ?? inspectVerifactuCertificate)({
      secret: certificate,
      issuerNif: scope.issuerNif,
      now: input.now,
    });
  } catch {
    throw new VerifactuCertificateStoreError("CERTIFICATE_INTEGRITY_FAILED");
  }
  if (
    inspection.fingerprintSha256 !== metadata.certificateFingerprintSha256 ||
    Date.parse(inspection.validFrom) !==
      Date.parse(metadata.certificateValidFrom) ||
    Date.parse(inspection.validTo) !== Date.parse(metadata.certificateValidTo)
  ) {
    throw new VerifactuCertificateStoreError("CERTIFICATE_INTEGRITY_FAILED");
  }

  await repository.markBindingUsed({
    bindingId: metadata.id,
    ...scope,
    reason,
  });
  return {
    bindingId: metadata.id,
    bindingVersion: metadata.bindingVersion,
    certificateChannel: metadata.certificateChannel,
    certificate,
  };
}

export async function revokeVerifactuCertificate(input: {
  userId: string;
  issuerNif: string;
  reason: string;
  repository?: VerifactuCertificateRepository;
}): Promise<{
  bindingId: string;
  encryptedObjectCleanupPending: boolean;
}> {
  const scope = normalizeScope(input);
  const reason = normalizeReason(input.reason);
  const repository =
    input.repository ?? createSupabaseVerifactuCertificateRepository();
  const revoked = await repository.revokeBinding({ ...scope, reason });
  return {
    bindingId: revoked.bindingId,
    encryptedObjectCleanupPending: !(await repository.removeEncryptedEnvelope(
      revoked.objectPath,
    )),
  };
}
