import { afterEach, describe, expect, it, vi } from "vitest";

import { mutateCentralBusinessFromBrowser } from "./central-business-authority/mutation-client";
import {
  CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY,
  issueCentralInvoiceAuthorityFromBrowser,
  resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser,
} from "./central-invoice-authority/form-canary-client";
import {
  setActiveWorkspaceOwnerScope,
  workspaceScopedBrowserStorageKey,
} from "./workspace-owner-runtime";

const OWNER_A = "owner-account-a";
const OWNER_B = "owner-account-b";

function readyStatusResponse(): Response {
  return new Response(
    JSON.stringify({
      ok: true,
      schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_ROUTE_V1",
      activation: {
        requestedMode: "canary",
        effectiveMode: "canary",
        enabled: true,
        fiscalWritesEnabled: true,
        appliesToUser: true,
        production: false,
        reason: "canary_allowlisted",
      },
      readiness: {
        schema: "CENTRAL_INVOICE_AUTHORITY_STATUS_READINESS_V1",
        checkedAt: "2026-09-07T12:00:00.000Z",
        ready: true,
        checks: [],
        blockers: [],
      },
      summary: {
        fiscalWritesPossible: true,
        modeAllowsWrites: true,
        serverSchemaReady: true,
        deviceVerified: true,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("workspace account switch guards", () => {
  afterEach(() => setActiveWorkspaceOwnerScope(null));

  it("no envia una ficha si la cuenta activa ya no es su propietaria", async () => {
    const fetchImpl = vi.fn();
    setActiveWorkspaceOwnerScope(OWNER_B);

    const result = await mutateCentralBusinessFromBrowser(
      {
        idempotencyKey: "account-switch-customer-1",
        operationKind: "upsert",
        entityType: "customer",
        entityId: "customer-1",
        expectedVersion: 0,
        payload: { id: "customer-1", name: "Cuenta A" },
      },
      { fetchImpl, expectedOwnerScope: OWNER_A },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_BUSINESS_MUTATION_SESSION_REQUIRED",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("no emite una factura si la cuenta activa cambio durante el flujo", async () => {
    const fetchImpl = vi.fn();
    setActiveWorkspaceOwnerScope(OWNER_B);

    const result = await issueCentralInvoiceAuthorityFromBrowser(
      {
        kind: "invoice",
        idempotencyKey: "account-switch-invoice-1",
        draft: {
          localDocumentId: "draft-1",
          expectedVersion: 0,
          draftHash: "sha256:draft",
        },
        series: {
          environment: "test",
          issuerNif: "B00000000",
          seriesCode: "F-2026",
          fiscalYear: 2026,
        },
        issuedAt: "2026-09-07T12:00:00.000Z",
        documentPayload: { synthetic: true },
        emittedSnapshot: { synthetic: true },
        emittedHash: "sha256:emitted",
      },
      { fetchImpl, expectedOwnerScope: OWNER_A },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CENTRAL_AUTHORITY_SESSION_REQUIRED",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("aborta antes de emitir si la cuenta cambia durante el preflight", async () => {
    setActiveWorkspaceOwnerScope(OWNER_A);
    const fetchImpl = vi.fn(async () => {
      setActiveWorkspaceOwnerScope(OWNER_B);
      return readyStatusResponse();
    });

    const result = await issueCentralInvoiceAuthorityFromBrowser(
      {
        kind: "invoice",
        idempotencyKey: "account-switch-invoice-preflight-1",
        draft: {
          localDocumentId: "draft-1",
          expectedVersion: 0,
          draftHash: "sha256:draft",
        },
        series: {
          environment: "test",
          issuerNif: "B00000000",
          seriesCode: "F-2026",
          fiscalYear: 2026,
        },
        issuedAt: "2026-09-07T12:00:00.000Z",
        documentPayload: { synthetic: true },
        emittedSnapshot: { synthetic: true },
        emittedHash: "sha256:emitted",
      },
      {
        expectedOwnerScope: OWNER_A,
        fetchImpl,
        getAccessToken: async () => "access-token-a",
        getDeviceToken: () => "device-token-a",
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: "WORKSPACE_ACCOUNT_CHANGED",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("no guarda la política de A en B si cambia durante la comprobación", async () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
    };
    setActiveWorkspaceOwnerScope(OWNER_A);

    const result = await resolveCentralInvoiceAuthorityFormIssuePolicyFromBrowser({
      expectedOwnerScope: OWNER_A,
      publicFormCanaryEnabled: true,
      publicFormCanaryUserId: OWNER_A,
      getAccessToken: async () => "access-token-a",
      getDeviceToken: () => "device-token-a",
      fetchImpl: vi.fn(async () => {
        setActiveWorkspaceOwnerScope(OWNER_B);
        return readyStatusResponse();
      }),
      storage,
    });

    expect(result).toMatchObject({
      shouldUseCentralAuthority: false,
      reason: "status_unavailable",
    });
    expect(
      entries.get(
        workspaceScopedBrowserStorageKey(
          CENTRAL_INVOICE_AUTHORITY_FORM_LAST_KNOWN_GUARD_KEY,
          OWNER_B,
        ),
      ),
    ).toBeUndefined();
  });
});
