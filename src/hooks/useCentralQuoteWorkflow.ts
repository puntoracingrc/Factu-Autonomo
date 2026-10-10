"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
import type { QuoteWorkflowAction } from "@/lib/central-business-authority/quote-workflow-mutation";

export function useCentralQuoteWorkflow() {
  const {
    getCurrentData,
    syncCentralBusinessEvents,
    commitPreparedAppDataDurably,
    commitPreparedCentralBusinessAppDataDurably,
  } = useAppStore();
  const gate = useCentralAuthorityPlanGate();
  const [mode, userId] = [gate.mode, gate.centralUserId];
  const latestScope = useRef({ mode, userId });
  latestScope.current = { mode, userId };

  return useCallback(
    async (quoteId: string, action: QuoteWorkflowAction) => {
      if (mode === "loading") return centralAuthorityPlanLoadingFailure();
      const { changeQuoteWorkflowWithCentralAuthority } = await import(
        "@/lib/central-business-authority/quote-workflow-mutation"
      );
      const isCurrent = () =>
        latestScope.current.mode === mode &&
        latestScope.current.userId === userId;
      if (!isCurrent())
        return {
          ok: false as const,
          error:
            "La empresa activa ha cambiado. Vuelve a abrir el presupuesto.",
        };
      return changeQuoteWorkflowWithCentralAuthority({
        userId,
        quoteId,
        action,
        dependencies: {
          getCurrentData,
          syncEventsBeforeWrite: userId
            ? () => syncCentralBusinessEvents(userId)
            : undefined,
          commitLocal: (expected, transition) =>
            isCurrent()
              ? commitPreparedAppDataDurably(expected, transition)
              : { status: "blocked", reason: "stale_precondition" },
          commitCentral: (expected, transition) =>
            isCurrent()
              ? commitPreparedCentralBusinessAppDataDurably(
                  expected,
                  transition,
                )
              : { status: "blocked", reason: "stale_precondition" },
        },
      });
    },
    [
      mode,
      userId,
      getCurrentData,
      syncCentralBusinessEvents,
      commitPreparedAppDataDurably,
      commitPreparedCentralBusinessAppDataDurably,
    ],
  );
}
