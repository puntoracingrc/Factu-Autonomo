import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const apiRoot = fileURLToPath(new URL("../app/api/", import.meta.url));
const securityScheduler = fileURLToPath(
  new URL("../../.github/workflows/security-health-alert.yml", import.meta.url),
);

const expectedMethods: Record<string, string[]> = {
  "admin/ai-learning/correct/route.ts": ["POST"],
  "admin/ai-learning/feedback/route.ts": ["POST"],
  "admin/capabilities/route.ts": ["GET"],
  "admin/errors/route.ts": ["GET"],
  "admin/health/route.ts": ["GET"],
  "admin/operations-status/route.ts": ["GET"],
  "admin/users/[userId]/mfa/route.ts": ["DELETE", "GET", "POST"],
  "admin/users/[userId]/restore-points/route.ts": ["GET", "POST"],
  "admin/users/[userId]/route.ts": ["PATCH"],
  "admin/users/route.ts": ["GET"],
  "admin/vercel-usage/route.ts": ["GET"],
  "billing/ai-usage/route.ts": ["GET"],
  "billing/checkout-scan-pack/route.ts": ["POST"],
  "billing/checkout/route.ts": ["POST"],
  "billing/portal/route.ts": ["POST"],
  "billing/profile/route.ts": ["GET"],
  "billing/trial/route.ts": ["POST"],
  "customers/parse/route.ts": ["POST"],
  "document-sync/route.ts": ["DELETE", "GET", "OPTIONS", "PATCH", "POST", "PUT"],
  "expense-deductibility/evaluate/route.ts": ["POST"],
  "fiscal-calendar/events/route.ts": ["GET"],
  "email/payment-reminder/route.ts": ["POST"],
  "email/welcome/route.ts": ["POST"],
  "expense-inbox/inbound/route.ts": ["POST"],
  "expense-inbox/route.ts": ["GET", "PATCH"],
  "expenses/scan/route.ts": ["GET", "POST"],
  "google-auth/token/route.ts": ["POST"],
  "google-drive/token/route.ts": ["POST"],
  "google-places/address-fill/route.ts": ["POST"],
  "imports/review/route.ts": ["POST"],
  "monitoring/error/route.ts": ["POST"],
  "referrals/me/route.ts": ["GET"],
  "referrals/redeem/route.ts": ["POST"],
  "reminders/realtime-session/route.ts": ["POST"],
  "security/csp-report/route.ts": ["GET", "POST"],
  "security/health-alert/route.ts": ["GET"],
  "server-documents/ingest/route.ts": ["GET", "POST"],
  "verifactu/declaration/route.ts": ["GET"],
  "verifactu/register/route.ts": ["POST"],
  "verifactu/status/route.ts": ["GET"],
  "webhooks/stripe/route.ts": ["POST"],
};

const adminRoutes = [
  "admin/errors/route.ts",
  "admin/health/route.ts",
  "admin/operations-status/route.ts",
  "admin/users/[userId]/mfa/route.ts",
  "admin/users/[userId]/restore-points/route.ts",
  "admin/users/[userId]/route.ts",
  "admin/users/route.ts",
  "admin/vercel-usage/route.ts",
] as const;

const bearerRoutes = [
  "admin/ai-learning/correct/route.ts",
  "admin/ai-learning/feedback/route.ts",
  "admin/capabilities/route.ts",
  "billing/ai-usage/route.ts",
  "billing/checkout-scan-pack/route.ts",
  "billing/checkout/route.ts",
  "billing/portal/route.ts",
  "billing/profile/route.ts",
  "billing/trial/route.ts",
  "customers/parse/route.ts",
  "email/payment-reminder/route.ts",
  "email/welcome/route.ts",
  "expense-inbox/route.ts",
  "expenses/scan/route.ts",
  "google-drive/token/route.ts",
  "google-places/address-fill/route.ts",
  "imports/review/route.ts",
  "monitoring/error/route.ts",
  "referrals/me/route.ts",
  "referrals/redeem/route.ts",
  "reminders/realtime-session/route.ts",
  "verifactu/register/route.ts",
] as const;

const publicConstrainedRoutes = [
  "expense-deductibility/evaluate/route.ts",
  "fiscal-calendar/events/route.ts",
  "google-auth/token/route.ts",
  "security/csp-report/route.ts",
  "verifactu/declaration/route.ts",
  "verifactu/status/route.ts",
] as const;

