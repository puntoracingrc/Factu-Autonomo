"use client";

import { createExpenseOriginalArchiveV1 } from "@/lib/expense-original-archive";
import { getSupabaseClientAsync } from "@/lib/supabase/client";
import type { ExpenseOriginalArchiveV1 } from "@/lib/types";
import { loadDriveBackupSettings } from "./backup";
import { getGoogleDriveClientId } from "./config";
import {
  uploadExpenseOriginalToGoogleDriveV1,
  type ExpenseOriginalFileV1,
} from "./expense-original-archive.v1";
import { runExclusiveDriveOperation } from "./operation";

const SHA256 = /^[0-9a-f]{64}$/u;

export type ExpenseOriginalArchiveCandidate =
  | Readonly<{ kind: "scan"; file: ExpenseOriginalFileV1 }>
  | Readonly<{
      kind: "expense_inbox";
      itemId: string;
      expectedSha256: string;
    }>;

export type ExpenseOriginalArchiveClientResult =
  | Readonly<{ status: "not_requested" }>
  | Readonly<{
      status: "archived";
      archive: ExpenseOriginalArchiveV1;
    }>
  | Readonly<{ status: "blocked"; error: string }>;

export async function archiveExpenseOriginalForSavedExpense(input: {
  readonly candidate?: ExpenseOriginalArchiveCandidate;
  readonly documentDate: string;
  readonly supplierName: string;
}): Promise<ExpenseOriginalArchiveClientResult> {
  if (!input.candidate || !loadDriveBackupSettings().archiveExpenseOriginals) {
    return Object.freeze({ status: "not_requested" as const });
  }

  const clientId = getGoogleDriveClientId();
  if (!clientId) {
    return blocked(
      "Google Drive no está configurado. Conservamos el formulario sin guardar el gasto.",
    );
  }

  let file: ExpenseOriginalFileV1;
  let expectedSha256: string | undefined;
  if (input.candidate.kind === "expense_inbox") {
    const recovered = await recoverInboxOriginal(input.candidate);
    if (recovered.status === "blocked") return recovered;
    file = recovered.file;
    expectedSha256 = input.candidate.expectedSha256;
  } else {
    file = input.candidate.file;
  }

  const execution = await runExclusiveDriveOperation(() =>
    uploadExpenseOriginalToGoogleDriveV1(
      {
        file,
        documentDate: input.documentDate,
        supplierName: input.supplierName,
        source: input.candidate!.kind,
        expectedSha256,
      },
      { clientId },
    ),
  );
  if (!execution.started) {
    return blocked(
      "Drive está terminando otra operación. Conservamos el formulario: espera unos segundos y vuelve a guardar.",
    );
  }
  if (!execution.value.ok) {
    return blocked(
      `${execution.value.error} Conservamos el formulario y el documento del buzón sigue pendiente.`,
    );
  }

  return Object.freeze({
    status: "archived" as const,
    archive: createExpenseOriginalArchiveV1({
      upload: execution.value,
      source: input.candidate.kind,
      archivedAt: new Date().toISOString(),
    }),
  });
}

async function recoverInboxOriginal(
  candidate: Extract<ExpenseOriginalArchiveCandidate, { kind: "expense_inbox" }>,
): Promise<
  | Readonly<{ status: "ready"; file: ExpenseOriginalFileV1 }>
  | Readonly<{ status: "blocked"; error: string }>
> {
  if (!candidate.itemId.trim() || !SHA256.test(candidate.expectedSha256)) {
    return blocked("La procedencia del original del buzón no es válida.");
  }
  try {
    const headers = await currentAuthHeaders();
    const response = await fetch(
      `/api/expense-inbox/${encodeURIComponent(candidate.itemId)}/original`,
      { headers, cache: "no-store" },
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: unknown;
      };
      const reason =
        typeof payload.error === "string" && payload.error.trim()
          ? payload.error.trim()
          : "No se pudo recuperar el original del buzón.";
      return blocked(`${reason} Conservamos el formulario sin cambios.`);
    }
    const serverSha256 = response.headers
      .get("X-Factu-Source-Sha256")
      ?.trim();
    const contentType = response.headers
      .get("Content-Type")
      ?.split(";", 1)[0]
      ?.trim();
    const buffer = await response.arrayBuffer();
    if (
      serverSha256 !== candidate.expectedSha256 ||
      !contentType ||
      buffer.byteLength === 0
    ) {
      return blocked(
        "El original recuperado no coincide con el adjunto escaneado. No se ha guardado el gasto.",
      );
    }
    return Object.freeze({
      status: "ready" as const,
      file: new Blob([buffer], { type: contentType }),
    });
  } catch {
    return blocked(
      "No se pudo recuperar el original del buzón. Conservamos el formulario para reintentarlo.",
    );
  }
}

async function currentAuthHeaders(): Promise<HeadersInit> {
  const supabase = await getSupabaseClientAsync();
  const { data } = (await supabase?.auth.getSession()) ?? {
    data: { session: null },
  };
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function blocked(error: string): Readonly<{ status: "blocked"; error: string }> {
  return Object.freeze({ status: "blocked" as const, error });
}
