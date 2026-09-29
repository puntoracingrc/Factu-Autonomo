import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260929121947_company_workspaces_and_admin_invitations.sql",
  "utf8",
);
const companyListConflictHotfixMigration = readFileSync(
  "supabase/migrations/20260929150510_fix_company_list_conflict_target.sql",
  "utf8",
);

const sensitiveRouteHandlers = [
  "src/lib/central-business-authority/mutation-route-handler.ts",
  "src/lib/central-business-authority/batch-mutation-route-handler.ts",
  "src/lib/central-business-authority/numbered-document-route-handler.ts",
  "src/lib/central-business-authority/events-route-handler.ts",
  "src/lib/central-business-authority/status-route-handler.ts",
  "src/lib/central-invoice-authority/issue-route-handler.ts",
  "src/lib/central-invoice-authority/collection-route-handler.ts",
  "src/lib/central-invoice-authority/relationship-route-handler.ts",
  "src/lib/central-invoice-authority/events-route-handler.ts",
  "src/lib/central-invoice-authority/status-route-handler.ts",
  "src/lib/workspace-history/archive-route-handler.ts",
] as const;

describe("company workspace security contract", () => {
  it("stores companies, memberships and email invitations behind service-role RPCs", () => {
    expect(migration).toContain(
      "create table if not exists public.app_companies",
    );
    expect(migration).toContain(
      "create table if not exists public.app_company_members",
    );
    expect(migration).toContain(
      "create table if not exists public.app_company_invitations",
    );
    expect(migration).toContain(
      "alter table public.app_company_members enable row level security",
    );
    expect(migration).toContain("list_app_companies_v1 requires service_role");
    expect(migration).toContain(
      "invite_app_company_admin_v1 requires service_role",
    );
    expect(migration).toContain("invitation_accepted");
    expect(migration).toContain("company member already active");
    expect(migration).not.toMatch(
      /grant\s+(?:all|select|insert|update|delete)[^;]*app_company_(?:members|invitations)[^;]*authenticated/i,
    );
  });

  it("uses a company tenant UUID without requiring a fake auth identity", () => {
    expect(migration).toContain("v_company_id uuid := gen_random_uuid()");
    expect(migration).toContain(
      "drop constraint if exists central_business_entities_user_id_fkey",
    );
    expect(migration).toContain(
      "drop constraint if exists workspace_auxiliary_entities_user_id_fkey",
    );
    expect(migration).toContain(
      "drop constraint if exists expense_inbox_items_user_id_fkey",
    );
    expect(migration).toContain("app_company_cloud_access_allowed_v1");
  });

  it("uses an unambiguous membership upsert in the table-returning list RPC", () => {
    expect(
      companyListConflictHotfixMigration.match(
        /on conflict on constraint app_company_members_pkey/gi,
      ),
    ).toHaveLength(2);
    expect(companyListConflictHotfixMigration).not.toContain(
      "on conflict (company_id, user_id)",
    );
    expect(companyListConflictHotfixMigration).toContain(
      "update public.app_company_invitations as invitation",
    );
    expect(companyListConflictHotfixMigration).toContain(
      "where invitation.company_id = v_company_id",
    );
  });

  it("requires the company header at every central data boundary", () => {
    for (const path of sensitiveRouteHandlers) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("FACTU_COMPANY_HEADER");
      expect(source, path).toContain(
        "request.headers.get(FACTU_COMPANY_HEADER)",
      );
      expect(source, path).toMatch(/actorUserId/);
      expect(source, path).toMatch(/billingUserId/);
    }
  });

  it("scopes the expense inbox and AI allowance to company data and billing", () => {
    const inbox = readFileSync("src/app/api/expense-inbox/route.ts", "utf8");
    const scan = readFileSync("src/app/api/expenses/scan/route.ts", "utf8");
    const aiUsage = readFileSync(
      "src/app/api/billing/ai-usage/route.ts",
      "utf8",
    );

    for (const source of [inbox, scan, aiUsage]) {
      expect(source).toContain("getCompanyRouteAuthFromBearer");
      expect(source).toContain("FACTU_COMPANY_HEADER");
      expect(source).toContain("auth.actorUserId");
      expect(source).toContain("auth.billingUserId");
    }
    expect(inbox).toContain("ensureExpenseInboxAlias(auth.userId)");
    expect(inbox).toContain("listExpenseInboxItems(auth.userId)");
  });
});
