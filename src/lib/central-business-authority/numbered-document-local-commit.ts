import { countersFromDocuments } from "@/lib/documents";
import {
  bumpNumberingAfterAssign,
  formatDocumentNumberWithSettings,
  normalizeNumbering,
} from "@/lib/numbering";
import type { AppData, Document, DocumentKind } from "@/lib/types";

import type {
  CentralBusinessNumberedDocumentCreateBrowserResult,
} from "./numbered-document-client";
import {
  centralBusinessReceiptServerPayload,
  materializeCentralBusinessReceipt,
} from "./central-receipt-materialization";
import { parseCentralBusinessDocumentPayload } from "./payload-parsers";

export type CentralBusinessNumberedDocumentLocalCommitErrorCode =
  | "INVALID_CONFIRMATION"
  | "MALFORMED_DOCUMENT"
  | "DOCUMENT_ID_COLLISION"
  | "DOCUMENT_NUMBER_COLLISION"
  | "RECEIPT_MATERIALIZATION_FAILED";

export class CentralBusinessNumberedDocumentLocalCommitError extends Error {
  readonly code: CentralBusinessNumberedDocumentLocalCommitErrorCode;

  constructor(
    code: CentralBusinessNumberedDocumentLocalCommitErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CentralBusinessNumberedDocumentLocalCommitError";
    this.code = code;
  }
}

export interface CentralBusinessNumberedDocumentLocalCommitTransition {
  data: AppData;
  value: Document;
  replayed: boolean;
}

function stableJson(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
    .join(",")}}`;
}

function kindForEntityType(
  entityType: "quote" | "receipt",
): Extract<DocumentKind, "presupuesto" | "recibo"> {
  return entityType === "quote" ? "presupuesto" : "recibo";
}

function assertConfirmation(
  data: AppData,
  entityType: "quote" | "receipt",
  confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
): Document {
  const payload = confirmation.documentPayload;
  const entityId =
    payload && typeof payload.id === "string" ? payload.id : "";
  const document = parseCentralBusinessDocumentPayload(
    payload,
    entityId,
    entityType,
  );
  if (!document) {
    throw new CentralBusinessNumberedDocumentLocalCommitError(
      "MALFORMED_DOCUMENT",
      "El servidor no devolvio un documento numerado valido.",
    );
  }

  const year = Number(document.date.slice(0, 4));
  const kind = kindForEntityType(entityType);
  const numbering = normalizeNumbering(data.profile.numbering);
  const expectedNumber = formatDocumentNumberWithSettings(
    kind,
    year,
    confirmation.sequence,
    numbering,
  );
  const expectedScope = numbering.formats[kind].template.includes("{year}")
    ? year
    : 0;
  const parsedDate = new Date(`${document.date}T00:00:00.000Z`);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/u.test(document.date) &&
    !Number.isNaN(parsedDate.valueOf()) &&
    parsedDate.toISOString().slice(0, 10) === document.date;
  if (
    confirmation.schema !==
      "CENTRAL_BUSINESS_NUMBERED_DOCUMENT_CLIENT_V1" ||
    confirmation.action !== "create" ||
    (confirmation.status !== "committed" &&
      confirmation.status !== "replayed") ||
    !confirmation.eventId ||
    !Number.isSafeInteger(confirmation.eventSequence) ||
    confirmation.eventSequence < 1 ||
    confirmation.entityVersion !== 1 ||
    !Number.isInteger(confirmation.sequence) ||
    confirmation.sequence < 1 ||
    confirmation.sequence > 999999 ||
    !Number.isInteger(confirmation.scopeYear) ||
    !/^[a-f0-9]{64}$/u.test(confirmation.contentHash) ||
    confirmation.fullNumber !== document.number ||
    confirmation.fullNumber !== expectedNumber ||
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !validDate ||
    confirmation.scopeYear !== expectedScope
  ) {
    throw new CentralBusinessNumberedDocumentLocalCommitError(
      "INVALID_CONFIRMATION",
      "La confirmacion numerada no coincide con la serie local.",
    );
  }

  return document;
}

export function buildCentralBusinessNumberedDocumentLocalCommit(
  data: AppData,
  entityType: "quote" | "receipt",
  confirmation: CentralBusinessNumberedDocumentCreateBrowserResult,
): CentralBusinessNumberedDocumentLocalCommitTransition {
  const document = assertConfirmation(data, entityType, confirmation);
  const sameId = data.documents.filter((entry) => entry.id === document.id);
  if (sameId.length > 1) {
    throw new CentralBusinessNumberedDocumentLocalCommitError(
      "DOCUMENT_ID_COLLISION",
      "La identidad central aparece mas de una vez en este dispositivo.",
    );
  }
  if (sameId.length === 1) {
    const comparableExisting =
      entityType === "receipt"
        ? centralBusinessReceiptServerPayload(sameId[0])
        : sameId[0];
    if (stableJson(comparableExisting) === stableJson(document)) {
      return { data, value: sameId[0], replayed: true };
    }
    throw new CentralBusinessNumberedDocumentLocalCommitError(
      "DOCUMENT_ID_COLLISION",
      "La identidad central ya existe con otro contenido local.",
    );
  }

  const numberCollision = data.documents.some(
    (entry) =>
      entry.type === document.type &&
      entry.number === document.number &&
      entry.id !== document.id,
  );
  if (numberCollision) {
    throw new CentralBusinessNumberedDocumentLocalCommitError(
      "DOCUMENT_NUMBER_COLLISION",
      "El numero confirmado por el servidor ya pertenece a otro documento local.",
    );
  }

  const year = Number(document.date.slice(0, 4));
  const kind = kindForEntityType(entityType);
  const nextNumbering = bumpNumberingAfterAssign(
    data.profile.numbering,
    kind,
    year,
    confirmation.sequence,
  );
  let value = document;
  let nextDocuments: Document[];
  if (entityType === "receipt") {
    try {
      const materialized = materializeCentralBusinessReceipt({
        data,
        receiptPayload: document,
      });
      value = materialized.receipt;
      nextDocuments = materialized.data.documents;
    } catch {
      throw new CentralBusinessNumberedDocumentLocalCommitError(
        "RECEIPT_MATERIALIZATION_FAILED",
        "El recibo central no pudo sellarse y vincularse localmente.",
      );
    }
  } else {
    nextDocuments = [...data.documents, document];
  }
  const calculatedCounters = countersFromDocuments(
    nextDocuments,
    year,
    nextNumbering,
  );
  const nextCounter = Math.max(
    data.counters[kind],
    calculatedCounters[kind],
    confirmation.sequence,
  );

  return {
    data: {
      ...data,
      profile: {
        ...data.profile,
        numbering: nextNumbering,
      },
      documents: nextDocuments,
      counters: {
        ...data.counters,
        [kind]: nextCounter,
      },
    },
    value,
    replayed: false,
  };
}
