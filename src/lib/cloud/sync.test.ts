import { describe, expect, it } from "vitest";
import { pickNewerAppData } from "./sync";
import { EMPTY_DATA } from "../types";

describe("cloud sync", () => {
  it("elige la copia local si es más reciente", () => {
    const local = {
      ...EMPTY_DATA,
      meta: { lastModified: "2026-06-10T10:00:00.000Z" },
    };
    const cloud = {
      ...EMPTY_DATA,
      meta: { lastModified: "2026-06-09T10:00:00.000Z" },
    };

    const result = pickNewerAppData(local, cloud, "2026-06-09T10:00:00.000Z");
    expect(result.source).toBe("local");
  });

  it("elige la copia de la nube si es más reciente", () => {
    const local = {
      ...EMPTY_DATA,
      meta: { lastModified: "2026-06-09T10:00:00.000Z" },
    };
    const cloud = {
      ...EMPTY_DATA,
      customers: [
        {
          id: "1",
          firstName: "Ana",
          lastName: "López",
          name: "Ana López",
          createdAt: "",
          updatedAt: "",
        },
      ],
      meta: { lastModified: "2026-06-10T12:00:00.000Z" },
    };

    const result = pickNewerAppData(local, cloud, "2026-06-10T12:00:00.000Z");
    expect(result.source).toBe("cloud");
    expect(result.data.customers).toHaveLength(1);
  });
});
