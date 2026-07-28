"use client";

import { useEffect, useState } from "react";

import {
  isCentralInvoiceAuthorityFormCanaryEnabledForUser,
  resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser,
  type CentralInvoiceAuthorityFormIssuePolicyDecision,
} from "@/lib/central-invoice-authority/form-canary-client";
import {
  describeCentralInvoiceAuthorityFormPolicyNotice,
  type CentralInvoiceAuthorityFormPolicyNoticeTone,
} from "@/lib/central-invoice-authority/form-canary-presentation";

interface CentralInvoiceAuthorityFormPolicyNoticeProps {
  eligible: boolean;
  publicFormCanaryEnabled: boolean;
  userId?: string | null;
  documentLabel: string;
}

const TONE_CLASSES: Record<CentralInvoiceAuthorityFormPolicyNoticeTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export function CentralInvoiceAuthorityFormPolicyNotice({
  eligible,
  publicFormCanaryEnabled,
  userId,
  documentLabel,
}: CentralInvoiceAuthorityFormPolicyNoticeProps) {
  const [checking, setChecking] = useState(false);
  const [policy, setPolicy] =
    useState<CentralInvoiceAuthorityFormIssuePolicyDecision | null>(null);
  const publicFormCanaryEnabledForUser =
    isCentralInvoiceAuthorityFormCanaryEnabledForUser({
      publicFormCanaryEnabled,
      userId,
    });

  useEffect(() => {
    if (!eligible) {
      setChecking(false);
      setPolicy(null);
      return;
    }

    let cancelled = false;
    setChecking(true);
    void resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser({
      publicFormCanaryEnabled,
      publicFormCanaryUserId: userId,
    })
      .then((nextPolicy) => {
        if (!cancelled) setPolicy(nextPolicy);
      })
      .catch(() => {
        if (!cancelled) setPolicy(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eligible, publicFormCanaryEnabled, userId]);

  const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
    policy,
    checking,
    publicFormCanaryEnabled: publicFormCanaryEnabledForUser,
    documentLabel,
  });

  if (!notice.visible) return null;

  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${TONE_CLASSES[notice.tone]}`}
    >
      <p className="font-bold">{notice.title}</p>
      <p className="mt-1">{notice.message}</p>
    </div>
  );
}
