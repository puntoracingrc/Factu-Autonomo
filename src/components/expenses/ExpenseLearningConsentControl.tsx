"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
  EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
  EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
} from "@/lib/expense-engine/learning-consent.v1";
import { EXPENSE_ENGINE_PRIVACY_POLICY_VERSION } from "@/lib/expense-engine/contracts";

const CONSENT_ENDPOINT = "/api/expenses/learning-consent";
const REQUEST_TIMEOUT_MS = 10_000;

const CONSENT_KEYS = [
  "state",
  "schemaVersion",
  "noticeVersion",
  "purpose",
  "privacyPolicyVersion",
  "decidedAt",
] as const;

type ConsentState = "UNDECIDED" | "GRANTED" | "REVOKED";

export interface ExpenseLearningConsentViewV1 {
  readonly state: ConsentState;
  readonly schemaVersion: typeof EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1;
  readonly noticeVersion: typeof EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1;
  readonly purpose: typeof EXPENSE_LEARNING_CONSENT_PURPOSE_V1;
  readonly privacyPolicyVersion: typeof EXPENSE_ENGINE_PRIVACY_POLICY_VERSION;
  readonly decidedAt: string | null;
}

export type ExpenseLearningConsentHttpResultV1 =
  | Readonly<{ kind: "HIDDEN" }>
  | Readonly<{ kind: "ERROR" }>
  | Readonly<{
      kind: "READY";
      consent: ExpenseLearningConsentViewV1;
    }>;

export type ExpenseLearningConsentMutationResolutionV1 =
  | Readonly<{ kind: "HIDDEN" }>
  | Readonly<{ kind: "UNCONFIRMED" }>
  | Readonly<{
      kind: "READY";
      consent: ExpenseLearningConsentViewV1;
      confirmedBy: "WRITE" | "READBACK";
    }>;

interface ExpenseLearningConsentControlProps {
  sessionSubject: string;
}

const HIDDEN_RESULT = Object.freeze({ kind: "HIDDEN" } as const);
const ERROR_RESULT = Object.freeze({ kind: "ERROR" } as const);
const HIDDEN_MUTATION_RESULT = Object.freeze({ kind: "HIDDEN" } as const);
const UNCONFIRMED_MUTATION_RESULT = Object.freeze({
  kind: "UNCONFIRMED",
} as const);

export function classifyExpenseLearningConsentHttpResultV1(
  status: number,
  body: unknown,
): ExpenseLearningConsentHttpResultV1 {
  if (status === 404) return HIDDEN_RESULT;
  if (status !== 200) return ERROR_RESULT;

  const envelope = strictRecord(body, ["consent"]);
  const consent = envelope
    ? normalizeExpenseLearningConsentViewV1(envelope.consent)
    : null;
  return consent
    ? Object.freeze({ kind: "READY", consent })
    : ERROR_RESULT;
}

export function normalizeExpenseLearningConsentViewV1(
  value: unknown,
): ExpenseLearningConsentViewV1 | null {
  const input = strictRecord(value, CONSENT_KEYS);
  if (
    !input ||
    (input.state !== "UNDECIDED" &&
      input.state !== "GRANTED" &&
      input.state !== "REVOKED") ||
    input.schemaVersion !== EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1 ||
    input.noticeVersion !== EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1 ||
    input.purpose !== EXPENSE_LEARNING_CONSENT_PURPOSE_V1 ||
    input.privacyPolicyVersion !== EXPENSE_ENGINE_PRIVACY_POLICY_VERSION
  ) {
    return null;
  }

  const decidedAt = normalizeDecidedAt(input.state, input.decidedAt);
  if (decidedAt === undefined) return null;

  return Object.freeze({
    state: input.state,
    schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
    noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
    purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
    privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
    decidedAt,
  });
}

export async function settleExpenseLearningConsentOperationV1<T>(
  operationSubject: string,
  readCurrentSubject: () => string | null,
  operation: () => Promise<T>,
): Promise<T | null> {
  if (readCurrentSubject() !== operationSubject) return null;
  const result = await operation();
  return readCurrentSubject() === operationSubject ? result : null;
}

