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
  Supplier,
  BusinessProfile,
} from "@/lib/types";
import { EMPTY_DATA } from "@/lib/types";
import { loadData, saveData, nextDocumentNumber } from "@/lib/storage";

interface AppStoreValue {
  data: AppData;
  ready: boolean;
  updateProfile: (profile: BusinessProfile) => void;
  addDocument: (doc: Omit<Document, "id" | "number" | "createdAt" | "updatedAt">) => Document;
  updateDocument: (doc: Document) => void;
  deleteDocument: (id: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt">) => Supplier;
  deleteSupplier: (id: string) => void;
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt">) => Customer;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
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
        const { number, counters } = nextDocumentNumber(
          doc.type,
          prev.counters,
        );
        const now = new Date().toISOString();
        created = {
          ...doc,
          id: newId(),
          number,
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...prev,
          counters,
          documents: [...prev.documents, created],
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

  const deleteDocument = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
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

  const getDocumentsByType = useCallback(
    (type: DocumentType) => data.documents.filter((d) => d.type === type),
    [data.documents],
  );

  const value = useMemo(
    () => ({
      data,
      ready,
      updateProfile,
      addDocument,
      updateDocument,
      deleteDocument,
      addExpense,
      deleteExpense,
      addSupplier,
      deleteSupplier,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getDocumentsByType,
    }),
    [
      data,
      ready,
      updateProfile,
      addDocument,
      updateDocument,
      deleteDocument,
      addExpense,
      deleteExpense,
      addSupplier,
      deleteSupplier,
      addCustomer,
      updateCustomer,
      deleteCustomer,
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
