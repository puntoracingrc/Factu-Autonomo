"use client";

import { useEffect, useState } from "react";
import {
  DEMO_MODE_EVENT,
  isDemoWorkspaceMode,
} from "@/lib/demo-workspace";

export function useDemoWorkspaceMode(): boolean {
  const [enabled, setEnabled] = useState(() => isDemoWorkspaceMode());

  useEffect(() => {
    function refresh() {
      setEnabled(isDemoWorkspaceMode());
    }

    window.addEventListener(DEMO_MODE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DEMO_MODE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return enabled;
}
