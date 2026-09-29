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

import { useCloudAuth } from "@/context/CloudAuthContext";
import {
  createCompany as createCompanyRequest,
  fetchCompanies,
  renameCompany as renameCompanyRequest,
} from "@/lib/companies/client";
import type { AppCompany } from "@/lib/companies/types";
import type { CompanyCreationResult } from "@/lib/companies/types";
import type { BusinessProfile } from "@/lib/types";

interface CompanyContextValue {
  ready: boolean;
  error: string | null;
  companies: AppCompany[];
  activeCompany: AppCompany | null;
  selectCompany: (companyId: string) => void;
  createCompany: (
    name: string,
    options?: { sourceCompanyId?: string; sourceProfile?: BusinessProfile },
  ) => Promise<CompanyCreationResult>;
  renameCompany: (companyId: string, name: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);
const ACTIVE_COMPANY_PREFIX = "factu:active-company:v1:";

function activeCompanyStorageKey(userId: string): string {
  return `${ACTIVE_COMPANY_PREFIX}${encodeURIComponent(userId)}`;
}

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { authReady, user } = useCloudAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<AppCompany[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const loadSequence = useRef(0);

  const load = useCallback(async () => {
    const sequence = loadSequence.current + 1;
    loadSequence.current = sequence;
    if (!authReady) return;
    if (!user) {
      setCompanies([]);
      setActiveCompanyId(null);
      setError(null);
      setReady(true);
      return;
    }
    setReady(false);
    setError(null);
    try {
      const next = await fetchCompanies();
      if (loadSequence.current !== sequence) return;
      if (next.length === 0) throw new Error("NO_COMPANIES");
      const stored = localStorage
        .getItem(activeCompanyStorageKey(user.id))
        ?.trim();
      const selected = next.find((company) => company.id === stored) ?? next[0];
      setCompanies(next);
      setActiveCompanyId(selected.id);
      localStorage.setItem(activeCompanyStorageKey(user.id), selected.id);
      setReady(true);
    } catch {
      if (loadSequence.current !== sequence) return;
      setCompanies([]);
      setActiveCompanyId(null);
      setError("No se pudieron preparar las empresas de esta cuenta.");
      setReady(true);
    }
  }, [authReady, user]);

  useEffect(() => {
    void load();
    return () => {
      loadSequence.current += 1;
    };
  }, [load]);

  const selectCompany = useCallback(
    (companyId: string) => {
      if (!user || !companies.some((company) => company.id === companyId))
        return;
      try {
        localStorage.setItem(activeCompanyStorageKey(user.id), companyId);
      } catch {
        // La selección de esta sesión no puede quedar bloqueada por una caché
        // llena. El servidor seguirá resolviendo la empresa autorizada.
      }
      setActiveCompanyId(companyId);
    },
    [companies, user],
  );

  const createCompany = useCallback(
    async (
      name: string,
      options?: { sourceCompanyId?: string; sourceProfile?: BusinessProfile },
    ) => {
      const result = await createCompanyRequest(name, options);
      const { company } = result;
      setCompanies((current) => [...current, company]);
      return result;
    },
    [],
  );

  const renameCompany = useCallback(async (companyId: string, name: string) => {
    await renameCompanyRequest(companyId, name);
    const normalized = name.replace(/\s+/g, " ").trim();
    setCompanies((current) =>
      current.map((company) =>
        company.id === companyId ? { ...company, name: normalized } : company,
      ),
    );
  }, []);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      ready,
      error,
      companies,
      activeCompany,
      selectCompany,
      createCompany,
      renameCompany,
      refreshCompanies: load,
    }),
    [
      activeCompany,
      companies,
      createCompany,
      error,
      load,
      ready,
      renameCompany,
      selectCompany,
    ],
  );

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany(): CompanyContextValue {
  const value = useContext(CompanyContext);
  if (!value)
    throw new Error("useCompany debe usarse dentro de CompanyProvider");
  return value;
}
