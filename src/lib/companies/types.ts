export const FACTU_COMPANY_HEADER = "x-factu-company-id";

export type CompanyMemberRole = "owner" | "admin";

export interface AppCompany {
  id: string;
  dataOwnerId: string;
  billingOwnerUserId: string;
  name: string;
  role: CompanyMemberRole;
  createdAt: string;
}

export interface AppCompanyMember {
  userId: string;
  email: string;
  role: CompanyMemberRole;
  joinedAt: string;
}

export interface AppCompanyInvitation {
  id: string;
  email: string;
  status: "pending" | "accepted";
  invitedAt: string;
}

export interface AppCompanyAccessOverview {
  members: AppCompanyMember[];
  invitations: AppCompanyInvitation[];
}

export interface AppCompaniesPayload {
  companies: AppCompany[];
}

export interface CompanySafeCopySummary {
  customers: number;
  suppliers: number;
  products: number;
  reusableProfile: boolean;
}

export interface CompanyCreationResult {
  company: AppCompany;
  copied: CompanySafeCopySummary | null;
}

export interface CompanyWorkspaceAccess {
  companyId: string;
  dataOwnerId: string;
  billingOwnerUserId: string;
  role: CompanyMemberRole;
}
