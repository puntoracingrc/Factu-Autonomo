"use client";

import { Building2, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCompany } from "@/context/CompanyContext";

export function CompanySwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { activeCompany, companies, selectCompany } = useCompany();

  if (!activeCompany) {
    return (
      <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-500">
        <Building2 className="h-4 w-4" />
        Preparando empresa
      </span>
    );
  }

  if (companies.length === 1) {
    return (
      <span
        title={activeCompany.name}
        className={`inline-flex min-h-10 min-w-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-sm font-bold text-emerald-800 ${compact ? "max-w-40" : "w-full"}`}
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="truncate">{activeCompany.name}</span>
      </span>
    );
  }

  return (
    <label
      className={`relative flex min-h-10 min-w-0 items-center rounded-xl bg-emerald-50 text-emerald-800 ${compact ? "max-w-44" : "w-full"}`}
      title="Cambiar de empresa"
    >
      <Building2 className="pointer-events-none absolute left-3 h-4 w-4" />
      <select
        aria-label="Empresa abierta"
        value={activeCompany.id}
        onChange={(event) => {
          selectCompany(event.target.value);
          router.push("/");
        }}
        className="min-h-10 w-full appearance-none truncate rounded-xl bg-transparent py-2 pl-9 pr-8 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4" />
    </label>
  );
}
