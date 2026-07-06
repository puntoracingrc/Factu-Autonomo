import type { AddressResidenceType, Client, Customer } from "./types";

export const STREET_TYPES = [
  { id: "calle", label: "Calle", abbreviation: "C/" },
  { id: "avenida", label: "Avenida", abbreviation: "Avda." },
  { id: "via", label: "Vía", abbreviation: "Vía" },
  { id: "vial", label: "Vial", abbreviation: "Vial" },
  { id: "pasaje", label: "Pasaje", abbreviation: "Pje." },
  { id: "pasadizo", label: "Pasadizo", abbreviation: "Pasadizo" },
  { id: "paseo", label: "Paseo", abbreviation: "Pº" },
  { id: "plaza", label: "Plaza", abbreviation: "Pl." },
  { id: "plazoleta", label: "Plazoleta", abbreviation: "Plazoleta" },
  { id: "andador", label: "Andador", abbreviation: "And." },
  { id: "acera", label: "Acera", abbreviation: "Acera" },
  { id: "calzada", label: "Calzada", abbreviation: "Calzada" },
  { id: "callejon", label: "Callejón", abbreviation: "Cjón." },
  { id: "calleja", label: "Calleja", abbreviation: "Calleja" },
  { id: "canton", label: "Cantón", abbreviation: "Cantón" },
  { id: "carrera", label: "Carrera", abbreviation: "Cra." },
  { id: "costanilla", label: "Costanilla", abbreviation: "Costanilla" },
  { id: "cuesta", label: "Cuesta", abbreviation: "Cuesta" },
  { id: "costa", label: "Costa", abbreviation: "Costa" },
  { id: "bajada", label: "Bajada", abbreviation: "Bajada" },
  { id: "subida", label: "Subida", abbreviation: "Subida" },
  { id: "prolongacion", label: "Prolongación", abbreviation: "Prol." },
  { id: "carretera", label: "Carretera", abbreviation: "Ctra." },
  { id: "autovia", label: "Autovía", abbreviation: "Autovía" },
  { id: "autopista", label: "Autopista", abbreviation: "Autop." },
  { id: "camino", label: "Camino", abbreviation: "Cam." },
  { id: "carril", label: "Carril", abbreviation: "Carril" },
  { id: "senda", label: "Senda", abbreviation: "Senda" },
  { id: "vereda", label: "Vereda", abbreviation: "Vereda" },
  { id: "canada", label: "Cañada", abbreviation: "Cañada" },
  { id: "pista", label: "Pista", abbreviation: "Pista" },
  { id: "paso", label: "Paso", abbreviation: "Paso" },
  { id: "arroyo", label: "Arroyo", abbreviation: "Arroyo" },
  { id: "barranco", label: "Barranco", abbreviation: "Barranco" },
  { id: "torrente", label: "Torrente", abbreviation: "Torrente" },
  { id: "travesia", label: "Travesía", abbreviation: "Tr." },
  { id: "ronda", label: "Ronda", abbreviation: "Ronda" },
  { id: "rotonda", label: "Rotonda", abbreviation: "Rotonda" },
  { id: "cruce", label: "Cruce", abbreviation: "Cruce" },
  { id: "glorieta", label: "Glorieta", abbreviation: "Glorieta" },
  { id: "puente", label: "Puente", abbreviation: "Puente" },
  { id: "tunel", label: "Túnel", abbreviation: "Túnel" },
  { id: "urbanizacion", label: "Urbanización", abbreviation: "Urb." },
  { id: "barrio", label: "Barrio", abbreviation: "Barrio" },
  { id: "barriada", label: "Barriada", abbreviation: "Barriada" },
  { id: "colonia", label: "Colonia", abbreviation: "Col." },
  { id: "residencial", label: "Residencial", abbreviation: "Resid." },
  { id: "complejo", label: "Complejo", abbreviation: "Compl." },
  { id: "conjunto", label: "Conjunto", abbreviation: "Conj." },
  { id: "sector", label: "Sector", abbreviation: "Sector" },
  { id: "zona", label: "Zona", abbreviation: "Zona" },
  { id: "grupo", label: "Grupo", abbreviation: "Grupo" },
  { id: "manzana", label: "Manzana", abbreviation: "Mza." },
  { id: "bloque", label: "Bloque", abbreviation: "Bloque" },
  { id: "poligono", label: "Polígono industrial", abbreviation: "Pol. Ind." },
  { id: "lugar", label: "Lugar", abbreviation: "Lugar" },
  { id: "sitio", label: "Sitio", abbreviation: "Sitio" },
  { id: "paraje", label: "Paraje", abbreviation: "Paraje" },
  { id: "partida", label: "Partida", abbreviation: "Partida" },
  { id: "diseminado", label: "Diseminado", abbreviation: "Disem." },
  { id: "aldea", label: "Aldea", abbreviation: "Aldea" },
  { id: "caserio", label: "Caserío", abbreviation: "Caserío" },
  { id: "poblado", label: "Poblado", abbreviation: "Poblado" },
  { id: "alameda", label: "Alameda", abbreviation: "Alameda" },
  { id: "rambla", label: "Rambla", abbreviation: "Rambla" },
  { id: "gran_via", label: "Gran Vía", abbreviation: "Gran Vía" },
  { id: "bulevar", label: "Bulevar", abbreviation: "Bulevar" },
  { id: "jardin", label: "Jardín", abbreviation: "Jardín" },
  { id: "parque", label: "Parque", abbreviation: "Parque" },
  { id: "muelle", label: "Muelle", abbreviation: "Muelle" },
  { id: "darsena", label: "Dársena", abbreviation: "Dársena" },
  { id: "puerto", label: "Puerto", abbreviation: "Pto." },
  { id: "playa", label: "Playa", abbreviation: "Playa" },
  { id: "mercado", label: "Mercado", abbreviation: "Mercado" },
  { id: "monte", label: "Monte", abbreviation: "Monte" },
  { id: "lago", label: "Lago", abbreviation: "Lago" },
  { id: "valle", label: "Valle", abbreviation: "Valle" },
  { id: "canal", label: "Canal", abbreviation: "Canal" },
  { id: "presa", label: "Presa", abbreviation: "Presa" },
  { id: "finca", label: "Finca", abbreviation: "Finca" },
  { id: "dehesa", label: "Dehesa", abbreviation: "Dehesa" },
  { id: "cortijo", label: "Cortijo", abbreviation: "Cortijo" },
  { id: "hacienda", label: "Hacienda", abbreviation: "Hacienda" },
  { id: "parcela", label: "Parcela", abbreviation: "Parc." },
  { id: "edificio", label: "Edificio", abbreviation: "Edif." },
  { id: "area", label: "Área", abbreviation: "Área" },
  { id: "extrarradio", label: "Extrarradio", abbreviation: "Extrarradio" },
  { id: "entrada", label: "Entrada", abbreviation: "Entrada" },
  { id: "acceso", label: "Acceso", abbreviation: "Acceso" },
  { id: "agregado", label: "Agregado", abbreviation: "Agreg." },
  { id: "apartado", label: "Apartado", abbreviation: "Apdo." },
  { id: "apartamentos", label: "Apartamentos", abbreviation: "Aptos." },
  { id: "aparcamiento", label: "Aparcamiento", abbreviation: "Aparc." },
  { id: "arrabal", label: "Arrabal", abbreviation: "Arrabal" },
  { id: "campo", label: "Campo", abbreviation: "Campo" },
  { id: "chalet", label: "Chalet", abbreviation: "Chalet" },
  { id: "circunvalacion", label: "Circunvalación", abbreviation: "Circ." },
  { id: "extramuros", label: "Extramuros", abbreviation: "Extramuros" },
  { id: "explanada", label: "Explanada", abbreviation: "Explanada" },
  { id: "era", label: "Era", abbreviation: "Era" },
  { id: "escalinata", label: "Escalinata", abbreviation: "Esc." },
  { id: "ferrocarril", label: "Ferrocarril", abbreviation: "FF.CC." },
  { id: "huerta", label: "Huerta", abbreviation: "Huerta" },
  { id: "ladera", label: "Ladera", abbreviation: "Ladera" },
  { id: "malecon", label: "Malecón", abbreviation: "Malecón" },
  { id: "masia", label: "Masía", abbreviation: "Masía" },
  { id: "paramo", label: "Páramo", abbreviation: "Páramo" },
  { id: "rincon", label: "Rincón", abbreviation: "Rincón" },
  { id: "ramal", label: "Ramal", abbreviation: "Ramal" },
  { id: "rampa", label: "Rampa", abbreviation: "Rampa" },
  { id: "riera", label: "Riera", abbreviation: "Riera" },
  { id: "recinto", label: "Recinto", abbreviation: "Recinto" },
  { id: "salida", label: "Salida", abbreviation: "Salida" },
  { id: "solar", label: "Solar", abbreviation: "Solar" },
] as const;

