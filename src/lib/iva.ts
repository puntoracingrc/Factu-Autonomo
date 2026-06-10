import type { IvaSettings } from "./types";

export const DEFAULT_IVA_SETTINGS: IvaSettings = {
  rates: [0, 4, 10, 21],
  defaultRate: 21,
};

export function clampIvaRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_IVA_SETTINGS.defaultRate;
  return Math.min(100, Math.max(0, Math.round(rate * 100) / 100));
}

export function normalizeIvaSettings(
  input?: Partial<IvaSettings> | null,
): IvaSettings {
  const rawRates = input?.rates?.length
    ? input.rates
    : DEFAULT_IVA_SETTINGS.rates;
  const rates = [...new Set(rawRates.map(clampIvaRate))].sort((a, b) => a - b);

  if (rates.length === 0) {
    return { ...DEFAULT_IVA_SETTINGS };
  }

  let defaultRate = clampIvaRate(
    input?.defaultRate ?? DEFAULT_IVA_SETTINGS.defaultRate,
  );
  if (!rates.includes(defaultRate)) {
    defaultRate = rates.includes(21) ? 21 : rates[rates.length - 1];
  }

  return { rates, defaultRate };
}

export function addIvaRate(
  settings: IvaSettings,
  rate: number,
): IvaSettings | { error: string } {
  const pct = clampIvaRate(rate);
  if (settings.rates.includes(pct)) {
    return { error: "Ese IVA ya está en la lista" };
  }
  return {
    rates: [...settings.rates, pct].sort((a, b) => a - b),
    defaultRate: settings.defaultRate,
  };
}

export function removeIvaRate(
  settings: IvaSettings,
  rate: number,
): IvaSettings | { error: string } {
  if (settings.rates.length <= 1) {
    return { error: "Debe haber al menos un tipo de IVA" };
  }
  if (rate === settings.defaultRate) {
    return { error: "Primero elige otro IVA por defecto" };
  }
  return {
    rates: settings.rates.filter((r) => r !== rate),
    defaultRate: settings.defaultRate,
  };
}

export function setDefaultIvaRate(
  settings: IvaSettings,
  rate: number,
): IvaSettings {
  const pct = clampIvaRate(rate);
  if (!settings.rates.includes(pct)) {
    return settings;
  }
  return { ...settings, defaultRate: pct };
}

export function formatIvaLabel(rate: number, defaultRate: number): string {
  return rate === defaultRate ? `${rate}% (por defecto)` : `${rate}%`;
}

export function ivaOptionsForValue(
  settings: IvaSettings,
  currentValue: number,
): number[] {
  const rates = [...settings.rates];
  const value = clampIvaRate(currentValue);
  if (!rates.includes(value)) {
    rates.push(value);
    rates.sort((a, b) => a - b);
  }
  return rates;
}
