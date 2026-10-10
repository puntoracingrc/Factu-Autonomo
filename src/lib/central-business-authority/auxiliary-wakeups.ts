export const CENTRAL_AUXILIARY_WAKEUP_EVENT = "workspace_auxiliary_changed";
export const EXPENSE_INBOX_REFRESH_EVENT = "factu:expense-inbox:refresh";

/** Only invalidation metadata crosses Broadcast; content is read through authorized APIs. */
export function auxiliaryWakeupKind(
  message: unknown,
): "expense_inbox" | "fiscal_notifications" | null {
  if (!message || typeof message !== "object" || !("payload" in message))
    return null;
  const payload = message.payload;
  if (!payload || typeof payload !== "object" || !("kind" in payload))
    return null;
  return payload.kind === "expense_inbox" ||
    payload.kind === "fiscal_notifications"
    ? payload.kind
    : null;
}
