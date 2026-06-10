"use client";

import { useEffect } from "react";
import {
  showFactuToast,
  tryConsumeDailyGreeting,
} from "@/lib/factu/occasional";

export function FactuDailyGreeting({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const greeting = tryConsumeDailyGreeting();
    if (greeting) showFactuToast(greeting, 4000);
  }, [enabled]);

  return null;
}
