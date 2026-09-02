import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildDocumentSnapshot } from "@/lib/document-integrity/snapshots";
import { DEFAULT_PROFILE, type BusinessProfile, type Document } from "@/lib/types";

import type { AeatSubmitResult } from "./aeat-submit";
import type {
  CentralVerifactuAttemptCompletion,
  CentralVerifactuLedgerRepository,
  CentralVerifactuRecordStatus,
  CentralVerifactuStoredRecord,
} from "./central-ledger";
import type {
  CentralInvoiceVerifactuSource,
  CentralVerifactuRecordCandidate,
} from "./central-source";
import {
  type CentralVerifactuSubmissionDependencies,
  CentralVerifactuSubmissionError,
  submitCentralInvoiceToAeatPreproduction,
} from "./central-submission-service";

const USER_ID = "1bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const LOCAL_DOCUMENT_ID = "synthetic-central-invoice-1";
const CENTRAL_DOCUMENT_ID = "2bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const CENTRAL_IDENTITY_ID = "3bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const RECORD_ID = "4bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const BINDING_ID = "5bb4023e-97de-4960-9b35-27a3a8a3a0f5";
const NIF = "B12345674";

const profile: BusinessProfile = {
  ...DEFAULT_PROFILE,
  name: "Empresa emisora sintetica",
  nif: NIF,
  address: "Calle de prueba 1",
  city: "Madrid",
  postalCode: "28001",
};
const document: Document = {
  id: LOCAL_DOCUMENT_ID,
  type: "factura",
  number: "F-2026-0001",
  date: "2026-09-02",
  client: { name: "Cliente sintetico", nif: "X0000000T" },
  items: [
    {
      id: "line-1",
      description: "Servicio sintetico",
      quantity: 1,
      unitPrice: 100,
      ivaPercent: 21,
    },
  ],
  status: "enviado",
  createdAt: "2026-09-02T08:00:00.000Z",
  updatedAt: "2026-09-02T08:00:00.000Z",
};
const source: CentralInvoiceVerifactuSource = {
  centralDocumentId: CENTRAL_DOCUMENT_ID,
  centralIdentityId: CENTRAL_IDENTITY_ID,
  centralKind: "invoice",
  environment: "test",
  localDocumentId: LOCAL_DOCUMENT_ID,
  issuerNif: NIF,
  fullNumber: document.number,
  centralIssuedAt: document.createdAt,
  emittedSnapshot: buildDocumentSnapshot(document, profile, {
    capturedAt: document.createdAt,
  }),
  emittedHash: `sha256:${"a".repeat(64)}`,
};

function env(enabled = true): Record<string, string> {
  return enabled
    ? {
        VERIFACTU_AEAT_PREPRODUCTION_ENABLED: "true",
        VERIFACTU_AEAT_PREPRODUCTION_USER_IDS: USER_ID,
        VERIFACTU_AEAT_PREPRODUCTION_DOCUMENT_IDS: LOCAL_DOCUMENT_ID,
        VERIFACTU_ENVIRONMENT: "test",
      }
    : {};
}

class MemoryLedger implements CentralVerifactuLedgerRepository {
  candidate: CentralVerifactuRecordCandidate | null = null;
  record: CentralVerifactuStoredRecord | null = null;
  attemptNumber = 0;
  attemptId: string | null = null;
  bindingId = BINDING_ID;
  bindingVersion = 1;
  endpointUrl = "https://prewww1.aeat.es/wlpl/TIKE-CONT/ws/SistemaFacturacion/VerifactuSOAP";
  prepareCalls = 0;
  queueCalls = 0;
  completeCalls: CentralVerifactuAttemptCompletion[] = [];

  async readSource() {
    return source;
  }

  async loadExistingRecord() {
    return this.record;
  }

  async loadChain() {
    return null;
  }

