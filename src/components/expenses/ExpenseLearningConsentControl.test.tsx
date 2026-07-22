import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const controlSource = readFileSync(
  new URL("./ExpenseLearningConsentControl.tsx", import.meta.url),
  "utf8",
);

type RuntimeConsent = Readonly<{
  state: "UNDECIDED" | "GRANTED" | "REVOKED";
  schemaVersion: string;
  noticeVersion: string;
  purpose: string;
  privacyPolicyVersion: string;
  decidedAt: string | null;
}>;

type RuntimeHttpResult =
  | Readonly<{ kind: "HIDDEN" }>
  | Readonly<{ kind: "ERROR" }>
  | Readonly<{ kind: "READY"; consent: RuntimeConsent }>;

interface ConsentControlRuntime {
  ExpenseLearningConsentControl: (props: {
    sessionSubject: string;
  }) => React.ReactNode;
  classifyExpenseLearningConsentHttpResultV1: (
    status: number,
    body: unknown,
  ) => RuntimeHttpResult;
  isExpenseLearningConsentDecisionDisabledV1: (
    saving: boolean,
    stateUnconfirmed: boolean,
  ) => boolean;
  resolveExpenseLearningConsentMutationV1: (
    expectedState: "GRANTED" | "REVOKED",
    write: () => Promise<RuntimeHttpResult>,
    readBack: () => Promise<RuntimeHttpResult>,
  ) => Promise<
    | Readonly<{ kind: "HIDDEN" }>
    | Readonly<{ kind: "UNCONFIRMED" }>
    | Readonly<{
        kind: "READY";
        consent: RuntimeConsent;
        confirmedBy: "WRITE" | "READBACK";
      }>
  >;
  selectExpenseLearningConsentAccessTokenV1: (
    session: unknown,
    expectedSubject: string,
  ) => string | null;
  selectExpenseLearningConsentRequestSignalV1: (
    providedSignal: AbortSignal | undefined,
    lifecycleSignal: AbortSignal | undefined,
  ) => AbortSignal | undefined;
  settleExpenseLearningConsentOperationV1: <T>(
    operationSubject: string,
    readCurrentSubject: () => string | null,
    operation: () => Promise<T>,
  ) => Promise<T | null>;
}

let moduleServer: ViteDevServer;
let runtime: ConsentControlRuntime;

beforeAll(async () => {
  moduleServer = await createServer({
    root: process.cwd(),
    logLevel: "silent",
    appType: "custom",
    server: { middlewareMode: true },
    resolve: { alias: { "@": resolve(process.cwd(), "src") } },
    esbuild: { jsx: "automatic" } as unknown as ViteDevServer["config"]["esbuild"],
  });
  runtime = (await moduleServer.ssrLoadModule(
    "/src/components/expenses/ExpenseLearningConsentControl.tsx",
  )) as ConsentControlRuntime;
});

afterAll(async () => {
  await moduleServer?.close();
});

function readyConsent(state: RuntimeConsent["state"]): RuntimeHttpResult {
  return runtime.classifyExpenseLearningConsentHttpResultV1(200, {
    consent: {
      state,
      schemaVersion: "expense-engine-learning-consent.v1",
      noticeVersion: "expense-learning-notice.v1",
      purpose: "IMPROVE_LOCAL_EXPENSE_READER",
      privacyPolicyVersion: "2026-07-21",
      decidedAt:
        state === "UNDECIDED" ? null : "2026-07-22T08:00:00.000Z",
    },
  });
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolveValue) => {
    resolvePromise = resolveValue;
  });
  return { promise, resolve: resolvePromise };
}
const scanSource = readFileSync(
  new URL("./ExpenseScanCard.tsx", import.meta.url),
  "utf8",
);
const aiNoticeSource = readFileSync(
  new URL("../legal/AiProcessingConsentNotice.tsx", import.meta.url),
  "utf8",
);

