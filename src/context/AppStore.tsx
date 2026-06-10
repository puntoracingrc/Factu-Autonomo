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
} from "@/lib/types";
import { ensureCustomerForDocument, type ClientInput } from "@/lib/customers";
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
import { trackDataDiff } from "@/lib/cloud/incremental";
import {
  buildReceiptFromInvoice,
  findReceiptForInvoice,
} from "@/lib/receipts";
import { loadData, saveData, touchAppData } from "@/lib/storage";
import { captureIssuerSnapshot } from "@/lib/issuer-snapshot";
import { withVerifactuOnDocument } from "@/lib/verifactu/store";

interface ReplaceDataOptions {
  fromRemote?: boolean;
}

interface AppStoreValue {
  data: AppData;
  ready: boolean;
  replaceData: (data: AppData, options?: ReplaceDataOptions) => void;
  updateProfile: (profile: BusinessProfile) => void;
  addDocument: (doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">) => Document;
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
  deleteDocument: (id: string) => boolean;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Supplier;
  deleteSupplier: (id: string) => void;
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
    setData(loadData());
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
    setAppData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === doc.id
          ? { ...doc, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
  }, [setAppData]);

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
          return {
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === id ? { ...d, status: "pagado", updatedAt: now } : d,
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
                return {
                  ...d,
                  status: "pagado",
                  receiptDocumentId: existingReceipt.id,
                  updatedAt: now,
                };
              }
              if (d.id === existingReceipt.id) {
                return { ...d, status: "pagado", updatedAt: now };
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

        const documents = prev.documents.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                status: "pagado" as const,
                receiptDocumentId: receipt.id,
                updatedAt: now,
              }
            : d,
        );
        documents.push(receipt);

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
          const receipt = findReceiptForInvoice(
            prev.documents,
            doc.id,
            doc.receiptDocumentId,
          );

          let documents = prev.documents.map((d) =>
            d.id === doc.id
              ? {
                  ...d,
                  status: newStatus,
                  receiptDocumentId: undefined,
                  updatedAt: now,
                }
              : d,
          );

          if (receipt?.sourceDocumentId === doc.id) {
            documents = documents.filter((d) => d.id !== receipt.id);
            const year = getDocumentYear(receipt, numbering);
            documents = renumberDocumentsForKindYear(
              documents,
              "recibo",
              year,
              numbering,
            );
            return {
              ...prev,
              profile: {
                ...prev.profile,
                numbering: syncNumberingToDocuments(numbering, documents),
              },
              documents,
              counters: countersFromDocuments(documents, year, numbering),
            };
          }

          return { ...prev, documents };
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
          address: result.customer.address,
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
      addRectificativa,
      updateDocument,
      markAsCollected,
      unmarkAsCollected,
      deleteDocument,
      addExpense,
      deleteExpense,
      addSupplier,
      deleteSupplier,
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
      addRectificativa,
      updateDocument,
      markAsCollected,
      unmarkAsCollected,
      deleteDocument,
      addExpense,
      deleteExpense,
      addSupplier,
      deleteSupplier,
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
