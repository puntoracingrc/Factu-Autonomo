export const AVISOS_TABS = ["mine", "auto"] as const;
export type AvisosTab = (typeof AVISOS_TABS)[number];

export function nextAvisosTabForKey(
  current: AvisosTab,
  key: string,
): AvisosTab | null {
  if (key === "Home") return AVISOS_TABS[0];
  if (key === "End") return AVISOS_TABS[AVISOS_TABS.length - 1];
  if (key !== "ArrowLeft" && key !== "ArrowRight") return null;

  const currentIndex = AVISOS_TABS.indexOf(current);
  const direction = key === "ArrowRight" ? 1 : -1;
  return AVISOS_TABS[
    (currentIndex + direction + AVISOS_TABS.length) % AVISOS_TABS.length
  ];
}
