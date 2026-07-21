import type { DocumentReadingOutcomeV1 } from "@/lib/document-reading/contracts.v1";
import { readExpenseDocumentLocallyV1 } from "./local-document-reader-adapter.v1";

export const EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_SCHEMA_VERSION_V1 = 1 as const;
export const EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_VERSION_V1 = "1.0.0" as const;

export interface ExpenseLocalDocumentReaderShadowResultV1 {
  readonly schemaVersion: 1;
  readonly shadowVersion: "1.0.0";
  readonly mode: "SHADOW";
  readonly reading: DocumentReadingOutcomeV1;
  readonly existingResultPolicy: "UNCHANGED";
  readonly mutationPerformed: false;
  readonly providerCalled: false;
  readonly persistencePolicy: "DO_NOT_PERSIST";
  readonly promotionPolicy: "BLOCKED";
}

interface ExpenseLocalDocumentReaderShadowDependenciesV1 {
  readonly readDocument: (value: unknown) => Promise<DocumentReadingOutcomeV1>;
}

const PRODUCTION_DEPENDENCIES: ExpenseLocalDocumentReaderShadowDependenciesV1 =
  Object.freeze({
    readDocument: readExpenseDocumentLocallyV1,
  });

export async function runExpenseLocalDocumentReaderShadowV1(
  request: unknown,
): Promise<ExpenseLocalDocumentReaderShadowResultV1> {
  return runWithDependencies(request, PRODUCTION_DEPENDENCIES);
}

async function runWithDependencies(
  request: unknown,
  dependencies: ExpenseLocalDocumentReaderShadowDependenciesV1,
): Promise<ExpenseLocalDocumentReaderShadowResultV1> {
  const reading = await dependencies.readDocument(request);
  return Object.freeze({
    schemaVersion: EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_SCHEMA_VERSION_V1,
    shadowVersion: EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_VERSION_V1,
    mode: "SHADOW",
    reading,
    existingResultPolicy: "UNCHANGED",
    mutationPerformed: false,
    providerCalled: false,
    persistencePolicy: "DO_NOT_PERSIST",
    promotionPolicy: "BLOCKED",
  });
}

export const EXPENSE_LOCAL_DOCUMENT_READER_SHADOW_TEST_SEAM =
  process.env.NODE_ENV === "test"
    ? Object.freeze({ runWithDependencies })
    : null;
