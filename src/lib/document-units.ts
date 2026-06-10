import type { DocumentUnitsSettings, LineItem } from "./types";

export interface DocumentUnitDefinition {
  id: string;
  label: string;
  shortLabel: string;
}

export const DOCUMENT_UNIT_CATALOG: DocumentUnitDefinition[] = [
  { id: "ud", label: "Unidad", shortLabel: "ud" },
  { id: "m", label: "Metro", shortLabel: "m" },
  { id: "m2", label: "Metro cuadrado", shortLabel: "m²" },
  { id: "h", label: "Hora", shortLabel: "h" },
  { id: "kg", label: "Kilogramo", shortLabel: "kg" },
  { id: "l", label: "Litro", shortLabel: "l" },
  { id: "paq", label: "Paquete", shortLabel: "paq" },
];

const CATALOG_IDS = new Set(DOCUMENT_UNIT_CATALOG.map((unit) => unit.id));
const DEFAULT_UNIT_ID = "ud";

export const EMPTY_DOCUMENT_UNITS: DocumentUnitsSettings = {
  enabledUnitIds: [DEFAULT_UNIT_ID],
  defaultUnitId: DEFAULT_UNIT_ID,
};

export function normalizeDocumentUnits(
  settings?: Partial<DocumentUnitsSettings> | null,
): DocumentUnitsSettings {
  const enabledUnitIds = (settings?.enabledUnitIds ?? [DEFAULT_UNIT_ID]).filter(
    (id) => CATALOG_IDS.has(id),
  );
  const uniqueEnabled = [...new Set(enabledUnitIds)];
  const enabled =
    uniqueEnabled.length > 0 ? uniqueEnabled : [DEFAULT_UNIT_ID];

  const requestedDefault = settings?.defaultUnitId ?? DEFAULT_UNIT_ID;
  const defaultUnitId = enabled.includes(requestedDefault)
    ? requestedDefault
    : enabled[0];

  return { enabledUnitIds: enabled, defaultUnitId };
}

export function getDocumentUnitDefinition(
  unitId: string,
): DocumentUnitDefinition | undefined {
  return DOCUMENT_UNIT_CATALOG.find((unit) => unit.id === unitId);
}

export function unitShortLabel(unitId: string): string {
  return getDocumentUnitDefinition(unitId)?.shortLabel ?? unitId;
}

export function enabledDocumentUnits(
  settings: DocumentUnitsSettings,
): DocumentUnitDefinition[] {
  return DOCUMENT_UNIT_CATALOG.filter((unit) =>
    settings.enabledUnitIds.includes(unit.id),
  );
}

export function toggleDocumentUnit(
  settings: DocumentUnitsSettings,
  unitId: string,
  enabled: boolean,
): DocumentUnitsSettings {
  if (!CATALOG_IDS.has(unitId)) return settings;

  const enabledSet = new Set(settings.enabledUnitIds);
  if (enabled) {
    enabledSet.add(unitId);
  } else {
    if (enabledSet.size <= 1) return settings;
    enabledSet.delete(unitId);
  }

  const enabledUnitIds = DOCUMENT_UNIT_CATALOG.map((unit) => unit.id).filter(
    (id) => enabledSet.has(id),
  );
  const defaultUnitId = enabledUnitIds.includes(settings.defaultUnitId)
    ? settings.defaultUnitId
    : enabledUnitIds[0];

  return { enabledUnitIds, defaultUnitId };
}

export function setDefaultDocumentUnit(
  settings: DocumentUnitsSettings,
  unitId: string,
): DocumentUnitsSettings {
  if (!settings.enabledUnitIds.includes(unitId)) return settings;
  return { ...settings, defaultUnitId: unitId };
}

export function resolveLineItemUnit(
  item: LineItem,
  settings: DocumentUnitsSettings,
): string {
  if (item.unit && settings.enabledUnitIds.includes(item.unit)) {
    return item.unit;
  }
  return settings.defaultUnitId;
}

export function normalizeLineItemUnits(
  items: LineItem[],
  settings: DocumentUnitsSettings,
): LineItem[] {
  return items.map((item) => ({
    ...item,
    unit: resolveLineItemUnit(item, settings),
  }));
}

export function formatQuantityWithUnit(quantity: number, unitId: string): string {
  const qty = Number.isInteger(quantity)
    ? String(quantity)
    : quantity
        .toFixed(2)
        .replace(/(\.\d*[1-9])0+$/, "$1")
        .replace(/\.0+$/, "");
  return `${qty} ${unitShortLabel(unitId)}`;
}
