type FactuManualLogoSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<
  FactuManualLogoSize,
  { box: string; emoji: string; dot: string }
> = {
  sm: {
    box: "h-11 w-11 rounded-xl",
    emoji: "text-xl",
    dot: "h-2 w-2 border-[1.5px]",
  },
  md: {
    box: "h-14 w-14 rounded-2xl",
    emoji: "text-3xl",
    dot: "h-2.5 w-2.5 border-2",
  },
  lg: {
    box: "h-16 w-16 rounded-2xl",
    emoji: "text-4xl",
    dot: "h-2.5 w-2.5 border-2",
  },
};

interface FactuManualLogoProps {
  size?: FactuManualLogoSize;
  className?: string;
}

export function FactuManualLogo({
  size = "md",
  className = "",
}: FactuManualLogoProps) {
  const styles = SIZE_CLASS[size];

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center border border-slate-200 bg-slate-50 shadow-sm ${styles.box} ${className}`.trim()}
      aria-hidden
    >
      <span className={styles.emoji}>🤖</span>
      <span
        className={`absolute bottom-0 right-0 rounded-full border-white bg-emerald-500 ${styles.dot}`}
      />
    </div>
  );
}
