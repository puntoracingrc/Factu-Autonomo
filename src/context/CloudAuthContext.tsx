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
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let authEventSeen = false;

    void getSupabaseClientAsync().then((supabase) => {
      if (cancelled) return;
      if (!supabase) {
        setAuthReady(true);
        return;
      }
      void supabase.auth
        .getUser()
        .then(({ data }) => {
          if (!cancelled && !authEventSeen) {
            setAuthenticatedUser(data.user);
          }
        })
        .finally(() => {
          if (!cancelled) setAuthReady(true);
        });
      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (cancelled) return;
          authEventSeen = true;
          setAuthenticatedUser(session?.user ?? null);
          setAuthReady(true);
        },
      );
      unsubscribe = () => listener.subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [cloudEnabled, setAuthenticatedUser]);

  const signOutAuthSession = useCallback(async (): Promise<string | null> => {
    const supabase = await getSupabaseClientAsync();
    if (supabase) {
      const { error } = await supabase.auth.signOut();
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