export type StreetTypeId = (typeof STREET_TYPES)[number]["id"];

export const RESIDENCE_TYPES: ReadonlyArray<{
  id: AddressResidenceType;
  label: string;
}> = [
  { id: "", label: "Sin indicar" },
  { id: "flat", label: "Piso" },
  { id: "house", label: "Casa" },
  { id: "chalet", label: "Chalet" },
  { id: "duplex", label: "Dúplex" },
  { id: "attic", label: "Ático" },
  { id: "ground_floor", label: "Bajo" },
  { id: "local", label: "Local" },
  { id: "shop", label: "Tienda" },
  { id: "office", label: "Oficina" },
  { id: "warehouse", label: "Nave" },
  { id: "workshop", label: "Taller" },
  { id: "storage", label: "Almacén" },
  { id: "garage", label: "Garaje" },
  { id: "storage_room", label: "Trastero" },
  { id: "plot", label: "Terreno / solar" },
  { id: "farm", label: "Finca" },
];

export const RESIDENCE_TYPE_LABELS = Object.fromEntries(
  RESIDENCE_TYPES.map((type) => [type.id, type.label]),
) as Record<AddressResidenceType, string>;

const RESIDENCE_TYPE_ALIASES: Record<Exclude<AddressResidenceType, "">, string[]> = {
  flat: ["flat", "piso", "apartamento", "apartment", "vivienda"],
  house: ["house", "casa"],
  chalet: ["chalet", "xalet", "casa unifamiliar"],
  duplex: ["duplex", "dúplex"],
  attic: ["attic", "atico", "ático"],
  ground_floor: ["ground_floor", "bajo", "bajos", "planta baja"],
  local: ["local", "local comercial"],
  shop: ["shop", "tienda", "comercio"],
  office: ["office", "oficina", "despacho"],
  warehouse: ["warehouse", "nave", "nave industrial", "poligono", "polígono"],
  workshop: ["workshop", "taller"],
  storage: ["storage", "almacen", "almacén"],
  garage: ["garage", "garaje", "parking", "párking"],
  storage_room: ["storage_room", "trastero"],
  plot: ["plot", "solar", "terreno", "parcela"],
  farm: ["farm", "finca", "masia", "masía"],
};

