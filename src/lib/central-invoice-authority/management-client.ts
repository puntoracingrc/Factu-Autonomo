"use client";
import { captureActiveWorkspaceOwnerScope, getActiveWorkspaceAccessToken } from "@/lib/cloud/active-workspace-session";
import { CLOUD_DEVICE_TOKEN_HEADER, getLocalCloudDeviceToken } from "@/lib/cloud/device-token";
import { FACTU_COMPANY_HEADER } from "@/lib/companies/types";
import { sha256Hex } from "@/lib/document-integrity/snapshot-hash";
import { stableStringifySnapshot } from "@/lib/document-integrity/snapshots";
import { invoiceAmendmentPatch } from "./amendment";
import type { Document } from "@/lib/types";

export async function manageCentralInvoiceFromBrowser(input: {
  action: "update" | "delete"; document: Document; expectedOwnerScope: string;
}): Promise<string> {
  const scope = captureActiveWorkspaceOwnerScope(input.expectedOwnerScope);
  const accessToken = await getActiveWorkspaceAccessToken(scope);
  const deviceToken = scope ? getLocalCloudDeviceToken(scope) : null;
  const link = input.document.centralInvoiceAuthority;
  if (!accessToken || !deviceToken || !link) throw new Error("Se necesita una sesión activa de esta empresa y conexión con el servidor.");
  const command = {
    action: input.action,
    documentRef: { serverDocumentId: link.serverDocumentId, identityId: link.identityId, expectedVersion: link.documentVersion },
    ...(input.action === "update" ? { patch: invoiceAmendmentPatch(input.document) } : {}),
  };
  // Stable across retries, including a lost response and a renewed session.
  const idempotencyKey = `INVOICE_MANAGE:${sha256Hex(stableStringifySnapshot(command))}`;
  let response: Response;
  try {
    response = await fetch("/api/central-invoice-authority/manage", {
      method: "POST", cache: "no-store", headers: {
        Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json",
        [FACTU_COMPANY_HEADER]: input.expectedOwnerScope, [CLOUD_DEVICE_TOKEN_HEADER]: deviceToken,
      }, body: JSON.stringify({ ...command, idempotencyKey }),
    });
  } catch { throw new Error("No se pudo confirmar el cambio con el servidor. Conserva el formulario y vuelve a intentarlo con conexión."); }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok !== true || typeof result.eventId !== "string") {
    throw new Error(result?.error?.message ?? "No se pudo confirmar el cambio central. No se ha aplicado en este dispositivo.");
  }
  return result.eventId;
}
