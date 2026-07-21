import { describe, expect, it } from "vitest";
import { EMPTY_DATA, type AppData, type SyncChange } from "@/lib/types";
import {
  buildCloudRepairPreviewPlan,
  cloudRepairPreviewAllowsConfirmation,
  cloudRepairSnapshotFingerprint,
  newestCloudChangeTimestamp,
} from "./device-repair-preview";

const OWNER_SCOPE = `sha256:${"a".repeat(64)}`;

function snapshot(input: {
  customers?: number;
  invoices?: number;
  expenses?: number;
  fiscalDocuments?: number;
  lastModified: string;
  ownerScope?: string;
}): AppData {
  return {
    ...EMPTY_DATA,
    profile: { ...EMPTY_DATA.profile },
    customers: Array.from(
      { length: input.customers ?? 0 },
      (_, index) =>
        ({ id: `customer-${index}` }) as AppData["customers"][number],
    ),
    documents: Array.from(
      { length: input.invoices ?? 0 },
      (_, index) =>
        ({
          id: `invoice-${index}`,
          type: "factura",
        }) as AppData["documents"][number],
    ),
    expenses: Array.from(
      { length: input.expenses ?? 0 },
      (_, index) => ({ id: `expense-${index}` }) as AppData["expenses"][number],
    ),
    fiscalNotificationsWorkspace:
      input.fiscalDocuments === undefined
        ? undefined
        : ({
            schemaVersion: 1,
            workspaceId: "workspace-1",
            ownerScope: input.ownerScope ?? OWNER_SCOPE,
            revision: 4,
            createdAt: "2026-07-20T08:00:00.000Z",
            updatedAt: "2026-07-21T09:30:00.000Z",
            documents: Array.from(
              { length: input.fiscalDocuments },
              (_, index) => ({ id: `fiscal-${index}` }),
            ),
            packages: [],
            files: [],
            parts: [],
            authorities: [],
            references: [],
            evidence: [],
            debts: [],
            debtObservations: [],
            cases: [],
            relations: [],
            analysisSnapshots: [],
            paymentOptions: [],
            paymentPlans: [],
            installments: [],
            interestCalculations: [],
            deadlineRules: [],
            obligations: [],
            timeline: [],
            accountingDrafts: [],
            auditEvents: [],
          } as unknown as AppData["fiscalNotificationsWorkspace"]),
    meta: {
      lastModified: input.lastModified,
      lastSyncedAt: input.lastModified,
    },
  };
}

