import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readLocal, saveLocal } from "./storage";
import { parseQuickIntent } from "@/lib/quick-invoicing/model";
import { syntheticIntent } from "@/lib/quick-invoicing/test-fixtures";

describe("quick app storage is bounded and separate from the main app",() => {
  it("restores an immutable pending intent across opening the app",async () => {
    const intent = parseQuickIntent(syntheticIntent());
    await saveLocal("synthetic-actor:old-company",{intent,pending:structuredClone(intent),step:3});
    const restored = await readLocal("synthetic-actor:old-company");
    expect(restored?.pending).toEqual(intent);
    expect(restored?.step).toBe(3);
  });
  it("does not read another actor or company or the full app cache",async () => {
    expect(await readLocal("synthetic-actor:new-company")).toBeUndefined();
    expect(await readLocal("another-actor:old-company")).toBeUndefined();
  });
});
