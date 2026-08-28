"use client";

import { useEffect, useRef } from "react";
import { useCloudSync } from "@/context/CloudSyncContext";
import { tryRedeemPendingReferral } from "@/lib/referrals/client";
import { hasPrivatePreviewAccess } from "@/lib/private-preview-access";

/** Aplica un código ?ref= pendiente cuando hay sesión iniciada. */
export function ReferralRedeemOnLogin() {
  const { user } = useCloudSync();
  const attemptedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id || !hasPrivatePreviewAccess(user.email)) {
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
  }, [user?.email, user?.id]);

  return null;
}
