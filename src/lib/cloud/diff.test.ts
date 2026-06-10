import { describe, expect, it } from "vitest";
import { applySyncChanges, diffAppData } from "./diff";
import { EMPTY_DATA } from "../types";
import type { Customer } from "../types";

function customer(id: string, name: string): Customer {
  const [firstName, ...rest] = name.split(" ");
  return {
    id,
    firstName,
    lastName: rest.join(" "),
    name,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("sync por cambios", () => {
  it("detecta solo el cliente añadido", () => {
    const prev = EMPTY_DATA;
    const next = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };

    const changes = diffAppData(prev, next);
    expect(changes).toHaveLength(1);
    expect(changes[0].entityType).toBe("customer");
    expect(changes[0].entityId).toBe("c1");
  });

  it("aplica un cambio remoto sin tocar el resto", () => {
    const local = {
      ...EMPTY_DATA,
      customers: [customer("c1", "Ana López")],
    };
    const remote = [
      {
        entityType: "customer" as const,
        entityId: "c2",
        deleted: false,
        payload: customer("c2", "Luis Pérez"),
        updatedAt: "2026-06-10T12:00:00.000Z",
      },
    ];

    const merged = applySyncChanges(local, remote);
    expect(merged.customers).toHaveLength(2);
  });
});
