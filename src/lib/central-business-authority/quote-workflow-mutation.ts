"use client";

import type {
  AppDataDurabilityResult,
  AppDataTransition,
} from "@/lib/app-data-durability";
import { editableQuoteWithLocalStatus } from "@/lib/document-integrity/quote-status";
import {
  canMarkQuoteAsAccepted,
  canMarkQuoteAsRejected,
  canUnmarkQuoteAsAccepted,
  canUnmarkQuoteAsRejected,
} from "@/lib/quotes";
import type { AppData, Document } from "@/lib/types";
import {
  mutateCentralBusinessEntityWithCanary,
  type CentralBusinessEntityMutationDependencies,
  type CentralBusinessPreparedLocalMutation,
} from "./entity-mutation-canary";
import { mutateCentralBusinessFromBrowser } from "./mutation-client";
import type { CentralBusinessJson } from "./mutation-command";
import {
  isCentralQuoteCreateCanaryEnabledForUser,
  type CentralQuoteCreateCanaryEnvironment,
} from "./quote-create-canary";

export type QuoteWorkflowAction = "accept" | "unaccept" | "reject" | "unreject";

export function prepareQuoteWorkflowTransition(
  data: AppData,
  id: string,
  action: QuoteWorkflowAction,
  now: string,
): CentralBusinessPreparedLocalMutation<Document> {
  const matches = data.documents.filter((document) => document.id === id);
  const current = matches[0];
  const allowed = {
    accept: canMarkQuoteAsAccepted,
    unaccept: canUnmarkQuoteAsAccepted,
    reject: canMarkQuoteAsRejected,
    unreject: canUnmarkQuoteAsRejected,
  }[action];
  if (matches.length !== 1 || !allowed(current)) {
    return {
      ok: false,
      error:
        "El presupuesto ya no permite este cambio. Revisa su estado actual.",
    };
  }
  try {
    const updated = editableQuoteWithLocalStatus(
      {
        ...current,
        status:
          action === "accept"
            ? "aceptado"
            : action === "reject"
              ? "rechazado"
              : "enviado",
        acceptedAt:
          action === "accept" ? (current.acceptedAt ?? now) : undefined,
      },
      now,
    );
    return {
      ok: true,
      payload: JSON.parse(JSON.stringify(updated)) as CentralBusinessJson,
      transition: {
        data: {
          ...data,
          documents: data.documents.map((document) =>
            document.id === id ? updated : document,
          ),
        },
        value: updated,
      },
    };
  } catch {
    return {
      ok: false,
      error:
        "El presupuesto no supera la comprobación de integridad. No se ha modificado.",
    };
  }
}

type Dependencies = Omit<
  CentralBusinessEntityMutationDependencies<Document>,
  "fallback" | "prepareLocal" | "commitLocal"
> & {
  commitLocal(
    expected: AppData,
    transition: AppDataTransition<Document>,
  ): AppDataDurabilityResult<Document>;
  commitCentral: CentralBusinessEntityMutationDependencies<Document>["commitLocal"];
};

export async function changeQuoteWorkflowWithCentralAuthority(input: {
  userId: string | null;
  quoteId: string;
  action: QuoteWorkflowAction;
  environment?: CentralQuoteCreateCanaryEnvironment;
  dependencies: Dependencies;
}) {
  const { dependencies } = input;
  const enabled = isCentralQuoteCreateCanaryEnabledForUser(
    input.userId,
    input.environment,
  );
  return mutateCentralBusinessEntityWithCanary<Document>({
    enabled,
    userId: input.userId,
    entityType: "quote",
    entityId: input.quoteId,
    operationKind: "upsert",
    operationIdPrefix: "CENTRAL_QUOTE_WORKFLOW",
    entityLabel: "este presupuesto",
    dependencies: {
      ...dependencies,
      mutate:
        dependencies.mutate ??
        ((mutation) =>
          mutateCentralBusinessFromBrowser(mutation, {
            expectedOwnerScope: input.userId,
          })),
      fallback: () => {
        // A cloud quote without a confirmed version must never silently become local.
        if (enabled)
          return {
            ok: false,
            error:
              "Falta recibir la versión central del presupuesto. Sincroniza y vuelve a intentarlo.",
          };
        const data = dependencies.getCurrentData();
        const prepared = prepareQuoteWorkflowTransition(
          data,
          input.quoteId,
          input.action,
          (dependencies.now ?? (() => new Date().toISOString()))(),
        );
        if (!prepared.ok) return prepared;
        const committed = dependencies.commitLocal(data, prepared.transition);
        return committed.status === "applied"
          ? { ok: true, value: committed.value, delivery: "local" }
          : {
              ok: false,
              error:
                "No se pudo guardar el estado del presupuesto. No se ha aplicado el cambio.",
            };
      },
      prepareLocal: ({ data, now }) =>
        prepareQuoteWorkflowTransition(data, input.quoteId, input.action, now),
      commitLocal: dependencies.commitCentral,
    },
  });
}
