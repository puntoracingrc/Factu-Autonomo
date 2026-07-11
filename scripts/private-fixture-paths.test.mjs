import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveOptInFixturePath,
  resolveReadableOptInFixturePath,
  validatePrivateFixtureId,
} from "./private-fixture-paths.mjs";

const ENVIRONMENT_VARIABLE = "FACTU_TEST_PRIVATE_FIXTURE_PATH";
const originalValue = process.env[ENVIRONMENT_VARIABLE];

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ENVIRONMENT_VARIABLE];
  } else {
    process.env[ENVIRONMENT_VARIABLE] = originalValue;
  }
});

describe("private fixture paths", () => {
  it("keeps private fixtures disabled unless the path is explicitly configured", () => {
    delete process.env[ENVIRONMENT_VARIABLE];
    expect(resolveOptInFixturePath(ENVIRONMENT_VARIABLE)).toBeUndefined();

    process.env[ENVIRONMENT_VARIABLE] = "   ";
    expect(resolveOptInFixturePath(ENVIRONMENT_VARIABLE)).toBeUndefined();
  });

  it("resolves portable relative roots and their expected layout", () => {
    process.env[ENVIRONMENT_VARIABLE] = "private-fixtures";

    expect(resolveOptInFixturePath(ENVIRONMENT_VARIABLE, "exports", "holded")).toBe(
      path.resolve("private-fixtures", "exports", "holded"),
    );
  });

  it("fails instead of skipping an explicitly configured unreadable path", () => {
    process.env[ENVIRONMENT_VARIABLE] =
      "test/fixtures/does-not-exist/private-fixture.pdf";

    expect(() =>
      resolveReadableOptInFixturePath(ENVIRONMENT_VARIABLE),
    ).toThrow(`${ENVIRONMENT_VARIABLE} está configurada`);
  });

  it("rejects fixture identifiers that could escape artifact directories", () => {
    expect(validatePrivateFixtureId("private_fixture-01.json")).toBe(
      "private_fixture-01.json",
    );
    expect(() => validatePrivateFixtureId("../escape")).toThrow(
      "fixtureId privado no válido",
    );
    expect(() => validatePrivateFixtureId("folder/file")).toThrow(
      "fixtureId privado no válido",
    );
    expect(() => validatePrivateFixtureId("folder\\file")).toThrow(
      "fixtureId privado no válido",
    );
  });
});
