import type { AppData } from "@/lib/types";

export function hasWorkspaceContent(data: AppData): boolean {
  const hasEntities =
    data.documents.length > 0 ||
    data.expenses.length > 0 ||
    data.recurringExpenses.length > 0 ||
    data.userReminders.length > 0 ||
    data.suppliers.length > 0 ||
    data.products.length > 0 ||
    data.customers.length > 0 ||
    Boolean(data.fiscalNotificationsWorkspace) ||
    (data.workspaceIntegrityQuarantine?.length ?? 0) > 0;

  if (hasEntities) return true;

  const profileFields = [
    data.profile.commercialName,
    data.profile.name,
    data.profile.nif,
    data.profile.vatId,
    data.profile.address,
    data.profile.city,
    data.profile.postalCode,
    data.profile.province,
    data.profile.phone,
    data.profile.email,
    data.profile.website,
    data.profile.iban,
    data.profile.logoUrl,
  ];

  return profileFields.some((value) => Boolean(value?.trim()));
}
