import type { User } from "@supabase/supabase-js";

const DEFAULT_ADMIN_EMAILS = ["puntoracingrc@gmail.com"];

interface AdminEmailsOptions {
  nodeEnv?: string;
}

function shouldIncludeDefaultAdminEmails(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return nodeEnv !== "production";
}

export function adminEmailsFromEnv(
  value = process.env.ADMIN_EMAILS,
  options: AdminEmailsOptions = {},
): string[] {
  const configured = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const defaults = shouldIncludeDefaultAdminEmails(options.nodeEnv)
    ? DEFAULT_ADMIN_EMAILS
    : [];

  return Array.from(new Set([...configured, ...defaults]));
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailsFromEnv().includes(email.trim().toLowerCase());
}

export function isAdminUser(user: User | null): user is User {
  return isAdminEmail(user?.email);
}
