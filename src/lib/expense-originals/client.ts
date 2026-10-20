"use client";
import { getActiveWorkspaceAccessToken } from "@/lib/cloud/active-workspace-session";
import {
  CLOUD_DEVICE_TOKEN_HEADER,
  getOrCreateLocalCloudDeviceToken,
} from "@/lib/cloud/device-token";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import {
  getActiveWorkspaceOwnerScope,
  isActiveWorkspaceOwnerScope,
} from "@/lib/workspace-owner-runtime";
import {
  EXPENSE_ORIGINAL_MAX_BYTES,
  EXPENSE_ORIGINAL_REFRESH_EVENT,
  EXPENSE_ORIGINAL_STATUS_LIMIT,
  originalFileError,
  originalMimeType,
  originalSignatureMatches,
  type ExpenseOriginalStatuses,
} from "./types";

/** Verified memory-only read for explicit exports; never exposes a Storage URL. */
export async function downloadExpenseOriginal(
  expenseId: string,
  scope: string,
) {
  const response = await requestOriginal(
    `/api/expenses/${encodeURIComponent(expenseId)}/original`,
    {},
    scope,
  );
  const rawName = response.headers
    .get("Content-Disposition")
    ?.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
  const fileName = rawName ? decodeURIComponent(rawName) : "original.pdf";
  const mimeType = response.headers.get("Content-Type")?.split(";", 1)[0] ?? "";
  const bytes = new Uint8Array(await response.arrayBuffer());
  const actualHash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (
    !bytes.length ||
    bytes.length > EXPENSE_ORIGINAL_MAX_BYTES ||
    originalMimeType(fileName) !== mimeType ||
    !originalSignatureMatches(bytes, mimeType) ||
    actualHash !== response.headers.get("X-Factu-Source-Sha256")
  )
    throw new Error(
      "No se pudo verificar el original descargado. No se ha exportado.",
    );
  if (!isActiveWorkspaceOwnerScope(scope))
    throw new Error("La empresa cambió. Repite la exportación.");
  return { bytes, fileName, mimeType };
}

async function requestOriginal(
  path: string,
  init: RequestInit = {},
  expectedScope = getActiveWorkspaceOwnerScope(),
) {
  if (!expectedScope || !isActiveWorkspaceOwnerScope(expectedScope))
    throw new Error(
      "Selecciona la empresa antes de abrir o adjuntar un original.",
    );
  const token = await getActiveWorkspaceAccessToken(expectedScope);
  if (!token || !isActiveWorkspaceOwnerScope(expectedScope))
    throw new Error(
      "La sesión cambió. Conserva el archivo y vuelve a intentarlo en la empresa correcta.",
    );
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set(FACTU_COMPANY_HEADER, expectedScope);
  headers.set(
    CLOUD_DEVICE_TOKEN_HEADER,
    getOrCreateLocalCloudDeviceToken(expectedScope),
  );
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  if (!isActiveWorkspaceOwnerScope(expectedScope))
    throw new Error(
      "La empresa cambió. No se ha aplicado ningún resultado en esta pantalla.",
    );
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? "No se pudo acceder al original. Reinténtalo.",
    );
  }
  return response;
}
export async function expenseOriginalStatuses(
  ids: string[],
  scope: string,
  signal?: AbortSignal,
): Promise<ExpenseOriginalStatuses> {
  const result: ExpenseOriginalStatuses = {};
  for (let i = 0; i < ids.length; i += EXPENSE_ORIGINAL_STATUS_LIMIT) {
    const response = await requestOriginal(
      "/api/expenses/originals/status",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expenseIds: ids.slice(i, i + EXPENSE_ORIGINAL_STATUS_LIMIT),
        }),
        signal,
      },
      scope,
    );
    const body = (await response.json()) as {
      originals?: ExpenseOriginalStatuses;
    };
    for (const [id, value] of Object.entries(body.originals ?? {}))
      if (ids.includes(id) && (value === "archived" || value === "inbox"))
        result[id] = value;
  }
  return result;
}
export async function uploadExpenseOriginal(
  expenseId: string,
  file: File,
  scope = getActiveWorkspaceOwnerScope(),
): Promise<void> {
  const error = originalFileError(file);
  if (error) throw new Error(error);
  await requestOriginal(
    `/api/expenses/${encodeURIComponent(expenseId)}/original`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-Factu-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    },
    scope,
  );
  window.dispatchEvent(
    new CustomEvent(EXPENSE_ORIGINAL_REFRESH_EVENT, {
      detail: { ownerScope: scope },
    }),
  );
}
export async function openExpenseOriginal(
  expenseId: string,
  scope = getActiveWorkspaceOwnerScope(),
): Promise<void> {
  const reserved = window.open("about:blank", "_blank");
  if (reserved) reserved.opener = null;
  try {
    const response = await requestOriginal(
      `/api/expenses/${encodeURIComponent(expenseId)}/original`,
      {},
      scope,
    );
    const expectedHash = response.headers.get("X-Factu-Source-Sha256");
    const blob = await response.blob();
    const bytes = await blob.arrayBuffer();
    const actualHash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    if (!expectedHash || actualHash !== expectedHash)
      throw new Error(
        "No se pudo verificar el original descargado. No se ha abierto.",
      );
    if (!scope || !isActiveWorkspaceOwnerScope(scope))
      throw new Error(
        "La empresa cambió. Vuelve a abrir el original desde la empresa correcta.",
      );
    const url = URL.createObjectURL(blob);
    const preview =
      blob.type === "application/pdf" || blob.type.startsWith("image/");
    if (preview && reserved) reserved.location.replace(url);
    else {
      reserved?.close();
      const rawName = response.headers
        .get("Content-Disposition")
        ?.match(/filename\*=UTF-8''([^;]+)/iu)?.[1];
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = rawName ? decodeURIComponent(rawName) : "original";
      anchor.click();
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    window.dispatchEvent(
      new CustomEvent(EXPENSE_ORIGINAL_REFRESH_EVENT, {
        detail: { ownerScope: scope },
      }),
    );
  } catch (error) {
    reserved?.close();
    throw error;
  }
}
