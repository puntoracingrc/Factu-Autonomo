"use client";

import { useEffect } from "react";
import {
  DATA_ACCESS_EVENT_NAME,
  type DataAccessEventDetail,
} from "@/lib/security/data-access-events";
import { getSupabaseClientAsync } from "@/lib/supabase/client";

const MAX_PENDING_REPORTS = 20;

export function DataAccessEventReporter() {
  useEffect(() => {
    let pendingReports = 0;

    async function report(detail: DataAccessEventDetail) {
      if (pendingReports >= MAX_PENDING_REPORTS) return;
      pendingReports += 1;

      try {
        const supabase = await getSupabaseClientAsync();
        const { data } = supabase
          ? await supabase.auth.getSession()
          : { data: { session: null } };
        const token = data.session?.access_token;
        if (!token) return;

        await fetch("/api/security/data-access-event", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(detail),
          cache: "no-store",
          keepalive: true,
        });
      } catch {
        // La observabilidad nunca debe interrumpir el trabajo del usuario.
      } finally {
        pendingReports -= 1;
      }
    }

    function handleEvent(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as DataAccessEventDetail | undefined;
      if (!detail) return;
      void report(detail);
    }

    window.addEventListener(DATA_ACCESS_EVENT_NAME, handleEvent);
    return () => window.removeEventListener(DATA_ACCESS_EVENT_NAME, handleEvent);
  }, []);

  return null;
}
