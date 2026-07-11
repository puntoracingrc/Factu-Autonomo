import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cloudSyncSource = readFileSync(
  new URL("../../context/CloudSyncContext.tsx", import.meta.url),
  "utf8",
);
const stripeWebhookSource = readFileSync(
  new URL("../../app/api/webhooks/stripe/route.ts", import.meta.url),
  "utf8",
);

describe("welcome email trigger ownership", () => {
  it("solo lo solicita el cliente autenticado después de confirmar el email", () => {
    expect(cloudSyncSource).toContain('fetch("/api/email/welcome"');
    expect(cloudSyncSource).toContain("!emailConfirmed");
    expect(cloudSyncSource).toContain("WELCOME_MAX_CLIENT_RETRIES");
    expect(stripeWebhookSource).not.toContain("sendWelcomeEmailForUser");
    expect(stripeWebhookSource).not.toContain('/api/email/welcome');
  });
});
