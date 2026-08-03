"use client";

import { useCallback } from "react";

import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "@/hooks/useCentralAuthorityPlanGate";
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
  const { getCurrentData, upsertCustomerForDocument: upsertCustomerFallback } =
    useAppStore();
  const planGate = useCentralAuthorityPlanGate();
  const userId = planGate.centralUserId;
  const { createCustomer } = useCentralCustomerCreate();
  const { updateCustomer } = useCentralCustomerMutations();

  const upsertDocumentCustomer = useCallback(
    async (input: ClientInput, selectedCustomerId: string | null) => {
      if (planGate.mode === "loading") {
        return centralAuthorityPlanLoadingFailure();
      }
      try {
        return await upsertCustomerForDocumentWithCentralCanary({
          userId,
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
      planGate.mode,
      updateCustomer,
      upsertCustomerFallback,
      userId,
    ],
  );

  return { upsertDocumentCustomer };
}
