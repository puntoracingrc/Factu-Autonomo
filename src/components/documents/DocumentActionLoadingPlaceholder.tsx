import { LoaderCircle } from "lucide-react";

interface DocumentActionLoadingPlaceholderProps {
  label: string;
}

export function DocumentActionLoadingPlaceholder({
  label,
}: DocumentActionLoadingPlaceholderProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
    </span>
  );
}
