import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

const root = fileURLToPath(new URL("../../", import.meta.url));

function source(relativePath: string): string {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("expense inbox reliability contract", () => {
  it("mantiene el webhook firmado accesible sin sesión de usuario", () => {
    const response = middleware(
      new NextRequest(
        "https://facturacion-autonomos.app/api/expense-inbox/inbound",
        { method: "POST" },
      ),
    );
    const route = source("src/app/api/expense-inbox/inbound/route.ts");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(route).toContain("verifyResendPayload");
    expect(route).toContain("readTextBody");
    expect(route).toContain("maxBytes: 4 * 1024 * 1024");
    expect(route).not.toContain("getUserFromBearer");
  });

  it("conserva reintentos, deduplicación y logs sin contenido sensible", () => {
    const route = source("src/app/api/expense-inbox/inbound/route.ts");
    const server = source("src/lib/expense-inbox-server.ts");

    expect(route).toContain("{ status: 500 }");
    expect(route).toContain("providerHostname: error.providerHostname");
    expect(route).not.toContain("download_url");
    expect(server).toContain("findExistingAttachment(input.userId, hash)");
    expect(server).toContain("claimInboxItemRetry");
    expect(server).toContain('.eq("status", "error")');
    expect(server).toContain("shouldRetryExpenseInboxItem");
    expect(server).toContain("allowAnyErrorRetry: true");
    expect(server).toContain('error.code === "23505"');
    expect(server).toContain('return "duplicate"');
  });

  it("copia al email de empresa sin reenvío externo ni duplicados", () => {
    const server = source("src/lib/expense-inbox-server.ts");
    const copy = source("src/lib/expense-inbox-copy.ts");

    expect(server).toContain("getExpenseInboxCopyRecipient");
    expect(server).toContain("sendExpenseInboxCompanyCopy");
    expect(server).toContain("sourceEmailId: received.emailId");
    expect(copy).toContain("expense-inbox-copy-v1/");
    expect(copy).toContain("normalizeExpenseInboxCopyRecipient");
    expect(copy).toContain("emailDomain(email) === normalizedInboxDomain");
    expect(copy).toContain("getEmailFromAddressForDomain(input.inboxDomain)");
    expect(server).toContain("getEmailDeliveryStatus");
    expect(server).toContain('delivery.state !== "delivered"');
  });

  it("permite recuperar el mismo adjunto con la cuota vigente sin duplicarlo", () => {
    const route = source("src/app/api/expense-inbox/route.ts");
    const server = source("src/lib/expense-inbox-server.ts");
    const card = source("src/components/expenses/ExpenseInboxCard.tsx");
    const migration = source(
      "supabase/migrations/20260715131500_expense_inbox_retry_metadata.sql",
    );

    expect(route).toContain('body.action === "retry"');
    expect(route).toContain('namespace: "expense_inbox_retry"');
    expect(server).toContain("retryExpenseInboxItem");
    expect(server).toContain("attachmentHash(downloaded.buffer)");
    expect(server).toContain("providerAttachmentId");
    expect(server).toContain("isMissingRetryMetadataError");
    expect(server).toContain("includeRetryMetadata");
    expect(server).toContain("canRetry: status === \"error\"");
    expect(server).toContain("findExistingAttachmentInSyncEntities");
    expect(server).toContain("claimInboxItemRetryInSyncEntities");
    expect(server).toContain("finishInboxItemRetryInSyncEntities");
    expect(server).toContain("getExpenseInboxItemRecordFromSyncEntities");
    expect(card).toContain("Reintentar análisis");
    expect(card).toContain("Comprar {scanPackLabel()}");
    expect(card).toContain('usageMode === "empty"');
    expect(card).not.toContain('usageMode !== "unlimited"');
    expect(migration).toContain("source_email_id");
    expect(migration).toContain("source_attachment_id");
  });

  it("cierra guardados y descartes sin volver a crear el gasto", () => {
    const route = source("src/app/api/expense-inbox/route.ts");
    const form = source("src/app/gastos/nuevo/page.tsx");
    const types = source("src/lib/types.ts");

    expect(route).toContain(
      'body.status === "processed" || body.status === "ignored"',
    );
    expect(route).toContain(
      "getExpenseInboxCopyRecipient(user.id).catch(() => null)",
    );
    expect(form).toContain('updateActiveInboxItemStatus("ignored")');
    expect(form).toContain('sourceInboxItemId: activeInboxItemId ?? undefined');
    expect(form).toContain("expenseAlreadySavedFromInbox");
    expect(types).toContain("sourceInboxItemId?: string");
  });

  it("entrega el original propio solo de forma transitoria y verificable", () => {
    const route = source("src/app/api/expense-inbox/[id]/original/route.ts");
    const server = source("src/lib/expense-inbox-server.ts");

    expect(route).toContain("getUserFromBearer");
    expect(route).toContain("requireEmailConfirmed: true");
    expect(route).toContain("expense_inbox_original_download");
    expect(route).toContain("private, no-store");
    expect(route).toContain("X-Factu-Source-Sha256");
    expect(server).toContain("getExpenseInboxOriginalAttachment");
    expect(server).toContain("recoverRetryAttachment(row)");
    expect(server).toContain("attachmentHash(buffer) !== row.attachment_hash");
  });

  it("protege la regeneración y evita reutilizar alias retirados", () => {
    const route = source("src/app/api/expense-inbox/route.ts");
    const server = source("src/lib/expense-inbox-server.ts");

    expect(route).toContain('body.action === "rotate-alias"');
    expect(route).toContain("rotateExpenseInboxAlias(user.id)");
    expect(server).toContain("aliasTokenReserved(aliasToken)");
    expect(server).toContain("rememberExpenseInboxAlias");
    expect(server).toContain('status: "retired"');
    expect(server).toContain('status: "active"');
    expect(server).toContain('.eq("active", true)');
  });

  it("mantiene la norma raíz y la decisión versionada", () => {
    const agents = source("AGENTS.md");
    const codeowners = source(".github/CODEOWNERS");
    const adr = source(
      "docs/architecture/ADR-0004-expense-inbox-email-reliability.md",
    );

    expect(agents).toContain("ADR-0004-expense-inbox-email-reliability.md");
    expect(agents).toContain("expense-inbox-reliability-contract.test.ts");
    expect(agents).toContain("expense-inbox-copy.test.ts");
    expect(adr).toContain("cdn.resend.app");
    expect(adr).toContain("HTTP 500");
    expect(adr).toContain("attachment_hash");
    expect(adr).toContain("reintento con `sync_entities`");
    expect(codeowners).toContain(
      "/docs/architecture/ADR-0004-expense-inbox-email-reliability.md",
    );
    expect(codeowners).toContain("/src/app/api/expense-inbox/**");
    expect(codeowners).toContain("/src/lib/expense-inbox*");
    expect(codeowners).toContain("/supabase/migrations/*expense_inbox*");
  });
});
