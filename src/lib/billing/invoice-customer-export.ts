import {
  filterCustomers,
  findCustomerByClient,
  findCustomerByIdOrMergedId,
  getCustomerDisplayName,
  isValidCustomerEmail,
  migrateCustomer,
  normalizeCustomerEmail,
} from "@/lib/customers";
import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import type { Customer, Document } from "@/lib/types";

export interface InvoiceCustomerExportContext {
  customer: Customer;
  customerName: string;
  greetingName: string;
  email?: string;
  documentIds: string[];
}

function resolveDocumentCustomer(
  document: Document,
  customers: Customer[],
): Customer | null {
  return (
    findCustomerByIdOrMergedId(customers, document.customerId) ??
    findCustomerByClient(customers, document.client) ??
    null
  );
}

function uniqueDocumentEmail(documents: Document[]): string | undefined {
  const emails = new Set(
    documents
      .map((document) =>
        normalizeCustomerEmail(document.client.email).toLocaleLowerCase(
          "en-US",
        ),
      )
      .filter((email) => Boolean(email) && isValidCustomerEmail(email)),
  );
  return emails.size === 1 ? [...emails][0] : undefined;
}

export function resolveInvoiceCustomerExportContext(input: {
  query: string;
  filteredDocuments: Document[];
  customers: Customer[];
}): InvoiceCustomerExportContext | null {
  const query = input.query.trim();
  const invoices = input.filteredDocuments.filter(
    (document) =>
      document.type === "factura" &&
      deriveDocumentLifecycle(document) !== "draft",
  );
  if (!query || invoices.length === 0) return null;

  const matchingCustomers = filterCustomers(input.customers, query);
  if (matchingCustomers.length !== 1) return null;

  const customer = migrateCustomer(matchingCustomers[0]);
  const allBelongToCustomer = invoices.every(
    (document) =>
      resolveDocumentCustomer(document, input.customers)?.id === customer.id,
  );
  if (!allBelongToCustomer) return null;

  const customerName = getCustomerDisplayName(customer).trim();
  if (!customerName) return null;

  const masterEmail = normalizeCustomerEmail(customer.email).toLocaleLowerCase(
    "en-US",
  );
  const email =
    masterEmail && isValidCustomerEmail(masterEmail)
      ? masterEmail
      : uniqueDocumentEmail(invoices);

  return {
    customer,
    customerName,
    greetingName: customer.contactName?.trim() || customerName,
    email,
    documentIds: [...new Set(invoices.map((document) => document.id))],
  };
}
