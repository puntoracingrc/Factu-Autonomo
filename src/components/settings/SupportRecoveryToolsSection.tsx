"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock3, ShieldCheck } from "lucide-react";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  SUPPORT_RECOVERY_TOOLS,
  activeSupportRecoveryAccesses,
  isSupportRecoveryToolId,
  type SupportRecoveryAccess,
  type SupportRecoveryToolId,
} from "@/lib/admin/recovery-tools";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

const DataOwnershipCard = dynamic(() =>
  import("@/components/settings/DataOwnershipCard").then(
    (module) => module.DataOwnershipCard,
  ),
);
const ExpenseWorkAllocationRepairCard = dynamic(() =>
  import("@/components/settings/ExpenseWorkAllocationRepairCard").then(
    (module) => module.ExpenseWorkAllocationRepairCard,
  ),
);
const ImportedLegacyDocumentRepairCard = dynamic(() =>
  import("@/components/settings/ImportedLegacyDocumentRepairCard").then(
    (module) => module.ImportedLegacyDocumentRepairCard,
  ),
);
const AppIssuedDocumentRecoveryCard = dynamic(() =>
  import("@/components/settings/AppIssuedDocumentRecoveryCard").then(
    (module) => module.AppIssuedDocumentRecoveryCard,
  ),
);

interface RecoveryToolsResponse {
  grants?: SupportRecoveryAccess[];
}

function validGrant(value: unknown): value is SupportRecoveryAccess {
  if (!value || typeof value !== "object") return false;
  const grant = value as Partial<SupportRecoveryAccess>;
  return (
    typeof grant.id === "string" &&
    isSupportRecoveryToolId(grant.toolId) &&
    typeof grant.grantedAt === "string" &&
    typeof grant.expiresAt === "string" &&
    Number.isFinite(Date.parse(grant.grantedAt)) &&
    Number.isFinite(Date.parse(grant.expiresAt))
  );
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SupportRecoveryToolsSection() {
  const { user } = useCloudSync();
  const userId = user?.id ?? null;
  const [grants, setGrants] = useState<SupportRecoveryAccess[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) {
        if (!cancelled) setGrants([]);
        return;
      }
      const supabase = await getSupabaseClientAsync();
      const { data } = (await supabase?.auth.getSession()) ?? {
        data: { session: null },
      };
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) setGrants([]);
        return;
      }
      try {
        const response = await fetch("/api/support/recovery-tools", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const body = (await response.json()) as RecoveryToolsResponse;
        if (!cancelled) {
          setGrants(
            response.ok && Array.isArray(body.grants)
              ? body.grants.filter(validGrant)
              : [],
          );
        }
      } catch {
        if (!cancelled) setGrants([]);
      }
    }
    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [userId]);

  const activeGrants = useMemo(
    () => activeSupportRecoveryAccesses(grants),
    [grants],
  );
  const activeToolIds = useMemo(
    () => new Set(activeGrants.map((grant) => grant.toolId)),
    [activeGrants],
  );

  useEffect(() => {
    if (activeGrants.length === 0) return;
    const nextExpiry = Math.min(
      ...activeGrants.map((grant) => Date.parse(grant.expiresAt)),
    );
    const timeout = window.setTimeout(
      () => setGrants((current) => activeSupportRecoveryAccesses(current)),
      Math.max(0, nextExpiry - Date.now() + 250),
    );
    return () => window.clearTimeout(timeout);
  }, [activeGrants]);

  if (activeGrants.length === 0) return null;

  const has = (toolId: SupportRecoveryToolId) => activeToolIds.has(toolId);

  return (
    <section id="soporte-tecnico-autorizado" className="mb-8 scroll-mt-24">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-950">
            Soporte técnico autorizado
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            El administrador ha abierto temporalmente herramientas excepcionales
            para esta cuenta. Las acciones se aplican en este dispositivo.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {activeGrants.map((grant) => (
              <li
                key={grant.id}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800"
              >
                <Clock3 className="h-3.5 w-3.5" />
                {SUPPORT_RECOVERY_TOOLS.find((tool) => tool.id === grant.toolId)
                  ?.label ?? grant.toolId}{" "}
                · hasta {formatExpiry(grant.expiresAt)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {has("local_backup_restore") && <DataOwnershipCard restoreOnly />}
      {has("expense_allocation_repair") && <ExpenseWorkAllocationRepairCard />}
      {has("legacy_import_repair") && <ImportedLegacyDocumentRepairCard />}
      {has("issued_document_recovery") && <AppIssuedDocumentRecoveryCard />}
    </section>
  );
}
