"use client";

import { useCloudAuth } from "@/context/CloudAuthContext";
import { useCompany } from "@/context/CompanyContext";
import { previewAccessForAccount } from "@/lib/private-preview-access";

export function usePrivatePreviewAccess() {
  const { authReady, user } = useCloudAuth();
  const { activeCompany, ready: companiesReady } = useCompany();
  const access = previewAccessForAccount(user, activeCompany);
  return {
    access,
    authReady,
    taxAccessReady: authReady && (!user || access === "full" || companiesReady),
  };
}