  async prepareRecord(input: Parameters<CentralVerifactuLedgerRepository["prepareRecord"]>[0]) {
    this.prepareCalls += 1;
    this.candidate = input.candidate;
    this.bindingId = input.certificateBindingId;
    this.bindingVersion = input.certificateBindingVersion;
    this.endpointUrl = input.endpointUrl;
    this.attemptNumber = 1;
    this.attemptId = "6bb4023e-97de-4960-9b35-27a3a8a3a0f5";
    return {
      resultStatus: "prepared" as const,
      recordId: RECORD_ID,
      attemptId: this.attemptId,
      recordStatus: "prepared" as const,
    };
  }

  async queueRetry() {
    this.queueCalls += 1;
    this.attemptNumber += 1;
    this.attemptId = `6bb4023e-97de-4960-9b35-27a3a8a3a0f${this.attemptNumber}`;
    return {
      resultStatus: "retry_queued" as const,
      attemptId: this.attemptId,
      attemptNumber: this.attemptNumber,
    };
  }

  async claimAttempt() {
    if (!this.candidate || !this.attemptId) throw new Error("not prepared");
    if (this.record) this.record.status = "sending";
    return {
      recordId: RECORD_ID,
      attemptId: this.attemptId,
      leaseToken: "7bb4023e-97de-4960-9b35-27a3a8a3a0f5",
      endpointUrl: this.endpointUrl,
      xml: this.candidate.xml,
      xmlSha256: this.candidate.xmlSha256,
      issuerNif: NIF,
      certificateBindingId: this.bindingId,
      certificateBindingVersion: this.bindingVersion,
    };
  }

  async completeAttempt(input: CentralVerifactuAttemptCompletion) {
    if (!this.candidate) throw new Error("not prepared");
    this.completeCalls.push(input);
    const status: CentralVerifactuRecordStatus =
      input.outcome === "accepted" || input.outcome === "accepted_duplicate"
        ? "accepted"
        : input.outcome === "accepted_with_errors"
          ? "accepted_with_errors"
          : input.outcome === "rejected"
            ? "rejected"
            : "delivery_unknown";
    this.record = {
      id: RECORD_ID,
      centralIdentityId: CENTRAL_IDENTITY_ID,
      issuerNif: NIF,
      status,
      recordHash: this.candidate.recordHash,
      xml: this.candidate.xml,
      xmlSha256: this.candidate.xmlSha256,
      qrUrl: this.candidate.qrUrl,
      csv: input.csv,
      aeatEstadoEnvio: input.estadoEnvio,
      aeatEstadoRegistro: input.estadoRegistro,
      aeatDuplicateState: input.duplicateState,
    };
    return {
      recordId: RECORD_ID,
      recordStatus: status,
      completedAt: "2026-09-02T10:00:01.000Z",
    };
  }
}

function dependencies(
  ledger: MemoryLedger,
  submit: NonNullable<CentralVerifactuSubmissionDependencies["submit"]>,
) {
  return {
    ledger,
    env: env(),
    now: () => new Date("2026-09-02T08:00:00.000Z"),
    producerConfigComplete: () => true,
    validateXml: async () => true,
    resolveCertificate: async () => ({
      bindingId: BINDING_ID,
      bindingVersion: 1,
      certificateChannel: "personal" as const,
      certificate: {
        p12Base64: Buffer.from("synthetic-p12").toString("base64"),
        password: "synthetic-password",
      },
    }),
    submit,
  };
}

async function errorCode(action: () => Promise<unknown>) {
  try {
    await action();
    return undefined;
  } catch (error) {
    return error instanceof CentralVerifactuSubmissionError
      ? error.code
      : undefined;
  }
}

