"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, HardDrive, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import { useCloudAuth } from "@/context/CloudAuthContext";
import { WorkspaceStorageProvider } from "@/context/WorkspaceStorageContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { claimLegacyLocalCloudDeviceToken } from "@/lib/cloud/device-token";
import {
  LEGACY_APP_DATA_STORAGE_KEY,
  projectAppDataForPersistence,
  readPersistedDataSnapshot,
} from "@/lib/storage";
import { EMPTY_DATA, type AppData } from "@/lib/types";
import { hasWorkspaceContent } from "@/lib/workspace-state";
import { legacyWorkspaceMatchesVerifiedOwner } from "@/lib/workspace-legacy-ownership";
import {
  claimLegacyWorkspaceAuxiliarySessionStorage,
  claimLegacyWorkspaceAuxiliaryStorage,
} from "@/lib/workspace-auxiliary-storage";
import { setActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";
import {
  claimWorkspaceStorageCandidate,
  initializeWorkspaceStorage,
  preserveWorkspaceStorageCandidate,
  readExistingGuestWorkspaceScope,
  resolveWorkspaceStorage,
  type WorkspaceStorageResolution,
  type WorkspaceStorageScope,
} from "@/lib/workspace-storage";

interface CandidateSummary {
  businessName: string;
  nif: string;
  documents: number;
  customers: number;
  suppliers: number;
  expenses: number;
}

type BoundaryState =
  | { status: "loading" }
  | { status: "blocked"; message: string }
  | {
      status: "review_required";
      resolution: Extract<
        WorkspaceStorageResolution,
        { status: "review_required" }
      >;
      summary: CandidateSummary | null;
    }
  | {
      status: "ready";
      scope: WorkspaceStorageScope;
    };

function candidateSummary(data: AppData | null): CandidateSummary | null {
  if (!data) return null;
  return {
    businessName:
      data.profile.commercialName?.trim() ||
      data.profile.name.trim() ||
      "Empresa sin nombre",
    nif: data.profile.nif.trim(),
    documents: data.documents.length,
    customers: data.customers.length,
    suppliers: data.suppliers.length,
    expenses: data.expenses.length,
  };
}

function emptyWorkspaceRaw(): string {
  return JSON.stringify(projectAppDataForPersistence(EMPTY_DATA));
}

function claimLegacyAuxiliaryData(ownerScope: string): void {
  claimLegacyWorkspaceAuxiliaryStorage(ownerScope, localStorage);
  claimLegacyWorkspaceAuxiliarySessionStorage(ownerScope, sessionStorage);
  claimLegacyLocalCloudDeviceToken(ownerScope);
}

export function WorkspaceStorageBoundary({
  children,
}: {
  children: (scope: WorkspaceStorageScope) => React.ReactNode;
}) {
  const {
    authReady,
    user,
    signOutAuthSession,
  } = useCloudAuth();
  const demoMode = useDemoWorkspaceMode();
  const [state, setState] = useState<BoundaryState>({ status: "loading" });
  const [confirmed, setConfirmed] = useState(false);
  const resolutionSequence = useRef(0);
  const ownerId = user?.id ?? null;

  const resolve = useCallback(async () => {
    const sequence = resolutionSequence.current + 1;
    resolutionSequence.current = sequence;
    const setCurrentState = (next: BoundaryState) => {
      if (resolutionSequence.current !== sequence) return;
      setActiveWorkspaceOwnerScope(
        next.status === "ready" ? next.scope.ownerScope : null,
      );
      setState(next);
    };
    if (!authReady || typeof localStorage === "undefined") {
      setCurrentState({ status: "loading" });
      return;
    }
    setCurrentState({ status: "loading" });
    setConfirmed(false);
    try {
      const legacyData = readPersistedDataSnapshot(
        LEGACY_APP_DATA_STORAGE_KEY,
      );
      const legacyHasContent = Boolean(
        legacyData && hasWorkspaceContent(legacyData),
      );
      const guestScope = readExistingGuestWorkspaceScope(localStorage);
      const guestData = guestScope
        ? readPersistedDataSnapshot(guestScope.storageKey)
        : null;
      const guestHasContent = Boolean(
        guestData && hasWorkspaceContent(guestData),
      );
      const canAutoClaimLegacy = Boolean(
        ownerId &&
          legacyData &&
          legacyHasContent &&
          (await legacyWorkspaceMatchesVerifiedOwner({
            data: legacyData,
            ownerScope: ownerId,
            storage: localStorage,
          })),
      );
      if (resolutionSequence.current !== sequence) return;
      const resolution = resolveWorkspaceStorage({
        userId: ownerId,
        demoMode: !ownerId && demoMode,
        legacyHasContent,
        guestHasContent,
        canAutoClaimLegacy,
        emptyRaw: emptyWorkspaceRaw(),
        storage: localStorage,
      });

      if (resolution.status === "blocked") {
        setCurrentState(resolution);
        return;
      }
      if (resolution.status === "review_required") {
        setCurrentState({
          status: "review_required",
          resolution,
          summary: candidateSummary(
            readPersistedDataSnapshot(resolution.candidateStorageKey),
          ),
        });
        return;
      }
      if (
        resolution.scope.kind === "user" &&
        (resolution.migration === "verified_legacy" ||
          resolution.migration === "verified_local")
      ) {
        claimLegacyAuxiliaryData(resolution.scope.ownerScope);
      }
      setCurrentState({ status: "ready", scope: resolution.scope });
    } catch {
      setCurrentState({
        status: "blocked",
        message:
          "No se pudo preparar el espacio local de esta sesión con seguridad.",
      });
    }
  }, [authReady, demoMode, ownerId]);

  useEffect(() => {
    void resolve();
    return () => {
      resolutionSequence.current += 1;
    };
  }, [resolve]);

  const accountLabel = user?.email ?? "esta cuenta";
  const review = state.status === "review_required" ? state : null;
  const summaryText = useMemo(() => {
    if (!review?.summary) return "No se pudo leer el resumen de la copia local.";
    const value = review.summary;
    return `${value.documents} documentos, ${value.customers} clientes, ${value.suppliers} proveedores y ${value.expenses} gastos.`;
  }, [review]);

  function confirmLocalOwnership() {
    if (!review || !confirmed) return;
    const applied = claimWorkspaceStorageCandidate({
      scope: review.resolution.scope,
      candidateStorageKey: review.resolution.candidateStorageKey,
      source: "confirmed_local",
      storage: localStorage,
    });
    if (!applied) {
      setState({
        status: "blocked",
        message: "El navegador no pudo confirmar la copia local.",
      });
      return;
    }
    claimLegacyAuxiliaryData(review.resolution.scope.ownerScope);
    setActiveWorkspaceOwnerScope(review.resolution.scope.ownerScope);
    setState({ status: "ready", scope: review.resolution.scope });
  }

  function startFromServer() {
    if (!review) return;
    if (
      !preserveWorkspaceStorageCandidate({
        ownerScope: review.resolution.scope.ownerScope,
        candidateStorageKey: review.resolution.candidateStorageKey,
        storage: localStorage,
      })
    ) {
      setState({
        status: "blocked",
        message:
          "No se pudo conservar la copia local anterior. No se ha reemplazado nada.",
      });
      return;
    }
    const initialized = initializeWorkspaceStorage({
      scope: review.resolution.scope,
      emptyRaw: emptyWorkspaceRaw(),
      source: "server",
      storage: localStorage,
      requireServerAdoption: true,
    });
    if (!initialized) {
      setState({
        status: "blocked",
        message:
          "No se pudo crear la copia aislada del servidor. La copia anterior sigue conservada.",
      });
      return;
    }
    setActiveWorkspaceOwnerScope(review.resolution.scope.ownerScope);
    setState({ status: "ready", scope: review.resolution.scope });
  }

  const readyMatchesSession =
    state.status !== "ready" ||
    (ownerId
      ? state.scope.kind === "user" && state.scope.ownerScope === ownerId
      : state.scope.kind !== "user");

  if (state.status === "ready" && readyMatchesSession) {
    return (
      <WorkspaceStorageProvider scope={state.scope}>
        {children(state.scope)}
      </WorkspaceStorageProvider>
    );
  }

  if (state.status === "review_required") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950">
        <section className="w-full max-w-2xl rounded-lg border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <HardDrive className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-black">Confirma qué datos son tuyos</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Este navegador contiene una copia creada antes de que Factu
                separase los datos por cuenta. No se subirá ni reemplazará nada
                hasta que elijas.
              </p>
            </div>
          </div>

          <div className="mt-6 border-y border-slate-200 py-5">
            <p className="text-sm font-bold text-slate-500">Sesión actual</p>
            <p className="mt-1 font-black">{accountLabel}</p>
            <p className="mt-4 text-sm font-bold text-slate-500">Copia local encontrada</p>
            <p className="mt-1 text-lg font-black">
              {state.summary?.businessName ?? "Copia local sin identificar"}
            </p>
            {state.summary?.nif ? (
              <p className="mt-1 text-sm text-slate-600">NIF: {state.summary.nif}</p>
            ) : null}
            <p className="mt-2 text-sm text-slate-600">{summaryText}</p>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            Confirmo que esta copia local pertenece a {accountLabel}.
          </label>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!confirmed}
              onClick={confirmLocalOwnership}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShieldCheck className="h-5 w-5" />
              Usar esta copia local
            </button>
            <button
              type="button"
              onClick={startFromServer}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 font-bold text-slate-800 hover:bg-slate-50"
            >
              <Database className="h-5 w-5" />
              Usar la copia del servidor
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Al usar el servidor, esta copia local se conserva aparte para una
            posible recuperación y nunca se sube a la cuenta actual.
          </p>
          <button
            type="button"
            onClick={() => void signOutAuthSession()}
            className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-950">
      <section className="w-full max-w-md text-center">
        {state.status === "blocked" ? (
          <>
            <h1 className="text-xl font-black">No hemos tocado tus datos</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {state.message}
            </p>
            <button
              type="button"
              onClick={() => void resolve()}
              className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Reintentar
            </button>
          </>
        ) : (
          <>
            <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />
            <p className="mt-4 font-bold">Preparando los datos de tu empresa</p>
          </>
        )}
      </section>
    </main>
  );
}
