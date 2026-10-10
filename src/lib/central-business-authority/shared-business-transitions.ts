import type { AppData, Document, Supplier } from "@/lib/types";
import {
  deriveDocumentLifecycle,
  isDocumentIntegrityLocked,
  markDocumentSent,
} from "@/lib/document-integrity";
import { editableQuoteWithLocalStatus } from "@/lib/document-integrity/quote-status";
import {
  applyCustomerMergeToDocument,
  mergeCustomerRecords,
  type MergeCustomersOptions,
} from "@/lib/document-integrity/customer-merge";
import { getDeletePolicy } from "@/lib/rectificativas";
import { deleteSupplierMasterFromData } from "@/lib/master-record-deletion";

export function editSharedSupplier(
  data: AppData,
  requested: Supplier,
  now: string,
) {
  if (!data.suppliers.some((supplier) => supplier.id === requested.id))
    throw new Error("El proveedor ya no existe.");
  return {
    data: {
      ...data,
      suppliers: data.suppliers.map((supplier) =>
        supplier.id === requested.id ? requested : supplier,
      ),
      expenses: data.expenses.map((expense) =>
        expense.supplierId === requested.id
          ? { ...expense, supplierName: requested.name }
          : expense,
      ),
      products: data.products.map((product) => {
        const direct =
          product.supplierId === requested.id &&
          product.supplierName !== requested.name;
        const purchase =
          product.purchase?.supplierId === requested.id &&
          product.purchase.supplierName !== requested.name;
        return direct || purchase
          ? {
              ...product,
              ...(direct ? { supplierName: requested.name } : {}),
              ...(purchase
                ? {
                    purchase: {
                      ...product.purchase,
                      supplierName: requested.name,
                    },
                  }
                : {}),
              updatedAt: now,
            }
          : product;
      }),
    },
    value: requested,
  };
}

export function deleteSharedSupplier(data: AppData, id: string) {
  if (!data.suppliers.some((supplier) => supplier.id === id))
    throw new Error("El proveedor ya no existe.");
  return { data: deleteSupplierMasterFromData(data, id), value: id };
}

export function editSharedQuote(
  data: AppData,
  requested: Document,
  now: string,
) {
  const current = data.documents.find((d) => d.id === requested.id);
  if (
    !current ||
    current.type !== "presupuesto" ||
    requested.type !== "presupuesto" ||
    isDocumentIntegrityLocked(current) ||
    deriveDocumentLifecycle(current) !== "draft"
  )
    throw new Error("Este presupuesto ya no permite editar sus datos.");
  const value = editableQuoteWithLocalStatus(
    {
      ...requested,
      id: current.id,
      number: current.number,
      createdAt: current.createdAt,
    },
    now,
  );
  return {
    data: {
      ...data,
      documents: data.documents.map((d) => (d.id === value.id ? value : d)),
    },
    value,
  };
}

export function deleteSharedQuote(data: AppData, id: string) {
  const current = data.documents.find((d) => d.id === id);
  if (
    !current ||
    current.type !== "presupuesto" ||
    !getDeletePolicy(current).allowed
  )
    throw new Error("Este presupuesto no permite el borrado.");
  // Never renumber other documents or rewind a centrally reconciled series.
  return {
    data: { ...data, documents: data.documents.filter((d) => d.id !== id) },
    value: true,
  };
}

export function markSharedDocumentSent(data: AppData, id: string, now: string) {
  const current = data.documents.find((d) => d.id === id);
  if (!current) throw new Error("Documento no encontrado.");
  const value =
    current.type === "presupuesto"
      ? editableQuoteWithLocalStatus(
          {
            ...current,
            status:
              current.status === "aceptado" || current.status === "rechazado"
                ? current.status
                : "enviado",
            deliveryStatus: "sent",
            sentAt: current.sentAt ?? now,
          },
          now,
        )
      : markDocumentSent(current, now);
  return {
    data: {
      ...data,
      documents: data.documents.map((d) => (d.id === id ? value : d)),
    },
    value,
  };
}

function assertCompatibleNifs(records: { nif?: string }[]) {
  const nifs = new Set(
    records
      .map((record) =>
        (record.nif ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""),
      )
      .filter(Boolean),
  );
  if (nifs.size > 1)
    throw new Error("No se pueden unificar fichas con NIF diferentes.");
}

export function mergeSharedCustomers(
  data: AppData,
  keepId: string,
  removeIds: string[],
  options: MergeCustomersOptions | undefined,
  now: string,
) {
  assertCompatibleNifs(
    data.customers.filter((c) => c.id === keepId || removeIds.includes(c.id)),
  );
  const merge = mergeCustomerRecords(data.customers, keepId, removeIds, now);
  if (!merge)
    throw new Error("No se encontraron las fichas que quieres unificar.");
  const removedIds = new Set(
    merge.removed.flatMap((customer) => [
      customer.id,
      ...(customer.mergedCustomerIds ?? []),
    ]),
  );
  return {
    data: {
      ...data,
      customers: merge.customers,
      documents: data.documents.map((d) =>
        applyCustomerMergeToDocument(d, merge.keep, merge.removed, options),
      ),
      userReminders: data.userReminders.map((reminder) =>
        reminder.link.kind === "customer" &&
        reminder.link.entityId &&
        removedIds.has(reminder.link.entityId)
          ? {
              ...reminder,
              link: { ...reminder.link, entityId: keepId },
              updatedAt: now,
            }
          : reminder,
      ),
    },
    value: true,
  };
}

export function mergeSharedSuppliers(
  data: AppData,
  keepId: string,
  removeIds: string[],
  now: string,
) {
  const keep = data.suppliers.find((s) => s.id === keepId);
  const removed = data.suppliers.filter(
    (s) => s.id !== keepId && removeIds.includes(s.id),
  );
  if (!keep || !removed.length)
    throw new Error("No se encontraron los proveedores que quieres unificar.");
  assertCompatibleNifs([keep, ...removed]);
  const value: Supplier = { ...keep };
  for (const field of [
    "nif",
    "email",
    "phone",
    "website",
    "streetType",
    "address",
    "city",
    "postalCode",
    "notes",
    "category",
  ] as const)
    value[field] = keep[field] ?? removed.find((s) => s[field])?.[field];
  const ids = new Set(removed.map((s) => s.id));
  return {
    data: {
      ...data,
      suppliers: data.suppliers
        .filter((s) => !ids.has(s.id))
        .map((s) => (s.id === keepId ? value : s)),
      expenses: data.expenses.map((e) =>
        e.supplierId && ids.has(e.supplierId)
          ? { ...e, supplierId: keepId, supplierName: value.name }
          : e,
      ),
      products: data.products.map((p) => {
        const direct = p.supplierId && ids.has(p.supplierId);
        const purchase =
          p.purchase?.supplierId && ids.has(p.purchase.supplierId);
        return direct || purchase
          ? {
              ...p,
              ...(direct
                ? { supplierId: keepId, supplierName: value.name }
                : {}),
              ...(purchase
                ? {
                    purchase: {
                      ...p.purchase,
                      supplierId: keepId,
                      supplierName: value.name,
                    },
                  }
                : {}),
              updatedAt: now,
            }
          : p;
      }),
    },
    value: true,
  };
}
