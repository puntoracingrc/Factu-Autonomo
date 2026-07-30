import type { UserReminder } from "./types";

export type UserReminderDraft = Omit<
  UserReminder,
  "id" | "completed" | "createdAt" | "updatedAt"
> & {
  completed?: boolean;
};

export type UserReminderCollectionMutationResult =
  | { ok: true; reminders: UserReminder[]; reminder: UserReminder }
  | { ok: false; reason: "not_found" | "identifier_collision" };

export function createUserReminderWithIdentity(
  draft: UserReminderDraft,
  identity: { id: string; now: string },
): UserReminder {
  return {
    ...draft,
    target: draft.target ?? "self",
    completed: draft.completed ?? false,
    id: identity.id,
    createdAt: identity.now,
    updatedAt: identity.now,
  };
}

export function updateUserReminderInCollection(
  reminders: UserReminder[],
  reminder: UserReminder,
  now: string,
): UserReminderCollectionMutationResult {
  const matches = reminders.filter((entry) => entry.id === reminder.id);
  if (matches.length === 0) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) {
    return { ok: false, reason: "identifier_collision" };
  }

  const updated: UserReminder = {
    ...reminder,
    createdAt: matches[0].createdAt,
    updatedAt: now,
  };
  return {
    ok: true,
    reminders: reminders.map((entry) =>
      entry.id === reminder.id ? updated : entry,
    ),
    reminder: updated,
  };
}

export function deleteUserReminderFromCollection(
  reminders: UserReminder[],
  id: string,
):
  | { ok: true; reminders: UserReminder[]; reminder: UserReminder }
  | { ok: false; reason: "not_found" | "identifier_collision" } {
  const matches = reminders.filter((entry) => entry.id === id);
  if (matches.length === 0) return { ok: false, reason: "not_found" };
  if (matches.length !== 1) {
    return { ok: false, reason: "identifier_collision" };
  }
  return {
    ok: true,
    reminders: reminders.filter((entry) => entry.id !== id),
    reminder: matches[0],
  };
}
