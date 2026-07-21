const PAINT_FALLBACK_MS = 120;

export function waitForSavingIndicatorPaint(): Promise<void> {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    document.visibilityState !== "visible"
  ) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    let fallbackTimer: number | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resolve();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") finish();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    fallbackTimer = window.setTimeout(finish, PAINT_FALLBACK_MS);
    firstFrame = window.requestAnimationFrame(() => {
      if (settled) return;
      secondFrame = window.requestAnimationFrame(finish);
    });
  });
}
