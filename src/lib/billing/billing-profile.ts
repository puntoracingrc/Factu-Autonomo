export interface BillingProfile {
  name: string | null;
  email: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface BillingProfileRow extends BillingProfile {
  syncedAt: string | null;
}

export function emptyBillingProfile(): BillingProfile {
  return {
    name: null,
    email: null,
    taxId: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    postalCode: null,
    country: null,
  };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function joinAddressLine1(line1?: string | null, line2?: string | null): string | null {
  const parts = [line1, line2].map((part) => clean(part)).filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(", ") : null;
}

export function billingProfileFromStripeParts(input: {
  name?: string | null;
  email?: string | null;
  taxId?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): BillingProfile {
  return {
    name: clean(input.name),
    email: clean(input.email),
    taxId: clean(input.taxId)?.toUpperCase() ?? null,
    addressLine1: joinAddressLine1(input.addressLine1, input.addressLine2),
    addressLine2: null,
    city: clean(input.city),
    postalCode: clean(input.postalCode),
    country: clean(input.country)?.toUpperCase() ?? null,
  };
}

export function billingProfileFromDbRow(
  row: Record<string, unknown> | null | undefined,
): BillingProfileRow | null {
  if (!row) return null;

  const profile = billingProfileFromStripeParts({
    name: row.billing_name as string | undefined,
    email: row.billing_email as string | undefined,
    taxId: row.billing_tax_id as string | undefined,
    addressLine1: row.billing_address_line1 as string | undefined,
    city: row.billing_city as string | undefined,
    postalCode: row.billing_postal_code as string | undefined,
    country: row.billing_country as string | undefined,
  });

  const hasData = Object.values(profile).some(Boolean);
  if (!hasData) return null;

  return {
    ...profile,
    syncedAt:
      typeof row.billing_synced_at === "string" ? row.billing_synced_at : null,
  };
}

export function formatBillingProfileSummary(profile: BillingProfile): string {
  const parts = [
    profile.name,
    profile.taxId,
    profile.addressLine1,
    [profile.postalCode, profile.city].filter(Boolean).join(" "),
    profile.country,
  ].filter(Boolean);
  return parts.join(" · ");
}
