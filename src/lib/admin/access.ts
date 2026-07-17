import type { User } from "@supabase/supabase-js";

const OWNER_ADMIN_EMAILS = [
  "puntoracingrc@gmail.com",
  "persianasalmar@gmail.com",
] as const;

export function adminEmailsFromEnv(
  value = process.env.ADMIN_EMAILS,
): string[] {
  const configured = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...OWNER_ADMIN_EMAILS, ...configured]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailsFromEnv().includes(email.trim().toLowerCase());
}

export function isAdminUser(user: User | null): user is User {
  return isAdminEmail(user?.email);
}
