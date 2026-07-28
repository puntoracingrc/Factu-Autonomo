"use client";

import { useEffect, useState } from "react";

import {
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
  documentLabel,
}: CentralInvoiceAuthorityFormPolicyNoticeProps) {
  const [checking, setChecking] = useState(false);
  const [policy, setPolicy] =
    useState<CentralInvoiceAuthorityFormIssuePolicyDecision | null>(null);

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
  }, [eligible, publicFormCanaryEnabled]);

  const notice = describeCentralInvoiceAuthorityFormPolicyNotice({
    policy,
    checking,
    publicFormCanaryEnabled,
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
