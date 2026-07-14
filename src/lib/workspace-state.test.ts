import { describe, expect, it } from "vitest";
import { EMPTY_DATA } from "@/lib/types";
import { hasWorkspaceContent } from "@/lib/workspace-state";
import type { FiscalNotificationsWorkspace } from "@/lib/fiscal-notifications/types";

function fiscalWorkspace(): FiscalNotificationsWorkspace {
  return {
    schemaVersion: 1,
    workspaceId: "fiscal-notifications-workspace-v1",
    ownerScope: "user:00000000-0000-4000-8000-000000000001",
    revision: 0,
    createdAt: "2026-07-14T09:00:00.000Z",
    updatedAt: "2026-07-14T09:00:00.000Z",
    packages: [],
    files: [],
    documents: [],
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
  };
}

describe("hasWorkspaceContent", () => {
  it("detecta un espacio vacío", () => {
    expect(hasWorkspaceContent(EMPTY_DATA)).toBe(false);
  });

  it("detecta datos fiscales empezados", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        profile: { ...EMPTY_DATA.profile, name: "Demo Local" },
      }),
    ).toBe(true);
  });

  it("detecta entidades guardadas", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        customers: [
          {
            id: "customer-1",
            customerType: "person",
            firstName: "María",
            lastName: "López",
            name: "María López",
            nif: "12345678A",
            email: "",
            phone: "",
            streetType: "",
            address: "",
            residenceType: "flat",
            addressExtra: "",
            city: "",
            postalCode: "",
            notes: "",
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });

  it("protege un expediente fiscal aunque sea el único contenido local", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        fiscalNotificationsWorkspace: fiscalWorkspace(),
      }),
    ).toBe(true);
  });

  it("protege una cuarentena recuperable aunque no queden entidades activas", () => {
    expect(
      hasWorkspaceContent({
        ...EMPTY_DATA,
        workspaceIntegrityQuarantine: [
          {
            collection: "customers",
            reason: "malformed_collection",
            rawValue: { bad: true },
          },
        ],
      }),
    ).toBe(true);
  });
});
