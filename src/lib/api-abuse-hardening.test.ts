import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSources = new Map(
  [
    [
      "billing checkout",
      "../app/api/billing/checkout/route.ts",
      "billing_checkout",
    ],
    [
      "billing scan pack",
      "../app/api/billing/checkout-scan-pack/route.ts",
      "billing_checkout_scan_pack",
    ],
    ["billing portal", "../app/api/billing/portal/route.ts", "billing_portal"],
    [
      "billing subscription",
      "../app/api/billing/subscription/route.ts",
      "billing_subscription",
    ],
    ["billing trial", "../app/api/billing/trial/route.ts", "billing_trial"],
    ["referrals me", "../app/api/referrals/me/route.ts", "referrals_me"],
    [
      "referrals redeem",
      "../app/api/referrals/redeem/route.ts",
      "referrals_redeem",
    ],
    [
      "expense inbox read",
      "../app/api/expense-inbox/route.ts",
      "expense_inbox_read",
    ],
    [
      "expense inbox update",
      "../app/api/expense-inbox/route.ts",
      "expense_inbox_update",
    ],
    [
      "expense inbox rotate",
      "../app/api/expense-inbox/route.ts",
      "expense_inbox_rotate_alias",
    ],
    [
      "expense inbox retry",
      "../app/api/expense-inbox/route.ts",
      "expense_inbox_retry",
    ],
    [
      "verifactu register",
      "../app/api/verifactu/register/route.ts",
      "verifactu_register",
    ],
    [
      "verifactu status",
      "../app/api/verifactu/status/route.ts",
      "verifactu_status",
    ],
    [
      "verifactu declaration",
      "../app/api/verifactu/declaration/route.ts",
      "verifactu_declaration",
    ],
    [
      "admin capabilities",
      "../app/api/admin/capabilities/route.ts",
      "admin_capabilities",
    ],
    ["admin errors", "../app/api/admin/errors/route.ts", "admin_errors"],
    ["admin health", "../app/api/admin/health/route.ts", "admin_health"],
    ["admin users", "../app/api/admin/users/route.ts", "admin_users_list"],
    [
      "admin user update",
      "../app/api/admin/users/[userId]/route.ts",
      "admin_users_update",
    ],
    [
      "admin restore",
      "../app/api/admin/users/[userId]/restore-points/route.ts",
      "admin_user_restore",
    ],
    [
      "ai learning correct",
      "../app/api/admin/ai-learning/correct/route.ts",
      "admin_ai_learning_correct",
    ],
    [
      "ai learning feedback",
      "../app/api/admin/ai-learning/feedback/route.ts",
      "admin_ai_learning_feedback",
    ],
  ].map(([name, relativePath, namespace]) => [
    name,
    {
      namespace,
      source: readFileSync(new URL(relativePath, import.meta.url), "utf8"),
    },
  ]),
);

describe("API abuse hardening", () => {
  it("keeps sensitive and costly routes behind rate limits", () => {
    for (const [name, route] of routeSources) {
      expect(route.source, `${name} imports rate limiting`).toContain(
        "@/lib/server/rate-limit",
      );
      expect(route.source, `${name} checks rate limits`).toContain(
        "checkRateLimit(",
      );
      expect(route.source, `${name} has a stable namespace`).toContain(
        `namespace: "${route.namespace}"`,
      );
    }
  });
});
