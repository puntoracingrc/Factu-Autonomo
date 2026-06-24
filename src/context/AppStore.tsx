"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  AppData,
  Customer,
  Document,
  DocumentType,
  Expense,
  RectificationInfo,
  Supplier,
  BusinessProfile,
  RecurringExpense,
  UserReminder,
} from "@/lib/types";
import { syncRecurringExpenses } from "@/lib/recurring-expenses";
import {
  ensureCustomerForDocument,
  type ClientInput,
} from "@/lib/customers";
import type { Client } from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import {
  assignNextDocumentNumber,
  assignNextDocumentNumberByType,
  countersFromDocuments,
  getDocumentYear,
  getFacturasIncludingRectificativas,
  renumberDocumentsForKindYear,
} from "@/lib/documents";
import {
  canRectifyInvoice,
  getDeletePolicy,
  originalStatusAfterRectification,
} from "@/lib/rectificativas";
import { normalizeIvaSettings } from "@/lib/iva";
import {
  bumpNumberingAfterAssign,
  configuredLastForKind,
  normalizeNumbering,
  syncNumberingToDocuments,
} from "@/lib/numbering";
import type { DocumentKind } from "@/lib/types";
import { canMarkAsCollected, statusAfterUnmarkingCollection } from "@/lib/income";
import {
  canMarkQuoteAsAccepted,
  isAcceptedQuote,
  statusAfterUnmarkingQuoteAcceptance,
} from "@/lib/quotes";
import { trackDataDiff } from "@/lib/cloud/incremental";
import {
  buildReceiptFromInvoice,
  findReceiptForInvoice,
  unmarkInvoiceCollection,
} from "@/lib/receipts";
import { loadData, saveData, touchAppData } from "@/lib/storage";
import { markFactuFeatureUsed } from "@/lib/factu/feature-usage";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import { normalizeDocumentPhrases } from "@/lib/document-phrases";
import { normalizeDocumentPaymentMethods } from "@/lib/document-payment-methods";
import { normalizeDocumentTemplate } from "@/lib/document-templates";
import { normalizeDocumentUnits } from "@/lib/document-units";
import {
  SUPPLIER_AUTO_LINK_SCORE,
  supplierSimilarityScore,
} from "@/lib/suppliers";
import { withVerifactuOnDocument } from "@/lib/verifactu/store";
import {
  applyGenericDocumentUpdate,
  issueDocument as issueDocumentWithIntegrity,
  markDocumentPaid as markDocumentPaidWithIntegrity,
  markDocumentSent as markDocumentSentWithIntegrity,
  acceptQuote as acceptQuoteWithIntegrity,
} from "@/lib/document-integrity";
import {
  applyCustomerMergeToDocument,
  mergeCustomerRecords,
  type MergeCustomersOptions,
} from "@/lib/document-integrity/customer-merge";

interface ReplaceDataOptions {
  fromRemote?: boolean;
}

