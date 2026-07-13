export const PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1 = Object.freeze([
  "/consultor-fiscal/modelos",
  "/consultor-fiscal/modelos/01",
  "/consultor-fiscal/modelos/01C",
  "/consultor-fiscal/modelos/04",
  "/consultor-fiscal/modelos/05",
  "/consultor-fiscal/modelos/06",
  "/consultor-fiscal/modelos/030",
  "/consultor-fiscal/modelos/035",
  "/consultor-fiscal/modelos/036",
  "/consultor-fiscal/modelos/038",
  "/consultor-fiscal/modelos/039",
  "/consultor-fiscal/modelos/040",
  "/consultor-fiscal/modelos/043",
  "/consultor-fiscal/modelos/044",
  "/consultor-fiscal/modelos/045",
  "/consultor-fiscal/modelos/100",
  "/consultor-fiscal/modelos/102",
  "/consultor-fiscal/modelos/111",
  "/consultor-fiscal/modelos/113",
  "/consultor-fiscal/modelos/115",
  "/consultor-fiscal/modelos/117",
  "/consultor-fiscal/modelos/121",
  "/consultor-fiscal/modelos/122",
  "/consultor-fiscal/modelos/123",
  "/consultor-fiscal/modelos/124",
  "/consultor-fiscal/modelos/126",
  "/consultor-fiscal/modelos/128",
  "/consultor-fiscal/modelos/130",
  "/consultor-fiscal/modelos/131",
  "/consultor-fiscal/modelos/136",
  "/consultor-fiscal/modelos/140",
  "/consultor-fiscal/modelos/143",
] as const);

const indexablePathSet = new Set<string>(
  PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1,
);

export function isPublicAeatOfficialIndexablePathV1(
  input: unknown,
): boolean {
  return typeof input === "string" && indexablePathSet.has(input);
}
