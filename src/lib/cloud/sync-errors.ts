export const FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE =
  "fiscal_workspace_diverged" as const;
export const DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE_CODE =
  "document_fiscal_identity_conflict" as const;
export const CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE_CODE =
  "cloud_snapshot_incomplete" as const;

const FISCAL_WORKSPACE_DIVERGED_INTERNAL_MESSAGE =
  "El expediente fiscal remoto ha divergido";
const DOCUMENT_FISCAL_IDENTITY_CONFLICT_INTERNAL_MESSAGE =
  "La nube contiene una factura con la misma identidad fiscal";
const CLOUD_SNAPSHOT_INCOMPLETE_INTERNAL_MESSAGE =
  "Este dispositivo no contiene toda la copia activa de la nube";

export interface CloudSyncReviewIssue {
  code:
    | typeof FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE
    | typeof DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE_CODE
    | typeof CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE_CODE;
  userMessage: string;
  automaticRetryBlocked: true;
  recovery: "review_account";
}

export const FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE: CloudSyncReviewIssue = {
  code: FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE,
  userMessage:
    "La copia fiscal de este dispositivo y la de la nube tienen historiales distintos. Ninguna de las dos copias fiscales se ha sobrescrito. Revisa la incidencia en Cuenta antes de continuar.",
  automaticRetryBlocked: true,
  recovery: "review_account",
};

export const DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE: CloudSyncReviewIssue =
  {
    code: DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE_CODE,
    userMessage:
      "Hay dos facturas emitidas con la misma serie, año y número. No se ha subido la segunda copia a la nube. Revisa la numeración antes de continuar.",
    automaticRetryBlocked: true,
    recovery: "review_account",
  };

export const CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE: CloudSyncReviewIssue = {
  code: CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE_CODE,
  userMessage:
    "Este dispositivo no contiene toda la copia activa de la nube. La sincronización incremental se ha pausado para evitar pisar facturas; compara y conserva la copia de la nube antes de emitir.",
  automaticRetryBlocked: true,
  recovery: "review_account",
};

export class CloudSyncReviewRequiredError extends Error {
  readonly code: CloudSyncReviewIssue["code"];

  constructor(
    code: CloudSyncReviewIssue["code"],
    message = FISCAL_WORKSPACE_DIVERGED_INTERNAL_MESSAGE,
  ) {
    super(message);
    this.name = "CloudSyncReviewRequiredError";
    this.code = code;
  }
}

export function fiscalWorkspaceDivergedSyncError(): CloudSyncReviewRequiredError {
  return new CloudSyncReviewRequiredError(
    FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE,
  );
}

export function documentFiscalIdentityConflictSyncError(): CloudSyncReviewRequiredError {
  return new CloudSyncReviewRequiredError(
    DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE_CODE,
    DOCUMENT_FISCAL_IDENTITY_CONFLICT_INTERNAL_MESSAGE,
  );
}

export function cloudSnapshotIncompleteSyncError(): CloudSyncReviewRequiredError {
  return new CloudSyncReviewRequiredError(
    CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE_CODE,
    CLOUD_SNAPSHOT_INCOMPLETE_INTERNAL_MESSAGE,
  );
}

export function classifyCloudSyncReviewIssue(
  error: unknown,
): CloudSyncReviewIssue | null {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : null;
  const message = error instanceof Error ? error.message : null;

  if (
    code === FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE ||
    message === FISCAL_WORKSPACE_DIVERGED_INTERNAL_MESSAGE
  ) {
    return FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE;
  }
  if (
    code === DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE_CODE ||
    message === DOCUMENT_FISCAL_IDENTITY_CONFLICT_INTERNAL_MESSAGE
  ) {
    return DOCUMENT_FISCAL_IDENTITY_CONFLICT_SYNC_ISSUE;
  }
  if (
    code === CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE_CODE ||
    message === CLOUD_SNAPSHOT_INCOMPLETE_INTERNAL_MESSAGE
  ) {
    return CLOUD_SNAPSHOT_INCOMPLETE_SYNC_ISSUE;
  }
  return null;
}