const RESIDENCE_TYPES_WITHOUT_ADDRESS_EXTRA = new Set<AddressResidenceType>([
  "house",
  "chalet",
  "plot",
  "farm",
]);

export function normalizeResidenceType(
  value?: AddressResidenceType | string | null,
): AddressResidenceType {
  const cleaned = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (!cleaned) return "";
  const direct = RESIDENCE_TYPES.find((type) => type.id === cleaned);
  if (direct) return direct.id;

  for (const [id, aliases] of Object.entries(RESIDENCE_TYPE_ALIASES)) {
    if (aliases.includes(cleaned)) return id as AddressResidenceType;
  }

  return "";
}

export function normalizeAddressExtra(value?: string | null): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function getStreetType(id?: string | null) {
  if (!id) return undefined;
  return STREET_TYPES.find((type) => type.id === id);
}

export function formatStreetLine(
  streetType?: string | null,
  address?: string | null,
): string {
  const trimmed = address?.trim() ?? "";
  if (!trimmed) return "";
  const type = getStreetType(streetType);
  if (!type) return trimmed;
  return `${type.abbreviation} ${trimmed}`;
}

export function formatClientAddressLine(client: Client): string {
  const formatted = formatStreetLine(client.streetType, client.address);
  if (formatted) return formatted;
  return client.address?.trim() ?? "";
}

