import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel region configuration", () => {
  it("runs server functions beside the Supabase project in Frankfurt", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
    ) as { $schema?: string; regions?: string[] };

    expect(config.$schema).toBe("https://openapi.vercel.sh/vercel.json");
    expect(config.regions).toEqual(["fra1"]);
  });
});
