"use client";

import { Clock3, LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  NAVIGATION_SLOW_DELAY_MS,
  NAVIGATION_STALLED_DELAY_MS,
  navigationFeedbackMessage,
  type NavigationFeedbackPhase,
  type PendingAppNavigation,
} from "@/components/layout/app-navigation-feedback";

export function AppNavigationFeedback({
  navigation,
  onRetry,
}: {
  navigation: PendingAppNavigation | null;
  onRetry: () => void;
}) {
  const [feedbackState, setFeedbackState] = useState<{
    href: string;
    phase: NavigationFeedbackPhase;
  }>({ href: "", phase: "pending" });

  useEffect(() => {
    if (!navigation) return;
    const href = navigation.href;
    setFeedbackState({ href, phase: "pending" });

    const slowTimer = window.setTimeout(
      () => setFeedbackState({ href, phase: "slow" }),
      NAVIGATION_SLOW_DELAY_MS,
    );
    const stalledTimer = window.setTimeout(
      () => setFeedbackState({ href, phase: "stalled" }),
      NAVIGATION_STALLED_DELAY_MS,
    );

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(stalledTimer);
    };
  }, [navigation]);

  if (!navigation) return null;

  const phase =
    feedbackState.href === navigation.href ? feedbackState.phase : "pending";
  const message = navigationFeedbackMessage(navigation.label, phase);

  return (
    <>
      <div
        className="app-navigation-progress"
        role="progressbar"
        aria-label={`Abriendo ${navigation.label}`}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {message}
      </p>
      {phase !== "pending" ? (
        <div
          className="pointer-events-none fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[90] flex w-[min(calc(100%_-_2rem),28rem)] -translate-x-1/2 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:bottom-auto lg:top-[calc(env(safe-area-inset-top)+0.75rem)]"
          role="status"
          aria-live="polite"
        >
          {phase === "stalled" ? (
            <Clock3 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          ) : (
            <LoaderCircle
              className="h-4 w-4 shrink-0 text-blue-600 motion-safe:animate-spin"
              aria-hidden="true"
            />
          )}
          <span className="min-w-0 flex-1">{message}</span>
          {phase === "stalled" ? (
            <button
              type="button"
              onClick={onRetry}
              className="pointer-events-auto inline-flex min-h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
