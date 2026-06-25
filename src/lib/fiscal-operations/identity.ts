import {
  assertIssuerAndNumSerieExist,
  assertIssueDateExists,
  normalizeFiscalEnvironment,
} from "./operation-guards";
import type {
  FiscalEnvironment,
  FiscalInvoiceIdentity,
} from "./types";
import type { ServerDocumentRecord } from "@/lib/server-documents/types";

function normalizeIssuerNif(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeNumserie(value: string): string {
  return value.trim();
}

function normalizeFechaExpedicion(value: string): string {
  const normalized = value.trim();
  const datePrefix = normalized.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  return datePrefix ?? normalized;
}

export function buildFiscalInvoiceIdentity(
  document: ServerDocumentRecord,
  environment: FiscalEnvironment | string,
): FiscalInvoiceIdentity {
  const fiscalEnvironment = normalizeFiscalEnvironment(environment);
  const { issuerNif, numserie } = assertIssuerAndNumSerieExist(document);
  const issueDate = assertIssueDateExists(document);

  return {
    environment: fiscalEnvironment,
    issuerNif: normalizeIssuerNif(issuerNif),
    numserie: normalizeNumserie(numserie),
    fechaExpedicion: normalizeFechaExpedicion(issueDate),
  };
}
