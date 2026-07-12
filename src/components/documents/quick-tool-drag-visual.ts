export type QuickToolDragKind = "calculator" | "post-it";

interface QuickToolDragVisualStyle {
  boxShadow: string;
  transform: string;
  transition: string;
  willChange: "auto" | "transform";
  zIndex: number;
}

const RESTING_SHADOW = "0 14px 30px rgba(15, 23, 42, 0.18)";
const LIFTED_SHADOW = "0 24px 42px rgba(15, 23, 42, 0.26)";

export function quickToolDragVisualStyle(
  kind: QuickToolDragKind,
  isDragging: boolean,
): QuickToolDragVisualStyle {
  const scale = kind === "post-it" ? 1.018 : 1.012;
  const lift = kind === "post-it" ? 4 : 3;

  return {
    boxShadow: isDragging ? LIFTED_SHADOW : RESTING_SHADOW,
    transform: isDragging
      ? `translate3d(0, -${lift}px, 0) scale(${scale})`
      : "translate3d(0, 0, 0) scale(1)",
    transition:
      "transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease-out",
    willChange: isDragging ? "transform" : "auto",
    zIndex: isDragging ? 60 : 50,
  };
}
