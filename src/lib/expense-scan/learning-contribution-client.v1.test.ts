import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
  EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
  EXPENSE_ENGINE_PRIVACY_SCOPE,
  EXPENSE_ENGINE_VERSION,
  type ExpenseEngineObservationV1,
} from "@/lib/expense-engine/contracts";
import {
  EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1,
  createExpenseAggregateContributionV1,
} from "@/lib/expense-engine/aggregate-contribution.v1";
import { EXPENSE_LEARNING_CLAIM_HEADER_V1 } from "@/lib/expense-engine/learning-contribution-protocol.v1";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  EXPENSE_LEARNING_CONTRIBUTION_CLIENT_TIMEOUT_MS_V1,
  createExpenseLearningContributionAttemptV1,
} from "./learning-contribution-client.v1";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClientAsync: vi.fn(),
}));

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

type AuthCallback = (
  event: string,
  session: { user: { id: string }; access_token: string } | null,
) => void;

function source(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

function validObservation(): ExpenseEngineObservationV1 {
  return {
    schemaVersion: EXPENSE_ENGINE_OBSERVATION_SCHEMA_VERSION,
    engineVersion: EXPENSE_ENGINE_VERSION,
    policyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    privacyScope: EXPENSE_ENGINE_PRIVACY_SCOPE,
    structuralArchetypeId: "LINE_TABLE",
    documentKind: "EXPENSE_INVOICE",
    sourceQualityBucket: "HIGH",
    routeMode: "SHADOW_AI",
    localOutcome: "CANDIDATE",
    localConfidence: "HIGH",
    abstentionReason: null,
    aiFallbackUsed: false,
    aiFallbackReason: null,
    aiUsageBucket: "ONE",
    localDurationBucket: "LT_1_S",
    humanReviewStatus: "CORRECTED",
    localVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "MATCH" }],
    aiVsHuman: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    localVsAi: [{ field: "TOTAL_AMOUNT", verdict: "CORRECTED" }],
    math: [{ check: "DOCUMENT_TOTAL", verdict: "MATCH", residual: "EXACT" }],
    criticalFlags: [],
    learningHints: null,
  };
}

function session(subject: string, accessToken = `token-${subject}`) {
  return {
    data: {
      session: {
        user: { id: subject },
        access_token: accessToken,
      },
    },
  };
}

