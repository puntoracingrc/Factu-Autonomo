import { describe, expect, it } from "vitest";
import {
  CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY,
  CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY,
  CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY,
  CENTRAL_INVOICE_AUTHORITY_MODE_KEY,
  CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY,
  CENTRAL_INVOICE_AUTHORITY_PRODUCTION_APPROVED_KEY,
  CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
  CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY,
  evaluateCentralInvoiceAuthorityActivation,
} from "./activation";

const USER_ID = "11111111-1111-4111-8111-111111111111";

const READY_PRIVATE_GATES = {
  [CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY]: "true",
  [CENTRAL_INVOICE_AUTHORITY_ISOLATED_RESTORE_DRILL_PASSED_KEY]: "true",
} as const;

describe("central invoice authority activation", () => {
  it("permanece apagada por defecto", () => {
    expect(evaluateCentralInvoiceAuthorityActivation({ env: {} })).toEqual({
      requestedMode: "off",
      effectiveMode: "off",
      enabled: false,
      fiscalWritesEnabled: false,
      appliesToUser: false,
      production: false,
      reason: "disabled",
    });
  });

  it("trata un modo desconocido como apagado", () => {
    const result = evaluateCentralInvoiceAuthorityActivation({
      env: { [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "automatic" },
    });

    expect(result.effectiveMode).toBe("off");
    expect(result.fiscalWritesEnabled).toBe(false);
    expect(result.reason).toBe("invalid_mode");
  });

  it("permite shadow sin escrituras fiscales", () => {
    const result = evaluateCentralInvoiceAuthorityActivation({
      env: { [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "shadow" },
      userId: USER_ID,
    });

    expect(result.effectiveMode).toBe("shadow");
    expect(result.enabled).toBe(true);
    expect(result.fiscalWritesEnabled).toBe(false);
    expect(result.reason).toBe("shadow_only");
  });

  it("limita canary a usuarios incluidos expresamente", () => {
    const env = {
      [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
      [CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY]: USER_ID,
      [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
        CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
      ...READY_PRIVATE_GATES,
    };

    expect(
      evaluateCentralInvoiceAuthorityActivation({
        env,
        userId: "22222222-2222-4222-8222-222222222222",
      }).reason,
    ).toBe("user_not_allowlisted");
    expect(
      evaluateCentralInvoiceAuthorityActivation({ env, userId: USER_ID })
        .fiscalWritesEnabled,
    ).toBe(true);
  });

  it("bloquea canary cuando el esquema no esta listo", () => {
    const result = evaluateCentralInvoiceAuthorityActivation({
      env: {
        [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
        [CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY]: USER_ID,
      },
      userId: USER_ID,
    });

    expect(result.effectiveMode).toBe("off");
    expect(result.reason).toBe("schema_not_ready");
  });

  it("bloquea canary mientras la sincronizacion operativa no esta lista", () => {
    const result = evaluateCentralInvoiceAuthorityActivation({
      env: {
        [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
        [CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY]: USER_ID,
        [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
          CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
      },
      userId: USER_ID,
    });

    expect(result.effectiveMode).toBe("off");
    expect(result.fiscalWritesEnabled).toBe(false);
    expect(result.reason).toBe("operational_sync_not_ready");
  });

  it("exige baseline, copia restaurable y ensayo aislado antes de escrituras fiscales", () => {
    const baseEnv = {
      [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "required",
      [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
        CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
      [CENTRAL_INVOICE_AUTHORITY_OPERATIONAL_SYNC_READY_KEY]: "true",
    };

    expect(
      evaluateCentralInvoiceAuthorityActivation({ env: baseEnv, userId: USER_ID })
        .reason,
    ).toBe("baseline_not_reconciled");
    expect(
      evaluateCentralInvoiceAuthorityActivation({
        env: {
          ...baseEnv,
          [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
        },
        userId: USER_ID,
      }).reason,
    ).toBe("restorable_backup_missing");
    expect(
      evaluateCentralInvoiceAuthorityActivation({
        env: {
          ...baseEnv,
          [CENTRAL_INVOICE_AUTHORITY_BASELINE_RECONCILED_KEY]: "true",
          [CENTRAL_INVOICE_AUTHORITY_RESTORABLE_BACKUP_VERIFIED_KEY]: "true",
        },
        userId: USER_ID,
      }).reason,
    ).toBe("isolated_restore_drill_missing");
  });

  it("exige aprobacion adicional para escrituras en produccion", () => {
    const baseEnv = {
      NODE_ENV: "production",
      [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "canary",
      [CENTRAL_INVOICE_AUTHORITY_CANARY_USERS_KEY]: USER_ID,
      [CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION_KEY]:
        CENTRAL_INVOICE_AUTHORITY_SCHEMA_VERSION,
      ...READY_PRIVATE_GATES,
    };

    expect(
      evaluateCentralInvoiceAuthorityActivation({
        env: baseEnv,
        userId: USER_ID,
      }).reason,
    ).toBe("production_approval_missing");

    expect(
      evaluateCentralInvoiceAuthorityActivation({
        env: {
          ...baseEnv,
          [CENTRAL_INVOICE_AUTHORITY_PRODUCTION_APPROVED_KEY]: "true",
        },
        userId: USER_ID,
      }).reason,
    ).toBe("canary_enabled");
  });

  it("no permite required sin esquema y aprobacion de produccion", () => {
    const result = evaluateCentralInvoiceAuthorityActivation({
      env: {
        VERCEL_ENV: "production",
        [CENTRAL_INVOICE_AUTHORITY_MODE_KEY]: "required",
      },
      userId: USER_ID,
    });

    expect(result.effectiveMode).toBe("off");
    expect(result.fiscalWritesEnabled).toBe(false);
    expect(result.reason).toBe("schema_not_ready");
  });
});
