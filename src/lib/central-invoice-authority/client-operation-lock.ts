"use client";

export const CENTRAL_INVOICE_AUTHORITY_CLIENT_OPERATION_LOCK =
  "factu:central-invoice-authority:client-operation:v1";

type ExclusiveLockManager = {
  request<T>(
    name: string,
    options: { mode: "exclusive" },
    callback: () => Promise<T>,
  ): Promise<T>;
};

let fallbackTail: Promise<void> = Promise.resolve();

function browserLockManager(): ExclusiveLockManager | null {
  if (typeof navigator === "undefined" || !navigator.locks) return null;
  return navigator.locks;
}

async function runWithFallbackQueue<T>(operation: () => Promise<T>): Promise<T> {
  const previous = fallbackTail;
  let release!: () => void;
  fallbackTail = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function runCentralInvoiceAuthorityClientOperation<T>(
  operation: () => Promise<T>,
  dependencies: { lockManager?: ExclusiveLockManager | null } = {},
): Promise<T> {
  const lockManager =
    dependencies.lockManager === undefined
      ? browserLockManager()
      : dependencies.lockManager;
  if (!lockManager) return runWithFallbackQueue(operation);

  return lockManager.request(
    CENTRAL_INVOICE_AUTHORITY_CLIENT_OPERATION_LOCK,
    { mode: "exclusive" },
    operation,
  );
}
