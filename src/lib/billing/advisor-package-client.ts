"use client";
import type { Expense } from "@/lib/types";
import {
  getActiveWorkspaceOwnerScope,
  isActiveWorkspaceOwnerScope,
} from "@/lib/workspace-owner-runtime";
import {
  expenseOriginalStatuses,
  downloadExpenseOriginal,
} from "@/lib/expense-originals/client";
import {
  buildAdvisorPackage,
  ADVISOR_PACKAGE_MAX_BYTES,
  type AdvisorOriginal,
  type AdvisorPackageInput,
} from "./advisor-package";

export async function readAdvisorExpenseOriginals(
  expenses: Expense[],
  scope: string,
) {
  const result = new Map<string, AdvisorOriginal>();
  const assertCurrent = () => {
    if (!isActiveWorkspaceOwnerScope(scope))
      throw new Error("La empresa cambió. Repite la exportación.");
  };
  assertCurrent();
  const statuses = await expenseOriginalStatuses(
    expenses.map((expense) => expense.id),
    scope,
  );
  assertCurrent();
  let totalBytes = 0;
  const add = (id: string, original: AdvisorOriginal) => {
    assertCurrent();
    totalBytes += original.bytes.byteLength;
    if (totalBytes > ADVISOR_PACKAGE_MAX_BYTES)
      throw new Error(
        "Los originales superan 300 MB. Exporta un mes cada vez.",
      );
    result.set(id, original);
  };
  // Keep concurrency bounded; do not download a blob for expenses without a file.
  const cloud = expenses.filter((expense) => statuses[expense.id]);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(2, cloud.length) }, async () => {
      while (next < cloud.length) {
        assertCurrent();
        const expense = cloud[next++];
        const original = await downloadExpenseOriginal(expense.id, scope);
        add(expense.id, {
          bytes: original.bytes,
          extension: `.${original.fileName.split(".").at(-1)!.toLowerCase()}`,
          source: "Factu",
        });
      }
    }),
  );
  const drive = expenses.filter(
    (expense) => !statuses[expense.id] && expense.originalArchive,
  );
  if (drive.length) {
    const [
      { getGoogleDriveClientId },
      { requestDriveAccessToken },
      { runExclusiveDriveOperation },
      { downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1 },
    ] = await Promise.all([
      import("@/lib/google-drive/config"),
      import("@/lib/google-drive/backup"),
      import("@/lib/google-drive/operation"),
      import("@/lib/google-drive/expense-original-download.v1"),
    ]);
    assertCurrent();
    const clientId = getGoogleDriveClientId();
    if (!clientId)
      throw new Error(
        "Conecta Google Drive para recuperar los originales antiguos del periodo.",
      );
    const execution = await runExclusiveDriveOperation(async () => {
      const token = await requestDriveAccessToken(clientId, "");
      for (const expense of drive) {
        assertCurrent();
        const original =
          await downloadExpenseOriginalFromGoogleDriveWithAccessTokenV1(
            expense.originalArchive!,
            token,
          );
        add(expense.id, { ...original, source: "Drive" });
      }
    });
    if (!execution.started)
      throw new Error(
        "Drive está ocupado. Espera unos segundos y vuelve a exportar.",
      );
  }
  assertCurrent();
  return result;
}

export async function downloadAdvisorPackage(
  input: AdvisorPackageInput,
  expectedOwnerScope: string | null,
) {
  const scope = expectedOwnerScope;
  if (!scope || getActiveWorkspaceOwnerScope() !== scope)
    throw new Error(
      "La empresa cambió. Selecciona la empresa antes de exportar.",
    );
  const archive = await buildAdvisorPackage(input, {
    isCurrent: () => isActiveWorkspaceOwnerScope(scope),
    readOriginals: (expenses) => readAdvisorExpenseOriginals(expenses, scope),
  });
  if (!isActiveWorkspaceOwnerScope(scope))
    throw new Error("La empresa cambió. Repite la exportación.");
  const url = URL.createObjectURL(archive.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = archive.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return archive;
}
