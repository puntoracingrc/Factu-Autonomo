import { describe, expect, it } from "vitest";

import { evaluatePersistedAppEntityShadowCanary } from "./persisted-app-entity-shadow-canary";

const FIRST_OWNER = "synthetic-entity-shadow-benchmark";
const SECOND_OWNER = "synthetic-entity-shadow-account-b";
const storageKey = (ownerId: string, kind: "guest" | "user" = "guest") =>
  `factu:workspace:v2:${kind}:${encodeURIComponent(ownerId)}`;

describe("persisted app entity shadow canary", () => {
  it("permanece apagado por defecto", () => {
    expect(
      evaluatePersistedAppEntityShadowCanary(storageKey(FIRST_OWNER), {}),
    ).toEqual({ enabled: false, ownerId: null, reason: "kill_switch" });
  });

  it("habilita solo el identificador exacto incluido en el canario", () => {
    const environment = {
      enabled: "false",
      killSwitch: "false",
      ownerIds: ` ${FIRST_OWNER} `,
    };

    expect(
      evaluatePersistedAppEntityShadowCanary(
        storageKey(FIRST_OWNER),
        environment,
      ),
    ).toEqual({
      enabled: true,
      ownerId: FIRST_OWNER,
      reason: "enabled_for_owner",
    });
    expect(
      evaluatePersistedAppEntityShadowCanary(
        storageKey(SECOND_OWNER),
        environment,
      ),
    ).toEqual({
      enabled: false,
      ownerId: SECOND_OWNER,
      reason: "owner_not_allowed",
    });
  });

  it("acepta espacios de usuario y conserva caracteres codificados", () => {
    const ownerId = "synthetic/user+canary@example.invalid";
    expect(
      evaluatePersistedAppEntityShadowCanary(storageKey(ownerId, "user"), {
        enabled: "false",
        killSwitch: "false",
        ownerIds: ownerId,
      }),
    ).toEqual({
      enabled: true,
      ownerId,
      reason: "enabled_for_owner",
    });
  });

  it("rechaza comodines y claves que no pertenecen a un espacio aislado", () => {
    expect(
      evaluatePersistedAppEntityShadowCanary(storageKey(FIRST_OWNER), {
        enabled: "false",
        killSwitch: "false",
        ownerIds: "*",
      }),
    ).toMatchObject({ enabled: false, reason: "owner_not_allowed" });
    expect(
      evaluatePersistedAppEntityShadowCanary("factura-autonomo-data", {
        enabled: "true",
        killSwitch: "false",
        ownerIds: FIRST_OWNER,
      }),
    ).toEqual({
      enabled: false,
      ownerId: null,
      reason: "invalid_storage_key",
    });
  });

  it("permite el modo global solo con una clave aislada y el corte abierto", () => {
    expect(
      evaluatePersistedAppEntityShadowCanary(storageKey(SECOND_OWNER), {
        enabled: "true",
        killSwitch: "false",
      }),
    ).toEqual({
      enabled: true,
      ownerId: SECOND_OWNER,
      reason: "enabled_globally",
    });
    expect(
      evaluatePersistedAppEntityShadowCanary(storageKey(SECOND_OWNER), {
        enabled: "true",
        killSwitch: "true",
      }),
    ).toEqual({ enabled: false, ownerId: null, reason: "kill_switch" });
  });
});
