"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  canDeleteDocument,
  canRectifyInvoice,
  originalStatusAfterRectification,
} from "@/lib/rectificativas";
import { loadData, saveData } from "@/lib/storage";

interface AppStoreValue {
  data: AppData;
  ready: boolean;
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
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

function newId(): string {
  return crypto.randomUUID();
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveData(data);
  }, [data, ready]);

  const updateProfile = useCallback((profile: BusinessProfile) => {
    setData((prev) => ({ ...prev, profile }));
  }, []);

  const addDocument = useCallback(
    (
      doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">,
    ): Document => {
      let created!: Document;
      setData((prev) => {
        const year = new Date(doc.date).getFullYear();
        const { number } = assignNextDocumentNumberByType(
          prev.documents,
          doc.type,
          year,
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
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year),
        };
      });
      return created;
    },
    [],
  );

  const updateDocument = useCallback((doc: Document) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === doc.id
          ? { ...doc, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
  }, []);

  const addRectificativa = useCallback(
    (
      originalId: string,
      doc: Omit<
        Document,
        "id" | "number" | "type" | "createdAt" | "updatedAt" | "rectification"
      > & { rectification: RectificationInfo },
    ): Document | null => {
      let created: Document | null = null;
      setData((prev) => {
        const original = prev.documents.find((d) => d.id === originalId);
        if (!original || !canRectifyInvoice(original)) return prev;

        const year = new Date(doc.date).getFullYear();
        const { number } = assignNextDocumentNumber(
          prev.documents,
          "factura_rectificativa",
          year,
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
          documents: nextDocuments,
          counters: countersFromDocuments(nextDocuments, year),
        };
      });
      return created;
    },
    [],
  );

  const deleteDocument = useCallback((id: string): boolean => {
    let deleted = false;
    setData((prev) => {
      const target = prev.documents.find((d) => d.id === id);
      if (!target || !canDeleteDocument(target)) return prev;

      deleted = true;
      const year = getDocumentYear(target);
      const kind = target.rectification
        ? "factura_rectificativa"
        : target.type === "factura"
          ? "factura"
          : target.type === "presupuesto"
            ? "presupuesto"
            : "recibo";
      const remaining = prev.documents.filter((d) => d.id !== id);
      const renumbered = renumberDocumentsForKindYear(remaining, kind, year);

      return {
        ...prev,
        documents: renumbered,
        counters: countersFromDocuments(renumbered, year),
      };
    });
    return deleted;
  }, []);

  const addExpense = useCallback(
    (expense: Omit<Expense, "id" | "createdAt">) => {
      setData((prev) => ({
        ...prev,
        expenses: [
          ...prev.expenses,
          { ...expense, id: newId(), createdAt: new Date().toISOString() },
        ],
      }));
    },
    [],
  );

  const deleteExpense = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }, []);

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, "id" | "createdAt">): Supplier => {
      const created: Supplier = {
        ...supplier,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        suppliers: [...prev.suppliers, created],
      }));
      return created;
    },
    [],
  );

  const deleteSupplier = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  }, []);

  const addCustomer = useCallback(
    (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">): Customer => {
      const now = new Date().toISOString();
      const created: Customer = {
        ...customer,
        id: newId(),
        createdAt: now,
        updatedAt: now,
      };
      setData((prev) => ({
        ...prev,
        customers: [...prev.customers, created],
      }));
      return created;
    },
    [],
  );

  const updateCustomer = useCallback((customer: Customer) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.map((c) =>
        c.id === customer.id
          ? { ...customer, updatedAt: new Date().toISOString() }
          : c,
      ),
    }));
  }, []);

  const deleteCustomer = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));
  }, []);

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

  const value = useMemo(
    () => ({
      data,
      ready,
      updateProfile,
      addDocument,
      addRectificativa,
      updateDocument,
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
    }),
    [
      data,
      ready,
      updateProfile,
      addDocument,
      addRectificativa,
      updateDocument,
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