function installSupabase(
  sessions: Array<ReturnType<typeof session>> = [
    session(USER_A, "token-a-1"),
    session(USER_A, "token-a-2"),
    session(USER_A, "token-a-3"),
  ],
) {
  let authCallback: AuthCallback | null = null;
  const unsubscribe = vi.fn();
  const getSession = vi.fn();
  for (const value of sessions) getSession.mockResolvedValueOnce(value);
  if (sessions.length > 0) {
    getSession.mockResolvedValue(sessions.at(-1));
  }
  const onAuthStateChange = vi.fn((callback: AuthCallback) => {
    authCallback = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  vi.mocked(getSupabaseClientAsync).mockResolvedValue({
    auth: { getSession, onAuthStateChange },
  } as never);
  return {
    getSession,
    onAuthStateChange,
    unsubscribe,
    emit(subject: string | null, accessToken = "event-token") {
      authCallback?.(
        subject ? "TOKEN_REFRESHED" : "SIGNED_OUT",
        subject ? { user: { id: subject }, access_token: accessToken } : null,
      );
    },
  };
}

function installDeterministicCrypto() {
  const getRandomValues = vi.fn((bytes: Uint8Array) => {
    bytes.forEach((_, index) => {
      bytes[index] = index;
    });
    return bytes;
  });
  vi.stubGlobal("crypto", { getRandomValues });
  return getRandomValues;
}

function submitValid(subject = USER_A) {
  const attempt = createExpenseLearningContributionAttemptV1(subject);
  if (!attempt) throw new Error("Expected a synthetic learning attempt");
  attempt.submit(validObservation());
  return attempt;
}

describe("expense learning contribution client v1", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED = "true";
    vi.mocked(getSupabaseClientAsync).mockReset();
    installDeterministicCrypto();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("mantiene el protocolo compartido inerte y fuera del helper server-only", () => {
    const protocol = source(
      "../expense-engine/learning-contribution-protocol.v1.ts",
    );
    const server = source(
      "../expense-engine/learning-contribution-server.v1.ts",
    );
    const client = source("./learning-contribution-client.v1.ts");

    expect(protocol).toContain(EXPENSE_LEARNING_CLAIM_HEADER_V1);
    expect(protocol).not.toMatch(
      /(?:import |process\.env|crypto|fetch|supabase|localStorage)/u,
    );
    expect(server).toContain(
      'import { EXPENSE_LEARNING_CLAIM_HEADER_V1 } from "./learning-contribution-protocol.v1";',
    );
    expect(server.indexOf("assertServerOnlyModule();")).toBeLessThan(
      server.indexOf("export { EXPENSE_LEARNING_CLAIM_HEADER_V1 }"),
    );
    expect(client).toContain(
      'from "@/lib/expense-engine/learning-contribution-protocol.v1"',
    );
    expect(client).not.toContain("learning-contribution-server.v1");
  });

  it.each([undefined, "false", "TRUE"])(
    "mantiene el gate literal antes de proyectar o usar capacidades (%s)",
    async (flag) => {
      if (flag === undefined) {
        delete process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED;
      } else {
        process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED = flag;
      }
      const client = source("./learning-contribution-client.v1.ts");
      const submitBlock = client.slice(
        client.indexOf('define(attempt, "submit"'),
      );
      expect(
        submitBlock.indexOf(
          "process.env.NEXT_PUBLIC_EXPENSE_LEARNING_WIRING_ENABLED",
        ),
      ).toBeLessThan(
        submitBlock.indexOf("createExpenseAggregateContributionV1("),
      );

      submitValid();
      await Promise.resolve();

      expect(getSupabaseClientAsync).not.toHaveBeenCalled();
      expect(globalThis.crypto.getRandomValues).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("conserva el sujeto solo en un handle opaco no serializable", () => {
    const attempt = createExpenseLearningContributionAttemptV1(USER_A);

    expect(attempt).not.toBeNull();
    expect(Object.keys(attempt!)).toEqual([]);
    expect(Object.isFrozen(attempt)).toBe(true);
    expect(JSON.stringify(attempt)).toBeUndefined();
    expect(JSON.stringify({ attempt })).toBe("{}");
    expect(JSON.stringify({ attempt })).not.toContain(USER_A);
    expect(createExpenseLearningContributionAttemptV1("not-a-user")).toBeNull();
  });

  it("envia una sola contribucion canonica con token y opciones cerradas", async () => {
    const auth = installSupabase();
    const random = installDeterministicCrypto();
    const responseJson = vi.fn();
    const responseText = vi.fn();
    const fetchMock = vi.fn(async () => ({
      status: 503,
      json: responseJson,
      text: responseText,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const attempt = submitValid();
    attempt.submit(validObservation());

    await vi.waitFor(() => expect(auth.unsubscribe).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(auth.onAuthStateChange).toHaveBeenCalledBefore(auth.getSession);
    expect(auth.getSession).toHaveBeenCalledTimes(3);
    expect(random).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    const token = headers[EXPENSE_LEARNING_CLAIM_HEADER_V1];
    const expected = createExpenseAggregateContributionV1(validObservation());
    expect(url).toBe("/api/expenses/learning-contribution");
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(headers.Authorization).toBe("Bearer token-a-2");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      keepalive: true,
      redirect: "error",
      referrerPolicy: "no-referrer",
    });
    expect(JSON.parse(String(init.body))).toEqual(expected);
    expect(
      new TextEncoder().encode(String(init.body)).byteLength,
    ).toBeLessThanOrEqual(EXPENSE_AGGREGATE_CONTRIBUTION_MAX_BODY_BYTES_V1);
    expect(String(init.body)).not.toContain(USER_A);
    expect(String(init.body)).not.toContain(token);
    expect(responseJson).not.toHaveBeenCalled();
    expect(responseText).not.toHaveBeenCalled();
  });

  it("no abre sesion ni genera token para una observacion no proyectable", async () => {
    const auth = installSupabase();
    const random = installDeterministicCrypto();
    const attempt = createExpenseLearningContributionAttemptV1(USER_A)!;

    attempt.submit({} as ExpenseEngineObservationV1);
    await Promise.resolve();

    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rechaza A a B antes de credenciales y justo antes del POST", async () => {
    const first = installSupabase([session(USER_B)]);
    const random = installDeterministicCrypto();
    submitValid();
    await vi.waitFor(() => expect(first.unsubscribe).toHaveBeenCalledOnce());
    expect(random).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();

    vi.mocked(getSupabaseClientAsync).mockReset();
    const second = installSupabase([
      session(USER_A, "token-a"),
      session(USER_B, "token-b"),
    ]);
    submitValid();
    await vi.waitFor(() => expect(second.unsubscribe).toHaveBeenCalledOnce());
    expect(fetch).not.toHaveBeenCalled();
  });

  it("aborta un POST en vuelo ante sign-out o A a B sin reintentar", async () => {
    const auth = installSupabase();
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal ?? undefined;
          requestSignal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    submitValid();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    auth.emit(USER_B);

    await vi.waitFor(() => expect(auth.unsubscribe).toHaveBeenCalledOnce());
    expect(requestSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("permite token refresh y navegacion normal bajo el mismo sujeto", async () => {
    const auth = installSupabase();
    const pendingFetch: { resolve?: (response: Response) => void } = {};
    const fetchMock = vi.fn(
      async () =>
        await new Promise<Response>((resolve) => {
          pendingFetch.resolve = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    submitValid();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    auth.emit(USER_A, "refreshed-a");
    pendingFetch.resolve?.(new Response(null, { status: 503 }));

    await vi.waitFor(() => expect(auth.unsubscribe).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("limpia listener y timeout si la sesion queda pendiente", async () => {
    vi.useFakeTimers();
    let authCallback: AuthCallback | null = null;
    const unsubscribe = vi.fn();
    const getSession = vi.fn(() => new Promise(() => {}));
    vi.mocked(getSupabaseClientAsync).mockResolvedValue({
      auth: {
        getSession,
        onAuthStateChange: vi.fn((callback: AuthCallback) => {
          authCallback = callback;
          return { data: { subscription: { unsubscribe } } };
        }),
      },
    } as never);

    submitValid();
    await vi.waitFor(() => expect(authCallback).not.toBeNull());
    await vi.advanceTimersByTimeAsync(
      EXPENSE_LEARNING_CONTRIBUTION_CLIENT_TIMEOUT_MS_V1,
    );
    await Promise.resolve();

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("transfiere el shadow aplicado antes de navegar sin bloquear el guardado", () => {
    const page = source("../../app/gastos/nuevo/page.tsx");
    const completion = page.slice(
      page.indexOf("function completeLocalSemanticShadowAfterDurableSave("),
      page.indexOf("function disposeLocalSemanticShadow("),
    );

    expect(page).toContain(
      "learningContributionAttempt?: ExpenseLearningContributionAttemptV1;",
    );
    expect(page).toContain(
      "createExpenseLearningContributionAttemptV1(user?.id)",
    );
    expect(page).not.toContain("learningSubject");
    expect(completion.indexOf("if (replayed)")).toBeLessThan(
      completion.indexOf("localShadowHandlesRef.current.delete(handle)"),
    );
    expect(
      completion.indexOf("localShadowHandlesRef.current.delete(handle)"),
    ).toBeLessThan(
      completion.indexOf("completeExpenseLocalSemanticShadowV1({"),
    );
    expect(completion).toContain(
      "Promise.race([completion, boundedCompletion])",
    );
    expect(completion).toContain(
      "LOCAL_SEMANTIC_COMPLETION_HANDOFF_TIMEOUT_MS_V1",
    );
    expect(completion).toContain(
      "review.learningContributionAttempt?.submit(observation)",
    );
    expect(completion).not.toContain("await ");
    expect(
      page.match(/completeLocalSemanticShadowAfterDurableSave\(/gu),
    ).toHaveLength(3);
    for (const saveIndex of allIndexes(page, "saveScannedExpenseDurably(")) {
      const applied = page.indexOf('result.status !== "applied"', saveIndex);
      const complete = page.indexOf(
        "completeLocalSemanticShadowAfterDurableSave(",
        applied,
      );
      expect(applied).toBeGreaterThan(saveIndex);
      expect(complete).toBeGreaterThan(applied);
    }
    expect(page).not.toContain(
      "JSON.stringify(review.learningContributionAttempt)",
    );
  });
});

function allIndexes(value: string, needle: string): number[] {
  const indexes: number[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    const index = value.indexOf(needle, cursor);
    if (index === -1) break;
    indexes.push(index);
    cursor = index + needle.length;
  }
  return indexes;
}
