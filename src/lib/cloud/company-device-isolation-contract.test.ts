import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261001150000_company_scoped_cloud_devices.sql",
    import.meta.url,
  ),
  "utf8",
);
const enforcementMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20261001150100_company_scoped_cloud_device_enforcement.sql",
    import.meta.url,
  ),
  "utf8",
);
const deviceServer = readFileSync(
  new URL("./devices.ts", import.meta.url),
  "utf8",
);
const deviceRoute = readFileSync(
  new URL("../../app/api/cloud/devices/route.ts", import.meta.url),
  "utf8",
);
const devicesCard = readFileSync(
  new URL("../../components/cloud/CloudDevicesCard.tsx", import.meta.url),
  "utf8",
);

describe("company-scoped cloud device contract", () => {
  it("preserves legacy rows while allowing company owner scopes", () => {
    expect(migration).toContain(
      "drop constraint if exists user_devices_user_id_fkey",
    );
    expect(migration).not.toMatch(/delete\s+from\s+public\.user_devices/i);
    expect(migration).not.toMatch(
      /truncate\s+(?:table\s+)?public\.user_devices/i,
    );
    expect(migration).toContain("where company.data_owner_id = p_user_id");
    expect(enforcementMigration).toContain(
      "where device.user_id = v_device_scope_id",
    );
    expect(migration).not.toContain(
      "create or replace function public.app_company_cloud_access_allowed_v1",
    );
  });

  it("uses the company scope for slots and the billing owner only for its plan", () => {
    expect(deviceServer).toContain("billingUserId = userId");
    expect(deviceServer).toContain("effectivePlanForUser(billingUserId)");
    expect(deviceServer).toContain("selectDeviceRows(admin, userId)");
    expect(deviceRoute).toContain("userId: auth.userId");
    expect(deviceRoute).toContain("billingUserId: auth.billingUserId");
    expect(devicesCard).toContain("useWorkspaceStorage()");
    expect(devicesCard).toContain("expectedOwnerScope: ownerScope");
    expect(devicesCard).toContain(
      "[billingEnabled, canUseCloud, emailConfirmed, ownerScope, user]",
    );
  });
});
