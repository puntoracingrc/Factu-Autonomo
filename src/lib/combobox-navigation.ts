export type ComboboxKeyboardAction =
  | { type: "none" }
  | { type: "close" }
  | { type: "highlight"; index: number }
  | { type: "select"; index: number };

function boundedIndex(index: number, itemCount: number): number {
  return Math.min(Math.max(index, 0), itemCount - 1);
}

export function resolveComboboxKeyboardAction({
  key,
  itemCount,
  highlightedIndex,
  open,
}: {
  key: string;
  itemCount: number;
  highlightedIndex: number;
  open: boolean;
}): ComboboxKeyboardAction {
  if (key === "Escape" && open) return { type: "close" };
  if (itemCount <= 0) return { type: "none" };

  const currentIndex = boundedIndex(highlightedIndex, itemCount);

  if (key === "ArrowDown") {
    return {
      type: "highlight",
      index: open ? Math.min(currentIndex + 1, itemCount - 1) : 0,
    };
  }
  if (key === "ArrowUp") {
    return {
      type: "highlight",
      index: open ? Math.max(currentIndex - 1, 0) : itemCount - 1,
    };
  }
  if (key === "Enter" && (open || itemCount === 1)) {
    return {
      type: "select",
      index: open ? currentIndex : 0,
    };
  }

  return { type: "none" };
}

export function getComboboxOptionId(listboxId: string, value: string): string {
  return `${listboxId}-option-${encodeURIComponent(value)}`;
}
