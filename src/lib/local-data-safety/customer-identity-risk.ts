import { buildDocumentSafeSummary, customersFrom, documentsFrom, stringValue } from "./helpers";
import type { LocalDataDocumentSafeSummary, LocalDataSafetyAppData, LocalDataSafetyEntityLike } from "./types";

// PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1

export type CustomerIdentityRiskId =
  | "duplicate_customer_id"
  | "document_missing_customer"
  | "protected_doc_customer_mismatch"
  | "possible_duplicate_synthetic_tax_id"
  | "merged_customer_ids_conflict"
  | "incoming_customer_overwrites_current";

export interface CustomerIdentityRisk {
  id: CustomerIdentityRiskId;
  severity: "info" | "warning" | "blocked";
  ref: string;
  document?: LocalDataDocumentSafeSummary;
  message: string;
}

export interface CustomerIdentityRiskAssessment {
  marker: "PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1";
  generatedAt: string;
  risks: CustomerIdentityRisk[];
  manualReviewRequired: boolean;
  autoMergeAllowed: false;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

export interface CustomerIdentityRiskSummary {
  riskIds: CustomerIdentityRiskId[];
  highestSeverity: "info" | "warning" | "blocked";
  manualReviewRequired: boolean;
  autoMergeAllowed: false;
  applyAllowed: false;
  restoreAllowed: false;
  safe: true;
}

function entityRef(entity: LocalDataSafetyEntityLike): string {
  return stringValue(entity.id) ?? stringValue(entity.localId) ?? "SYNTHETIC_ONLY_UNKNOWN_CUSTOMER";
}

function entityName(entity: LocalDataSafetyEntityLike): string {
  return stringValue(entity.displayName) ?? stringValue(entity.name) ?? "";
}

function entityTax(entity: LocalDataSafetyEntityLike): string | undefined {
  return stringValue(entity.taxId) ?? stringValue(entity.nif);
}

function mergedIds(entity: LocalDataSafetyEntityLike): string[] {
  const value = entity.mergedCustomerIds;
  return Array.isArray(value) ? value.map(String) : [];
}

function addRisk(
  risks: CustomerIdentityRisk[],
  id: CustomerIdentityRiskId,
  severity: CustomerIdentityRisk["severity"],
  ref: string,
  message: string,
  document?: CustomerIdentityRisk["document"],
): void {
  const risk: CustomerIdentityRisk = { id, severity, ref, message };
  if (document) risk.document = document;
  risks.push(risk);
}

export function analyzeCustomerIdentityImportRisk(
  currentData: LocalDataSafetyAppData,
  incomingData: LocalDataSafetyAppData,
  options: { generatedAt?: string } = {},
): CustomerIdentityRiskAssessment {
  const risks: CustomerIdentityRisk[] = [];
  const currentCustomers = customersFrom(currentData);
  const incomingCustomers = customersFrom(incomingData);
  const currentById = new Map(currentCustomers.map((customer) => [entityRef(customer), customer]));
  const incomingIds = new Map<string, number>();
  const incomingTaxIds = new Map<string, string[]>();

  for (const customer of incomingCustomers) {
    const id = entityRef(customer);
    incomingIds.set(id, (incomingIds.get(id) ?? 0) + 1);
    const taxId = entityTax(customer);
    if (taxId) incomingTaxIds.set(taxId, [...(incomingTaxIds.get(taxId) ?? []), id]);
    const current = currentById.get(id);
    if (current && entityName(current) && entityName(customer) && entityName(current) !== entityName(customer)) {
      addRisk(risks, "incoming_customer_overwrites_current", "warning", id, "Incoming customer differs from current.");
    }
    for (const mergedId of mergedIds(customer)) {
      if (currentById.has(mergedId)) {
        addRisk(risks, "merged_customer_ids_conflict", "warning", mergedId, "Merged customer id conflicts with current data.");
      }
    }
  }

  for (const [id, count] of incomingIds) {
    if (count > 1) addRisk(risks, "duplicate_customer_id", "blocked", id, "Incoming backup repeats customer id.");
  }
  for (const [taxId, ids] of incomingTaxIds) {
    if (ids.length > 1) {
      addRisk(risks, "possible_duplicate_synthetic_tax_id", "warning", taxId, "Synthetic tax id appears on multiple customers.");
    }
  }

  const customerIds = new Set([...currentCustomers.map(entityRef), ...incomingCustomers.map(entityRef)]);
  for (const document of documentsFrom(incomingData)) {
    const ref = stringValue(document.customerId);
    if (!ref || !customerIds.has(ref)) {
      addRisk(
        risks,
        "document_missing_customer",
        "warning",
        ref ?? "SYNTHETIC_ONLY_MISSING_CUSTOMER",
        "Document references a missing customer.",
        buildDocumentSafeSummary(document),
      );
    }
    if (document.status && document.status !== "borrador") {
      const currentCustomer = ref ? currentById.get(ref) : undefined;
      const incomingCustomer = ref ? incomingCustomers.find((customer) => entityRef(customer) === ref) : undefined;
      if (currentCustomer && incomingCustomer && entityName(currentCustomer) !== entityName(incomingCustomer)) {
        addRisk(
          risks,
          "protected_doc_customer_mismatch",
          "blocked",
          ref ?? "SYNTHETIC_ONLY_MISSING_CUSTOMER",
          "Protected document customer identity differs.",
          buildDocumentSafeSummary(document),
        );
      }
    }
  }

  return {
    marker: "PHASE2D61_CUSTOMER_IDENTITY_IMPORT_RISK_ANALYZER_V1",
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    risks,
    manualReviewRequired: risks.length > 0,
    autoMergeAllowed: false,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}

function highestSeverity(risks: CustomerIdentityRisk[]): "info" | "warning" | "blocked" {
  if (risks.some((risk) => risk.severity === "blocked")) return "blocked";
  if (risks.some((risk) => risk.severity === "warning")) return "warning";
  return "info";
}

export function summarizeCustomerIdentityImportRisk(
  assessment: CustomerIdentityRiskAssessment,
): CustomerIdentityRiskSummary {
  return {
    riskIds: [...new Set(assessment.risks.map((risk) => risk.id))],
    highestSeverity: highestSeverity(assessment.risks),
    manualReviewRequired: assessment.manualReviewRequired,
    autoMergeAllowed: false,
    applyAllowed: false,
    restoreAllowed: false,
    safe: true,
  };
}
