"use client";
import { useEffect, useState } from "react";
import { useCentralAuthorityPlanGate } from "./useCentralAuthorityPlanGate";
import { expenseOriginalStatuses } from "@/lib/expense-originals/client";
import {
  EXPENSE_ORIGINAL_REFRESH_EVENT,
  type ExpenseOriginalStatuses,
} from "@/lib/expense-originals/types";
import type { Expense } from "@/lib/types";

export function useExpenseOriginals(
  expenses: readonly Pick<Expense, "id" | "sourceInboxItemId">[],
) {
  const { centralUserId: scope } = useCentralAuthorityPlanGate();
  const idsKey = JSON.stringify(
    expenses.map((e) => [e.id, e.sourceInboxItemId ?? ""]),
  );
  const [state, setState] = useState<{
    scope: string | null;
    originals: ExpenseOriginalStatuses;
    error: string | null;
    loading: boolean;
  }>({ scope: null, originals: {}, error: null, loading: false });
  useEffect(() => {
    const ids = (JSON.parse(idsKey) as [string, string][]).map((row) => row[0]);
    if (!scope || !ids.length) return;
    let disposed = false;
    let controller: AbortController | null = null;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const ownController = controller;
      setState((previous) => ({
        scope,
        originals: previous.scope === scope ? previous.originals : {},
        error: null,
        loading: true,
      }));
      try {
        const originals = await expenseOriginalStatuses(
          ids,
          scope,
          ownController.signal,
        );
        if (!disposed && !ownController.signal.aborted)
          setState({ scope, originals, error: null, loading: false });
      } catch {
        if (!disposed && !ownController.signal.aborted)
          setState((previous) => ({
            ...previous,
            scope,
            error:
              "No se pudieron consultar los archivos originales. Reintenta abrirlos cuando haya conexión.",
            loading: false,
          }));
      }
    };
    const refresh = (event: Event) => {
      if (
        (event as CustomEvent<{ ownerScope?: string }>).detail?.ownerScope ===
        scope
      )
        void load();
    };
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    window.addEventListener(EXPENSE_ORIGINAL_REFRESH_EVENT, refresh);
    window.addEventListener("online", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      controller?.abort();
      window.removeEventListener(EXPENSE_ORIGINAL_REFRESH_EVENT, refresh);
      window.removeEventListener("online", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [idsKey, scope]);
  return {
    ownerScope: scope,
    enabled: Boolean(scope),
    originals: state.scope === scope ? state.originals : {},
    error: state.scope === scope ? state.error : null,
    loading: Boolean(scope) && (state.scope !== scope || state.loading),
  };
}
