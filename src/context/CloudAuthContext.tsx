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
import type { User } from "@supabase/supabase-js";

import { clearDriveAccessToken } from "@/lib/google-drive/backup";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import { isCloudEnabled } from "@/lib/supabase/config";
import { recoverPersistentSession } from "@/lib/supabase/persistent-session";
import { setActiveWorkspaceOwnerScope } from "@/lib/workspace-owner-runtime";

interface CloudAuthValue {
  cloudEnabled: boolean;
  authReady: boolean;
  user: User | null;
  email: string;
  setEmail: (value: string) => void;
  setAuthenticatedUser: (user: User | null) => void;
  signOutAuthSession: () => Promise<string | null>;
}

const CloudAuthContext = createContext<CloudAuthValue | null>(null);

export function CloudAuthProvider({ children }: { children: React.ReactNode }) {
  const cloudEnabled = isCloudEnabled();
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const authenticatedOwnerRef = useRef<string | null>(null);

  const setAuthenticatedUser = useCallback((next: User | null) => {
    const nextOwner = next?.id ?? null;
    if (authenticatedOwnerRef.current !== nextOwner) clearDriveAccessToken();
    authenticatedOwnerRef.current = nextOwner;
    setActiveWorkspaceOwnerScope(nextOwner);
    setUser(next);
    if (next?.email) setEmail(next.email);
  }, []);

  useEffect(() => {
    if (!cloudEnabled) {
      setAuthReady(true);
      return;
    }
    const recovery = recoverPersistentSession({
      getAuth: async () => (await getSupabaseClientAsync())?.auth ?? null,
      onUser: setAuthenticatedUser,
      onReady: () => setAuthReady(true),
      canRetry: () => navigator.onLine && document.visibilityState !== "hidden",
    });
    const resume = () => recovery.retry();
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      recovery.dispose();
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [cloudEnabled, setAuthenticatedUser]);

  const signOutAuthSession = useCallback(async (): Promise<string | null> => {
    const supabase = await getSupabaseClientAsync();
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) return error.message;
    }
    setAuthenticatedUser(null);
    return null;
  }, [setAuthenticatedUser]);

  const value = useMemo<CloudAuthValue>(
    () => ({
      cloudEnabled,
      authReady,
      user,
      email,
      setEmail,
      setAuthenticatedUser,
      signOutAuthSession,
    }),
    [
      authReady,
      cloudEnabled,
      email,
      setAuthenticatedUser,
      signOutAuthSession,
      user,
    ],
  );

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  );
}

export function useCloudAuth(): CloudAuthValue {
  const value = useContext(CloudAuthContext);
  if (!value) {
    throw new Error("useCloudAuth debe usarse dentro de CloudAuthProvider");
  }
  return value;
}
