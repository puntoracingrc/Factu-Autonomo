import {
  getUserSessionFromBearer,
  type VerifiedUserSession,
} from "@/lib/billing/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AppCompany,
  AppCompanyAccessOverview,
  CompanyMemberRole,
  CompanyWorkspaceAccess,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CompanyRpcRow = {
  company_id: string;
  data_owner_id: string;
  billing_owner_user_id: string;
  company_name: string;
  member_role: string;
  company_created_at: string;
};

type CompanyMemberRow = {
  user_id: string;
  email: string;
  role: string;
  joined_at: string;
};

type CompanyInvitationRow = {
  id: string;
  email: string;
  status: string;
  invited_at: string;
};

function companyRole(value: string): CompanyMemberRole {
  return value === "owner" ? "owner" : "admin";
}

function companyFromRpcRow(row: CompanyRpcRow): AppCompany {
  return {
    id: row.company_id,
    dataOwnerId: row.data_owner_id,
    billingOwnerUserId: row.billing_owner_user_id,
    name: row.company_name,
    role: companyRole(row.member_role),
    createdAt: row.company_created_at,
  };
}

export function normalizeCompanyId(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : null;
}

export function normalizeCompanyEmail(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function verifiedEmail(identity: VerifiedUserSession): string {
  const email = normalizeCompanyEmail(identity.user.email);
  if (!email) throw new Error("VERIFIED_EMAIL_REQUIRED");
  return email;
}

function adminClient() {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("COMPANY_SERVICE_UNAVAILABLE");
  return admin;
}

export async function listCompaniesForIdentity(
  identity: VerifiedUserSession,
): Promise<AppCompany[]> {
  const admin = adminClient();
  const { data, error } = await admin.rpc("list_app_companies_v1", {
    p_user_id: identity.user.id,
    p_verified_email: verifiedEmail(identity),
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as CompanyRpcRow[]).map(companyFromRpcRow);
}

export async function createCompanyForIdentity(
  identity: VerifiedUserSession,
  name: string,
): Promise<AppCompany> {
  const companyName = name.replace(/\s+/g, " ").trim();
  if (!companyName || companyName.length > 120) {
    throw new Error("INVALID_COMPANY_NAME");
  }
  const admin = adminClient();
  const { data, error } = await admin.rpc("create_app_company_v1", {
    p_actor_user_id: identity.user.id,
    p_actor_email: verifiedEmail(identity),
    p_name: companyName,
  });
  if (error) throw new Error(error.message);
  const row = (data as CompanyRpcRow[] | null)?.[0];
  if (!row) throw new Error("COMPANY_CREATE_FAILED");
  return companyFromRpcRow(row);
}

export async function renameCompanyForIdentity(
  identity: VerifiedUserSession,
  companyId: string,
  name: string,
): Promise<void> {
  const normalizedId = normalizeCompanyId(companyId);
  const companyName = name.replace(/\s+/g, " ").trim();
  if (!normalizedId || !companyName || companyName.length > 120) {
    throw new Error("INVALID_COMPANY_NAME");
  }
  const { error } = await adminClient().rpc("rename_app_company_v1", {
    p_actor_user_id: identity.user.id,
    p_company_id: normalizedId,
    p_name: companyName,
  });
  if (error) throw new Error(error.message);
}

export async function resolveCompanyWorkspaceAccess(
  identity: VerifiedUserSession,
  requestedCompanyId: string | null | undefined,
): Promise<CompanyWorkspaceAccess | null> {
  const companies = await listCompaniesForIdentity(identity);
  const requested = normalizeCompanyId(requestedCompanyId);
  const selected = requested
    ? companies.find((company) => company.id === requested)
    : (companies.find((company) => company.id === identity.user.id) ??
      companies[0]);
  if (!selected) return null;
  return {
    companyId: selected.id,
    dataOwnerId: selected.dataOwnerId,
    billingOwnerUserId: selected.billingOwnerUserId,
    role: selected.role,
  };
}

export async function resolveCompanyRouteAuth(
  identity: VerifiedUserSession,
  requestedCompanyId: string | null | undefined,
): Promise<{
  userId: string;
  actorUserId: string;
  billingUserId: string;
  companyId: string;
  sessionId: string;
  userEmail: string | null;
}> {
  const access = await resolveCompanyWorkspaceAccess(
    identity,
    requestedCompanyId,
  );
  if (!access) throw new Error("COMPANY_ACCESS_DENIED");
  return {
    userId: access.dataOwnerId,
    actorUserId: identity.user.id,
    billingUserId: access.billingOwnerUserId,
    companyId: access.companyId,
    sessionId: identity.sessionId,
    userEmail: identity.user.email ?? null,
  };
}

export async function getCompanyRouteAuthFromBearer(
  authorization: string | null,
  requestedCompanyId: string | null | undefined,
) {
  const identity = await getUserSessionFromBearer(authorization, {
    requireEmailConfirmed: true,
  });
  if (!identity) return null;
  try {
    return await resolveCompanyRouteAuth(identity, requestedCompanyId);
  } catch {
    return null;
  }
}

export async function inviteCompanyAdmin(
  identity: VerifiedUserSession,
  companyId: string,
  email: string,
): Promise<{ id: string; email: string; status: string }> {
  const normalizedId = normalizeCompanyId(companyId);
  const normalizedEmail = normalizeCompanyEmail(email);
  if (!normalizedId || !normalizedEmail) {
    throw new Error("INVALID_COMPANY_INVITATION");
  }
  if (normalizedEmail === normalizeCompanyEmail(identity.user.email)) {
    throw new Error("CANNOT_INVITE_CURRENT_ACCOUNT");
  }
  const { data, error } = await adminClient().rpc(
    "invite_app_company_admin_v1",
    {
      p_actor_user_id: identity.user.id,
      p_company_id: normalizedId,
      p_email: normalizedEmail,
    },
  );
  if (error) throw new Error(error.message);
  const row = (
    data as Array<{
      invitation_id: string;
      invitation_email: string;
      invitation_status: string;
    }> | null
  )?.[0];
  if (!row) throw new Error("COMPANY_INVITATION_FAILED");
  return {
    id: row.invitation_id,
    email: row.invitation_email,
    status: row.invitation_status,
  };
}

export async function getCompanyAccessOverview(
  identity: VerifiedUserSession,
  companyId: string,
): Promise<AppCompanyAccessOverview> {
  const access = await resolveCompanyWorkspaceAccess(identity, companyId);
  if (!access || access.companyId !== normalizeCompanyId(companyId)) {
    throw new Error("COMPANY_ACCESS_DENIED");
  }
  const admin = adminClient();
  const [membersResult, invitationsResult] = await Promise.all([
    admin
      .from("app_company_members")
      .select("user_id,email,role,joined_at")
      .eq("company_id", access.companyId)
      .eq("status", "active")
      .order("joined_at", { ascending: true }),
    admin
      .from("app_company_invitations")
      .select("id,email,status,invited_at")
      .eq("company_id", access.companyId)
      .in("status", ["pending", "accepted"])
      .order("invited_at", { ascending: true }),
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (invitationsResult.error) throw new Error(invitationsResult.error.message);
  const members = (membersResult.data ?? []) as CompanyMemberRow[];
  const invitations = (invitationsResult.data ?? []) as CompanyInvitationRow[];
  return {
    members: members.map((member) => ({
      userId: member.user_id,
      email: member.email,
      role: companyRole(member.role),
      joinedAt: member.joined_at,
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status === "accepted" ? "accepted" : "pending",
      invitedAt: invitation.invited_at,
    })),
  };
}

export async function revokeCompanyInvitation(
  identity: VerifiedUserSession,
  companyId: string,
  invitationId: string,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const normalizedInvitationId = normalizeCompanyId(invitationId);
  if (!normalizedCompanyId || !normalizedInvitationId) {
    throw new Error("INVALID_COMPANY_INVITATION");
  }
  const { error } = await adminClient().rpc(
    "revoke_app_company_invitation_v1",
    {
      p_actor_user_id: identity.user.id,
      p_company_id: normalizedCompanyId,
      p_invitation_id: normalizedInvitationId,
    },
  );
  if (error) throw new Error(error.message);
}

export async function revokeCompanyAdmin(
  identity: VerifiedUserSession,
  companyId: string,
  targetUserId: string,
): Promise<void> {
  const normalizedCompanyId = normalizeCompanyId(companyId);
  const normalizedUserId = normalizeCompanyId(targetUserId);
  if (!normalizedCompanyId || !normalizedUserId) {
    throw new Error("INVALID_COMPANY_MEMBER");
  }
  const { error } = await adminClient().rpc("revoke_app_company_admin_v1", {
    p_actor_user_id: identity.user.id,
    p_company_id: normalizedCompanyId,
    p_target_user_id: normalizedUserId,
  });
  if (error) throw new Error(error.message);
}
