"use client";

import { useEffect, useRef } from "react";
import { useCloudSync } from "@/context/CloudSyncContext";
import { tryRedeemPendingReferral } from "@/lib/referrals/client";

/** Aplica un código ?ref= pendiente cuando hay sesión iniciada. */
export function ReferralRedeemOnLogin() {
  const { user } = useCloudSync();
  const attemptedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      attemptedForUser.current = null;
      return;
    }
    if (attemptedForUser.current === user.id) return;
    attemptedForUser.current = user.id;

    void tryRedeemPendingReferral().then((message) => {
      if (message) {
        window.dispatchEvent(
          new CustomEvent("fa-referral-success", { detail: { message } }),
        );
      }
    });
  }, [user?.id]);

  return null;
}
