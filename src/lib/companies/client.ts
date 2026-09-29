"use client";

import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type {
  AppCompaniesPayload,
  AppCompany,
  AppCompanyAccessOverview,
} from "./types";

async function accessToken(): Promise<string | null> {
  const supabase = await getSupabaseClientAsync();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function companyRequest<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(input, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok) throw new Error(payload.error || "COMPANY_REQUEST_FAILED");
  return payload;
}

export async function fetchCompanies(): Promise<AppCompany[]> {
  const payload = await companyRequest<AppCompaniesPayload>("/api/companies");
  return payload.companies;
}

export async function createCompany(name: string): Promise<AppCompany> {
  const payload = await companyRequest<{ company: AppCompany }>(
    "/api/companies",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  return payload.company;
}

export async function renameCompany(
  companyId: string,
  name: string,
): Promise<void> {
  await companyRequest(`/api/companies/${encodeURIComponent(companyId)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function fetchCompanyAccess(
  companyId: string,
): Promise<AppCompanyAccessOverview> {
  return companyRequest<AppCompanyAccessOverview>(
    `/api/companies/${encodeURIComponent(companyId)}/access`,
  );
}

export async function inviteAdmin(
  companyId: string,
  email: string,
): Promise<void> {
  await companyRequest(
    `/api/companies/${encodeURIComponent(companyId)}/access`,
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
  );
}

export async function revokeCompanyAccess(
  companyId: string,
  kind: "invitation" | "member",
  id: string,
): Promise<void> {
  await companyRequest(
    `/api/companies/${encodeURIComponent(companyId)}/access`,
    {
      method: "DELETE",
      body: JSON.stringify({ kind, id }),
    },
  );
}
