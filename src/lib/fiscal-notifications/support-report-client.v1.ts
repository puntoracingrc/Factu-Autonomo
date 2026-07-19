"use client";

import { reportAppError } from "@/lib/monitoring/client";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import {
  buildFiscalNotificationSupportReportV1,
  type FiscalNotificationSupportReportInputV1,
} from "./support-report.v1";

export type FiscalNotificationSupportSendResultV1 =
  | { readonly ok: true; readonly caseId: string }
  | { readonly ok: false; readonly error: string };

export async function sendFiscalNotificationSupportReportV1(
  input: FiscalNotificationSupportReportInputV1,
): Promise<FiscalNotificationSupportSendResultV1> {
  const caseId = createCaseId();
  const report = caseId
    ? buildFiscalNotificationSupportReportV1(input, caseId)
    : null;
  if (!report) {
    return { ok: false, error: "No se pudo preparar el caso de soporte." };
  }

  try {
    const supabase = await getSupabaseClientAsync();
    const session = supabase ? await supabase.auth.getSession() : null;
    const token = session?.data.session?.access_token;
    if (!token) {
      return {
        ok: false,
        error: "Inicia sesión de nuevo para enviar el caso a soporte.",
      };
    }

    const response = await fetch("/api/fiscal-notifications/support", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(report),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: unknown;
      caseId?: unknown;
      error?: unknown;
    } | null;
    const sent =
      response.ok &&
      body?.ok === true &&
      body.caseId === report.caseId;

    // El endpoint registra de forma autoritativa cada caso aceptado. Si fallan
    // a la vez correo y registro directo, se usa la ruta común del monitor y
    // solo se confirma al usuario cuando esa segunda escritura fue verificada.
    const monitored = sent
      ? false
      : await reportAppError({
          severity: "error",
          area: "fiscal_notifications_support",
          code: "support_case_failed",
          message:
            "No se pudo enviar un caso técnico saneado del lector fiscal.",
          metadata: {
            caseId: report.caseId,
            stage: report.stage,
            status: report.status,
            httpStatus: response.status,
          },
        });

    if (sent || monitored) return { ok: true, caseId: report.caseId };
    return {
      ok: false,
      error:
        typeof body?.error === "string" && body.error.trim()
          ? body.error
          : "No se pudo enviar el caso. Inténtalo de nuevo.",
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo conectar con soporte. Inténtalo de nuevo.",
    };
  }
}

function createCaseId(): string | null {
  try {
    return `case:${globalThis.crypto.randomUUID()}`;
  } catch {
    return null;
  }
}
