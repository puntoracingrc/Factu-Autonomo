import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildImportRestoreReviewViewModel,
  buildLocalDataImportRestoreReviewModel,
  evaluateLocalDataSafetyUiShellScope,
  runLocalDataBackupValidationPipeline,
} from "@/lib/local-data-safety";
import { ImportRestoreReviewShell } from "./ImportRestoreReviewShell";

// PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1

function buildSyntheticViewModel() {
  const validation = runLocalDataBackupValidationPipeline(
    {
      documents: [
        {
          id: "SYNTHETIC_CURRENT_ISSUED",
          status: "emitida",
          documentLifecycle: "issued",
          integrityLock: "locked",
        },
      ],
    },
    {
      fileName: "backup.json",
      mimeType: "application/json",
      byteLength: 900,
      parsedObject: {
        documents: [
          {
            id: "SYNTHETIC_CURRENT_ISSUED",
            status: "emitida",
            documentLifecycle: "issued",
            integrityLock: "locked",
          },
        ],
      },
    },
    { validatedAt: "2026-06-27T00:00:00.000Z" },
  );
  const reviewModel = buildLocalDataImportRestoreReviewModel(validation);
  return {
    reviewModel,
    viewModel: buildImportRestoreReviewViewModel(reviewModel),
  };
}

describe("ImportRestoreReviewShell", () => {
  it("renders the disabled preview banner and blocked actions", () => {
    const { reviewModel, viewModel } = buildSyntheticViewModel();
    const html = renderToStaticMarkup(
      createElement(ImportRestoreReviewShell, {
        viewModel,
        scope: evaluateLocalDataSafetyUiShellScope({ reviewModel }),
      }),
    );

    expect(html).toContain("PHASE2D24_DISABLED_IMPORT_RESTORE_REACT_SHELL_V1");
    expect(html).toContain("Vista previa");
    expect(html).toContain("No se aplicaran cambios");
    expect(html).toContain("Aplicar importacion");
    expect(html).toContain("Aplicar restauracion");
    expect(html).toContain("disabled");
    expect(html).toContain("aria-disabled=\"true\"");
  });

  it("does not render links, routes, or unsafe synthetic internals", () => {
    const { viewModel } = buildSyntheticViewModel();
    const html = renderToStaticMarkup(createElement(ImportRestoreReviewShell, { viewModel }));

    expect(html).not.toContain("href=");
    expect(html).not.toContain("SYNTHETIC_CURRENT_ISSUED");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("data-route");
  });
});
