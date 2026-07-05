import type {
  AppDensityPreference,
  AppPreferences,
  AppStartPagePreference,
  AppThemePreference,
} from "./types";

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: "system",
  density: "comfortable",
  startPage: "panel",
  reduceMotion: false,
};

export const APP_THEME_OPTIONS: Array<{
  value: AppThemePreference;
  label: string;
  description: string;
}> = [
  {
    value: "system",
    label: "Sistema",
    description: "Sigue claro u oscuro según tu dispositivo.",
  },
  {
    value: "light",
    label: "Claro",
    description: "Mantiene la app luminosa durante el día.",
  },
  {
    value: "dark",
    label: "Oscuro",
    description: "Reduce brillo para trabajar con poca luz.",
  },
];

export const APP_DENSITY_OPTIONS: Array<{
  value: AppDensityPreference;
  label: string;
  description: string;
}> = [
  {
    value: "comfortable",
    label: "Cómoda",
    description: "Más aire entre tarjetas y controles.",
  },
  {
    value: "compact",
    label: "Compacta",
    description: "Más información visible, útil en escritorio.",
  },
];

export const APP_START_PAGE_OPTIONS: Array<{
  value: AppStartPagePreference;
  label: string;
  description: string;
  href: string;
}> = [
  {
    value: "panel",
    label: "Panel",
    description: "Resumen, accesos rápidos y avisos.",
    href: "/",
  },
  {
    value: "customers",
    label: "Clientes",
    description: "Abrir directamente la agenda de clientes.",
    href: "/clientes",
  },
  {
    value: "invoices",
    label: "Facturas",
    description: "Entrar a tus facturas y borradores.",
    href: "/facturas",
  },
  {
    value: "expenses",
    label: "Gastos",
    description: "Revisar compras, tickets y gastos fijos.",
    href: "/gastos",
  },
  {
    value: "taxes",
    label: "Impuestos",
    description: "Ver el resumen fiscal orientativo.",
    href: "/impuestos",
  },
  {
    value: "settings",
    label: "Ajustes",
    description: "Volver siempre a la configuración.",
    href: "/configuracion",
  },
];

function isTheme(value: unknown): value is AppThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

function isDensity(value: unknown): value is AppDensityPreference {
  return value === "comfortable" || value === "compact";
}

function isStartPage(value: unknown): value is AppStartPagePreference {
  return APP_START_PAGE_OPTIONS.some((option) => option.value === value);
}

export function normalizeAppPreferences(
  input?: Partial<AppPreferences> | null,
): AppPreferences {
  return {
    theme: isTheme(input?.theme)
      ? input.theme
      : DEFAULT_APP_PREFERENCES.theme,
    density: isDensity(input?.density)
      ? input.density
      : DEFAULT_APP_PREFERENCES.density,
    startPage: isStartPage(input?.startPage)
      ? input.startPage
      : DEFAULT_APP_PREFERENCES.startPage,
    reduceMotion:
      typeof input?.reduceMotion === "boolean"
        ? input.reduceMotion
        : DEFAULT_APP_PREFERENCES.reduceMotion,
  };
}

export function appStartPageHref(
  value: AppStartPagePreference | undefined,
): string {
  return (
    APP_START_PAGE_OPTIONS.find((option) => option.value === value)?.href ??
    APP_START_PAGE_OPTIONS[0].href
  );
}
