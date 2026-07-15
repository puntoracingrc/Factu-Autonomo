export type ExpenseScanQueueStatus =
  | "PREPARED"
  | "ANALYZING"
  | "READ"
  | "NEEDS_REVIEW"
  | "NOT_RECOGNIZED";

export interface ExpenseScanFileIdentity {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
}

export interface ExpenseScanQueueItem<
  TFile extends ExpenseScanFileIdentity = File,
> {
  readonly id: string;
  readonly file: TFile;
  readonly status: ExpenseScanQueueStatus;
  readonly message: string | null;
}

export interface EnqueueExpenseScanFilesResult<
  TFile extends ExpenseScanFileIdentity = File,
> {
  readonly items: readonly ExpenseScanQueueItem<TFile>[];
  readonly duplicateNames: readonly string[];
  readonly limitExceeded: boolean;
}

export function expenseScanFileQueueId(file: ExpenseScanFileIdentity): string {
  return [file.name, file.size, file.type, file.lastModified].join("\u0000");
}

export function enqueueExpenseScanFiles<
  TFile extends ExpenseScanFileIdentity,
>(input: {
  readonly current: readonly ExpenseScanQueueItem<TFile>[];
  readonly incoming: readonly TFile[];
  readonly limit: number;
}): EnqueueExpenseScanFilesResult<TFile> {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
    throw new Error("Expense scan queue limit must be a positive safe integer.");
  }

  const seenIds = new Set(input.current.map((item) => item.id));
  const duplicateNames: string[] = [];
  const additions: ExpenseScanQueueItem<TFile>[] = [];

  for (const file of input.incoming) {
    const id = expenseScanFileQueueId(file);
    if (seenIds.has(id)) {
      duplicateNames.push(file.name);
      continue;
    }
    seenIds.add(id);
    additions.push({
      id,
      file,
      status: "PREPARED",
      message: null,
    });
  }

  if (input.current.length + additions.length > input.limit) {
    return {
      items: [...input.current],
      duplicateNames,
      limitExceeded: true,
    };
  }

  return {
    items: [...input.current, ...additions],
    duplicateNames,
    limitExceeded: false,
  };
}

export function updateExpenseScanQueueItem<
  TFile extends ExpenseScanFileIdentity,
>(
  items: readonly ExpenseScanQueueItem<TFile>[],
  id: string,
  update: Pick<ExpenseScanQueueItem<TFile>, "status" | "message">,
): readonly ExpenseScanQueueItem<TFile>[] {
  return items.map((item) =>
    item.id === id
      ? {
          ...item,
          status: update.status,
          message: update.message,
        }
      : item,
  );
}
