import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1,
  EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1,
  deriveExpenseLearningSubmissionDigestsV1,
  isCanonicalExpenseLearningClaimTokenV1,
  isCanonicalExpenseLearningHmacSecretV1,
} from "./learning-contribution-server.v1";

const TOKEN = Buffer.alloc(32, 7).toString("base64url");
const TOKEN_ALIAS = `${TOKEN.slice(0, -1)}d`;
const CLAIM_SECRET = Buffer.alloc(32, 11).toString("base64url");
const CONTRIBUTOR_SECRET = Buffer.alloc(32, 13).toString("base64url");
const USER_A = "11111111-2222-4333-8444-555555555555";
const USER_B = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const protocolSource = readFileSync(
  new URL("./learning-contribution-server.v1.ts", import.meta.url),
  "utf8",
);

function stableClock(iso: string) {
  return () => new Date(iso);
}

function derive(
  overrides: Partial<
    Parameters<typeof deriveExpenseLearningSubmissionDigestsV1>[0]
  > = {},
) {
  return deriveExpenseLearningSubmissionDigestsV1({
    claimToken: TOKEN,
    userId: USER_A,
    claimSecret: CLAIM_SECRET,
    contributorSecret: CONTRIBUTOR_SECRET,
    now: stableClock("2026-07-22T12:00:00.000Z"),
    ...overrides,
  });
}

describe("expense learning contribution server protocol v1", () => {
  it("impone la frontera server-only al importar el protocolo", () => {
    const guard = protocolSource.indexOf("assertServerOnlyModule();");
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(protocolSource.indexOf("export const"));
    expect(protocolSource).toContain('typeof window !== "undefined"');
    expect(protocolSource).not.toContain("process.env");
  });

  it("acepta solo token base64url canónico de 32 bytes y secretos acotados", () => {
    expect(TOKEN).toHaveLength(43);
    expect(isCanonicalExpenseLearningClaimTokenV1(TOKEN)).toBe(true);
    expect(isCanonicalExpenseLearningClaimTokenV1(`${TOKEN}=`)).toBe(false);
    expect(isCanonicalExpenseLearningClaimTokenV1(TOKEN.slice(0, -1))).toBe(
      false,
    );
    expect(
      isCanonicalExpenseLearningClaimTokenV1(
        Buffer.alloc(33, 7).toString("base64url"),
      ),
    ).toBe(false);
    expect(isCanonicalExpenseLearningClaimTokenV1(`${TOKEN},${TOKEN}`)).toBe(
      false,
    );
    expect(Buffer.from(TOKEN_ALIAS, "base64url")).toEqual(
      Buffer.from(TOKEN, "base64url"),
    );
    expect(isCanonicalExpenseLearningClaimTokenV1(TOKEN_ALIAS)).toBe(false);
    expect(isCanonicalExpenseLearningClaimTokenV1("+/".repeat(22))).toBe(false);

    expect(isCanonicalExpenseLearningHmacSecretV1(CLAIM_SECRET)).toBe(true);
    expect(
      isCanonicalExpenseLearningHmacSecretV1(
        Buffer.alloc(64, 5).toString("base64url"),
      ),
    ).toBe(true);
    expect(
      isCanonicalExpenseLearningHmacSecretV1(
        Buffer.alloc(31, 5).toString("base64url"),
      ),
    ).toBe(false);
    expect(isCanonicalExpenseLearningHmacSecretV1(`${CLAIM_SECRET}=`)).toBe(
      false,
    );
  });

  it("deriva dos HMAC independientes, canónicos e inmutables", () => {
    const output = derive();

    expect(output).toEqual({
      claimTokenDigest:
        "93912cc012d4ddd79ab8ee16d9b0cce75ad99f8af2aae8bdf1987c58136cc90f",
      contributorWeekHmac:
        "ae0f234575477402f9eab1c91c7e93345256621f7b244724e25150886edac76a",
    });
    expect(output?.claimTokenDigest).toMatch(/^[0-9a-f]{64}$/u);
    expect(output?.contributorWeekHmac).toMatch(/^[0-9a-f]{64}$/u);
    expect(output?.claimTokenDigest).not.toBe(output?.contributorWeekHmac);
    expect(Object.isFrozen(output)).toBe(true);
    expect(JSON.stringify(output)).not.toContain(TOKEN);
    expect(JSON.stringify(output)).not.toContain(USER_A);
  });

  it("mantiene el claim global y separa el pseudónimo por cuenta y semana", () => {
    const base = derive();
    const otherUser = derive({ userId: USER_B });
    const otherWeek = derive({
      now: stableClock("2026-07-29T12:00:00.000Z"),
    });

    expect(otherUser?.claimTokenDigest).toBe(base?.claimTokenDigest);
    expect(otherWeek?.claimTokenDigest).toBe(base?.claimTokenDigest);
    expect(otherUser?.contributorWeekHmac).not.toBe(base?.contributorWeekHmac);
    expect(otherWeek?.contributorWeekHmac).not.toBe(base?.contributorWeekHmac);
  });

  it("falla cerrado con secretos, identidad o reloj inválidos", () => {
    expect(derive({ claimSecret: undefined })).toBeNull();
    expect(derive({ contributorSecret: "short" })).toBeNull();
    expect(derive({ contributorSecret: CLAIM_SECRET })).toBeNull();
    expect(derive({ userId: "not-a-uuid" })).toBeNull();
    expect(derive({ claimToken: `${TOKEN}=` })).toBeNull();
    expect(derive({ now: () => new Date(Number.NaN) })).toBeNull();
  });

  it("aplica una guardia simétrica de cinco minutos alrededor del lunes UTC", () => {
    expect(EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1).toBe(5 * 60_000);
    expect(EXPENSE_LEARNING_RPC_TIMEOUT_MS_V1).toBeLessThan(
      EXPENSE_LEARNING_WEEK_BOUNDARY_GUARD_MS_V1,
    );

    for (const iso of [
      "2026-07-19T23:55:00.000Z",
      "2026-07-19T23:59:59.999Z",
      "2026-07-20T00:00:00.000Z",
      "2026-07-20T00:05:00.000Z",
    ]) {
      expect(derive({ now: stableClock(iso) }), iso).toBeNull();
    }

    expect(
      derive({ now: stableClock("2026-07-19T23:54:59.999Z") }),
    ).not.toBeNull();
    expect(
      derive({ now: stableClock("2026-07-20T00:05:00.001Z") }),
    ).not.toBeNull();
    expect(
      derive({ now: stableClock("2024-01-01T12:00:00.000Z") }),
    ).not.toBeNull();
  });

  it("rechaza si la semana cambia durante la preparación", () => {
    const instants = [
      new Date("2026-07-19T23:54:59.999Z"),
      new Date("2026-07-20T00:00:00.001Z"),
    ];
    const output = derive({
      now: () => instants.shift() ?? new Date("2026-07-20T00:00:00.001Z"),
    });

    expect(output).toBeNull();
  });
});