export type StreetAddressFields = {
  streetType?: string;
  address?: string;
  addressExtra?: string;
  residenceType?: AddressResidenceType | string;
  postalCode?: string;
  city?: string;
};

export function streetAddressSortKey(
  entity: Pick<StreetAddressFields, "address" | "addressExtra" | "postalCode" | "city">,
): string {
  return [entity.address, entity.addressExtra, entity.postalCode, entity.city]
    .filter(Boolean)
    .join(", ");
}

export function customerStreetSortKey(
  customer: Pick<Customer, "address" | "addressExtra" | "postalCode" | "city">,
): string {
  return streetAddressSortKey(customer);
}

export function formatAddressExtra(
  residenceType?: AddressResidenceType | string | null,
  addressExtra?: string | null,
): string {
  if (!residenceTypeAllowsAddressExtra(residenceType)) return "";
  return normalizeAddressExtra(addressExtra);
}

export function residenceTypeAllowsAddressExtra(
  residenceType?: AddressResidenceType | string | null,
): boolean {
  return !RESIDENCE_TYPES_WITHOUT_ADDRESS_EXTRA.has(
    normalizeResidenceType(residenceType),
  );
}

export function formatAddressBlock(entity: StreetAddressFields): string {
  const streetLine = formatStreetLine(entity.streetType, entity.address);
  const addressExtra = formatAddressExtra(
    entity.residenceType,
    entity.addressExtra,
  );
  return [
    streetLine,
    addressExtra,
    [entity.postalCode, entity.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

const STREET_TYPE_ALIASES: Partial<Record<StreetTypeId, string[]>> = {
  calle: [
    "calle",
    "c/",
    "c.",
    "cl.",
    "carrer",
    "rúa",
    "rua",
    "kalea",
    "karrika",
    "cai",
  ],
  avenida: [
    "avenida",
    "avda.",
    "avda",
    "av.",
    "av",
    "avinguda",
    "avenguda",
    "etorbi",
    "etorbidea",
    "hiribidea",
  ],
  via: ["vía", "via"],
  vial: ["vial"],
  pasaje: ["pasaje", "pje.", "pje", "passatge"],
  pasadizo: ["pasadizo"],
  paseo: [
    "paseo",
    "pº",
    "p.º",
    "pg.",
    "pg",
    "passeig",
    "pasealekua",
    "ibilbidea",
  ],
  plaza: ["plaza", "pl.", "plaça", "praza", "enparantza"],
  plazoleta: ["plazoleta", "placeta", "plazuela"],
  andador: ["andador", "and.", "andadero"],
  acera: ["acera"],
  calzada: ["calzada", "calçada"],
  callejon: ["callejón", "callejon", "cjón.", "cjon.", "carreró", "carrero", "ruela"],
  calleja: ["calleja", "callejuela"],
  canton: ["cantón", "canton", "cantó", "canto"],
  carrera: ["carrera", "cra."],
  costanilla: ["costanilla"],
  cuesta: ["cuesta"],
  costa: ["costa", "costera"],
  bajada: ["bajada", "baixada"],
  subida: ["subida", "pujada"],
  prolongacion: ["prolongación", "prolongacion", "prol."],
  carretera: [
    "carretera",
    "ctra.",
    "ctra",
    "crta.",
    "crta",
    "estrada",
    "estr.",
    "errepidea",
  ],
  autovia: ["autovía", "autovia"],
  autopista: ["autopista", "autop."],
  camino: ["camino", "cam.", "cam", "camí", "cami", "camiño", "bide", "bidea"],
  carril: ["carril"],
  senda: ["senda", "sendero"],
  vereda: ["vereda"],
  canada: ["cañada", "canada"],
  pista: ["pista"],
  paso: ["paso", "pas"],
  arroyo: ["arroyo"],
  barranco: ["barranco"],
  torrente: ["torrente", "torrent"],
  travesia: ["travesía", "travesia", "tr.", "travessia", "travessera"],
  ronda: ["ronda"],
  rotonda: ["rotonda"],
  cruce: ["cruce", "cruïlla", "cruilla"],
  glorieta: ["glorieta"],
  puente: ["puente", "pont"],
  tunel: ["túnel", "tunel"],
  urbanizacion: ["urbanización", "urbanizacion", "urb."],
  barrio: ["barrio", "barri", "auzo", "auzoa"],
  barriada: ["barriada"],
  colonia: ["colonia", "col."],
  residencial: ["residencial", "resid."],
  complejo: ["complejo", "compl."],
  conjunto: ["conjunto", "conj."],
  sector: ["sector"],
  zona: ["zona"],
  grupo: ["grupo"],
  manzana: ["manzana", "mza."],
  bloque: ["bloque"],
  poligono: ["polígono industrial", "poligono industrial", "pol. ind.", "polígono", "poligono"],
  lugar: ["lugar"],
  sitio: ["sitio"],
  paraje: ["paraje"],
  partida: ["partida"],
  diseminado: ["diseminado", "disem."],
  aldea: ["aldea"],
  caserio: ["caserío", "caserio"],
  poblado: ["poblado"],
  alameda: ["alameda"],
  rambla: ["rambla"],
  gran_via: ["gran vía", "gran via"],
  bulevar: ["bulevar", "boulevard", "bvd.", "bvd", "blvr.", "blvr"],
  jardin: ["jardín", "jardin", "jardines"],
  parque: ["parque", "parc"],
  muelle: ["muelle", "moll"],
  darsena: ["dársena", "darsena"],
  puerto: ["puerto", "pto.", "pto", "port"],
  playa: ["playa", "platja", "praia", "hondartza"],
  mercado: ["mercado"],
  monte: ["monte"],
  lago: ["lago", "llac", "laku"],
  valle: ["valle"],
  canal: ["canal"],
  presa: ["presa"],
  finca: ["finca"],
  dehesa: ["dehesa"],
  cortijo: ["cortijo"],
  hacienda: ["hacienda"],
  parcela: ["parcela", "parc."],
  edificio: ["edificio", "edif."],
  area: ["área", "area"],
  extrarradio: ["extrarradio"],
  entrada: ["entrada"],
  acceso: ["acceso"],
  agregado: ["agregado", "agreg."],
  apartado: ["apartado", "apdo.", "apdo"],
  apartamentos: ["apartamentos", "aptos.", "apto."],
  aparcamiento: ["aparcamiento", "aparc.", "parking", "párking"],
  arrabal: ["arrabal", "raval"],
  campo: ["campo", "camp"],
  chalet: ["chalet", "xalet"],
  circunvalacion: ["circunvalación", "circunvalacion", "circ."],
  extramuros: ["extramuros"],
  explanada: ["explanada"],
  era: ["era"],
  escalinata: ["escalinata", "esc."],
  ferrocarril: ["ferrocarril", "ff.cc.", "ffcc"],
  huerta: ["huerta", "horta"],
  ladera: ["ladera"],
  malecon: ["malecón", "malecon"],
  masia: ["masía", "masia"],
  paramo: ["páramo", "paramo"],
  rincon: ["rincón", "rincon"],
  ramal: ["ramal"],
  rampa: ["rampa"],
  riera: ["riera"],
  recinto: ["recinto"],
  salida: ["salida"],
  solar: ["solar"],
};

const STREET_TYPE_SUFFIX_ALIASES: Partial<Record<StreetTypeId, string[]>> = {
  calle: ["kalea", "karrika"],
  avenida: ["etorbidea", "etorbi", "hiribidea"],
  carretera: ["errepidea"],
  camino: ["bidea", "bide"],
  paseo: ["pasealekua", "ibilbidea"],
  plaza: ["enparantza"],
  playa: ["hondartza"],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function streetAliasPrefixPattern(alias: string): RegExp {
  const separator = /[./ºª]$/.test(alias) || alias.includes("/")
    ? "\\s*"
    : "(?:\\s+|$)";
  return new RegExp(`^${escapeRegExp(alias)}${separator}`, "i");
}

function stripStreetConnector(value: string): string {
  return value
    .replace(/^(de la|de las|de los|de les|de l'|del|dels|des|do|da|dos|das|d'|de)\s+/i, "")
    .trim();
}

/** Separa prefijos legacy («Calle Mayor 1») en tipo + nombre de vía. */
export function splitLegacyStreetAddress(address?: string | null): {
  streetType?: StreetTypeId;
  streetLine: string;
} {
  const trimmed = address?.trim() ?? "";
  if (!trimmed) return { streetLine: "" };

  for (const type of STREET_TYPES) {
    const aliases = [
      type.label,
      type.abbreviation,
      ...(STREET_TYPE_ALIASES[type.id] ?? []),
    ].sort((a, b) => b.length - a.length);

    for (const alias of aliases) {
      const pattern = streetAliasPrefixPattern(alias);
      if (!pattern.test(trimmed)) continue;

      return {
        streetType: type.id,
        streetLine: stripStreetConnector(trimmed.replace(pattern, "").trim()),
      };
    }
  }

  for (const type of STREET_TYPES) {
    const aliases = (STREET_TYPE_SUFFIX_ALIASES[type.id] ?? []).sort(
      (a, b) => b.length - a.length,
    );

    for (const alias of aliases) {
      const match = trimmed.match(
        new RegExp(`^(.+?)\\s+${escapeRegExp(alias)}(?=\\s*(?:,|\\d|$))`, "i"),
      );
      if (!match) continue;

      const before = match[1]?.trim() ?? "";
      const after = trimmed.slice(match[0].length).trim();
      const joiner = after.startsWith(",") ? "" : " ";

      return {
        streetType: type.id,
        streetLine: `${before}${after ? `${joiner}${after}` : ""}`.trim(),
      };
    }
  }

  return { streetLine: trimmed };
}

export function normalizeStreetFields<T extends StreetAddressFields>(entity: T): T {
  if (entity.streetType || !entity.address) {
    return entity;
  }

  const { streetType, streetLine } = splitLegacyStreetAddress(entity.address);
  if (!streetType) return entity;

  return {
    ...entity,
    streetType,
    address: streetLine || entity.address,
  };
}

export function normalizeCustomerStreetFields(customer: Customer): Customer {
  return normalizeStreetFields(customer);
}

export function clientAddressToFormFields(
  client: Pick<Client, "streetType" | "address" | "addressExtra" | "residenceType">,
): {
  streetType: string;
  streetLine: string;
  addressExtra: string;
  residenceType: AddressResidenceType;
} {
  const segments = (client.address ?? "")
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const firstSegment = segments[0] ?? client.address?.trim() ?? "";
  const explicitAddressExtra = formatAddressExtra(
    client.residenceType,
    client.addressExtra,
  );
  const inferredAddressExtra =
    explicitAddressExtra ||
    (segments[1] && !/^\d{5}\b/.test(segments[1]) ? segments[1] : "");
  const residenceType = normalizeResidenceType(
    client.residenceType ?? (inferredAddressExtra ? "flat" : undefined),
  );

  if (client.streetType) {
    const type = getStreetType(client.streetType);
    if (type && firstSegment) {
      const abbr = type.abbreviation.replace(/\./g, "\\.");
      const prefixPattern = new RegExp(`^(${abbr}|${type.label})\\s*`, "i");
      return {
        streetType: client.streetType,
        streetLine: firstSegment.replace(prefixPattern, "").trim() || firstSegment,
        addressExtra: inferredAddressExtra,
        residenceType,
      };
    }
    return {
      streetType: client.streetType,
      streetLine: firstSegment,
      addressExtra: inferredAddressExtra,
      residenceType,
    };
  }

  const { streetType, streetLine } = splitLegacyStreetAddress(firstSegment);
  return {
    streetType: streetType ?? "",
    streetLine,
    addressExtra: inferredAddressExtra,
    residenceType,
  };
}
