import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("integración de la vigilancia fiscal en Admin", () => {
  it("consulta el endpoint una vez por carga y usa el mismo contrato para revisar", () => {
    expect(source.match(/"\/api\/admin\/fiscal-watch"/g)).toHaveLength(2);
    expect(source).toContain(
      'fetchAdminResponse("/api/admin/fiscal-watch", { headers })',
    );
    expect(source).toContain("fiscalWatchResponse");
    expect(source).toContain("setFiscalWatchNotice");
    expect(source).toContain('method: "POST"');
    expect(source).toContain('action: "review"');
    expect(source).toContain("reviewStoreAvailable");
    expect(source).toContain("reviewFiscalWatchIssue");
    expect(source).toContain("applyFiscalWatchReviews");
    expect(source).toContain("fiscalWatchReviewKey");
  });

  it("oculta localmente los avisos descartados y conserva el panel verde si ya no quedan", () => {
    expect(source).toContain("FISCAL_WATCH_DISMISSED_KEYS_STORAGE_KEY");
    expect(source).toContain("readFiscalWatchDismissedKeys");
    expect(source).toContain("writeFiscalWatchDismissedKeys");
    expect(source).toContain("rememberFiscalWatchDismissedKey");
    expect(source).toContain("applyVisibleFiscalWatchDismissals");
    expect(source).toContain("setFiscalWatch((current) =>");
    expect(source).toContain(
      "applyVisibleFiscalWatchDismissals(current, nextDismissedKeys)",
    );
    expect(source).toContain("fiscalWatchBody.status ?? null");
  });

  it("conserva a la vez el monitor técnico del calendario y el de cambios", () => {
    expect(source).toContain("<FiscalCalendarHealthPanel");
    expect(source).toContain("<FiscalWatchPanel");
    expect(source).toContain("highestAdminLevel(systemLevels)");
    expect(source).toContain('systemSignalIds.join("||")');
  });

  it("marca en rojo un fallo de transporte y usa la señal estable del monitor", () => {
    expect(source).toContain('"fiscal-watch-probe-failed"');
    expect(source).toContain(
      "fiscalWatchProbeFailed || !nextFiscalWatch",
    );
    expect(source).toContain(
      'fiscalWatch?.signalId || "fiscal-watch-unavailable"',
    );
  });

  it("limpia diagnósticos antiguos antes de una recarga o pérdida de sesión", () => {
    const loadStartIndex = source.indexOf(
      "const loadOperations = useCallback",
    );
    const loadStart = source.slice(
      loadStartIndex,
      source.indexOf("const token = await getAccessToken()", loadStartIndex),
    );
    expect(loadStart).toContain("setCalendarHealth(null)");
    expect(loadStart).toContain("setFiscalWatch(null)");
    expect(loadStart).toContain("setHealth(null)");
    expect(loadStart).toContain("setOperations(null)");
  });
});
