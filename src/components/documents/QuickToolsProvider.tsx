"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { QuickCalculator } from "./QuickCalculator";
import { QuickPostIt } from "./QuickPostIt";
import {
  parseQuickPostItSession,
  QUICK_POST_IT_SESSION_KEY,
  type QuickPostItSession,
} from "./quick-post-it-session";

interface QuickToolsContextValue {
  calculatorOpen: boolean;
  postItOpen: boolean;
  openCalculator: () => void;
  openPostIt: () => void;
}

const QuickToolsContext = createContext<QuickToolsContextValue | null>(null);

const EMPTY_POST_IT_SESSION: QuickPostItSession = {
  open: false,
  text: "",
};

export function QuickToolsProvider({ children }: { children: ReactNode }) {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [postItSession, setPostItSession] = useState<QuickPostItSession>(
    EMPTY_POST_IT_SESSION,
  );

  useEffect(() => {
    try {
      const restored = parseQuickPostItSession(
        window.sessionStorage.getItem(QUICK_POST_IT_SESSION_KEY),
      );
      if (restored) setPostItSession(restored);
    } catch {
      // The note still works in memory when browser session storage is unavailable.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      if (!postItSession.open) {
        window.sessionStorage.removeItem(QUICK_POST_IT_SESSION_KEY);
        return;
      }

      window.sessionStorage.setItem(
        QUICK_POST_IT_SESSION_KEY,
        JSON.stringify(postItSession),
      );
    } catch {
      // Keep the in-memory note usable even if persistence is blocked.
    }
  }, [hydrated, postItSession]);

  const value = useMemo<QuickToolsContextValue>(
    () => ({
      calculatorOpen,
      postItOpen: postItSession.open,
      openCalculator: () => setCalculatorOpen(true),
      openPostIt: () =>
        setPostItSession((current) => ({ ...current, open: true })),
    }),
    [calculatorOpen, postItSession.open],
  );

  function closePostIt() {
    setPostItSession(EMPTY_POST_IT_SESSION);
  }

  return (
    <QuickToolsContext.Provider value={value}>
      {children}
      {calculatorOpen ? (
        <QuickCalculator onClose={() => setCalculatorOpen(false)} />
      ) : null}
      {hydrated && postItSession.open ? (
        <QuickPostIt
          value={postItSession.text}
          onChange={(text) =>
            setPostItSession((current) => ({ ...current, text }))
          }
          onClose={closePostIt}
        />
      ) : null}
    </QuickToolsContext.Provider>
  );
}

export function useQuickTools(): QuickToolsContextValue {
  const context = useContext(QuickToolsContext);
  if (!context) {
    throw new Error("useQuickTools must be used inside QuickToolsProvider");
  }
  return context;
}