interface AppStoreValue {
  data: AppData;
  ready: boolean;
  replaceData: (data: AppData, options?: ReplaceDataOptions) => void;
  updateProfile: (profile: BusinessProfile) => void;
  addDocument: (doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">) => Document;
  issueDocument: (id: string) => Document;
  markDocumentSent: (id: string) => Document | null;
  addRectificativa: (
    originalId: string,
    doc: Omit<
      Document,
      "id" | "number" | "type" | "createdAt" | "updatedAt" | "rectification"
    > & { rectification: RectificationInfo },
  ) => Document | null;
  updateDocument: (doc: Document) => void;
  markAsCollected: (id: string) => void;
  unmarkAsCollected: (id: string) => void;
  markQuoteAsAccepted: (id: string) => void;
  unmarkQuoteAsAccepted: (id: string) => void;
  deleteDocument: (id: string) => boolean;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  addRecurringExpense: (
    item: Omit<RecurringExpense, "id" | "createdAt" | "updatedAt">,
  ) => RecurringExpense;
  updateRecurringExpense: (item: RecurringExpense) => void;
  deleteRecurringExpense: (id: string) => void;
  addUserReminder: (
    item: Omit<UserReminder, "id" | "completed" | "createdAt" | "updatedAt"> & {
      completed?: boolean;
    },
  ) => UserReminder;
  updateUserReminder: (item: UserReminder) => void;
  completeUserReminder: (id: string) => void;
  reopenUserReminder: (id: string) => void;
  deleteUserReminder: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Supplier;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  mergeSuppliers: (keepId: string, removeIds: string[]) => void;
  mergeCustomers: (
    keepId: string,
    removeIds: string[],
    options?: MergeCustomersOptions,
  ) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  upsertCustomerForDocument: (
    input: ClientInput,
    selectedCustomerId: string | null,
  ) =>
    | { ok: true; customerId: string; client: Client }
    | { ok: false; error: string };
  getDocumentsByType: (type: DocumentType) => Document[];
  registerVerifactuForDocument: (
    doc: Document,
    chainOverride?: AppData["verifactuChain"],
  ) => Promise<Document>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const skipNextSave = useRef(true);

  const setAppData = useCallback(
    (
      updater: AppData | ((prev: AppData) => AppData),
      options?: { skipDirty?: boolean },
    ) => {
      setData((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;
        const touched = touchAppData(next);
        return options?.skipDirty ? touched : trackDataDiff(prev, touched);
      });
    },
    [],
  );

  useEffect(() => {
    setData(syncRecurringExpenses(loadData()));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveData(data);
  }, [data, ready]);

  const replaceData = useCallback(
    (next: AppData, options?: ReplaceDataOptions) => {
      if (options?.fromRemote) {
        skipNextSave.current = false;
        setData(next);
        saveData(next);
        return;
      }
      setAppData(next, { skipDirty: false });
    },
    [setAppData],
  );

  const updateProfile = useCallback((profile: BusinessProfile) => {
    setAppData((prev) => ({
      ...prev,
      profile: {
        ...profile,
        iva: normalizeIvaSettings(profile.iva),
        numbering: normalizeNumbering(profile.numbering),
        documentPhrases: normalizeDocumentPhrases(profile.documentPhrases),
        documentPaymentMethods: normalizeDocumentPaymentMethods(
          profile.documentPaymentMethods,
        ),
        documentTemplate: normalizeDocumentTemplate(profile.documentTemplate),
        documentUnits: normalizeDocumentUnits(profile.documentUnits),
      },
    }));
  }, [setAppData]);

  const addDocument = useCallback(
    (
      doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
    ): Document => {
      let created!: Document;
      setAppData((prev) => {
        const year = new Date(doc.date).getFullYear();
        const kind: DocumentKind =
          doc.type === "factura"
            ? "factura"
            : doc.type === "presupuesto"
              ? "presupuesto"
              : "recibo";
        const numbering = prev.profile.numbering;
        const { number, sequence } = assignNextDocumentNumberByType(
          prev.documents,
          doc.type,
          year,
          configuredLastForKind(numbering, kind, year),
          numbering,
        );
        const now = new Date().toISOString();
        const nextDocuments = [
          ...prev.documents,
          {
            ...doc,
            id: newId(),
            number,
            createdAt: now,
            updatedAt: now,
          },
        ];
        created = nextDocuments[nextDocuments.length - 1];
        return {
          ...prev,
          profile: {
            ...prev.profile,
            numbering: bumpNumberingAfterAssign(
              prev.profile.numbering,
              kind,
              year,
              sequence,
            ),
          },
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year, numbering),
        };
      });
      return created;
    },
    [setAppData],
  );