describe("ExpenseLearningConsentControl P2C", () => {
  it("hides only the disabled 404 surface and keeps other failures retryable", () => {
    expect(controlSource).toContain(
      'if (status === 404) return HIDDEN_RESULT;',
    );
    expect(controlSource).toContain(
      'if (status !== 200) return ERROR_RESULT;',
    );
    expect(controlSource).toContain(
      'if (view?.kind === "HIDDEN") return null;',
    );
    expect(controlSource).toContain("Cargando preferencia…");
    expect(controlSource).toContain("No podemos cargar esta preferencia ahora.");
    expect(controlSource).toContain("Reintentar");
    expect(controlSource).toContain("REQUEST_TIMEOUT_MS = 10_000");
    expect(controlSource).toContain("sourceSignal?.aborted");
  });

  it("renders per account and drops delayed GET or PUT results after A changes to B", async () => {
    const accountA = renderToStaticMarkup(
      createElement(runtime.ExpenseLearningConsentControl, {
        sessionSubject: "account-a",
      }),
    );
    const accountB = renderToStaticMarkup(
      createElement(runtime.ExpenseLearningConsentControl, {
        sessionSubject: "account-b",
      }),
    );
    expect(accountA).toContain("Cargando preferencia");
    expect(accountB).toContain("Cargando preferencia");

    let currentSubject = "account-a";
    const delayedGet = deferred<RuntimeHttpResult>();
    const pendingGet = runtime.settleExpenseLearningConsentOperationV1(
      "account-a",
      () => currentSubject,
      () => delayedGet.promise,
    );
    currentSubject = "account-b";
    delayedGet.resolve(readyConsent("GRANTED"));
    await expect(pendingGet).resolves.toBeNull();

    currentSubject = "account-a";
    const delayedPut = deferred<RuntimeHttpResult>();
    const pendingPut = runtime.settleExpenseLearningConsentOperationV1(
      "account-a",
      () => currentSubject,
      () => delayedPut.promise,
    );
    currentSubject = "account-b";
    delayedPut.resolve(readyConsent("REVOKED"));
    await expect(pendingPut).resolves.toBeNull();

    const acceptedForB = await runtime.settleExpenseLearningConsentOperationV1(
      "account-b",
      () => currentSubject,
      async () => readyConsent("REVOKED"),
    );
    expect(acceptedForB?.kind).toBe("READY");
    expect(
      acceptedForB?.kind === "READY" ? acceptedForB.consent.state : null,
    ).toBe("REVOKED");
  });

  it("rejects a bearer session whose authenticated subject changed", () => {
    expect(
      runtime.selectExpenseLearningConsentAccessTokenV1(
        { access_token: "token-a", user: { id: "account-a" } },
        "account-b",
      ),
    ).toBeNull();
    expect(
      runtime.selectExpenseLearningConsentAccessTokenV1(
        { access_token: "token-b", user: { id: "account-b" } },
        "account-b",
      ),
    ).toBe("token-b");
  });

  it("accepts only the exact versioned server response and rebuilds it immutably", () => {
    expect(controlSource).toContain(
      'const envelope = strictRecord(body, ["consent"]);',
    );
    expect(controlSource).toContain(
      "input.schemaVersion !== EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1",
    );
    expect(controlSource).toContain(
      "input.noticeVersion !== EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1",
    );
    expect(controlSource).toContain(
      "input.purpose !== EXPENSE_LEARNING_CONSENT_PURPOSE_V1",
    );
    expect(controlSource).toContain(
      "input.privacyPolicyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION",
    );
    expect(controlSource).toContain("keys.length !== allowedKeys.length");
    expect(controlSource).toContain("Reflect.ownKeys(value)");
    expect(controlSource).toContain("return Object.freeze({");
    expect(controlSource).toContain("return canonical === value ? canonical : undefined;");
  });

  it("requires null decidedAt only for the undecided state", () => {
    expect(controlSource).toContain(
      'if (state === "UNDECIDED") return value === null ? null : undefined;',
    );
    expect(controlSource).toContain(
      'if (typeof value !== "string" || value.length > 64) return undefined;',
    );
  });

  it("uses one symmetric checkbox for affirmative opt-in and revocation", () => {
    expect(controlSource).toContain('type="checkbox"');
    expect(controlSource).toContain("event.currentTarget.checked");
    expect(controlSource).toContain("Compartir señales técnicas de futuras correcciones");
    expect(controlSource).toContain("Puedes retirarlo desmarcando esta opción.");
    expect(controlSource).toContain("Qué se compartiría");
    expect(controlSource).not.toContain("<Card");
  });

  it("reconciles an ambiguous PUT instead of assuming the previous state", async () => {
    const serverState = readyConsent("GRANTED");
    const committedAfterTimeout =
      await runtime.resolveExpenseLearningConsentMutationV1(
        "GRANTED",
        async () => {
          throw new Error("response lost after commit");
        },
        async () => serverState,
      );
    expect(committedAfterTimeout.kind).toBe("READY");
    expect(
      committedAfterTimeout.kind === "READY"
        ? committedAfterTimeout.confirmedBy
        : null,
    ).toBe("READBACK");
    expect(
      committedAfterTimeout.kind === "READY"
        ? committedAfterTimeout.consent.state
        : null,
    ).toBe("GRANTED");

    const unresolved = await runtime.resolveExpenseLearningConsentMutationV1(
      "REVOKED",
      async () => ({ kind: "ERROR" }),
      async () => ({ kind: "ERROR" }),
    );
    expect(unresolved).toEqual({ kind: "UNCONFIRMED" });
    let stateUnconfirmed = unresolved.kind === "UNCONFIRMED";
    expect(
      runtime.isExpenseLearningConsentDecisionDisabledV1(
        false,
        stateUnconfirmed,
      ),
    ).toBe(true);

    const refreshed = readyConsent("REVOKED");
    if (refreshed.kind === "READY") stateUnconfirmed = false;
    expect(
      runtime.isExpenseLearningConsentDecisionDisabledV1(
        false,
        stateUnconfirmed,
      ),
    ).toBe(false);
    expect(controlSource).toContain("No podemos confirmar el estado actual.");
    expect(controlSource).toContain("Consultar de nuevo");
    expect(controlSource).not.toContain(
      "Tu preferencia anterior sigue igual.",
    );
  });

  it("binds manual GET retries to the lifecycle abort signal", async () => {
    const lifecycle = new AbortController();
    const retrySignal = runtime.selectExpenseLearningConsentRequestSignalV1(
      undefined,
      lifecycle.signal,
    );
    const retryAborted = new Promise<boolean>((resolveAbort) => {
      retrySignal?.addEventListener(
        "abort",
        () => resolveAbort(retrySignal.aborted),
        { once: true },
      );
    });

    lifecycle.abort();
    await expect(retryAborted).resolves.toBe(true);
    expect(retrySignal?.aborted).toBe(true);
    expect(controlSource).toContain(
      "lifecycleControllerRef.current?.signal",
    );
  });

  it("sends only the closed decision tuple and never identity or source content", () => {
    expect(controlSource).toContain('method: "PUT"');
    expect(controlSource).toContain('cache: "no-store"');
    expect(controlSource).toContain("EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1");
    expect(controlSource).toContain("EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1");
    expect(controlSource).toContain("EXPENSE_LEARNING_CONSENT_PURPOSE_V1");
    expect(controlSource).toContain("EXPENSE_ENGINE_PRIVACY_POLICY_VERSION");
    for (const forbidden of [
      "userId",
      "ownerId",
      "tenantId",
      "learningHints",
      "ocrText",
      "documentId",
      "fileName",
      "localStorage",
      "sessionStorage",
      "startExpenseLocalSemanticShadowV1",
      "console.",
    ]) {
      expect(controlSource).not.toContain(forbidden);
    }
  });

  it("integrates without changing scan, queue, save or shadow conditions", () => {
    expect(scanSource).toContain(
      'import { ExpenseLearningConsentControl } from "./ExpenseLearningConsentControl";',
    );
    expect(scanSource).toContain("key={user.id}");
    expect(scanSource).toContain("sessionSubject={user.id}");
    expect(controlSource).toContain(
      "candidate.user?.id === expectedSubject",
    );

    const scanDisabledStart = scanSource.indexOf("const scanControlsDisabled");
    const scanDisabledEnd = scanSource.indexOf("const includedScanLimit");
    const scanDisabledContract = scanSource.slice(
      scanDisabledStart,
      scanDisabledEnd,
    );
    expect(scanDisabledContract).toContain("!aiConsent.accepted");
    expect(scanDisabledContract).not.toContain("LearningConsent");
    expect(scanSource).toContain("enqueueExpenseScanFiles");
    expect(scanSource).toContain("onScanned(data");
    expect(scanSource).toContain("startExpenseLocalSemanticShadowV1");
  });

  it("separates operational AI processing from the dormant learning purpose", () => {
    expect(aiNoticeSource).toContain("Para analizar textos, imágenes o PDF");
    expect(aiNoticeSource).not.toContain("correcciones pueden");
    expect(aiNoticeSource).not.toContain("patrones técnicos limpios");
    expect(controlSource).toContain(
      "Por ahora esta preferencia no envía contribuciones; el aprendizaje",
    );
  });
});
