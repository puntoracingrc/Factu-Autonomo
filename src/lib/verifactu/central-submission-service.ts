import { createHash } from "node:crypto";

import {
  submitRegistroToAeatPreproduction,
  type AeatSubmitResult,
} from "./aeat-submit";
import {
  createSupabaseCentralVerifactuLedgerRepository,
  CentralVerifactuLedgerError,
  type CentralVerifactuLedgerRepository,
  type CentralVerifactuStoredRecord,
} from "./central-ledger";
import { buildCentralVerifactuRecordCandidate } from "./central-source";
import {
  resolveVerifactuCertificate,
  VerifactuCertificateStoreError,
} from "./certificate-store";
import {
  evaluateVerifactuPreproductionActivation,
  getOfficialAeatEndpointUrl,
  type AeatCertificateChannel,
  type VerifactuCertificateConfig,
} from "./config";
import { validateVerifactuXmlOffline } from "./official-xsd-validator";
import { getProducerConfigStatus } from "./producer-config";

const MAX_CHAIN_RETRIES = 3;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CentralVerifactuSubmissionResult =
  | {
      ok: true;
      status: "accepted" | "accepted_duplicate" | "already_accepted";
      recordId: string;
      fullNumber: string;
      csv: string;
      qrUrl: string;
    }
  | {
      ok: false;
      status:
        | "in_progress"
        | "accepted_with_errors"
        | "rejected"
        | "delivery_unknown";
      recordId: string;
      fullNumber: string;
      csv?: string;
      errorCode?: string;
      errorMessage: string;
    };

export type CentralVerifactuSubmissionErrorCode =
  | "INVALID_REQUEST"
  | "PREPRODUCTION_DISABLED"
  | "PRODUCER_CONFIG_INCOMPLETE"
  | "CERTIFICATE_UNAVAILABLE"
  | "XML_PREFLIGHT_FAILED"
  | "LEDGER_FAILURE"
  | "ATTEMPT_MISMATCH";

export class CentralVerifactuSubmissionError extends Error {
  constructor(readonly code: CentralVerifactuSubmissionErrorCode) {
    super(code);
    this.name = "CentralVerifactuSubmissionError";
  }
}

