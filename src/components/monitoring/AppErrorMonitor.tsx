"use client";

import { useEffect } from "react";
import { reportAppError } from "@/lib/monitoring/client";

export function AppErrorMonitor() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      void reportAppError({
        severity: "error",
        area: "browser",
        code: "window_error",
        message: event.message || "Error de navegador",
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      void reportAppError({
        severity: "error",
        area: "browser",
        code: "unhandled_rejection",
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Promesa rechazada sin gestionar",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

