"use client";

import { useState } from "react";
import { useAppStore } from "@/context/AppStore";
import { analyzeFiscalNotificationDocumentDeletionV1 } from "@/lib/fiscal-notifications/document-deletion.v1";
import type { FiscalNotificationStructuredHistoryEntryV1 } from "@/lib/fiscal-notifications/structured-review-history-view-model.v1";
import { hasUsableDriveToken } from "@/lib/google-drive/backup";
import {
  restoreFiscalNotificationOriginalInGoogleDriveV1,
  trashFiscalNotificationOriginalInGoogleDriveV1,
} from "@/lib/google-drive/fiscal-notification-original-delete.v1";
import {
  getGoogleDriveClientId,
  isGoogleDriveBackupEnabled,
} from "@/lib/google-drive/config";
import { runExclusiveDriveOperation } from "@/lib/google-drive/operation";

export function useFiscalNotificationDocumentDeletion(input: {
  readonly ownerScope: string;
  readonly documents: readonly FiscalNotificationStructuredHistoryEntryV1[];
  readonly onDeleted?: (documentId: string) => void;
}) {
  const { getCurrentData, deleteFiscalNotificationDocument } = useAppStore();
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidate = documentId
    ? input.documents.find((item) => item.key === documentId) ?? null
    : null;
  const hasDriveOriginal =
    candidate?.originalArchive?.documentIds.length === 1 &&
    candidate.originalArchive.documentIds[0] === candidate.key;

  function request(nextDocumentId: string): void {
    setError(null);
    setDocumentId(nextDocumentId);
  }

  function close(): void {
    if (busy) return;
    setError(null);
    setDocumentId(null);
  }

  async function confirm(deleteDriveOriginal: boolean): Promise<void> {
    if (!documentId || busy) return;
    const selectedDocumentId = documentId;
    const archive = candidate?.originalArchive ?? null;
    const canDeleteDriveOriginal =
      archive !== null &&
      archive.documentIds.length === 1 &&
      archive.documentIds[0] === selectedDocumentId;
    if (deleteDriveOriginal && !canDeleteDriveOriginal) {
      setError(
        "Este original también pertenece a otra ficha y no se puede eliminar desde aquí.",
      );
      return;
    }
    if (deleteDriveOriginal && !isGoogleDriveBackupEnabled()) {
      setError("Google Drive no está disponible en esta instalación de Factu.");
      return;
    }
    const expected = getCurrentData();
    const currentAnalysis = analyzeFiscalNotificationDocumentDeletionV1({
      workspace: expected.fiscalNotificationsWorkspace,
      ownerScope: input.ownerScope,
      documentId: selectedDocumentId,
    });
    if (currentAnalysis.status !== "READY") {
      setError(deletionError(currentAnalysis.status));
      return;
    }
    setBusy(true);
    setError(null);
    let driveTrashChanged = false;
    if (deleteDriveOriginal && archive) {
      const execution = await runExclusiveDriveOperation(() =>
        trashFiscalNotificationOriginalInGoogleDriveV1(
          {
            driveFileId: archive.driveFileId,
            expectedSha256: archive.sourceSha256,
          },
          {
            clientId: getGoogleDriveClientId(),
            prompt: hasUsableDriveToken() ? "" : "consent",
          },
        ),
      );
      if (!execution.started) {
        setBusy(false);
        setError(
          "Google Drive está realizando otra operación. Inténtalo de nuevo.",
        );
        return;
      }
      if (!execution.value.ok) {
        setBusy(false);
        setError(execution.value.error);
        return;
      }
      driveTrashChanged = execution.value.changedByOperation;
    }

    const result = deleteFiscalNotificationDocument({
      expected,
      ownerScope: input.ownerScope,
      documentId: selectedDocumentId,
      deletedAt: new Date().toISOString(),
    });
    if (result.status === "applied") {
      setBusy(false);
      setError(null);
      setDocumentId(null);
      input.onDeleted?.(selectedDocumentId);
      return;
    }
    let rollbackFailed = false;
    if (deleteDriveOriginal && archive && driveTrashChanged) {
      const rollback = await runExclusiveDriveOperation(() =>
        restoreFiscalNotificationOriginalInGoogleDriveV1(
          {
            driveFileId: archive.driveFileId,
            expectedSha256: archive.sourceSha256,
          },
          {
            clientId: getGoogleDriveClientId(),
            prompt: "",
          },
        ),
      );
      rollbackFailed =
        !rollback.started || (rollback.started && !rollback.value.ok);
    }
    setBusy(false);
    const localError =
      result.status === "indeterminate"
        ? "No se puede confirmar si el cambio quedó guardado. Recarga antes de intentarlo otra vez."
        : "El documento no se ha eliminado porque los datos cambiaron o tienen dependencias que deben revisarse.";
    setError(
      rollbackFailed
        ? `${localError} Revisa también la papelera de Google Drive.`
        : localError,
    );
  }

  return Object.freeze({
    candidate,
    hasDriveOriginal,
    busy,
    error,
    request,
    close,
    confirm,
  });
}

function deletionError(status: "BLOCKED" | "NOT_FOUND"): string {
  return status === "NOT_FOUND"
    ? "La ficha ya no existe en esta cuenta. Recarga la página."
    : "Esta ficha tiene datos operativos dependientes o no supera la validación. No se ha eliminado nada.";
}
