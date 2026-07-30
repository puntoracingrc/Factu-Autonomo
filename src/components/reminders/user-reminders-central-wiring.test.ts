import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const panel = readFileSync(
  "src/components/reminders/UserRemindersPanel.tsx",
  "utf8",
);
const hook = readFileSync("src/hooks/useCentralUserReminders.ts", "utf8");
const env = readFileSync(".env.example", "utf8");

describe("user reminders central wiring", () => {
  it("dirige las cuatro acciones por el adaptador central", () => {
    expect(panel).toContain("useCentralUserReminders");
    expect(panel).toContain("await createReminder");
    expect(panel).toContain("await setReminderCompleted");
    expect(panel).toContain("await deleteReminder");
    expect(hook).toContain("createReminderWithCentralCanary");
    expect(hook).toContain("setReminderCompletedWithCentralCanary");
    expect(hook).toContain("deleteReminderWithCentralCanary");
  });

  it("limita la activación pública por UUID y bloquea dobles acciones", () => {
    expect(env).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_REMINDER_CANARY_ENABLED=false",
    );
    expect(env).toContain(
      "NEXT_PUBLIC_CENTRAL_BUSINESS_REMINDER_CANARY_USER_IDS=",
    );
    expect(panel).toContain("if (savingReminder) return");
    expect(panel).toContain("if (busyReminderId) return");
    expect(panel).toContain("disabled={savingReminder}");
  });
});
