"use client";

import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  getActiveWorkspaceOwnerScope,
  isActiveWorkspaceOwnerScope,
} from "@/lib/workspace-owner-runtime";

export function captureActiveWorkspaceOwnerScope(
  expectedOwnerScope?: string | null,
): string | null {
  const ownerScope =
    expectedOwnerScope?.trim() || getActiveWorkspaceOwnerScope();
  return ownerScope && isActiveWorkspaceOwnerScope(ownerScope)
    ? ownerScope
    : null;
}

export async function getActiveWorkspaceAccessToken(
  expectedOwnerScope?: string | null,
): Promise<string | null> {
  const ownerScope = captureActiveWorkspaceOwnerScope(expectedOwnerScope);
  if (!ownerScope) return null;

  const supabase = await getSupabaseClientAsync();
  if (!supabase || !isActiveWorkspaceOwnerScope(ownerScope)) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (
    !session?.access_token ||
    session.user.id !== ownerScope ||
    !isActiveWorkspaceOwnerScope(ownerScope)
  ) {
    return null;
  }
  return session.access_token;
}
