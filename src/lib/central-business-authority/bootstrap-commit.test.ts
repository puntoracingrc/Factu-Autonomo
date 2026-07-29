import { describe, expect, it } from "vitest";

import {
  buildCentralBusinessBootstrapCommitCommand,
  CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
} from "./bootstrap-commit";
import {
  buildCentralBusinessBootstrapPreview,
  type CentralBusinessBootstrapEntityInput,
} from "./bootstrap-preview";

const entities: CentralBusinessBootstrapEntityInput[] = [
  {
    entityType: "supplier",
    entityId: "supplier-a",
    payload: { id: "supplier-a", name: "Proveedor A" },
  },
  {
    entityType: "customer",
    entityId: "customer-a",
    payload: { id: "customer-a", name: "Cliente A" },
  },
];

function command(inputEntities = entities) {
  const preview = buildCentralBusinessBootstrapPreview({
    localEntities: inputEntities,
    centralEntities: [],
  });
  return buildCentralBusinessBootstrapCommitCommand({
    userId: "user-a",
    deviceId: "device-a",
    sessionId: "session-a",
    idempotencyKey: "bootstrap:synthetic:0001",
    confirmation: CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
    entities: inputEntities,
    preview,
  });
}

describe("central business bootstrap commit command", () => {
  it("firma y ordena un lote idempotente sin incluir payloads en requestHash", () => {
    const first = command();
    const reordered = command([...entities].reverse());

    expect(first.requestHash).toBe(reordered.requestHash);
    expect(first.entities.map((entity) => entity.entityId)).toEqual([
      "customer-a",
      "supplier-a",
    ]);
    expect(first.entities[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.entities[0]?.idempotencyKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.entities[0]?.requestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("exige confirmacion literal y una vista previa sin conflictos", () => {
    const preview = buildCentralBusinessBootstrapPreview({
      localEntities: entities,
      centralEntities: [
        {
          entityType: "customer",
          entityId: "customer-a",
          currentVersion: 1,
          deleted: true,
          contentHash: "tombstone",
        },
      ],
    });

    expect(() =>
      buildCentralBusinessBootstrapCommitCommand({
        userId: "user-a",
        deviceId: "device-a",
        sessionId: "session-a",
        idempotencyKey: "bootstrap:synthetic:0001",
        confirmation: "yes",
        entities,
        preview: buildCentralBusinessBootstrapPreview({
          localEntities: entities,
          centralEntities: [],
        }),
      }),
    ).toThrow("confirmacion explicita");
    expect(() =>
      buildCentralBusinessBootstrapCommitCommand({
        userId: "user-a",
        deviceId: "device-a",
        sessionId: "session-a",
        idempotencyKey: "bootstrap:synthetic:0001",
        confirmation: CENTRAL_BUSINESS_BOOTSTRAP_CONFIRMATION,
        entities,
        preview,
      }),
    ).toThrow("contiene conflictos");
  });
});
