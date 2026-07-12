import type {
  AppDataDurabilityBlockedReason,
  AppDataDurabilityResult,
  AppDataTransition,
} from "./app-data-durability";
import {
  prepareReceiptGeneration,
  type ReceiptGenerationBlockedReason,
} from "./receipts";
import type { AppData, Document } from "./types";

export type ReceiptGenerationCommandResult =
  | { status: "created"; receipt: Document; data: AppData }
  | {
      status: "existing";
      receipt: Document;
      integrityBlocked: boolean;
    }
  | {
      status: "blocked";
      reason: ReceiptGenerationBlockedReason | AppDataDurabilityBlockedReason;
    }
  | { status: "indeterminate"; reason: "storage_state_unknown" };

export interface ReceiptGenerationCommandInput {
  expected: AppData;
  invoiceId: string;
  now: string;
  createId: () => string;
  commit: (
    expected: AppData,
    build: (previous: AppData) => AppDataTransition<Document>,
  ) => AppDataDurabilityResult<Document>;
}

/**
 * Orquesta preparación + persistencia sin publicar memoria por su cuenta.
 * El callback `commit` conserva la única frontera durable y debe publicar el
 * resultado únicamente cuando devuelve `applied`.
 */
export function runReceiptGenerationCommand(
  input: ReceiptGenerationCommandInput,
): ReceiptGenerationCommandResult {
  let prepared: ReturnType<typeof prepareReceiptGeneration>;
  try {
    prepared = prepareReceiptGeneration(input.expected, input.invoiceId, {
      now: input.now,
      createId: input.createId,
    });
  } catch {
    return { status: "blocked", reason: "source_invalid" };
  }

  if (prepared.status === "existing") {
    return {
      status: "existing",
      receipt: prepared.receipt,
      integrityBlocked: prepared.integrityBlocked,
    };
  }
  if (prepared.status === "blocked") return prepared;

  let persisted: AppDataDurabilityResult<Document>;
  try {
    persisted = input.commit(input.expected, (previous) => {
      if (previous !== input.expected) {
        throw new Error("La precondición durable del recibo cambió.");
      }
      return { data: prepared.data, value: prepared.receipt };
    });
  } catch {
    return { status: "indeterminate", reason: "storage_state_unknown" };
  }

  if (persisted.status === "applied") {
    return {
      status: "created",
      receipt: persisted.value,
      data: persisted.data,
    };
  }
  return persisted;
}