describe("cloud device repair preview", () => {
  it("shows dates and exact count reductions without treating them as identity", () => {
    const local = snapshot({
      customers: 3,
      invoices: 2,
      expenses: 1,
      fiscalDocuments: 2,
      lastModified: "2026-07-21T10:00:00.000Z",
    });
    const cloud = snapshot({
      customers: 2,
      invoices: 1,
      expenses: 2,
      fiscalDocuments: 1,
      lastModified: "2026-07-21T09:00:00.000Z",
    });

    const result = buildCloudRepairPreviewPlan({
      local,
      cloud,
      localRecordedAt: local.meta!.lastModified,
      cloudRecordedAt: "2026-07-21T09:05:00.000Z",
      cloudSource: "entities",
      generatedAt: "2026-07-21T10:05:00.000Z",
      expectedFiscalOwnerScope: OWNER_SCOPE,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.preview.local.recordedAt).toBe("2026-07-21T10:00:00.000Z");
    expect(result.preview.cloud.recordedAt).toBe("2026-07-21T09:05:00.000Z");
    expect(
      result.preview.counts.find((entry) => entry.key === "customers"),
    ).toMatchObject({ local: 3, cloud: 2, delta: -1, reduction: true });
    expect(
      result.preview.counts.find((entry) => entry.key === "expenses"),
    ).toMatchObject({ local: 1, cloud: 2, delta: 1, reduction: false });
    expect(
      result.preview.counts.find((entry) => entry.key === "fiscalDocuments"),
    ).toMatchObject({
      local: 2,
      cloud: 1,
      protectedReduction: true,
    });
    expect(result.preview.hasReductions).toBe(true);
    expect(result.preview.hasProtectedReductions).toBe(true);
    expect(result.preview.exactBusinessStateMatches).toBe(false);
    expect(cloudRepairPreviewAllowsConfirmation(result.preview, false)).toBe(
      false,
    );
    expect(cloudRepairPreviewAllowsConfirmation(result.preview, true)).toBe(
      true,
    );
  });

  it("uses a business fingerprint that ignores only volatile sync metadata", () => {
    const original = snapshot({
      customers: 1,
      lastModified: "2026-07-21T10:00:00.000Z",
    });
    const metadataOnly = {
      ...original,
      meta: {
        lastModified: "2026-07-21T11:00:00.000Z",
        pendingChanges: [],
      },
    };
    const changed = {
      ...original,
      customers: [
        ...original.customers,
        { id: "customer-2" } as AppData["customers"][number],
      ],
    };

    expect(cloudRepairSnapshotFingerprint(metadataOnly)).toBe(
      cloudRepairSnapshotFingerprint(original),
    );
    expect(cloudRepairSnapshotFingerprint(changed)).not.toBe(
      cloudRepairSnapshotFingerprint(original),
    );
  });

  it("does not present equal counts as equal business content", () => {
    const local = snapshot({
      customers: 1,
      lastModified: "2026-07-21T10:00:00.000Z",
    });
    const cloud = {
      ...snapshot({
        customers: 1,
        lastModified: "2026-07-21T10:00:00.000Z",
      }),
      customers: [{ id: "different-customer" } as AppData["customers"][number]],
    };
    const result = buildCloudRepairPreviewPlan({
      local,
      cloud,
      localRecordedAt: local.meta!.lastModified,
      cloudRecordedAt: cloud.meta!.lastModified,
      cloudSource: "entities",
      generatedAt: "2026-07-21T10:05:00.000Z",
      expectedFiscalOwnerScope: OWNER_SCOPE,
    });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") return;
    expect(result.preview.hasReductions).toBe(false);
    expect(result.preview.exactBusinessStateMatches).toBe(false);
  });

  it("abstains when a fiscal workspace belongs to another owner scope", () => {
    const local = snapshot({
      fiscalDocuments: 1,
      lastModified: "2026-07-21T10:00:00.000Z",
      ownerScope: `sha256:${"b".repeat(64)}`,
    });
    const cloud = snapshot({
      fiscalDocuments: 1,
      lastModified: "2026-07-21T10:00:00.000Z",
    });

    expect(
      buildCloudRepairPreviewPlan({
        local,
        cloud,
        localRecordedAt: local.meta!.lastModified,
        cloudRecordedAt: cloud.meta!.lastModified,
        cloudSource: "entities",
        generatedAt: "2026-07-21T10:05:00.000Z",
        expectedFiscalOwnerScope: OWNER_SCOPE,
      }),
    ).toEqual({ status: "blocked", reason: "unclassifiable_snapshot" });
  });

  it.each([
    ["local absent", "local", undefined],
    ["local empty", "local", ""],
    ["cloud absent", "cloud", undefined],
    ["cloud empty", "cloud", ""],
  ] as const)(
    "abstains when the fiscal owner scope is %s",
    (_label, target, ownerScope) => {
      const local = snapshot({
        fiscalDocuments: 0,
        lastModified: "2026-07-21T10:00:00.000Z",
      });
      const cloud = snapshot({
        fiscalDocuments: 0,
        lastModified: "2026-07-21T10:00:00.000Z",
      });
      const workspace =
        target === "local"
          ? local.fiscalNotificationsWorkspace!
          : cloud.fiscalNotificationsWorkspace!;
      workspace.ownerScope = ownerScope as string;

      expect(
        buildCloudRepairPreviewPlan({
          local,
          cloud,
          localRecordedAt: local.meta!.lastModified,
          cloudRecordedAt: cloud.meta!.lastModified,
          cloudSource: "entities",
          generatedAt: "2026-07-21T10:05:00.000Z",
          expectedFiscalOwnerScope: OWNER_SCOPE,
        }),
      ).toEqual({ status: "blocked", reason: "unclassifiable_snapshot" });
    },
  );

  it("abstains when a document category cannot be counted closed", () => {
    const local = snapshot({
      lastModified: "2026-07-21T10:00:00.000Z",
    });
    const cloud = {
      ...snapshot({ lastModified: "2026-07-21T10:00:00.000Z" }),
      documents: [{ id: "unknown", type: "unknown" }],
    } as unknown as AppData;

    expect(
      buildCloudRepairPreviewPlan({
        local,
        cloud,
        localRecordedAt: local.meta!.lastModified,
        cloudRecordedAt: cloud.meta!.lastModified,
        cloudSource: "entities",
        generatedAt: "2026-07-21T10:05:00.000Z",
        expectedFiscalOwnerScope: OWNER_SCOPE,
      }),
    ).toEqual({ status: "blocked", reason: "unclassifiable_snapshot" });
  });

  it("selects the latest valid cloud entity timestamp", () => {
    const changes = [
      { updatedAt: "invalid" },
      { updatedAt: "2026-07-21T08:00:00.000Z" },
      { updatedAt: "2026-07-21T09:30:00.000Z" },
    ] as SyncChange[];

    expect(newestCloudChangeTimestamp(changes)).toBe(
      "2026-07-21T09:30:00.000Z",
    );
  });
});