  const updateDocument = useCallback((doc: Document) => {
    setAppData((prev) => {
      const now = new Date().toISOString();
      return {
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === doc.id ? applyGenericDocumentUpdate(d, doc, now) : d,
        ),
      };
    });
  }, [setAppData]);

  const issueDocument = useCallback(
    (id: string): Document => {
      let issued: Document | null = null;
      setAppData((prev) => {
        const current = prev.documents.find((doc) => doc.id === id);
        if (!current) return prev;

        issued = issueDocumentWithIntegrity(current, prev.profile);

        return {
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.id === id ? issued! : doc,
          ),
        };
      });

      if (!issued) {
        throw new Error("Documento no encontrado");
      }
      return issued;
    },
    [setAppData],
  );

  const markDocumentSent = useCallback(
    (id: string): Document | null => {
      let sent: Document | null = null;
      setAppData((prev) => {
        const current = prev.documents.find((doc) => doc.id === id);
        if (!current) return prev;

        sent = markDocumentSentWithIntegrity(current);

        return {
          ...prev,
          documents: prev.documents.map((doc) => (doc.id === id ? sent! : doc)),
        };
      });

      return sent;
    },
    [setAppData],
  );

  const markAsCollected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = prev.documents.find((d) => d.id === id);
        if (!doc || !canMarkAsCollected(doc) || doc.status === "pagado") {
          return prev;
        }

        const now = new Date().toISOString();
        const numbering = prev.profile.numbering;

        if (doc.type === "recibo") {
          const paid = markDocumentPaidWithIntegrity(doc, now);
          return {
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === id ? paid : d,
            ),
          };
        }

        const existingReceipt = findReceiptForInvoice(
          prev.documents,
          doc.id,
          doc.receiptDocumentId,
        );

        if (existingReceipt) {
          return {
            ...prev,
            documents: prev.documents.map((d) => {
              if (d.id === doc.id) {
                const paid = markDocumentPaidWithIntegrity(doc, now);
                return {
                  ...paid,
                  receiptDocumentId: existingReceipt.id,
                };
              }
              if (d.id === existingReceipt.id) {
                return markDocumentPaidWithIntegrity(d, now);
              }
              return d;
            }),
          };
        }

        const receiptDraft = buildReceiptFromInvoice(doc);
        const year = new Date(receiptDraft.date).getFullYear();
        const { number, sequence } = assignNextDocumentNumberByType(
          prev.documents,
          "recibo",
          year,
          configuredLastForKind(numbering, "recibo", year),
          numbering,
        );

        const receipt: Document = {
          ...receiptDraft,
          id: newId(),
          number,
          issuer: doc.issuer ?? captureIssuerSnapshot(prev.profile),
          createdAt: now,
          updatedAt: now,
        };
        const paidReceipt = markDocumentPaidWithIntegrity(receipt, now);
        const paidDocument = markDocumentPaidWithIntegrity(doc, now);

        const documents = prev.documents.map((d) =>
          d.id === doc.id
            ? {
                ...paidDocument,
                receiptDocumentId: receipt.id,
              }
            : d,
        );
        documents.push(paidReceipt);

        return {
          ...prev,
          profile: {
            ...prev.profile,
            numbering: bumpNumberingAfterAssign(
              prev.profile.numbering,
              "recibo",
              year,
              sequence,
            ),
          },
          documents,
          counters: countersFromDocuments(documents, year, numbering),
        };
      });
    },
    [setAppData],
  );

  const unmarkAsCollected = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = prev.documents.find((d) => d.id === id);
        if (!doc || doc.status !== "pagado") return prev;

        const now = new Date().toISOString();
        const newStatus = statusAfterUnmarkingCollection(doc);
        const numbering = prev.profile.numbering;

        if (doc.type === "factura") {
          const result = unmarkInvoiceCollection(
            prev.documents,
            doc.id,
            newStatus,
            now,
            numbering,
          );

          if (result.removedReceiptId) {
            return {
              ...prev,
              profile: {
                ...prev.profile,
                numbering: syncNumberingToDocuments(
                  numbering,
                  result.documents,
                ),
              },
              documents: result.documents,
              counters: countersFromDocuments(
                result.documents,
                result.renumberYear,
                numbering,
              ),
            };
          }

          return { ...prev, documents: result.documents };
        }

        return {
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === id ? { ...d, status: newStatus, updatedAt: now } : d,
          ),
        };
      });
    },
    [setAppData],
  );

  const markQuoteAsAccepted = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = prev.documents.find((d) => d.id === id);
        if (!doc || !canMarkQuoteAsAccepted(doc) || isAcceptedQuote(doc)) {
          return prev;
        }

        const now = new Date().toISOString();
        const accepted = acceptQuoteWithIntegrity(doc, now);
        return {
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === id ? accepted : d,
          ),
        };
      });
    },
    [setAppData],
  );

  const unmarkQuoteAsAccepted = useCallback(
    (id: string) => {
      setAppData((prev) => {
        const doc = prev.documents.find((d) => d.id === id);
        if (!doc || !isAcceptedQuote(doc)) return prev;

        const now = new Date().toISOString();
        return {
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: statusAfterUnmarkingQuoteAcceptance(),
                  updatedAt: now,
                }
              : d,
          ),
        };
      });
    },
    [setAppData],
  );

  const addRectificativa = useCallback(
    (
      originalId: string,
      doc: Omit<
        Document,
        "id" | "number" | "type" | "createdAt" | "updatedAt" | "rectification"
      > & { rectification: RectificationInfo },
    ): Document | null => {
      let created: Document | null = null;
      setAppData((prev) => {
        const original = prev.documents.find((d) => d.id === originalId);
        if (!original || !canRectifyInvoice(original)) return prev;

        const year = new Date(doc.date).getFullYear();
        const numbering = prev.profile.numbering;
        const { number, sequence } = assignNextDocumentNumber(
          prev.documents,
          "factura_rectificativa",
          year,
          configuredLastForKind(
            numbering,
            "factura_rectificativa",
            year,
          ),
          numbering,
        );
        const now = new Date().toISOString();
        const rectificativa: Document = {
          ...doc,
          type: "factura",
          id: newId(),
          number,
          createdAt: now,
          updatedAt: now,
        };

        const nextDocuments = prev.documents.map((d) =>
          d.id === originalId
            ? {
                ...d,
                status: originalStatusAfterRectification(doc.rectification.type),
                rectifiedById: rectificativa.id,
                updatedAt: now,
              }
            : d,
        );
        nextDocuments.push(rectificativa);
        created = rectificativa;

        return {
          ...prev,
          profile: {
            ...prev.profile,
            numbering: bumpNumberingAfterAssign(
              prev.profile.numbering,
              "factura_rectificativa",
              year,
              sequence,
            ),
          },
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year, numbering),
        };
      });
      return created;
    },
    [setAppData],
  );

  const deleteDocument = useCallback((id: string): boolean => {
    let deleted = false;
    setAppData((prev) => {
      const target = prev.documents.find((d) => d.id === id);
      if (!target || !getDeletePolicy(target).allowed) return prev;

      deleted = true;
      const numbering = prev.profile.numbering;
      const year = getDocumentYear(target, numbering);
      const kind = target.rectification
        ? "factura_rectificativa"
        : target.type === "factura"
          ? "factura"
          : target.type === "presupuesto"
            ? "presupuesto"
            : "recibo";
      const remaining = prev.documents.filter((d) => d.id !== id);
      const renumbered = renumberDocumentsForKindYear(
        remaining,
        kind,
        year,
        numbering,
      );

      return {
        ...prev,
        profile: {
          ...prev.profile,
          numbering: syncNumberingToDocuments(numbering, renumbered),
        },
        documents: renumbered,
        counters: countersFromDocuments(renumbered, year, numbering),
      };
    });
    return deleted;
  }, [setAppData]);

  const addExpense = useCallback(
    (expense: Omit<Expense, "id" | "createdAt">) => {
      setAppData((prev) => ({
        ...prev,
        expenses: [
          ...prev.expenses,
          { ...expense, id: newId(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [setAppData],
  );

  const deleteExpense = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }, [setAppData]);

  const addRecurringExpense = useCallback(
    (
      item: Omit<RecurringExpense, "id" | "createdAt" | "updatedAt">,
    ): RecurringExpense => {
      const now = new Date().toISOString();
      const created: RecurringExpense = {
        ...item,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      setAppData((prev) =>
        syncRecurringExpenses({
          ...prev,
          recurringExpenses: [...prev.recurringExpenses, created],
        }),
      );
      return created;
    },
    [setAppData],
  );

  const updateRecurringExpense = useCallback(
    (item: RecurringExpense) => {
      setAppData((prev) =>
        syncRecurringExpenses({
          ...prev,
          recurringExpenses: prev.recurringExpenses.map((entry) =>
            entry.id === item.id
              ? { ...item, updatedAt: new Date().toISOString() }
              : entry,
          ),
        }),
      );
    },
    [setAppData],
  );

  const deleteRecurringExpense = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.filter((entry) => entry.id !== id),
    }));
  }, [setAppData]);

  const addUserReminder = useCallback(
    (
      item: Omit<UserReminder, "id" | "completed" | "createdAt" | "updatedAt"> & {
        completed?: boolean;
      },
    ): UserReminder => {
      const now = new Date().toISOString();
      const created: UserReminder = {
        ...item,
        target: item.target ?? "self",
        completed: item.completed ?? false,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      setAppData((prev) => ({
        ...prev,
        userReminders: [...prev.userReminders, created],
      }));
      markFactuFeatureUsed("user_reminders");
      return created;
    },
    [setAppData],
  );

  const updateUserReminder = useCallback(
    (item: UserReminder) => {
      setAppData((prev) => ({
        ...prev,
        userReminders: prev.userReminders.map((entry) =>
          entry.id === item.id
            ? { ...item, updatedAt: new Date().toISOString() }
            : entry,
        ),
      }));
    },
    [setAppData],
  );

  const completeUserReminder = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      setAppData((prev) => ({
        ...prev,
        userReminders: prev.userReminders.map((entry) =>
          entry.id === id
            ? { ...entry, completed: true, completedAt: now, updatedAt: now }
            : entry,
        ),
      }));
    },
    [setAppData],
  );

  const reopenUserReminder = useCallback(
    (id: string) => {
      setAppData((prev) => ({
        ...prev,
        userReminders: prev.userReminders.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                completed: false,
                completedAt: undefined,
                updatedAt: new Date().toISOString(),
              }
            : entry,
        ),
      }));
    },
    [setAppData],
  );

  const deleteUserReminder = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      userReminders: prev.userReminders.filter((entry) => entry.id !== id),
    }));
  }, [setAppData]);

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id" | "createdAt">): Supplier => {
      const created: Supplier = {
        ...supplier,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setAppData((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, created],
      }));
      return created;
    },
    [setAppData],
  );

  const deleteSupplier = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  }, [setAppData]);

  const updateSupplier = useCallback((supplier: Supplier) => {
    setAppData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((entry) =>
        entry.id === supplier.id ? supplier : entry,
      ),
    }));
  }, [setAppData]);

  const mergeSuppliers = useCallback((keepId: string, removeIds: string[]) => {
    const uniqueRemoveIds = [...new Set(removeIds)].filter((id) => id !== keepId);
    if (uniqueRemoveIds.length === 0) return;

    setAppData((prev) => {
      const keep = prev.suppliers.find((supplier) => supplier.id === keepId);
      if (!keep) return prev;

      const removed = prev.suppliers.filter((supplier) =>
        uniqueRemoveIds.includes(supplier.id),
      );
      const removedNames = removed.map((supplier) => supplier.name);
      const enrichedKeep: Supplier = {
        ...keep,
        nif: keep.nif ?? removed.find((supplier) => supplier.nif)?.nif,
        email: keep.email ?? removed.find((supplier) => supplier.email)?.email,
        phone: keep.phone ?? removed.find((supplier) => supplier.phone)?.phone,
        website:
          keep.website ?? removed.find((supplier) => supplier.website)?.website,
        streetType:
          keep.streetType ??
          removed.find((supplier) => supplier.streetType)?.streetType,
        address:
          keep.address ?? removed.find((supplier) => supplier.address)?.address,
        city: keep.city ?? removed.find((supplier) => supplier.city)?.city,
        postalCode:
          keep.postalCode ??
          removed.find((supplier) => supplier.postalCode)?.postalCode,
        notes: keep.notes ?? removed.find((supplier) => supplier.notes)?.notes,
        category:
          keep.category ?? removed.find((supplier) => supplier.category)?.category,
      };

      return {
        ...prev,
        suppliers: prev.suppliers
          .filter((supplier) => !uniqueRemoveIds.includes(supplier.id))
          .map((supplier) => (supplier.id === keepId ? enrichedKeep : supplier)),
        expenses: prev.expenses.map((expense) => {
          if (expense.supplierId && uniqueRemoveIds.includes(expense.supplierId)) {
            return {
              ...expense,
              supplierId: keepId,
              supplierName: enrichedKeep.name,
            };
          }

          if (
            removedNames.some(
              (name) =>
                supplierSimilarityScore(expense.supplierName, name) >=
                SUPPLIER_AUTO_LINK_SCORE,
            )
          ) {
            return {
              ...expense,
              supplierId: keepId,
              supplierName: enrichedKeep.name,
            };
          }

          return expense;
        }),
      };
    });
  }, [setAppData]);

  const addCustomer = useCallback(
    (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer => {
      const now = new Date().toISOString();
      const created: Customer = {
        ...customer,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      setAppData((prev) => ({
        ...prev,
        customers: [...prev.customers, created],
      }));
      return created;
    },
    [setAppData],
  );

  const updateCustomer = useCallback((customer: Customer) => {
    setAppData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customer.id
          ? { ...customer, updatedAt: new Date().toISOString() }
          : c,
      ),
    }));
  }, [setAppData]);

  const deleteCustomer = useCallback((id: string) => {
    setAppData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  }, [setAppData]);

  const mergeCustomers = useCallback((
    keepId: string,
    removeIds: string[],
    options?: MergeCustomersOptions,
  ) => {
    const uniqueRemoveIds = [...new Set(removeIds)].filter((id) => id !== keepId);
    if (uniqueRemoveIds.length === 0) return;

    setAppData((prev) => {
      const merge = mergeCustomerRecords(
        prev.customers,
        keepId,
        uniqueRemoveIds,
      );
      if (!merge) return prev;

      return {
        ...prev,
        customers: merge.customers,
        documents: prev.documents.map((document) =>
          applyCustomerMergeToDocument(
            document,
            merge.keep,
            merge.removed,
            options,
          ),
        ),
      };
    });
  }, [setAppData]);

  const upsertCustomerForDocument = useCallback(
    (
      input: ClientInput,
      selectedCustomerId: string | null,
    ):
      | { ok: true; customerId: string; client: Client }
      | { ok: false; error: string } => {
      const result = ensureCustomerForDocument(
        data.customers,
        input,
        selectedCustomerId,
      );
      if (!result.ok) return result;

      if (result.created) {
        const created = addCustomer({
          firstName: result.customer.firstName,
          lastName: result.customer.lastName,
          name: result.customer.name,
          nif: result.customer.nif,
          email: result.customer.email,
          phone: result.customer.phone,
          streetType: result.customer.streetType,
          address: result.customer.address,
          city: result.customer.city,
          postalCode: result.customer.postalCode,
          notes: result.customer.notes,
        });
        return { ok: true, customerId: created.id, client: result.client };
      }

      updateCustomer(result.customer);
      return {
        ok: true,
        customerId: result.customer.id,
        client: result.client,
      };
    },
    [data.customers, addCustomer, updateCustomer],
  );

  const getDocumentsByType = useCallback(
    (type: DocumentType) => {
      if (type === "factura") {
        return getFacturasIncludingRectificativas(data.documents);
      }
      return data.documents.filter((d) => d.type === type);
    },
    [data.documents],
  );

  const registerVerifactuForDocument = useCallback(
    async (
      doc: Document,
      chainOverride?: AppData["verifactuChain"],
    ): Promise<Document> => {
      if (doc.verifactu) {
        setAppData((prev) => ({
          ...prev,
          verifactuChain: chainOverride ?? prev.verifactuChain,
          documents: prev.documents.map((d) => (d.id === doc.id ? doc : d)),
        }));
        return doc;
      }

      const applied = await withVerifactuOnDocument({
        doc,
        profile: data.profile,
        chain: data.verifactuChain,
      });

      setAppData((prev) => ({
        ...prev,
        verifactuChain: chainOverride ?? applied.chain,
        documents: prev.documents.map((d) =>
          d.id === applied.doc.id ? applied.doc : d,
        ),
      }));

      return applied.doc;
    },
    [data.profile, data.verifactuChain, setAppData],
  );

  const value = useMemo(
    () => ({
      data,
      ready,
      replaceData,
      updateProfile,
      addDocument,
      issueDocument,
      markDocumentSent,
      addRectificativa,
      updateDocument,
      markAsCollected,
      unmarkAsCollected,
      markQuoteAsAccepted,
      unmarkQuoteAsAccepted,
      deleteDocument,
      addExpense,
      deleteExpense,
      addRecurringExpense,
      updateRecurringExpense,
      deleteRecurringExpense,
      addUserReminder,
      updateUserReminder,
      completeUserReminder,
      reopenUserReminder,
      deleteUserReminder,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      mergeSuppliers,
      mergeCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      upsertCustomerForDocument,
      getDocumentsByType,
      registerVerifactuForDocument,
    }),
    [
      data,
      ready,
      replaceData,
      updateProfile,
      addDocument,
      issueDocument,
      markDocumentSent,
      addRectificativa,
      updateDocument,
      markAsCollected,
      unmarkAsCollected,
      markQuoteAsAccepted,
      unmarkQuoteAsAccepted,
      deleteDocument,
      addExpense,
      deleteExpense,
      addRecurringExpense,
      updateRecurringExpense,
      deleteRecurringExpense,
      addUserReminder,
      updateUserReminder,
      completeUserReminder,
      reopenUserReminder,
      deleteUserReminder,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      mergeSuppliers,
      mergeCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      upsertCustomerForDocument,
      getDocumentsByType,
      registerVerifactuForDocument,
    ],
  );

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore debe usarse dentro de AppStoreProvider");
  return ctx;
}
