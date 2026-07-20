import type { FiscalNotificationsWorkspace } from "./types";

export function retainReferencedFiscalNotificationSourcesV1(
  workspace: FiscalNotificationsWorkspace,
): Pick<FiscalNotificationsWorkspace, "packages" | "files" | "auditEvents"> {
  const referencedFileIds = new Set(
    workspace.documents.map((document) => document.fileId),
  );
  const files = workspace.files.filter((file) => referencedFileIds.has(file.id));
  const fileIds = new Set(files.map((file) => file.id));
  const retainedPackages = workspace.packages
    .map((item) => ({
      ...item,
      fileIds: item.fileIds.filter((fileId) => fileIds.has(fileId)),
    }))
    .filter((item) => item.fileIds.length > 0);
  const packageIds = new Set(retainedPackages.map((item) => item.id));
  const packages = retainedPackages.map((item) => {
    if (
      item.exactDuplicateOf === undefined ||
      packageIds.has(item.exactDuplicateOf)
    ) {
      return item;
    }
    const packageWithoutDanglingDuplicate = { ...item };
    Reflect.deleteProperty(
      packageWithoutDanglingDuplicate,
      "exactDuplicateOf",
    );
    return packageWithoutDanglingDuplicate;
  });
  const auditEvents = workspace.auditEvents.filter(
    (event) =>
      event.entityType !== "PACKAGE" || packageIds.has(event.entityId),
  );

  return { packages, files, auditEvents };
}
