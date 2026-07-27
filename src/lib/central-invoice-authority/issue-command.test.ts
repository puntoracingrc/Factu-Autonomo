import { describe, expect, it } from "vitest";
import {
  buildCentralInvoiceAuthorityIssueCommand,
  CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT,
  summarizeCentralInvoiceAuthorityIssueCommand,
  type CentralInvoiceAuthorityIssueInput,
} from "./issue-command";

const baseInput: CentralInvoiceAuthorityIssueInput = {
  kind: "invoice",
  auth: {
    userId: "SYNTHETIC_ONLY_USER_A",
    deviceId: "SYNTHETIC_ONLY_DEVICE_A",
    sessionId: "SYNTHETIC_ONLY_SESSION_A",
    userIdSource: "test",
  },
  idempotencyKey: "SYNTHETIC_ONLY_ISSUE_KEY_A",
  draft: {
    localDocumentId: "SYNTHETIC_ONLY_LOCAL_DOC_A",
    expectedVersion: 3,
    draftHash: "sha256:SYNTHETIC_ONLY_DRAFT_HASH_A",
  },
  series: {
    environment: "test",
    issuerNif: "B00000000",
    seriesCode: "F-2026",
    fiscalYear: 2026,
  },
  issuedAt: "2026-07-27T09:00:00.000Z",
};

describe("central invoice authority issue command contract", () => {
  it("construye un comando server-only sin asignar numero fiscal", () => {
    const command = buildCentralInvoiceAuthorityIssueCommand(
      baseInput,
      "SYNTHETIC_ONLY_REQUEST_A",
    );

    expect(command.schema).toBe(CENTRAL_INVOICE_AUTHORITY_ISSUE_COMMAND_CONTRACT);
    expect(command.userId).toBe(baseInput.auth.userId);
    expect(command.draft.expectedVersion).toBe(3);
    expect(command.series.seriesCode).toBe("F-2026");
    expect(JSON.stringify(command)).not.toContain("sequence");
    expect(JSON.stringify(command)).not.toContain("invoiceNumber");
  });

  it("produce un requestHash estable para el mismo comando idempotente", () => {
    const first = buildCentralInvoiceAuthorityIssueCommand(
      baseInput,
      "SYNTHETIC_ONLY_REQUEST_A",
    );
    const second = buildCentralInvoiceAuthorityIssueCommand(
      { ...baseInput, auth: { ...baseInput.auth } },
      "SYNTHETIC_ONLY_REQUEST_B",
    );

    expect(first.requestHash).toBe(second.requestHash);
  });

  it("cambia el requestHash si se reutiliza la clave con otro borrador", () => {
    const first = buildCentralInvoiceAuthorityIssueCommand(baseInput);
    const conflicting = buildCentralInvoiceAuthorityIssueCommand({
      ...baseInput,
      draft: {
        ...baseInput.draft,
        draftHash: "sha256:SYNTHETIC_ONLY_OTHER_DRAFT_HASH",
      },
    });

    expect(conflicting.requestHash).not.toBe(first.requestHash);
  });

  it("exige auth derivada por servidor con dispositivo y sesion", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        auth: { ...baseInput.auth, deviceId: "" },
      }),
    ).toThrow(/dispositivo/);
  });

  it("exige clave de idempotencia estable", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        idempotencyKey: "short",
      }),
    ).toThrow(/idempotencia/);
  });

  it("exige version esperada y huella de borrador", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        draft: { ...baseInput.draft, expectedVersion: -1 },
      }),
    ).toThrow(/version esperada/);

    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        draft: { ...baseInput.draft, draftHash: "" },
      }),
    ).toThrow(/huella/);
  });

  it("exige identidad tecnica de factura rectificada", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        kind: "rectification",
      }),
    ).toThrow(/rectificada/);

    const command = buildCentralInvoiceAuthorityIssueCommand({
      ...baseInput,
      kind: "rectification",
      rectifiesIdentityId: "SYNTHETIC_ONLY_IDENTITY_A",
    });

    expect(command.safeSummary.rectification).toBe(true);
  });

  it("rechaza contenido completo o sensible dentro de campos permitidos", () => {
    expect(() =>
      buildCentralInvoiceAuthorityIssueCommand({
        ...baseInput,
        draft: { ...baseInput.draft, draftHash: "%P" + "DF raw" },
      }),
    ).toThrow(/sensible|completo/);
  });

  it("resume sin exponer NIF ni clave de idempotencia en claro", () => {
    const command = buildCentralInvoiceAuthorityIssueCommand(baseInput);
    const summary = JSON.stringify(
      summarizeCentralInvoiceAuthorityIssueCommand(command),
    );

    expect(summary).toContain("issuerNifHash");
    expect(summary).toContain("idempotencyKeyHash");
    expect(summary).not.toContain(baseInput.series.issuerNif);
    expect(summary).not.toContain(baseInput.idempotencyKey);
    expect(summary).not.toContain(baseInput.auth.sessionId);
  });
});
