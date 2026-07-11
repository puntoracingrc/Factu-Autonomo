import { deriveDocumentLifecycle } from "@/lib/document-integrity";
import type {
  AppData,
  Customer,
  Document,
  Expense,
  Product,
  Supplier,
  UserReminder,
} from "@/lib/types";

export interface CustomerDeletionImpact {
  customerFound: boolean;
  documentCount: number;
  draftDocumentCount: number;
  historicalDocumentCount: number;
  reminderCount: number;
}

export interface SupplierDeletionImpact {
  supplierFound: boolean;
  expenseCount: number;
  productCount: number;
  nifSnapshotCount: number;
}

function customerRelationIds(customer: Customer): Set<string> {
  return new Set([customer.id, ...(customer.mergedCustomerIds ?? [])]);
}

function customerIdsClaimedByOtherMasters(
  customers: Customer[],
  deletedCustomerId: string,
): Set<string> {
  return new Set(
    customers
      .filter((customer) => customer.id !== deletedCustomerId)
      .flatMap((customer) => [customer.id, ...(customer.mergedCustomerIds ?? [])]),
  );
}

function customerIdsThatBecomeOrphaned(
  customers: Customer[],
  customer: Customer,
): Set<string> {
  const claimedElsewhere = customerIdsClaimedByOtherMasters(
    customers,
    customer.id,
  );
  return new Set(
    [...customerRelationIds(customer)].filter(
      (customerId) => !claimedElsewhere.has(customerId),
    ),
  );
}

function documentReferencesAnyCustomerId(
  document: Document,
  customerIds: Set<string>,
): boolean {
  return Boolean(document.customerId && customerIds.has(document.customerId));
}

function reminderReferencesAnyCustomerId(
  reminder: UserReminder,
  customerIds: Set<string>,
): boolean {
  return (
    reminder.link.kind === "customer" &&
    Boolean(reminder.link.entityId && customerIds.has(reminder.link.entityId))
  );
}

function unlinkDocumentCustomer(document: Document): Document {
  const unlinked = { ...document };
  delete unlinked.customerId;
  return unlinked;
}

function unlinkReminderCustomer(reminder: UserReminder): UserReminder {
  return {
    ...reminder,
    link: { kind: "none" },
  };
}

export function analyzeCustomerDeletion(
  data: AppData,
  customerId: string,
): CustomerDeletionImpact {
  const customer = data.customers.find((entry) => entry.id === customerId);
  if (!customer) {
    return {
      customerFound: false,
      documentCount: 0,
      draftDocumentCount: 0,
      historicalDocumentCount: 0,
      reminderCount: 0,
    };
  }

  const orphanedIds = customerIdsThatBecomeOrphaned(data.customers, customer);
  const documents = data.documents.filter((document) =>
    documentReferencesAnyCustomerId(document, orphanedIds),
  );
  const draftDocumentCount = documents.filter(
    (document) => deriveDocumentLifecycle(document) === "draft",
  ).length;

  return {
    customerFound: true,
    documentCount: documents.length,
    draftDocumentCount,
    historicalDocumentCount: documents.length - draftDocumentCount,
    reminderCount: data.userReminders.filter((reminder) =>
      reminderReferencesAnyCustomerId(reminder, orphanedIds),
    ).length,
  };
}

/**
 * Removes a customer master and every reference that would otherwise become
 * orphaned in one immutable AppData transition. Document client data and all
 * immutable snapshots/hashes remain byte-for-byte untouched.
 */
export function deleteCustomerMasterFromData(
  data: AppData,
  customerId: string,
): AppData {
  const customer = data.customers.find((entry) => entry.id === customerId);
  if (!customer) return data;

  const orphanedIds = customerIdsThatBecomeOrphaned(data.customers, customer);

  return {
    ...data,
    customers: data.customers.filter((entry) => entry.id !== customerId),
    documents: data.documents.map((document) =>
      documentReferencesAnyCustomerId(document, orphanedIds)
        ? unlinkDocumentCustomer(document)
        : document,
    ),
    userReminders: data.userReminders.map((reminder) =>
      reminderReferencesAnyCustomerId(reminder, orphanedIds)
        ? unlinkReminderCustomer(reminder)
        : reminder,
    ),
  };
}

function expenseReferencesSupplier(
  expense: Expense,
  supplierId: string,
): boolean {
  return expense.supplierId === supplierId;
}

function productReferencesSupplier(
  product: Product,
  supplierId: string,
): boolean {
  return (
    product.supplierId === supplierId ||
    product.purchase?.supplierId === supplierId
  );
}

function expenseNeedsSupplierNifSnapshot(
  expense: Expense,
  supplier: Supplier,
): boolean {
  return Boolean(
    expenseReferencesSupplier(expense, supplier.id) &&
      supplier.nif?.trim() &&
      !expense.purchaseDocument?.supplierNif?.trim(),
  );
}

function unlinkExpenseSupplier(
  expense: Expense,
  supplier: Supplier,
): Expense {
  const unlinked = { ...expense };
  delete unlinked.supplierId;
  if (!unlinked.supplierName?.trim()) {
    unlinked.supplierName = supplier.name;
  }

  if (expenseNeedsSupplierNifSnapshot(expense, supplier)) {
    unlinked.purchaseDocument = {
      ...(expense.purchaseDocument ?? {}),
      supplierNif: supplier.nif!.trim(),
    };
  }

  return unlinked;
}

function unlinkProductSupplier(product: Product, supplier: Supplier): Product {
  const unlinked = { ...product };
  if (unlinked.supplierId === supplier.id) {
    delete unlinked.supplierId;
    if (!unlinked.supplierName?.trim()) {
      unlinked.supplierName = supplier.name;
    }
  }
  if (unlinked.purchase?.supplierId === supplier.id) {
    const purchase = { ...unlinked.purchase };
    delete purchase.supplierId;
    if (!purchase.supplierName?.trim()) {
      purchase.supplierName = supplier.name;
    }
    unlinked.purchase = purchase;
  }
  return unlinked;
}

export function analyzeSupplierDeletion(
  data: AppData,
  supplierId: string,
): SupplierDeletionImpact {
  const supplier = data.suppliers.find((entry) => entry.id === supplierId);
  if (!supplier) {
    return {
      supplierFound: false,
      expenseCount: 0,
      productCount: 0,
      nifSnapshotCount: 0,
    };
  }

  return {
    supplierFound: true,
    expenseCount: data.expenses.filter((expense) =>
      expenseReferencesSupplier(expense, supplierId),
    ).length,
    productCount: data.products.filter((product) =>
      productReferencesSupplier(product, supplierId),
    ).length,
    nifSnapshotCount: data.expenses.filter((expense) =>
      expenseNeedsSupplierNifSnapshot(expense, supplier),
    ).length,
  };
}

/**
 * Removes a supplier master and unlinks expenses plus both product supplier
 * references atomically. Supplier names, invoice-specific NIFs, purchase
 * lines, price history and product costs are intentionally preserved.
 */
export function deleteSupplierMasterFromData(
  data: AppData,
  supplierId: string,
): AppData {
  const supplier = data.suppliers.find((entry) => entry.id === supplierId);
  if (!supplier) return data;

  return {
    ...data,
    suppliers: data.suppliers.filter((entry) => entry.id !== supplierId),
    expenses: data.expenses.map((expense) =>
      expenseReferencesSupplier(expense, supplierId)
        ? unlinkExpenseSupplier(expense, supplier)
        : expense,
    ),
    products: data.products.map((product) =>
      productReferencesSupplier(product, supplierId)
        ? unlinkProductSupplier(product, supplier)
        : product,
    ),
  };
}