describe("central VeriFactu preproduction submission", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("is closed unless both the user and exact document are allowlisted", async () => {
    const ledger = new MemoryLedger();
    expect(
      await errorCode(() =>
        submitCentralInvoiceToAeatPreproduction({
          userId: USER_ID,
          localDocumentId: LOCAL_DOCUMENT_ID,
          dependencies: {
            ...dependencies(ledger, vi.fn()),
            env: env(false),
          },
        }),
      ),
    ).toBe("PREPRODUCTION_DISABLED");
    expect(ledger.prepareCalls).toBe(0);
  });

  it("persists, claims and confirms one accepted test record", async () => {
    const ledger = new MemoryLedger();
    const submit = vi.fn().mockResolvedValue({
      ok: true,
      outcome: "accepted",
      httpStatus: 200,
      csv: "CSV-TEST-1",
      estadoEnvio: "Correcto",
      estadoRegistro: "Correcta",
      rawResponse: "<CSV>CSV-TEST-1</CSV>",
    } satisfies AeatSubmitResult);

    const result = await submitCentralInvoiceToAeatPreproduction({
      userId: USER_ID,
      localDocumentId: LOCAL_DOCUMENT_ID,
      dependencies: dependencies(ledger, submit),
    });

    expect(result).toMatchObject({
      ok: true,
      status: "accepted",
      recordId: RECORD_ID,
      csv: "CSV-TEST-1",
    });
    expect(ledger.prepareCalls).toBe(1);
    expect(ledger.completeCalls[0]).toMatchObject({
      outcome: "accepted",
      responseSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("retries an ambiguous delivery with the exact same immutable XML", async () => {
    const ledger = new MemoryLedger();
    const submittedXml: string[] = [];
    const submit = vi.fn(async (input: { xml: string }) => {
      submittedXml.push(input.xml);
      if (submittedXml.length === 1) {
        return {
          ok: false,
          outcome: "delivery_unknown",
          errorCode: "AEAT_TRANSPORT_ERROR",
          errorMessage: "Unknown delivery",
        } satisfies AeatSubmitResult;
      }
      return {
        ok: true,
        outcome: "accepted_duplicate",
        httpStatus: 200,
        csv: "CSV-RECOVERED",
        estadoEnvio: "ParcialmenteCorrecto",
        estadoRegistro: "Incorrecto",
        duplicateState: "Correcta",
        rawResponse: "<CSV>CSV-RECOVERED</CSV>",
      } satisfies AeatSubmitResult;
    });
    const deps = dependencies(ledger, submit);

    const first = await submitCentralInvoiceToAeatPreproduction({
      userId: USER_ID,
      localDocumentId: LOCAL_DOCUMENT_ID,
      dependencies: deps,
    });
    expect(first).toMatchObject({ ok: false, status: "delivery_unknown" });

    const second = await submitCentralInvoiceToAeatPreproduction({
      userId: USER_ID,
      localDocumentId: LOCAL_DOCUMENT_ID,
      dependencies: deps,
    });
    expect(second).toMatchObject({
      ok: true,
      status: "accepted_duplicate",
      csv: "CSV-RECOVERED",
    });
    expect(ledger.prepareCalls).toBe(1);
    expect(ledger.queueCalls).toBe(1);
    expect(submittedXml).toHaveLength(2);
    expect(submittedXml[1]).toBe(submittedXml[0]);
  });

  it("never resends an already accepted identity", async () => {
    const ledger = new MemoryLedger();
    ledger.record = {
      id: RECORD_ID,
      centralIdentityId: CENTRAL_IDENTITY_ID,
      issuerNif: NIF,
      status: "accepted",
      recordHash: "A".repeat(64),
      xml: "<accepted/>",
      xmlSha256: "a".repeat(64),
      qrUrl: "https://prewww2.aeat.es/qr",
      csv: "CSV-EXISTING",
      aeatEstadoEnvio: "Correcto",
      aeatEstadoRegistro: "Correcta",
      aeatDuplicateState: null,
    };
    const submit = vi.fn();

    const result = await submitCentralInvoiceToAeatPreproduction({
      userId: USER_ID,
      localDocumentId: LOCAL_DOCUMENT_ID,
      dependencies: dependencies(ledger, submit),
    });
    expect(result).toMatchObject({
      ok: true,
      status: "already_accepted",
      csv: "CSV-EXISTING",
    });
    expect(submit).not.toHaveBeenCalled();
    expect(ledger.prepareCalls).toBe(0);
  });
});
