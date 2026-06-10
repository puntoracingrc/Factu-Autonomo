import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { buildWelcomeEmail } from "./templates/welcome";

const WELCOME_SENT_KEY = "welcome_email_sent";

export async function sendWelcomeEmailForUser(input: {
  userId: string;
  email: string;
  recipientName?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    return { ok: false, error: "Supabase admin no configurado" };
  }

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(input.userId);

  if (userError || !userData.user) {
    return { ok: false, error: "Usuario no encontrado" };
  }

  const user = userData.user;
  const email = user.email?.trim();
  if (!email || email.toLowerCase() !== input.email.trim().toLowerCase()) {
    return { ok: false, error: "Email no coincide con el usuario" };
  }

  if (user.user_metadata?.[WELCOME_SENT_KEY]) {
    return { ok: true, skipped: true };
  }

  const content = buildWelcomeEmail({
    email,
    recipientName: input.recipientName,
  });

  const result = await sendEmail({
    to: email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });

  if (!result.ok) {
    return { ok: false, skipped: result.skipped, error: result.error };
  }

  await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      ...user.user_metadata,
      [WELCOME_SENT_KEY]: new Date().toISOString(),
    },
  });

  return { ok: true };
}
