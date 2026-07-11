export const ADMIN_USER_RESTORE_APPLY_BLOCK_CODE =
  "admin_restore_transaction_required";

export const ADMIN_USER_RESTORE_POINT_MODE = "preview_only" as const;

export const ADMIN_USER_RESTORE_APPLY_BLOCK_REASON =
  "La restauración está bloqueada hasta disponer de una operación transaccional o una saga reanudable con rollback y evidencia indivisible. Las copias y la vista previa siguen disponibles.";