export async function resolveExpenseLearningConsentMutationV1(
  expectedState: "GRANTED" | "REVOKED",
  write: () => Promise<ExpenseLearningConsentHttpResultV1>,
  readBack: () => Promise<ExpenseLearningConsentHttpResultV1>,
): Promise<ExpenseLearningConsentMutationResolutionV1> {
  try {
    const written = await write();
    if (written.kind === "HIDDEN") return HIDDEN_MUTATION_RESULT;
    if (written.kind === "READY" && written.consent.state === expectedState) {
      return Object.freeze({
        kind: "READY",
        consent: written.consent,
        confirmedBy: "WRITE",
      });
    }
  } catch {
    // A timeout or lost response can happen after the server committed.
  }

  try {
    const current = await readBack();
    if (current.kind === "HIDDEN") return HIDDEN_MUTATION_RESULT;
    if (current.kind === "READY") {
      return Object.freeze({
        kind: "READY",
        consent: current.consent,
        confirmedBy: "READBACK",
      });
    }
  } catch {
    // The UI must not infer a state when both the write and readback are unclear.
  }

  return UNCONFIRMED_MUTATION_RESULT;
}

export function selectExpenseLearningConsentAccessTokenV1(
  session: unknown,
  expectedSubject: string,
): string | null {
  if (
    !expectedSubject ||
    !session ||
    typeof session !== "object" ||
    Array.isArray(session)
  ) {
    return null;
  }

  const candidate = session as {
    access_token?: unknown;
    user?: { id?: unknown } | null;
  };
  return candidate.user?.id === expectedSubject &&
    typeof candidate.access_token === "string" &&
    candidate.access_token.length > 0
    ? candidate.access_token
    : null;
}

export function isExpenseLearningConsentDecisionDisabledV1(
  saving: boolean,
  stateUnconfirmed: boolean,
): boolean {
  return saving || stateUnconfirmed;
}

export function selectExpenseLearningConsentRequestSignalV1(
  providedSignal: AbortSignal | undefined,
  lifecycleSignal: AbortSignal | undefined,
): AbortSignal | undefined {
  return providedSignal ?? lifecycleSignal;
}