const signedWebhookRoutes = [
  "expense-inbox/inbound/route.ts",
  "webhooks/stripe/route.ts",
] as const;

const flagControlledRoutes = [
  "document-sync/route.ts",
  "server-documents/ingest/route.ts",
] as const;

const scheduledRoutes = ["security/health-alert/route.ts"] as const;

const distributedRateLimitedRoutes = [
  ...adminRoutes,
  ...bearerRoutes,
  ...publicConstrainedRoutes,
];

const boundedBodyRoutes = [
  "admin/ai-learning/correct/route.ts",
  "admin/ai-learning/feedback/route.ts",
  "admin/users/[userId]/mfa/route.ts",
  "admin/users/[userId]/restore-points/route.ts",
  "admin/users/[userId]/route.ts",
  "billing/checkout/route.ts",
  "customers/parse/route.ts",
  "email/payment-reminder/route.ts",
  "email/welcome/route.ts",
  "expense-deductibility/evaluate/route.ts",
  "expense-inbox/inbound/route.ts",
  "expense-inbox/route.ts",
  "expenses/scan/route.ts",
  "google-auth/token/route.ts",
  "google-drive/token/route.ts",
  "imports/review/route.ts",
  "monitoring/error/route.ts",
  "referrals/redeem/route.ts",
  "security/csp-report/route.ts",
  "verifactu/register/route.ts",
  "webhooks/stripe/route.ts",
] as const;

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts"
      ? [relative(apiRoot, path).replaceAll("\\", "/")]
      : [];
  });
}

function sourceFor(route: string): string {
  return readFileSync(resolve(apiRoot, route), "utf8");
}

function exportedMethods(source: string): string[] {
  return Array.from(
    source.matchAll(
      /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)/g,
    ),
    (match) => match[1],
  ).sort();
}

describe("API security inventory", () => {
  it("requires every API route and exported method to be classified", () => {
    const discovered = routeFiles(apiRoot).sort();
    expect(discovered).toEqual(Object.keys(expectedMethods).sort());

    for (const route of discovered) {
      expect(exportedMethods(sourceFor(route)), route).toEqual(
        expectedMethods[route].slice().sort(),
      );
    }
  });

  it("classifies every route under exactly one access boundary", () => {
    const classified = [
      ...adminRoutes,
      ...bearerRoutes,
      ...publicConstrainedRoutes,
      ...signedWebhookRoutes,
      ...flagControlledRoutes,
      ...scheduledRoutes,
    ].sort();
    expect(classified).toEqual(Object.keys(expectedMethods).sort());
    expect(new Set(classified).size).toBe(classified.length);
  });

  it("keeps admin and bearer routes behind server-side identity checks", () => {
    for (const route of adminRoutes) {
      expect(sourceFor(route), route).toContain("getAdminAccessFromRequest");
    }
    for (const route of bearerRoutes) {
      expect(sourceFor(route), route).toContain("getUserFromBearer");
    }
  });

  it("keeps scheduled routes behind the shared scheduler secret", () => {
    for (const route of scheduledRoutes) {
      expect(sourceFor(route), route).toContain("CRON_SECRET");
      expect(sourceFor(route), route).toContain("timingSafeEqual");
    }
  });

  it("keeps the security alert scheduler versioned and protected", () => {
    const workflow = readFileSync(securityScheduler, "utf8");
    expect(workflow).toContain('cron: "*/15 * * * *"');
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("SECURITY_HEALTH_CRON_SECRET");
    expect(workflow).toContain("/api/security/health-alert");
    expect(workflow).toContain("Authorization: Bearer");
  });

  it("keeps constrained routes behind distributed rate limiting", () => {
    for (const route of distributedRateLimitedRoutes) {
      expect(sourceFor(route), route).toContain("checkRateLimit(");
    }
  });

  it("bounds every directly parsed request body", () => {
    for (const route of boundedBodyRoutes) {
      expect(sourceFor(route), route).toMatch(
        /readJsonBody|readTextBody|rejectOversizedContentLength|validateRequestBodySize/,
      );
    }
  });

  it("keeps webhooks signature-checked and bounded", () => {
    expect(sourceFor("webhooks/stripe/route.ts")).toContain(
      "stripe.webhooks.constructEvent",
    );
    expect(sourceFor("expense-inbox/inbound/route.ts")).toContain(
      "verifyResendPayload",
    );
    for (const route of signedWebhookRoutes) {
      expect(sourceFor(route), route).toContain("readTextBody");
    }
  });
});
