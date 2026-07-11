export const EMAIL_CONFIRMATION_REQUIRED_MESSAGE =
  "Confirma tu email para activar la nube y las acciones reales.";

interface EmailConfirmationUser {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  phone_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

function metadataBoolean(value: unknown): boolean {
  return value === true || value === "true";
}

export function isUserEmailConfirmed(
  user: EmailConfirmationUser | null | undefined,
): boolean {
  if (!user?.email) return false;
  if (user.email_confirmed_at) return true;

  // `confirmed_at` can represent a confirmed phone, and `user_metadata` is
  // editable by the user. Only accept the email-specific Auth timestamp or an
  // application claim that can be written exclusively with the service role.
  return metadataBoolean(user.app_metadata?.email_verified);
}