export function ExpenseLearningConsentControl({
  sessionSubject,
}: ExpenseLearningConsentControlProps) {
  const mountedRef = useRef(false);
  const currentSubjectRef = useRef(sessionSubject);
  currentSubjectRef.current = sessionSubject;
  const lifecycleControllerRef = useRef<AbortController | null>(null);
  const [view, setView] = useState<ExpenseLearningConsentHttpResultV1 | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [failedDecision, setFailedDecision] = useState<boolean | null>(null);
  const [stateUnconfirmed, setStateUnconfirmed] = useState(false);

  const readCurrentSubject = useCallback(
    () => (mountedRef.current ? currentSubjectRef.current : null),
    [],
  );

  const loadConsent = useCallback(
    async (signal?: AbortSignal) => {
      const operationSubject = sessionSubject;
      const requestSignal = selectExpenseLearningConsentRequestSignalV1(
        signal,
        lifecycleControllerRef.current?.signal,
      );
      if (requestSignal?.aborted) return;
      setLoading(true);
      setFailedDecision(null);
      setStateUnconfirmed(false);
      try {
        const next = await settleExpenseLearningConsentOperationV1(
          operationSubject,
          readCurrentSubject,
          () =>
            requestExpenseLearningConsentStateV1(
              operationSubject,
              requestSignal,
            ),
        );
        if (next && !requestSignal?.aborted) setView(next);
      } catch {
        if (
          readCurrentSubject() === operationSubject &&
          !requestSignal?.aborted
        ) {
          setView(ERROR_RESULT);
        }
      } finally {
        if (
          readCurrentSubject() === operationSubject &&
          !requestSignal?.aborted
        ) {
          setLoading(false);
        }
      }
    },
    [readCurrentSubject, sessionSubject],
  );

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    lifecycleControllerRef.current = controller;
    void loadConsent(controller.signal);
    return () => {
      mountedRef.current = false;
      controller.abort();
      if (lifecycleControllerRef.current === controller) {
        lifecycleControllerRef.current = null;
      }
    };
  }, [loadConsent]);

  const updateConsent = useCallback(
    async (granted: boolean) => {
      const operationSubject = sessionSubject;
      const signal = lifecycleControllerRef.current?.signal;
      const expectedState = granted ? "GRANTED" : "REVOKED";
      setSaving(true);
      setFailedDecision(null);
      setStateUnconfirmed(false);
      try {
        const resolution = await settleExpenseLearningConsentOperationV1(
          operationSubject,
          readCurrentSubject,
          () =>
            resolveExpenseLearningConsentMutationV1(
              expectedState,
              () =>
                requestExpenseLearningConsentDecisionV1(
                  operationSubject,
                  granted,
                  signal,
                ),
              () =>
                requestExpenseLearningConsentStateV1(operationSubject, signal),
            ),
        );
        if (!resolution || signal?.aborted) return;
        if (resolution.kind === "HIDDEN") {
          setView(HIDDEN_RESULT);
        } else if (resolution.kind === "UNCONFIRMED") {
          setStateUnconfirmed(true);
        } else {
          setView(
            Object.freeze({ kind: "READY", consent: resolution.consent }),
          );
          if (resolution.consent.state !== expectedState) {
            setFailedDecision(granted);
          }
        }
      } finally {
        if (readCurrentSubject() === operationSubject && !signal?.aborted) {
          setSaving(false);
        }
      }
    },
    [readCurrentSubject, sessionSubject],
  );

  if (view?.kind === "HIDDEN") return null;

  if (loading || !view) {
    return (
      <section
        aria-labelledby="expense-learning-consent-title"
        className="border-t border-sky-200 pt-4"
      >
        <h3
          id="expense-learning-consent-title"
          className="text-sm font-bold text-slate-900"
        >
          Ayuda a mejorar el lector local
        </h3>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
          <Loader2
            className="h-4 w-4 animate-spin text-blue-600"
            aria-hidden="true"
          />
          Cargando preferencia…
        </p>
      </section>
    );
  }

  if (view.kind === "ERROR") {
    return (
      <section
        aria-labelledby="expense-learning-consent-title"
        className="border-t border-sky-200 pt-4"
      >
        <h3
          id="expense-learning-consent-title"
          className="text-sm font-bold text-slate-900"
        >
          Ayuda a mejorar el lector local
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          No podemos cargar esta preferencia ahora. El escaneo y el guardado
          siguen funcionando igual.
        </p>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 min-h-10 rounded-xl px-3 text-sm"
          onClick={() => void loadConsent()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
      </section>
    );
  }

  const granted = view.consent.state === "GRANTED";

  return (
    <section
      aria-labelledby="expense-learning-consent-title"
      className="border-t border-sky-200 pt-4"
    >
      <h3
        id="expense-learning-consent-title"
        className="text-sm font-bold text-slate-900"
      >
        Ayuda a mejorar el lector local
      </h3>
      <p id="expense-learning-consent-description" className="mt-1 text-sm text-slate-600">
        Es una opción separada: no cambia el escaneo, la revisión ni el
        guardado de tus gastos.
      </p>

      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm text-slate-800">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"
          checked={granted}
          disabled={isExpenseLearningConsentDecisionDisabledV1(
            saving,
            stateUnconfirmed,
          )}
          aria-describedby="expense-learning-consent-description"
          onChange={(event) => void updateConsent(event.currentTarget.checked)}
        />
        <span>
          <span className="font-semibold">
            Compartir señales técnicas de futuras correcciones
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {granted
              ? "Consentimiento activado. Puedes retirarlo desmarcando esta opción."
              : "Actívalo solo si quieres contribuir a mejorar lecturas futuras."}
          </span>
        </span>
        {saving ? (
          <Loader2
            className="ml-auto h-4 w-4 shrink-0 animate-spin text-blue-600"
            aria-label="Guardando preferencia"
          />
        ) : null}
      </label>

      {failedDecision !== null ? (
        <div className="mt-3 text-sm text-red-700" role="status">
          <p>
            El servidor confirma que el cambio no se guardó. La preferencia
            mostrada sigue siendo la vigente.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 min-h-10 rounded-xl px-3 text-sm"
            disabled={saving}
            onClick={() => void updateConsent(failedDecision)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      ) : null}

      {stateUnconfirmed ? (
        <div className="mt-3 text-sm text-red-700" role="status">
          <p>
            No podemos confirmar el estado actual. Consulta de nuevo antes de
            cambiar esta preferencia.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 min-h-10 rounded-xl px-3 text-sm"
            disabled={saving}
            onClick={() => void loadConsent()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Consultar de nuevo
          </Button>
        </div>
      ) : null}

      <details className="mt-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">
          Qué se compartiría
        </summary>
        <div className="mt-2 space-y-2 leading-relaxed">
          <p>
            Cuando habilitemos las contribuciones, solo se enviarían categorías
            técnicas acotadas después de que revises y guardes un gasto. Nunca
            el PDF, el texto OCR, el proveedor, NIF, cuentas, referencias,
            importes ni porcentajes exactos.
          </p>
          <p>
            Puedes retirar el consentimiento en cualquier momento. Se detendrán
            nuevas aportaciones y se eliminará lo que aún pueda separarse. Las
            estadísticas ya combinadas de forma irreversible no pueden aislarse.
          </p>
          <p>
            Por ahora esta preferencia no envía contribuciones; el aprendizaje
            compartido sigue desactivado.
          </p>
        </div>
      </details>
    </section>
  );
}

async function requestExpenseLearningConsentStateV1(
  sessionSubject: string,
  signal?: AbortSignal,
): Promise<ExpenseLearningConsentHttpResultV1> {
  const token = await readAccessToken(sessionSubject);
  if (!token || signal?.aborted) return ERROR_RESULT;

  const response = await fetchWithTimeout(
    CONSENT_ENDPOINT,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
    signal,
  );
  const body =
    response.status === 404 ? null : await response.json().catch(() => null);
  return classifyExpenseLearningConsentHttpResultV1(response.status, body);
}

async function requestExpenseLearningConsentDecisionV1(
  sessionSubject: string,
  granted: boolean,
  signal?: AbortSignal,
): Promise<ExpenseLearningConsentHttpResultV1> {
  const token = await readAccessToken(sessionSubject);
  if (!token || signal?.aborted) return ERROR_RESULT;

  const response = await fetchWithTimeout(
    CONSENT_ENDPOINT,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        schemaVersion: EXPENSE_LEARNING_CONSENT_SCHEMA_VERSION_V1,
        noticeVersion: EXPENSE_LEARNING_CONSENT_NOTICE_VERSION_V1,
        purpose: EXPENSE_LEARNING_CONSENT_PURPOSE_V1,
        privacyPolicyVersion: EXPENSE_ENGINE_PRIVACY_POLICY_VERSION,
        granted,
      }),
    },
    signal,
  );
  const body =
    response.status === 404 ? null : await response.json().catch(() => null);
  return classifyExpenseLearningConsentHttpResultV1(response.status, body);
}

async function readAccessToken(expectedSubject: string): Promise<string | null> {
  const { getSupabaseClientAsync } = await import("@/lib/supabase/client");
  const supabase = await getSupabaseClientAsync();
  const { data } = (await supabase?.auth.getSession()) ?? {
    data: { session: null },
  };
  return selectExpenseLearningConsentAccessTokenV1(
    data.session,
    expectedSubject,
  );
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  sourceSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromSource = () => controller.abort();
  if (sourceSignal?.aborted) {
    controller.abort();
  } else {
    sourceSignal?.addEventListener("abort", abortFromSource, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    sourceSignal?.removeEventListener("abort", abortFromSource);
  }
}

function normalizeDecidedAt(
  state: ConsentState,
  value: unknown,
): string | null | undefined {
  if (state === "UNDECIDED") return value === null ? null : undefined;
  if (typeof value !== "string" || value.length > 64) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  const canonical = new Date(timestamp).toISOString();
  return canonical === value ? canonical : undefined;
}

function strictRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== allowedKeys.length ||
    keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))
  ) {
    return null;
  }

  const output: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    output[String(key)] = descriptor.value;
  }
  return output;
}
