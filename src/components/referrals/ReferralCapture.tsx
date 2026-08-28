"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCloudSync } from "@/context/CloudSyncContext";
import { hasPrivatePreviewAccess } from "@/lib/private-preview-access";
import { captureReferralFromSearchParams } from "@/lib/referrals/storage";

/** Guarda ?ref= en localStorage al entrar en la app. */
export function ReferralCapture() {
  const searchParams = useSearchParams();
  const { authReady, user } = useCloudSync();

  useEffect(() => {
    if (!authReady || !hasPrivatePreviewAccess(user?.email)) return;
    captureReferralFromSearchParams(searchParams);
  }, [authReady, searchParams, user?.email]);

  return null;
}
