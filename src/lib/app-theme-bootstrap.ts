import type { AppThemePreference } from "./types";

export type ResolvedAppTheme = Exclude<AppThemePreference, "system">;

export const APP_THEME_CACHE_KEY = "factu-app-theme-v1";
export const APP_THEME_COLORS: Record<ResolvedAppTheme, string> = {
  light: "#f1f5f9",
  dark: "#0d1117",
};

export function resolveAppTheme(
  preference: AppThemePreference,
  prefersDark: boolean,
): ResolvedAppTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

export function cacheAppThemePreference(
  preference: AppThemePreference,
  storage: Pick<Storage, "setItem"> = window.localStorage,
) {
  try {
    storage.setItem(APP_THEME_CACHE_KEY, preference);
  } catch {
    // The visual preference remains active even when storage is unavailable.
  }
}

export function applyResolvedAppTheme(
  theme: ResolvedAppTheme,
  doc: Document = document,
) {
  const root = doc.documentElement;
  root.dataset.appTheme = theme;
  root.style.colorScheme = theme;
  doc
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = APP_THEME_COLORS[theme];
    });
}

export const APP_THEME_BOOTSTRAP_SCRIPT = `(()=>{let preference="system";try{const cached=localStorage.getItem("factu-app-theme-v1");if(cached==="system"||cached==="light"||cached==="dark")preference=cached}catch{}const prefersDark=typeof window.matchMedia==="function"&&window.matchMedia("(prefers-color-scheme: dark)").matches;const theme=preference==="dark"||(preference==="system"&&prefersDark)?"dark":"light";const root=document.documentElement;root.dataset.appTheme=theme;root.style.colorScheme=theme;const color=theme==="dark"?"#0d1117":"#f1f5f9";document.querySelectorAll("meta[name=theme-color]").forEach((meta)=>meta.setAttribute("content",color))})();`;
