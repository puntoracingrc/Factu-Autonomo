"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureReferralFromSearchParams } from "@/lib/referrals/storage";

/** Guarda ?ref= en localStorage al entrar en la app. */
export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureReferralFromSearchParams(searchParams);
  }, [searchParams]);

  return null;
}
