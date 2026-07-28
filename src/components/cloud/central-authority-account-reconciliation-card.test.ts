import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  describeCentralInvoiceAuthorityAccountReconciliation,
} from "./central-authority-account-reconciliation-presentation";

const component = readFileSync(
  fileURLToPath(
    new URL(
      "./CentralInvoiceAuthorityAccountReconciliationCard.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);
const accountPage = readFileSync(
  fileURLToPath(new URL("../../app/cuenta/page.tsx", import.meta.url)),
  "utf8",
);

describe("central authority account reconciliation card", () => {
  it("is wired between status and event sync cards", () => {
    expect(accountPage).toContain(
      "CentralInvoiceAuthorityAccountReconciliationCard",
    );
    expect(
      accountPage.indexOf(
        "<CentralInvoiceAuthorityAccountReconciliationCard />",
      ),
    ).toBeGreaterThan(
      accountPage.indexOf("<CentralInvoiceAuthorityStatusCard />"),
    );
    expect(
      accountPage.indexOf(
        "<CentralInvoiceAuthorityAccountReconciliationCard />",
      ),
    ).toBeLessThan(
      accountPage.indexOf("<CentralInvoiceAuthorityEventsSyncCard />"),
    );
  });

  it("requires explicit confirmation and excludes only duplicate series", () => {
    expect(component).toContain('type="checkbox"');
    expect(component).toContain("confirmed");
    expect(component).toContain("hasConflicts");
    expect(component).toContain("hasCleanSeries");
    expect(component).toContain(
      "Las series con numeros duplicados quedan bloqueadas.",
    );
    expect(component).toContain(
      "series en conflicto no se enviaran.",
    );
    expect(component).toContain("disabled={!canReconcile}");
    expect(component).toContain(
      "runCentralInvoiceAuthorityClientOperation",
    );
  });

  it("summarizes committed and replayed results", () => {
    expect(
      describeCentralInvoiceAuthorityAccountReconciliation({
        ok: true,
        schema:
          "CENTRAL_INVOICE_AUTHORITY_ACCOUNT_SERIES_RECONCILIATION_CLIENT_V1",
        results: [
          {
            status: "committed",
            reconciliationId: "one",
            previousSequence: 0,
            resultingSequence: 8,
            seriesCode: "F-2026",
            fiscalYear: 2026,
          },
          {
            status: "replayed",
            reconciliationId: "two",
            previousSequence: 0,
            resultingSequence: 1,
            seriesCode: "FR-2026",
            fiscalYear: 2026,
          },
        ],
      }),
    ).toEqual({
      tone: "success",
      message: "2 series verificadas: 1 actualizadas y 1 ya conciliadas.",
    });
  });
});