export interface CentralVerifactuSubmissionDependencies {
  ledger?: CentralVerifactuLedgerRepository;
  env?: Record<string, string | undefined>;
  now?: () => Date;
  producerConfigComplete?: () => boolean;
  validateXml?: (xml: string) => Promise<boolean>;
  resolveCertificate?: (input: {
    userId: string;
    issuerNif: string;
    reason: string;
  }) => Promise<{
    bindingId: string;
    bindingVersion: number;
    certificateChannel: AeatCertificateChannel;
    certificate: VerifactuCertificateConfig;
  }>;
  submit?: (input: {
    xml: string;
    certificate: VerifactuCertificateConfig;
    certificateChannel: AeatCertificateChannel;
    endpointUrl: string;
  }) => Promise<AeatSubmitResult>;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeText(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function resultFromStoredRecord(
  record: CentralVerifactuStoredRecord,
  fullNumber: string,
): CentralVerifactuSubmissionResult {
  if (record.status === "accepted" && record.csv) {
    return {
      ok: true,
      status: "already_accepted",
      recordId: record.id,
      fullNumber,
      csv: record.csv,
      qrUrl: record.qrUrl,
    };
  }
  if (record.status === "accepted_with_errors") {
    return {
      ok: false,
      status: "accepted_with_errors",
      recordId: record.id,
      fullNumber,
      ...(record.csv ? { csv: record.csv } : {}),
      errorMessage:
        "AEAT aceptó el registro con incidencias. Debe revisarse antes de continuar.",
    };
  }
  if (record.status === "rejected") {
    return {
      ok: false,
      status: "rejected",
      recordId: record.id,
      fullNumber,
      errorMessage:
        "AEAT rechazó el registro. El material queda bloqueado para revisión.",
    };
  }
  return {
    ok: false,
    status: "in_progress",
    recordId: record.id,
    fullNumber,
    errorMessage: "Ya hay un intento de envío en curso.",
  };
}

async function defaultValidateXml(xml: string): Promise<boolean> {
  const result = await validateVerifactuXmlOffline({
    xml,
    schema: "registration",
    syntheticOnly: true,
  });
  return result.accepted;
}

function validateRequest(userId: string, localDocumentId: string) {
  if (
    !UUID_PATTERN.test(userId) ||
    !localDocumentId.trim() ||
    localDocumentId !== localDocumentId.trim() ||
    localDocumentId.length > 200
  ) {
    throw new CentralVerifactuSubmissionError("INVALID_REQUEST");
  }
}

export async function submitCentralInvoiceToAeatPreproduction(input: {
  userId: string;
  localDocumentId: string;
  dependencies?: CentralVerifactuSubmissionDependencies;
}): Promise<CentralVerifactuSubmissionResult> {
  validateRequest(input.userId, input.localDocumentId);
  const dependencies = input.dependencies ?? {};
  const activation = evaluateVerifactuPreproductionActivation({
    userId: input.userId,
    localDocumentId: input.localDocumentId,
    env: dependencies.env,
  });
  if (!activation.enabled) {
    throw new CentralVerifactuSubmissionError("PREPRODUCTION_DISABLED");
  }
  const producerComplete =
    dependencies.producerConfigComplete?.() ?? getProducerConfigStatus().complete;
  if (!producerComplete) {
    throw new CentralVerifactuSubmissionError("PRODUCER_CONFIG_INCOMPLETE");
  }

  const ledger =
    dependencies.ledger ?? createSupabaseCentralVerifactuLedgerRepository();
  try {
    const source = await ledger.readSource({
      userId: input.userId,
      localDocumentId: input.localDocumentId,
    });
    const existing = await ledger.loadExistingRecord({
      userId: input.userId,
      centralIdentityId: source.centralIdentityId,
    });
    if (
      existing?.status === "accepted" ||
      existing?.status === "accepted_with_errors" ||
      existing?.status === "rejected"
    ) {
      return resultFromStoredRecord(existing, source.fullNumber);
    }

    let candidate = null;
    if (!existing) {
      const chain = await ledger.loadChain({
        userId: input.userId,
        issuerNif: source.issuerNif,
      });
      candidate = await buildCentralVerifactuRecordCandidate({
        source,
        chain,
        now: dependencies.now?.(),
      });
      if (!(await (dependencies.validateXml ?? defaultValidateXml)(candidate.xml))) {
        throw new CentralVerifactuSubmissionError("XML_PREFLIGHT_FAILED");
      }
    }

    const resolveCertificate =
      dependencies.resolveCertificate ?? resolveVerifactuCertificate;
    let certificate;
    try {
      certificate = await resolveCertificate({
        userId: input.userId,
        issuerNif: source.issuerNif,
        reason: `AEAT preproduction ${source.centralIdentityId}`,
      });
    } catch (error) {
      if (error instanceof VerifactuCertificateStoreError) {
        throw new CentralVerifactuSubmissionError("CERTIFICATE_UNAVAILABLE");
      }
      throw error;
    }
    const endpointUrl = getOfficialAeatEndpointUrl(
      "test",
      certificate.certificateChannel,
    );

    let recordId = existing?.id ?? "";
    let attemptId: string | null = null;
    if (existing) {
      const retry = await ledger.queueRetry({
        userId: input.userId,
        recordId: existing.id,
        certificateBindingId: certificate.bindingId,
        certificateBindingVersion: certificate.bindingVersion,
        endpointUrl,
      });
      if (retry.resultStatus === "already_accepted") {
        const accepted = await ledger.loadExistingRecord({
          userId: input.userId,
          centralIdentityId: source.centralIdentityId,
        });
        if (!accepted) throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
        return resultFromStoredRecord(accepted, source.fullNumber);
      }
      if (retry.resultStatus === "already_sending") {
        return resultFromStoredRecord(existing, source.fullNumber);
      }
      attemptId = retry.attemptId;
    } else {
      for (let attempt = 1; attempt <= MAX_CHAIN_RETRIES; attempt += 1) {
        try {
          const prepared = await ledger.prepareRecord({
            userId: input.userId,
            source,
            certificateBindingId: certificate.bindingId,
            certificateBindingVersion: certificate.bindingVersion,
            candidate: candidate!,
            endpointUrl,
          });
          recordId = prepared.recordId;
          attemptId = prepared.attemptId;
          if (prepared.resultStatus === "replayed_accepted") {
            const accepted = await ledger.loadExistingRecord({
              userId: input.userId,
              centralIdentityId: source.centralIdentityId,
            });
            if (!accepted) {
              throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
            }
            return resultFromStoredRecord(accepted, source.fullNumber);
          }
          if (prepared.resultStatus !== "prepared") {
            const retry = await ledger.queueRetry({
              userId: input.userId,
              recordId,
              certificateBindingId: certificate.bindingId,
              certificateBindingVersion: certificate.bindingVersion,
              endpointUrl,
            });
            if (retry.resultStatus === "already_accepted") {
              const accepted = await ledger.loadExistingRecord({
                userId: input.userId,
                centralIdentityId: source.centralIdentityId,
              });
              if (!accepted) {
                throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
              }
              return resultFromStoredRecord(accepted, source.fullNumber);
            }
            if (retry.resultStatus === "already_sending") {
              const replay = await ledger.loadExistingRecord({
                userId: input.userId,
                centralIdentityId: source.centralIdentityId,
              });
              if (!replay) {
                throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
              }
              return resultFromStoredRecord(replay, source.fullNumber);
            }
            attemptId = retry.attemptId;
          }
          break;
        } catch (error) {
          if (
            error instanceof CentralVerifactuLedgerError &&
            error.code === "CHAIN_CONFLICT" &&
            attempt < MAX_CHAIN_RETRIES
          ) {
            const chain = await ledger.loadChain({
              userId: input.userId,
              issuerNif: source.issuerNif,
            });
            candidate = await buildCentralVerifactuRecordCandidate({
              source,
              chain,
              now: dependencies.now?.(),
            });
            if (
              !(await (dependencies.validateXml ?? defaultValidateXml)(
                candidate.xml,
              ))
            ) {
              throw new CentralVerifactuSubmissionError(
                "XML_PREFLIGHT_FAILED",
              );
            }
            continue;
          }
          throw error;
        }
      }
    }

    if (!recordId || !attemptId) {
      throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
    }

    let claimed;
    try {
      claimed = await ledger.claimAttempt({
        userId: input.userId,
        attemptId,
      });
    } catch (error) {
      if (
        error instanceof CentralVerifactuLedgerError &&
        error.causeCode === "55000"
      ) {
        return {
          ok: false,
          status: "in_progress",
          recordId,
          fullNumber: source.fullNumber,
          errorMessage: "Otro proceso ya está enviando este mismo registro.",
        };
      }
      throw error;
    }
    if (
      claimed.recordId !== recordId ||
      claimed.attemptId !== attemptId ||
      claimed.certificateBindingId !== certificate.bindingId ||
      claimed.certificateBindingVersion !== certificate.bindingVersion ||
      claimed.endpointUrl !== endpointUrl ||
      sha256(claimed.xml) !== claimed.xmlSha256
    ) {
      throw new CentralVerifactuSubmissionError("ATTEMPT_MISMATCH");
    }

    const aeat = await (
      dependencies.submit ?? submitRegistroToAeatPreproduction
    )({
      xml: claimed.xml,
      certificate: certificate.certificate,
      certificateChannel: certificate.certificateChannel,
      endpointUrl: claimed.endpointUrl,
    });
    const outcome =
      aeat.outcome === "not_sent" ? "delivery_unknown" : aeat.outcome;
    const rawResponse = aeat.rawResponse ?? null;
    const completion = await ledger.completeAttempt({
      userId: input.userId,
      attemptId: claimed.attemptId,
      leaseToken: claimed.leaseToken,
      outcome,
      httpStatus: aeat.httpStatus ?? null,
      csv: aeat.csv ?? null,
      estadoEnvio: aeat.estadoEnvio ?? null,
      estadoRegistro: aeat.estadoRegistro ?? null,
      duplicateState: aeat.duplicateState ?? null,
      errorCode: safeText(aeat.errorCode, 200),
      errorMessage: safeText(aeat.errorMessage, 1500),
      rawResponse,
      responseSha256: rawResponse ? sha256(rawResponse) : null,
    });

    if (outcome === "accepted" || outcome === "accepted_duplicate") {
      if (!aeat.csv || completion.recordStatus !== "accepted") {
        throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
      }
      return {
        ok: true,
        status: outcome,
        recordId: completion.recordId,
        fullNumber: source.fullNumber,
        csv: aeat.csv,
        qrUrl: existing?.qrUrl ?? candidate!.qrUrl,
      };
    }
    if (outcome === "accepted_with_errors") {
      return {
        ok: false,
        status: "accepted_with_errors",
        recordId: completion.recordId,
        fullNumber: source.fullNumber,
        ...(aeat.csv ? { csv: aeat.csv } : {}),
        errorCode: aeat.errorCode,
        errorMessage:
          aeat.errorMessage ?? "AEAT aceptó el registro con incidencias.",
      };
    }
    if (outcome === "rejected") {
      return {
        ok: false,
        status: "rejected",
        recordId: completion.recordId,
        fullNumber: source.fullNumber,
        errorCode: aeat.errorCode,
        errorMessage: aeat.errorMessage ?? "AEAT rechazó el registro.",
      };
    }
    return {
      ok: false,
      status: "delivery_unknown",
      recordId: completion.recordId,
      fullNumber: source.fullNumber,
      errorCode: aeat.errorCode,
      errorMessage:
        "No se pudo confirmar si AEAT recibió el registro. El próximo intento reutilizará exactamente el mismo XML.",
    };
  } catch (error) {
    if (error instanceof CentralVerifactuSubmissionError) throw error;
    if (error instanceof CentralVerifactuLedgerError) {
      throw new CentralVerifactuSubmissionError("LEDGER_FAILURE");
    }
    throw error;
  }
}
