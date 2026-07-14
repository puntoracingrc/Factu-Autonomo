import { todayISO } from "./calculations";
import type { Document, LineItem } from "./types";

export type DuplicatedDocumentDraft = Omit<
  Document,
  "id" | "number" | "createdAt" | "updatedAt"
>;

interface DuplicateDocumentOptions {
  date?: string;
  lineIdFactory?: () => string;
}

function cloneLineItem(item: LineItem, lineIdFactory: () => string): LineItem {
  return {
    ...item,
    id: lineIdFactory(),
  };
}

export function buildDuplicatedDocumentDraft(
  source: Document,
  options: DuplicateDocumentOptions = {},
): DuplicatedDocumentDraft {
  const lineIdFactory = options.lineIdFactory ?? (() => crypto.randomUUID());

  return {
    type: source.type,
    date: options.date ?? todayISO(),
    dueDate: undefined,
    customerId: source.customerId,
    client: { ...source.client },
    items: source.items.map((item) => cloneLineItem(item, lineIdFactory)),
    notes: source.notes,
    salesTerms: source.salesTerms,
    paymentTerms: source.paymentTerms,
    status: "borrador",
    documentLifecycle: "draft",
    integrityLock: "unlocked",
    deliveryStatus: "not_sent",
    paymentStatus: "not_applicable",
    acceptanceStatus: "not_applicable",
  };
}
