export const EMAIL_CONFIRMATION_REQUIRED_MESSAGE =
  "Confirma tu email para activar la nube y las acciones reales.";

interface EmailConfirmationUser {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
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
  if (user.email_confirmed_at || user.confirmed_at) return true;
  if (metadataBoolean(user.user_metadata?.email_verified)) return true;
  if (metadataBoolean(user.app_metadata?.email_verified)) return true;

  const provider =
    typeof user.app_metadata?.provider === "string"
      ? user.app_metadata.provider
      : "";

  return Boolean(provider && provider !== "email");
}
