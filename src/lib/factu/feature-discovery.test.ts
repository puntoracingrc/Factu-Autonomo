import { describe, expect, it } from "vitest";
import { collectFactuFeatureTips } from "./feature-discovery";
import { DEFAULT_PROFILE, EMPTY_DATA } from "../types";
import { defaultFactuFeatureUsage } from "./feature-usage";

describe("collectFactuFeatureTips", () => {
  it("no sugiere nada sin perfil", () => {
    expect(
      collectFactuFeatureTips({
        data: EMPTY_DATA,
        usage: defaultFactuFeatureUsage(),
      }),
    ).toEqual([]);
  });

  it("sugiere recordatorios e impuestos a usuario activo", () => {
    const tips = collectFactuFeatureTips({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
        documents: [
          {
            id: "f1",
            type: "factura",
            number: "F-1",
            date: "2026-06-01",
            client: { name: "Ana" },
            items: [],
            status: "enviado",
            createdAt: "2026-06-01",
            updatedAt: "2026-06-01",
          },
        ],
      },
      usage: defaultFactuFeatureUsage(),
    });

    expect(tips.some((tip) => tip.id === "factu-tip-reminders")).toBe(true);
    expect(tips.some((tip) => tip.id === "factu-tip-impuestos")).toBe(true);
    expect(tips.every((tip) => tip.category === "factu")).toBe(true);
  });

  it("oculta consejos ya usados", () => {
    const tips = collectFactuFeatureTips({
      data: {
        ...EMPTY_DATA,
        profile: { ...DEFAULT_PROFILE, name: "Test", nif: "12345678Z" },
        documents: [
          {
            id: "f1",
            type: "factura",
            number: "F-1",
            date: "2026-06-01",
            client: { name: "Ana" },
            items: [],
            status: "enviado",
            createdAt: "2026-06-01",
            updatedAt: "2026-06-01",
          },
        ],
      },
      usage: {
        ...defaultFactuFeatureUsage(),
        impuestos: true,
        userReminders: true,
      },
    });

    expect(tips.some((tip) => tip.id === "factu-tip-impuestos")).toBe(false);
    expect(tips.some((tip) => tip.id === "factu-tip-reminders")).toBe(false);
  });
});
