import {
  attachExpenseOriginal,
  getExpenseOriginal,
} from "@/lib/expense-originals/server";
import {
  originalErrorResponse,
  originalJson,
  originalRouteAuth,
  ORIGINAL_PRIVATE_HEADERS,
  privateOriginalResponse,
} from "@/lib/expense-originals/route-auth";
import { EXPENSE_ORIGINAL_MAX_BYTES } from "@/lib/expense-originals/types";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
function validId(id: string) {
  return id.length > 0 && id.length <= 200 && !/[\u0000-\u001f]/u.test(id);
}
export async function GET(request: Request, context: Context) {
  try {
    const result = await originalRouteAuth(request);
    if (result.response) return result.response;
    const { id } = await context.params;
    if (!validId(id))
      return originalJson({ error: "El gasto solicitado no es válido." }, 400);
    const { record, bytes } = await getExpenseOriginal(result.auth.userId, id);
    const name = encodeURIComponent(record.file_name).replace(
      /['()*]/gu,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...ORIGINAL_PRIVATE_HEADERS,
        "Content-Type": record.mime_type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="original"; filename*=UTF-8''${name}`,
        "X-Content-Type-Options": "nosniff",
        "X-Factu-Source-Sha256": record.sha256,
      },
    });
  } catch (error) {
    return originalErrorResponse(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const result = await originalRouteAuth(request, true);
    if (result.response) return result.response;
    const { id } = await context.params;
    if (!validId(id))
      return originalJson({ error: "El gasto solicitado no es válido." }, 400);
    if (
      Number(request.headers.get("content-length")) > EXPENSE_ORIGINAL_MAX_BYTES
    )
      return originalJson({ error: "El archivo supera 4 MB." }, 413);
    let fileName: string;
    try {
      fileName = decodeURIComponent(
        request.headers.get("X-Factu-File-Name") ?? "",
      );
    } catch {
      return originalJson(
        { error: "El nombre del archivo no es válido." },
        400,
      );
    }
    if (!fileName || fileName.length > 540 || !request.body)
      return originalJson({ error: "Selecciona un archivo original." }, 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > EXPENSE_ORIGINAL_MAX_BYTES) {
          await reader.cancel();
          return originalJson({ error: "El archivo supera 4 MB." }, 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    await attachExpenseOriginal(result.auth.userId, id, bytes, fileName);
    return privateOriginalResponse(originalJson({ ok: true }));
  } catch (error) {
    return originalErrorResponse(error);
  }
}
