import type { User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "./send";
import { sendWelcomeEmailForUser } from "./welcome";

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("./send", () => ({
  sendEmail: vi.fn(),
}));

function confirmedUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "owner@example.test",
    email_confirmed_at: "2026-07-11T00:00:00.000Z",
    phone: "",
    confirmed_at: "2026-07-11T00:00:00.000Z",
    last_sign_in_at: "2026-07-11T00:00:00.000Z",
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: "2026-07-11T00:00:00.000Z",
    updated_at: "2026-07-11T00:00:00.000Z",
    is_anonymous: false,
    ...overrides,
  };
}

function fakeAdmin(options?: {
  user?: User;
  claimAllowed?: (call: number) => boolean;
  claimError?: boolean;
  updateErrorAt?: number;
  metadataBeforeUpdateAt?: {
    call: number;
    values: Record<string, unknown>;
  };
}) {
  let user = options?.user ?? confirmedUser();
  let rpcCalls = 0;
  let updateCalls = 0;

  const getUserById = vi.fn(async () => ({
    data: { user },
    error: null,
  }));
  const updateUserById = vi.fn(
    async (_userId: string, attributes: { app_metadata?: object }) => {
      updateCalls += 1;
      if (options?.updateErrorAt === updateCalls) {
        return {
          data: { user: null },
          error: { message: "metadata unavailable" },
        };
      }
      if (options?.metadataBeforeUpdateAt?.call === updateCalls) {
        user = {
          ...user,
          app_metadata: {
            ...user.app_metadata,
            ...options.metadataBeforeUpdateAt.values,
          },
        };
      }
      user = {
        ...user,
        // GoTrue merges top-level app_metadata updates.
        app_metadata: {
          ...user.app_metadata,
          ...attributes.app_metadata,
        },
      };
      return { data: { user }, error: null };
    },
  );
  const rpc = vi.fn(async () => {
    rpcCalls += 1;
    if (options?.claimError) {
      return { data: null, error: { message: "rpc unavailable" } };
    }
    return {
      data: [
        {
          allowed: options?.claimAllowed?.(rpcCalls) ?? true,
        },
      ],
      error: null,
    };
  });

  return {
    auth: { admin: { getUserById, updateUserById } },
    rpc,
    get currentUser() {
      return user;
    },
  };
}

