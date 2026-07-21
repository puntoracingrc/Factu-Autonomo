export const FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE =
  "fiscal_workspace_diverged" as const;

const FISCAL_WORKSPACE_DIVERGED_INTERNAL_MESSAGE =
  "El expediente fiscal remoto ha divergido";

export interface CloudSyncReviewIssue {
  code: typeof FISCAL_WORKSPACE_DIVERGED_SYNC_ISSUE_CODE;
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
  return null;
}
