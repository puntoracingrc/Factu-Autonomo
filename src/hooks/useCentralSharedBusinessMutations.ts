"use client";

import { useCallback, useRef } from "react";
import { useAppStore } from "@/context/AppStore";
import {
  centralAuthorityPlanLoadingFailure,
  useCentralAuthorityPlanGate,
} from "./useCentralAuthorityPlanGate";
import type { AppDataTransition } from "@/lib/app-data-durability";
import type { AppData, Document, Supplier } from "@/lib/types";
import type { MergeCustomersOptions } from "@/lib/document-integrity/customer-merge";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import type { SharedTransitionResult } from "@/lib/central-business-authority/shared-transition-mutation";

export function useCentralSharedBusinessMutations() {
  const store = useAppStore();
  const gate = useCentralAuthorityPlanGate();
  const latest = useRef(gate);
  latest.current = gate;

  const run = useCallback(
    async <T>(
      prepare: (data: AppData, now: string) => AppDataTransition<T>,
      fallback: () => T | Promise<T>,
      allowUnpublishedDraft = false,
    ): Promise<SharedTransitionResult<T>> => {
      if (gate.mode === "loading") return centralAuthorityPlanLoadingFailure();
      const ownerScope = gate.centralUserId;
      const isCurrent = () =>
        latest.current.mode === gate.mode &&
        latest.current.centralUserId === ownerScope;
      try {
        if (!ownerScope) return { ok: true, value: await fallback() };
        const { commitSharedTransition } =
          await import("@/lib/central-business-authority/shared-transition-mutation");
        return await commitSharedTransition(ownerScope, {
          getCurrentData: store.getCurrentData,
          prepare,
          commit: store.commitPreparedCentralBusinessAppDataDurably,
          sync: () => store.syncCentralBusinessEvents(ownerScope),
          isCurrent,
          allowUnpublishedDraft,
        });
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo confirmar el cambio.",
        };
      }
    },
    [gate.mode, gate.centralUserId, store],
  );

  const updateSharedSupplier = useCallback(
    async (supplier: Supplier) => {
      const { editSharedSupplier } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data, now) => editSharedSupplier(data, supplier, now),
        () => {
          store.updateSupplier(supplier);
          return supplier;
        },
      );
    },
    [run, store],
  );

  const deleteSharedSupplier = useCallback(
    async (id: string) => {
      const { deleteSharedSupplier: prepare } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data) => prepare(data, id),
        () => {
          store.deleteSupplier(id);
          return id;
        },
      );
    },
    [run, store],
  );

  const saveDraft = useCallback(
    async (requested: Document, expected?: Document) => {
      const { saveSharedDocumentDraft } =
        await import("@/lib/central-business-authority/shared-document-drafts");
      const ownerScope = gate.centralUserId;
      const result = await run(
        (data, now) => saveSharedDocumentDraft(data, requested, expected, now),
        () =>
          expected
            ? store.updateDocument(requested)
            : store.addDocument(requested),
        true,
      );
      if (!result.ok || !ownerScope) return result;
      const synced = await store.syncCentralBusinessEvents(ownerScope);
      if (!synced.ok || latest.current.centralUserId !== ownerScope)
        return {
          ok: false as const,
          error:
            "El servidor guardó el borrador. Sincroniza para confirmar su versión antes de emitirlo.",
        };
      const saved = store
        .getCurrentData()
        .documents.find((doc) => doc.id === requested.id);
      if (!saved?.centralBusinessDraftVersion)
        return {
          ok: false as const,
          error:
            "Falta recibir la confirmación central del borrador. Sincroniza antes de emitirlo.",
        };
      return { ok: true as const, value: saved };
    },
    [gate.centralUserId, run, store],
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      const { deleteSharedDocumentDraft } =
        await import("@/lib/central-business-authority/shared-document-drafts");
      return run(
        (data) => deleteSharedDocumentDraft(data, id),
        () => store.deleteDocument(id),
      );
    },
    [run, store],
  );

  const updateQuote = useCallback(
    async (requested: Document, expected: Document | undefined) => {
      const { editSharedQuote } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data, now) => {
          const current = data.documents.find((d) => d.id === requested.id);
          if (
            stableStringifySnapshot(current) !==
            stableStringifySnapshot(expected)
          )
            throw new Error(
              "El presupuesto cambió en otro dispositivo. Reabre su versión actual antes de guardar.",
            );
          return editSharedQuote(data, requested, now);
        },
        () => store.updateDocument(requested),
      );
    },
    [run, store],
  );

  const deleteQuote = useCallback(
    async (id: string) => {
      const { deleteSharedQuote } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data) => deleteSharedQuote(data, id),
        () => store.deleteDocument(id),
      );
    },
    [run, store],
  );

  const mergeCustomers = useCallback(
    async (
      keepId: string,
      removeIds: string[],
      options?: MergeCustomersOptions,
    ) => {
      const { mergeSharedCustomers } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data, now) =>
          mergeSharedCustomers(data, keepId, removeIds, options, now),
        () => {
          store.mergeCustomers(keepId, removeIds, options);
          return true;
        },
      );
    },
    [run, store],
  );

  const mergeSuppliers = useCallback(
    async (keepId: string, removeIds: string[]) => {
      const { mergeSharedSuppliers } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      return run(
        (data, now) => mergeSharedSuppliers(data, keepId, removeIds, now),
        () => {
          store.mergeSuppliers(keepId, removeIds);
          return true;
        },
      );
    },
    [run, store],
  );

  const markSent = useCallback(
    async (id: string): Promise<Document | null> => {
      if (gate.mode === "loading")
        throw new Error(centralAuthorityPlanLoadingFailure().error);
      if (!gate.centralUserId) return store.markDocumentSent(id);
      const original = store
        .getCurrentData()
        .documents.find((d) => d.id === id);
      const { markSharedDocumentSent } =
        await import("@/lib/central-business-authority/shared-business-transitions");
      if (original?.type !== "factura") {
        const result = await run(
          (data, now) => markSharedDocumentSent(data, id, now),
          () => store.markDocumentSent(id),
        );
        if (!result.ok) throw new Error(result.error);
        return result.value;
      }
      const ownerScope = gate.centralUserId;
      const synced = await store.syncCentralInvoiceAuthorityEvents(
        store.getCurrentData(),
      );
      if (
        synced.status !== "applied" ||
        latest.current.centralUserId !== ownerScope
      )
        throw new Error(
          "El documento se ha compartido, pero no se pudo confirmar su marca de envío central. Sincroniza y reinténtalo.",
        );
      const baseline = store.getCurrentData();
      const transition = markSharedDocumentSent(
        baseline,
        id,
        new Date().toISOString(),
      );
      const sent = transition.value;
      const link = sent.centralInvoiceAuthority;
      if (
        !link ||
        !sent.paymentStatus ||
        !["enviado", "pagado", "vencido"].includes(sent.status)
      )
        throw new Error(
          "El documento se ha compartido, pero su marca de envío requiere una versión central compatible.",
        );
      const { updateCentralInvoiceCollectionFromBrowser } =
        await import("@/lib/central-invoice-authority/collection-client");
      const result = await updateCentralInvoiceCollectionFromBrowser(
        {
          idempotencyKey: `central-sent:${sent.id}:${link.documentVersion}`,
          documentRef: {
            serverDocumentId: link.serverDocumentId,
            identityId: link.identityId,
            expectedVersion: link.documentVersion,
          },
          status: sent.status as "enviado" | "pagado" | "vencido",
          paymentStatus: sent.paymentStatus as "pending" | "paid" | "overdue",
          paidAt: sent.paidAt ?? null,
          documentPayload: JSON.parse(
            JSON.stringify({
              schema: "CENTRAL_INVOICE_AUTHORITY_DOCUMENT_FORM_CANARY_V1",
              localDocumentId: sent.id,
              document: sent,
            }),
          ),
        },
        { expectedOwnerScope: ownerScope },
      );
      if (!result.ok)
        throw new Error(
          "El documento se ha compartido, pero el servidor no confirmó la marca de envío. Sincroniza antes de reintentarlo.",
        );
      if (latest.current.centralUserId !== ownerScope)
        throw new Error(
          "La empresa activa ha cambiado. El envío quedó registrado en la empresa original.",
        );
      const received = await store.syncCentralInvoiceAuthorityEvents(
        store.getCurrentData(),
      );
      if (received.status !== "applied")
        throw new Error(
          "Envío registrado en el servidor. Sincroniza para actualizar esta pantalla.",
        );
      return store.getCurrentData().documents.find((d) => d.id === id) ?? sent;
    },
    [gate.mode, gate.centralUserId, run, store],
  );

  return {
    isCentralWorkspace: Boolean(gate.centralUserId),
    updateSharedSupplier,
    deleteSharedSupplier,
    updateQuote,
    deleteQuote,
    mergeCustomers,
    mergeSuppliers,
    markSent,
    saveDraft,
    deleteDraft,
  };
}
