"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Database, LogOut, RefreshCw } from "lucide-react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useWorkspaceStorage } from "@/context/WorkspaceStorageContext";
import { canUseCloudForUser } from "@/lib/billing/cloud-access";
import { markCentralBusinessAutomaticBootstrapVerified } from "@/lib/central-business-authority/automatic-bootstrap-state";
import { registerCurrentCloudDevice } from "@/lib/cloud/device-client";
import {
  markWorkspaceServerAdoptionComplete,
  workspaceRequiresServerAdoption,
} from "@/lib/workspace-storage";

const BUSINESS_EVENT_LIMIT = 500;
const INVOICE_EVENT_LIMIT = 50;
const MAX_EVENT_PAGES = 100;

type GateState =
  | { status: "checking" }
  | { status: "ready" }
  | { status: "error"; message: string };

export function WorkspaceServerAdoptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const scope = useWorkspaceStorage();
  const {
    ready,
    getCurrentData,
    adoptCentralBusinessEventsFromServer,
    syncCentralInvoiceAuthorityEvents,
    syncFiscalNotificationsWorkspace,
  } = useAppStore();
  const {
    user,
    emailConfirmed,
    requiresEmailConfirmation,
    signOut,
  } = useCloudSync();
  const adoptionSequence = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<GateState>(() =>
    scope.kind === "user" &&
    typeof localStorage !== "undefined" &&
    workspaceRequiresServerAdoption(scope.ownerScope, localStorage)
      ? { status: "checking" }
      : { status: "ready" },
  );

  const adopt = useCallback(async () => {
    const sequence = adoptionSequence.current + 1;
    adoptionSequence.current = sequence;
    const isCurrent = () => adoptionSequence.current === sequence;
    const setCurrentState = (next: GateState) => {
      if (isCurrent()) setState(next);
    };
    if (scope.kind !== "user") {
      setCurrentState({ status: "ready" });
      return;
    }
    if (!workspaceRequiresServerAdoption(scope.ownerScope, localStorage)) {
      setCurrentState({ status: "ready" });
      return;
    }
    if (!ready || !user || user.id !== scope.ownerScope) return;
    if (!emailConfirmed || requiresEmailConfirmation) {
      // La cuenta necesita poder abrir /cuenta para confirmar o reenviar email.
      setCurrentState({ status: "ready" });
      return;
    }

    setCurrentState({ status: "checking" });
    try {
      const access = await canUseCloudForUser(user.id);
      if (!isCurrent()) return;
      if (!access.allowed) {
        markWorkspaceServerAdoptionComplete(user.id, localStorage);
        setCurrentState({ status: "ready" });
        return;
      }

      const device = await registerCurrentCloudDevice({
        notifyReactivated: false,
        expectedOwnerScope: scope.ownerScope,
      });
      if (!isCurrent()) return;
      if (device.error || device.allowed === false) {
        throw new Error(
          device.message ??
            device.error ??
            "Este dispositivo no pudo verificarse con el servidor central.",
        );
      }

      const business = await adoptCentralBusinessEventsFromServer(user.id, {
        limit: BUSINESS_EVENT_LIMIT,
        maxPages: MAX_EVENT_PAGES,
      });
      if (!isCurrent()) return;
      if (!business.ok) throw new Error(business.message);

      for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
        const invoices = await syncCentralInvoiceAuthorityEvents(
          getCurrentData(),
          {
            limit: INVOICE_EVENT_LIMIT,
            replayFromStartWhenNoActiveInvoices: true,
          },
        );
        if (!isCurrent()) return;
        if (invoices.status !== "applied") {
          throw new Error(
            "No se pudo guardar la copia central de las facturas en este dispositivo.",
          );
        }
        if (!invoices.value.localSync.ok) {
          throw new Error(
            invoices.value.localSync.message ??
              "Las facturas centrales requieren revisión.",
          );
        }
        if (invoices.value.localSync.pulledEvents < INVOICE_EVENT_LIMIT) break;
        if (page === MAX_EVENT_PAGES - 1) {
          throw new Error("Quedan demasiadas facturas centrales por recuperar.");
        }
      }

      const fiscal = await syncFiscalNotificationsWorkspace(user.id);
      if (!isCurrent()) return;
      if (!fiscal.ok) throw new Error(fiscal.message);

      markCentralBusinessAutomaticBootstrapVerified({ ownerScope: user.id });
      markWorkspaceServerAdoptionComplete(user.id, localStorage);
      setCurrentState({ status: "ready" });
    } catch (error) {
      setCurrentState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo preparar la copia del servidor.",
      });
    }
  }, [
    adoptCentralBusinessEventsFromServer,
    emailConfirmed,
    getCurrentData,
    ready,
    requiresEmailConfirmation,
    scope,
    syncCentralInvoiceAuthorityEvents,
    syncFiscalNotificationsWorkspace,
    user,
  ]);

  useEffect(() => {
    void adopt();
    return () => {
      adoptionSequence.current += 1;
    };
  }, [adopt, revision]);

  if (state.status === "ready") return <>{children}</>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <Database className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-black">
          {state.status === "checking"
            ? "Preparando los datos de tu empresa"
            : "Tus datos locales siguen protegidos"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {state.status === "checking"
            ? "Estamos reconstruyendo en este dispositivo la copia confirmada por el servidor central. No se está subiendo la copia anterior."
            : state.message}
        </p>
        {state.status === "checking" ? (
          <RefreshCw className="mx-auto mt-6 h-6 w-6 animate-spin text-blue-600" />
        ) : (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-5 font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
