import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260730224000_replay_identical_central_business_mutations.sql",
  ),
  "utf8",
);

describe("central business identical mutation replay schema", () => {
  it("replays the current event without creating a new version", () => {
    expect(migration).toContain(
      "CENTRAL_BUSINESS_IDENTICAL_MUTATION_REPLAY_V1",
    );
    expect(migration).toContain("v_entity.content_hash = p_content_hash");
    expect(migration).toContain("v_entity.current_payload = p_payload");
    expect(migration).toContain("entity_version = v_entity.current_version");
    expect(migration).toContain("'replayed'::text");

    const replayBranch = migration.slice(
      migration.indexOf("if found"),
      migration.indexOf("if p_expected_version = 0"),
    );
    expect(replayBranch).not.toContain(
      "insert into public.central_business_outbox",
    );
    expect(replayBranch).not.toContain("v_next_version :=");
  });

  it("keeps the RPC service-only and fails closed without current evidence", () => {
    expect(migration).toContain(
      "central business entity is missing its current outbox event",
    );
    expect(migration).toContain("errcode = 'P4106'");
    expect(migration).toContain(
      "from public, anon, authenticated",
    );
    expect(migration).toContain("to service_role");
  });
});
