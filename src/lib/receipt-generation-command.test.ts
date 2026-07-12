import { describe, expect, it, vi } from "vitest";
import { commitAppDataDurably } from "./app-data-durability";
import { issueDocument, markDocumentPaid } from "./document-integrity";
import {
  runReceiptGenerationCommand,
  type ReceiptGenerationCommandInput,
} from "./receipt-generation-command";
import { inspectReceiptGeneration } from "./receipts";
import { EMPTY_DATA, type AppData, type Document } from "./types";

const NOW = "2026-07-12T18:00:00.000Z";
const PROFILE = {
  ...EMPTY_DATA.profile,
  name: "Profesional Test",
  nif: "12345678Z",
  address: "Calle Mayor 1",
  postalCode: "28001",
  city: "Madrid",
};

function paidInvoice(): Document {
  return markDocumentPaid(
    issueDocument(
      {
        id: "invoice-command",
        type: "factura",
        number: "F-2026-0400",
        date: "2026-07-12",
        client: {
          name: "Cliente Test",
          nif: "X1234567L",
          address: "Calle Cliente 2",
          postalCode: "28002",
          city: "Madrid",
        },
        items: [
          {
            id: "invoice-line",
            description: "Servicio",
            quantity: 1,
            unitPrice: 100,
            ivaPercent: 21,
          },
        ],
        status: "borrador",
        documentLifecycle: "draft",
        integrityLock: "unlocked",
        createdAt: NOW,
        updatedAt: NOW,
      },
      PROFILE,
      NOW,
    ),
    NOW,
  );
}

function appData(): AppData {
  return {
    ...EMPTY_DATA,
    profile: {
      ...PROFILE,
      numbering: {
        ...PROFILE.numbering,
        lastSequence: { ...PROFILE.numbering.lastSequence },
        formats: {
          factura: { ...PROFILE.numbering.formats.factura },
          factura_rectificativa: {
            ...PROFILE.numbering.formats.factura_rectificativa,
          },
          presupuesto: { ...PROFILE.numbering.formats.presupuesto },
          recibo: { ...PROFILE.numbering.formats.recibo },
        },
      },
    },
    documents: [paidInvoice()],
  };
}

function ids(): () => string {
  const values = ["receipt-command", "receipt-command-line"];
  return () => values.shift() ?? crypto.randomUUID();
}

function commandInput(
  expected: AppData,
  commit: ReceiptGenerationCommandInput["commit"],
): ReceiptGenerationCommandInput {
  return {
    expected,
    invoiceId: expected.documents[0].id,
    now: NOW,
    createId: ids(),
    commit,
  };
}

describe("runReceiptGenerationCommand", () => {
  it("devuelve creado solo después de persistir y permite rehidratar el vínculo", () => {
    const expected = appData();
    let current = expected;
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const commit: ReceiptGenerationCommandInput["commit"] = (
      baseline,
      build,
    ) => {
      const result = commitAppDataDurably({
        expected: baseline,
        getCurrent: () => current,
        build,
        persist,
      });
      if (result.status === "applied") current = result.data;
      return result;
    };

    const result = runReceiptGenerationCommand(commandInput(expected, commit));

    expect(result.status).toBe("created");
    expect(persist).toHaveBeenCalledTimes(1);
    expect(expected.documents).toHaveLength(1);
    expect(current.documents).toHaveLength(2);
    const reloaded = JSON.parse(JSON.stringify(current)) as AppData;
    expect(
      inspectReceiptGeneration(reloaded.documents, expected.documents[0].id),
    ).toMatchObject({
      status: "existing",
      receipt: { id: "receipt-command" },
      integrityBlocked: false,
    });
  });

  it.each([
    { status: "blocked", reason: "quota_exceeded" } as const,
    { status: "blocked", reason: "storage_unavailable" } as const,
    { status: "blocked", reason: "verification_failed" } as const,
    {
      status: "indeterminate",
      reason: "storage_state_unknown",
    } as const,
  ])("no publica memoria cuando persistencia devuelve $reason", (failure) => {
    const expected = appData();
    let current = expected;
    const commit: ReceiptGenerationCommandInput["commit"] = (
      baseline,
      build,
    ) => {
      const result = commitAppDataDurably({
        expected: baseline,
        getCurrent: () => current,
        build,
        persist: () => failure,
      });
      if (result.status === "applied") current = result.data;
      return result;
    };

    expect(
      runReceiptGenerationCommand(commandInput(expected, commit)),
    ).toEqual(failure);
    expect(current).toBe(expected);
    expect(current.documents).toHaveLength(1);
  });

  it("bloquea una precondición stale antes de persistir", () => {
    const expected = appData();
    const current = { ...expected };
    const persist = vi.fn();
    const commit: ReceiptGenerationCommandInput["commit"] = (
      baseline,
      build,
    ) =>
      commitAppDataDurably({
        expected: baseline,
        getCurrent: () => current,
        build,
        persist,
      });

    expect(
      runReceiptGenerationCommand(commandInput(expected, commit)),
    ).toEqual({ status: "blocked", reason: "stale_precondition" });
    expect(persist).not.toHaveBeenCalled();
  });

  it("hace idempotente el doble envío y no persiste un segundo recibo", () => {
    let current = appData();
    const persist = vi.fn(() => ({ status: "applied" }) as const);
    const commit: ReceiptGenerationCommandInput["commit"] = (
      baseline,
      build,
    ) => {
      const result = commitAppDataDurably({
        expected: baseline,
        getCurrent: () => current,
        build,
        persist,
      });
      if (result.status === "applied") current = result.data;
      return result;
    };

    expect(
      runReceiptGenerationCommand(commandInput(current, commit)).status,
    ).toBe("created");
    expect(
      runReceiptGenerationCommand(commandInput(current, commit)),
    ).toMatchObject({
      status: "existing",
      receipt: { id: "receipt-command" },
    });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(current.documents).toHaveLength(2);
  });

  it("trata un throw inesperado del commit como estado de storage desconocido", () => {
    const expected = appData();
    const commit: ReceiptGenerationCommandInput["commit"] = vi.fn(
      () => {
        throw new Error("fallo inesperado");
      },
    );

    expect(
      runReceiptGenerationCommand(commandInput(expected, commit)),
    ).toEqual({
      status: "indeterminate",
      reason: "storage_state_unknown",
    });
    expect(expected.documents).toHaveLength(1);
  });
});
