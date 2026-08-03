"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import {
  resolveCentralBusinessUserId,
  useCentralBusinessResolvedUserId,
} from "@/hooks/useCentralBusinessUserId";
import { useCentralCustomerCreate } from "@/hooks/useCentralCustomerCreate";
import { useCentralCustomerMutations } from "@/hooks/useCentralCustomerMutations";
import {
  upsertCustomerForDocumentWithCentralCanary,
  type CentralCustomerDocumentUpsertResult,
} from "@/lib/central-business-authority/customer-document-upsert-canary";
import type { ClientInput } from "@/lib/customers";

export function useCentralDocumentCustomerUpsert(): {
  upsertDocumentCustomer: (
    input: ClientInput,
    selectedCustomerId: string | null,
  ) => Promise<CentralCustomerDocumentUpsertResult>;
} {
  const {
    getCurrentData,
    upsertCustomerForDocument: upsertCustomerFallback,
  } = useAppStore();
  const { user } = useCloudSync();
  const userId = useCentralBusinessResolvedUserId(user?.id);
  const { createCustomer } = useCentralCustomerCreate();
  const { updateCustomer } = useCentralCustomerMutations();

  const upsertDocumentCustomer = useCallback(
    async (input: ClientInput, selectedCustomerId: string | null) => {
      try {
        const resolvedUserId = await resolveCentralBusinessUserId(userId);
        return await upsertCustomerForDocumentWithCentralCanary({
          userId: resolvedUserId,
          customerInput: input,
          selectedCustomerId,
          dependencies: {
            getCurrentData,
            fallback: upsertCustomerFallback,
            createCustomer,
            updateCustomer,
          },
        });
      } catch {
        return {
          ok: false as const,
          error:
            "No se pudo preparar el cliente del documento. No se ha guardado la factura ni el presupuesto.",
        };
      }
    },
    [
      createCustomer,
      getCurrentData,
      updateCustomer,
      upsertCustomerFallback,
      userId,
    ],
  );

  return { upsertDocumentCustomer };
}
