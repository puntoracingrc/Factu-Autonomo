import type Stripe from "stripe";
import { getSupabaseAdmin } from "../supabase/admin";
import { getStripe } from "./stripe";
import {
  billingProfileFromStripeParts,
  type BillingProfile,
} from "./billing-profile";

function profileFromCheckoutSession(
  session: Stripe.Checkout.Session,
): BillingProfile {
  const details = session.customer_details;
  const taxId =
    details?.tax_ids?.find((entry) => entry.value)?.value ??
    details?.tax_ids?.[0]?.value;

  return billingProfileFromStripeParts({
    name: details?.name ?? session.customer_email,
    email: details?.email ?? session.customer_email,
    taxId,
    addressLine1: details?.address?.line1,
    addressLine2: details?.address?.line2,
    city: details?.address?.city,
    postalCode: details?.address?.postal_code,
    country: details?.address?.country,
  });
}

async function profileFromStripeCustomer(
  customerId: string,
): Promise<BillingProfile | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const customer = (await stripe.customers.retrieve(customerId, {
    expand: ["tax_ids"],
  })) as Stripe.Customer;

  if (customer.deleted) return null;

  const taxIds = customer.tax_ids?.data ?? [];
  const taxId = taxIds.find((entry) => entry.value)?.value ?? taxIds[0]?.value;

  return billingProfileFromStripeParts({
    name: customer.name,
    email: customer.email,
    taxId,
    addressLine1: customer.address?.line1,
    addressLine2: customer.address?.line2,
    city: customer.address?.city,
    postalCode: customer.address?.postal_code,
    country: customer.address?.country,
  });
}

export async function persistBillingProfile(
  userId: string,
  profile: BillingProfile,
  stripeCustomerId?: string | null,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const hasProfileData = Object.values(profile).some(Boolean);
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (stripeCustomerId) {
    payload.stripe_customer_id = stripeCustomerId;
  }

  if (hasProfileData) {
    payload.billing_name = profile.name;
    payload.billing_email = profile.email;
    payload.billing_tax_id = profile.taxId;
    payload.billing_address_line1 = profile.addressLine1;
    payload.billing_address_line2 = profile.addressLine2;
    payload.billing_city = profile.city;
    payload.billing_postal_code = profile.postalCode;
    payload.billing_country = profile.country;
    payload.billing_synced_at = new Date().toISOString();
  }

  await admin.from("user_subscriptions").upsert(payload, {
    onConflict: "user_id",
  });
}

export async function syncBillingProfileFromCheckoutSession(
  userId: string,
  session: Stripe.Checkout.Session,
): Promise<BillingProfile> {
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  let profile = profileFromCheckoutSession(session);

  if (customerId) {
    const fromCustomer = await profileFromStripeCustomer(customerId);
    if (fromCustomer) {
      profile = billingProfileFromStripeParts({
        name: fromCustomer.name ?? profile.name,
        email: fromCustomer.email ?? profile.email,
        taxId: fromCustomer.taxId ?? profile.taxId,
        addressLine1: fromCustomer.addressLine1 ?? profile.addressLine1,
        addressLine2: fromCustomer.addressLine2 ?? profile.addressLine2,
        city: fromCustomer.city ?? profile.city,
        postalCode: fromCustomer.postalCode ?? profile.postalCode,
        country: fromCustomer.country ?? profile.country,
      });
    }
  }

  await persistBillingProfile(userId, profile, customerId);
  return profile;
}

export async function syncBillingProfileFromCustomerId(
  userId: string,
  customerId: string,
): Promise<BillingProfile | null> {
  const profile = await profileFromStripeCustomer(customerId);
  if (!profile) return null;
  await persistBillingProfile(userId, profile, customerId);
  return profile;
}
