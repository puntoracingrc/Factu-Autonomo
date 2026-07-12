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
] as const);

const indexablePathSet = new Set<string>(
  PUBLIC_AEAT_OFFICIAL_INDEXABLE_PATHS_V1,
);

export function isPublicAeatOfficialIndexablePathV1(
  input: unknown,
): boolean {
  return typeof input === "string" && indexablePathSet.has(input);
}