describe("sendWelcomeEmailForUser", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it("deriva el destinatario del usuario admin y exige email confirmado", async () => {
    const admin = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.test",
        idempotencyKey: "welcome-user-v1/user-1",
      }),
    );
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledTimes(3);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_sent: expect.any(String),
      welcome_email_delivery_v1: {
        state: "sent",
        claimId: expect.any(String),
      },
    });
  });

  it("solo escribe claves welcome y conserva metadata ajena concurrente", async () => {
    const admin = fakeAdmin({
      user: confirmedUser({
        app_metadata: {
          provider: "email",
          providers: ["email"],
          admin_banned: false,
        },
      }),
      metadataBeforeUpdateAt: {
        call: 1,
        values: { admin_banned: true, admin_ban_reason: "review" },
      },
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });

    await expect(
      sendWelcomeEmailForUser({ userId: "user-1" }),
    ).resolves.toEqual({ ok: true });

    expect(admin.currentUser.app_metadata).toMatchObject({
      provider: "email",
      providers: ["email"],
      admin_banned: true,
      admin_ban_reason: "review",
      welcome_email_sent: expect.any(String),
    });
    for (const [, attributes] of admin.auth.admin.updateUserById.mock.calls) {
      const keys = Object.keys(attributes.app_metadata ?? {});
      expect(keys.every((key) => key.startsWith("welcome_email_"))).toBe(true);
    }
  });

  it("falla cerrado para un usuario con teléfono pero no email confirmado", async () => {
    const admin = fakeAdmin({
      user: confirmedUser({
        email_confirmed_at: undefined,
        confirmed_at: "2026-07-11T00:00:00.000Z",
        phone_confirmed_at: "2026-07-11T00:00:00.000Z",
        app_metadata: { provider: "phone" },
        user_metadata: { email_verified: true },
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toMatchObject({ ok: false, retryable: true });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("no envía si falla la reserva atómica distribuida", async () => {
    const admin = fakeAdmin({ claimError: true });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toMatchObject({ ok: false, retryable: true });
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("registra el claim en app_metadata antes de enviar y no envía si falla", async () => {
    const admin = fakeAdmin({ updateErrorAt: 1 });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result.ok).toBe(false);
    expect(admin.rpc).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("dos llamadas concurrentes tienen un único ganador", async () => {
    const admin = fakeAdmin({
      claimAllowed: (call) => call === 1,
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });

    const results = await Promise.all([
      sendWelcomeEmailForUser({ userId: "user-1" }),
      sendWelcomeEmailForUser({ userId: "user-1" }),
    ]);

    expect(results.filter((result) => result.skipped)).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("un fallo al marcar sent se reconcilia con la misma clave idempotente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin({ updateErrorAt: 3 });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-1" });

    const first = await sendWelcomeEmailForUser({ userId: "user-1" });
    const second = await sendWelcomeEmailForUser({ userId: "user-1" });
    vi.setSystemTime(new Date("2026-07-11T01:05:01.000Z"));
    const reconciled = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(first.ok).toBe(true);
    expect(first.error).toContain("metadata pendiente");
    expect(second).toMatchObject({
      ok: false,
      skipped: true,
      retryable: true,
    });
    expect(reconciled).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(sendEmail).mock.calls.map(([call]) => call.idempotencyKey),
    ).toEqual(["welcome-user-v1/user-1", "welcome-user-v1/user-1"]);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: { state: "sent" },
    });
  });

  it("un fallo de red ambiguo se reintenta dentro de la ventana idempotente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail)
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce({ ok: true, id: "email-1" });

    const first = await sendWelcomeEmailForUser({ userId: "user-1" });
    const second = await sendWelcomeEmailForUser({ userId: "user-1" });
    vi.setSystemTime(new Date("2026-07-11T01:05:01.000Z"));
    const retried = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(first).toMatchObject({ ok: false, retryable: true });
    expect(second).toMatchObject({
      ok: false,
      skipped: true,
      retryable: true,
    });
    expect(retried).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(sendEmail).mock.calls.map(([call]) => call.idempotencyKey),
    ).toEqual(["welcome-user-v1/user-1", "welcome-user-v1/user-1"]);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: { state: "sent" },
    });
  });

  it("un rechazo explícito del proveedor queda recuperable tras el cooldown", async () => {
    const admin = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      status: 429,
      failureKind: "known",
      retryable: true,
      retryAfterSeconds: 17,
      error: "rate limited",
    });

    const first = await sendWelcomeEmailForUser({ userId: "user-1" });
    const second = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(first).toMatchObject({
      ok: false,
      retryable: true,
      retryAfterSeconds: 300,
    });
    expect(second).toMatchObject({
      ok: false,
      skipped: true,
      retryable: true,
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: {
        state: "failed",
        failedAt: expect.any(String),
        failureKind: "known",
        failureRetryable: true,
      },
    });
  });

  it("un 4xx permanente se registra y no entra en bucle de reintento", async () => {
    const admin = fakeAdmin();
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({
      ok: false,
      status: 400,
      failureKind: "known",
      retryable: false,
      error: "validation error",
    });

    const first = await sendWelcomeEmailForUser({ userId: "user-1" });
    const second = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(first).toMatchObject({ ok: false, retryable: false });
    expect(second).toEqual({ ok: true, skipped: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: {
        state: "failed",
        failureKind: "known",
        failureRetryable: false,
      },
    });
  });

  it("si no persiste failed, recupera dispatching con la misma clave", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin({ updateErrorAt: 3 });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        failureKind: "known",
        retryable: true,
        error: "rate limited",
      })
      .mockResolvedValueOnce({ ok: true, id: "email-1" });

    const first = await sendWelcomeEmailForUser({ userId: "user-1" });
    expect(first).toMatchObject({ ok: false, retryable: true });
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: { state: "dispatching" },
    });

    vi.setSystemTime(new Date("2026-07-11T01:05:01.000Z"));
    await expect(
      sendWelcomeEmailForUser({ userId: "user-1" }),
    ).resolves.toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(
      vi.mocked(sendEmail).mock.calls.map(([call]) => call.idempotencyKey),
    ).toEqual(["welcome-user-v1/user-1", "welcome-user-v1/user-1"]);
  });

  it("recupera un claim que quedó abandonado antes del transporte", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin({
      user: confirmedUser({
        app_metadata: {
          welcome_email_delivery_v1: {
            state: "claimed",
            claimId: "abandoned-claim",
            claimedAt: "2026-07-11T00:54:59.000Z",
          },
        },
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true, id: "email-retry" });

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toEqual({ ok: true });
    expect(admin.rpc).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(admin.currentUser.app_metadata).toMatchObject({
      welcome_email_delivery_v1: { state: "sent" },
    });
  });

  it("espera antes de reintentar un rechazo conocido reciente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin({
      user: confirmedUser({
        app_metadata: {
          welcome_email_delivery_v1: {
            state: "failed",
            claimId: "failed-claim",
            claimedAt: "2026-07-11T00:58:00.000Z",
            failedAt: "2026-07-11T00:59:00.000Z",
          },
        },
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toMatchObject({
      ok: false,
      skipped: true,
      retryable: true,
      retryAfterSeconds: 240,
    });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("deja de reintentar un transporte ambiguo al cerrar la ventana segura", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T01:00:00.000Z"));
    const admin = fakeAdmin({
      user: confirmedUser({
        app_metadata: {
          welcome_email_delivery_v1: {
            state: "dispatching",
            claimId: "ambiguous-claim",
            claimedAt: "2026-07-10T01:59:00.000Z",
            idempotencyStartedAt: "2026-07-10T01:59:00.000Z",
            dispatchingAt: "2026-07-10T01:59:01.000Z",
          },
        },
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("respeta el marcador legacy para no duplicar cuentas existentes", async () => {
    const admin = fakeAdmin({
      user: confirmedUser({
        user_metadata: {
          welcome_email_sent: "2026-07-10T00:00:00.000Z",
        },
      }),
    });
    vi.mocked(getSupabaseAdmin).mockReturnValue(admin as never);

    const result = await sendWelcomeEmailForUser({ userId: "user-1" });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
