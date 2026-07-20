export type CustomerTextField =
  | "name"
  | "taxId"
  | "email"
  | "phone"
  | "address"
  | "city"
  | "postalCode";

type ParsedFieldSegment = {
  field: CustomerTextField;
  value: string;
  approximateLabel: boolean;
};

const FIELD_LABELS: Readonly<Record<CustomerTextField, readonly string[]>> = {
  name: [
    "cliente",
    "client",
    "nombre",
    "nom",
    "nome",
    "empresa",
    "enpresa",
    "entrepresa",
    "interpresa",
    "razon social",
    "razo social",
    "rao social",
    "nombre fiscal",
    "nom fiscal",
    "nome fiscal",
    "se llama",
    "es diu",
    "chamase",
    "se chama",
    "izena",
    "izen fiskala",
    "enpresaren izena",
  ],
  taxId: [
    "nif",
    "cif",
    "nie",
    "ifz",
    "identificacion fiscal",
    "identificacio fiscal",
    "identificacion tributaria",
    "identifikazio fiskala",
  ],
  email: [
    "email",
    "e mail",
    "correo",
    "correo electronico",
    "correo e",
    "correu",
    "correu electronic",
    "correu electronicu",
    "correu electronico",
    "correu e",
    "enderezo electronico",
    "posta elektronikoa",
    "helbide elektronikoa",
  ],
  phone: [
    "telefono",
    "telefon",
    "telefon mobil",
    "telefono mugikorra",
    "telefonoa",
    "telefonu",
    "tel",
    "tlf",
    "movil",
    "mobil",
    "mugikor",
    "mugikorra",
  ],
  address: [
    "direccion",
    "domicilio",
    "domicilio fiscal",
    "adreca",
    "adreza",
    "direicion",
    "domicili",
    "enderezo",
    "enderezo fiscal",
    "helbide",
    "helbidea",
    "egoitza",
  ],
  city: [
    "ciudad",
    "localidad",
    "poblacion",
    "municipio",
    "ciutat",
    "ciudat",
    "ciuda",
    "ziudat",
    "localitat",
    "poblacio",
    "municipi",
    "cidade",
    "localidade",
    "poboacion",
    "poblazion",
    "munizipio",
    "concello",
    "hiria",
    "herria",
    "udalerria",
  ],
  postalCode: [
    "cp",
    "c p",
    "codigo postal",
    "cod postal",
    "codi postal",
    "codigu postal",
    "codigo postaleko",
    "posta kodea",
  ],
};

const COMMON_TYPOS: Readonly<Record<string, CustomerTextField>> = {
  clietne: "name",
  cleinte: "name",
  clente: "name",
  emrpesa: "name",
  empreas: "name",
  enrpesa: "name",
  nomber: "name",
  razn_social: "name",
  rao_socila: "name",
  nfi: "taxId",
  cfi: "taxId",
  emial: "email",
  eamil: "email",
  amil: "email",
  corero: "email",
  cooreo: "email",
  telf: "phone",
  tlefono: "phone",
  telofono: "phone",
  teleofno: "phone",
  telefoino: "phone",
  mobli: "phone",
  direcion: "address",
  direcicon: "address",
  dirrecion: "address",
  domcilio: "address",
  aderca: "address",
  enderzo: "address",
  helbieda: "address",
  cuidad: "city",
  ciuadd: "city",
  localdiad: "city",
  poblaicon: "city",
  municpio: "city",
  codgio_postal: "postalCode",
  codi_psotal: "postalCode",
  posta_koeda: "postalCode",
};

const LEADING_DISCOURSE_REGEX =
  /^(?:(?:y|e|eta|i)\s+)?(?:(?:el|la|els|les|o|a|os|as|su|seu|seva)\s+)?/iu;
const APPROXIMATE_LABEL_DENYLIST = new Set(["hombre", "dominio"]);

function clean(value: string): string {
  return value.trim().replace(/\s+/gu, " ");
}

function comparable(value: string): string {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("es-ES")
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

const LABEL_INDEX = new Map<string, CustomerTextField>();

for (const [field, labels] of Object.entries(FIELD_LABELS) as Array<
  [CustomerTextField, readonly string[]]
>) {
  for (const label of labels) LABEL_INDEX.set(comparable(label), field);
}
for (const [label, field] of Object.entries(COMMON_TYPOS)) {
  LABEL_INDEX.set(label.replace(/_/gu, " "), field);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function accentFlexiblePattern(value: string): string {
  return escapeRegExp(value)
    .replace(/a/gu, "[aáàä]")
    .replace(/e/gu, "[eéèë]")
    .replace(/i/gu, "[iíìï]")
    .replace(/o/gu, "[oóòö]")
    .replace(/u/gu, "[uúùü]")
    .replace(/c/gu, "[cç]")
    .replace(/n/gu, "[nñ]")
    .replace(/\\ /gu, "\\s+");
}

const EXACT_LABEL_SOURCE = Array.from(LABEL_INDEX.keys())
  .sort((left, right) => right.length - left.length)
  .map(accentFlexiblePattern)
  .join("|");

const INLINE_FIELD_BOUNDARY_REGEX = new RegExp(
  `(?:,|\\s+(?:y|e|eta|i)\\s+)(?=\\s*(?:(?:el|la|els|les|o|a|os|as|su|seu|seva)\\s+)?(?:${EXACT_LABEL_SOURCE})(?:\\s|[:=.-]))`,
  "giu",
);

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0),
  );
  for (let leftIndex = 0; leftIndex <= left.length; leftIndex += 1) {
    rows[leftIndex]![0] = leftIndex;
  }
  for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) {
    rows[0]![rightIndex] = rightIndex;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      rows[leftIndex]![rightIndex] = Math.min(
        (rows[leftIndex - 1]?.[rightIndex] ?? 0) + 1,
        (rows[leftIndex]?.[rightIndex - 1] ?? 0) + 1,
        (rows[leftIndex - 1]?.[rightIndex - 1] ?? 0) + cost,
      );
      if (
        leftIndex > 1 &&
        rightIndex > 1 &&
        left[leftIndex - 1] === right[rightIndex - 2] &&
        left[leftIndex - 2] === right[rightIndex - 1]
      ) {
        rows[leftIndex]![rightIndex] = Math.min(
          rows[leftIndex]![rightIndex] ?? Number.POSITIVE_INFINITY,
          (rows[leftIndex - 2]?.[rightIndex - 2] ?? 0) + 1,
        );
      }
    }
  }
  return rows[left.length]?.[right.length] ?? Number.POSITIVE_INFINITY;
}

function approximateFieldForLabel(label: string): CustomerTextField | null {
  const normalized = comparable(label);
  if (
    normalized.length < 4 ||
    APPROXIMATE_LABEL_DENYLIST.has(normalized)
  ) {
    return null;
  }
  const maximum = normalized.length >= 10 ? 2 : 1;
  let best = maximum + 1;
  const winners = new Set<CustomerTextField>();

  for (const [knownLabel, field] of LABEL_INDEX) {
    const distance = editDistance(normalized, knownLabel);
    if (distance > maximum || distance > best) continue;
    if (distance < best) {
      best = distance;
      winners.clear();
    }
    winners.add(field);
  }

  return winners.size === 1 ? Array.from(winners)[0] ?? null : null;
}

function fieldForLabel(
  label: string,
  allowApproximate: boolean,
): { field: CustomerTextField; approximate: boolean } | null {
  const normalized = comparable(label);
  const exact = LABEL_INDEX.get(normalized);
  if (exact) {
    const typoField = COMMON_TYPOS[normalized.replace(/ /gu, "_")];
    return { field: exact, approximate: Boolean(typoField) };
  }
  if (!allowApproximate) return null;
  const approximate = approximateFieldForLabel(normalized);
  return approximate ? { field: approximate, approximate: true } : null;
}

function splitLabelAndValue(segment: string): {
  label: string;
  value: string;
  explicitSeparator: boolean;
}[] {
  const cleaned = clean(segment.replace(LEADING_DISCOURSE_REGEX, ""));
  const explicit = cleaned.match(
    /^(.{1,40}?)\s*(?::|=|\s+-\s+|\s+(?:es|és|son|da|é|dira?)\s+)\s*(.+)$/iu,
  );
  const candidates: Array<{
    label: string;
    value: string;
    explicitSeparator: boolean;
  }> = [];
  if (explicit?.[1] && explicit[2]) {
    candidates.push({
      label: explicit[1],
      value: explicit[2],
      explicitSeparator: true,
    });
  }

  const words = cleaned.split(/\s+/u);
  for (let count = Math.min(3, words.length - 1); count >= 1; count -= 1) {
    candidates.push({
      label: words.slice(0, count).join(" "),
      value: words.slice(count).join(" "),
      explicitSeparator: false,
    });
  }
  return candidates;
}

export function parseCustomerFieldSegment(
  segment: string,
): ParsedFieldSegment | null {
  for (const candidate of splitLabelAndValue(segment)) {
    const resolved = fieldForLabel(
      candidate.label,
      candidate.explicitSeparator,
    );
    const value = clean(candidate.value).replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/gu, "");
    if (!resolved || !value) continue;
    return {
      field: resolved.field,
      value,
      approximateLabel: resolved.approximate,
    };
  }
  return null;
}

export function customerTextHardLines(text: string): string[] {
  return text
    .split(/\r?\n|;|\|+|\/{2,}/u)
    .map(clean)
    .filter(Boolean);
}

export function customerTextFieldSegments(text: string): string[] {
  const segments: string[] = [];
  for (const hardLine of customerTextHardLines(text)) {
    const inline = hardLine
      .split(INLINE_FIELD_BOUNDARY_REGEX)
      .flatMap((part) => part.split(/,(?=\s*[\p{L}])/u))
      .map(clean)
      .filter(Boolean);
    segments.push(hardLine, ...inline);
  }
  return Array.from(new Set(segments));
}

export function firstCustomerFieldValue(
  segments: readonly string[],
  field: CustomerTextField,
): { value: string; approximateLabel: boolean } | null {
  for (const segment of segments) {
    const parsed = parseCustomerFieldSegment(segment);
    if (parsed?.field !== field) continue;
    return {
      value: parsed.value,
      approximateLabel: parsed.approximateLabel,
    };
  }
  return null;
}

export function customerFieldValues(
  segments: readonly string[],
  field: CustomerTextField,
): Array<{ value: string; approximateLabel: boolean }> {
  const values = new Map<string, { value: string; approximateLabel: boolean }>();
  for (const segment of segments) {
    const parsed = parseCustomerFieldSegment(segment);
    if (parsed?.field !== field) continue;
    const key = comparable(parsed.value);
    if (!key) continue;
    const existing = values.get(key);
    values.set(key, {
      value: parsed.value,
      approximateLabel:
        parsed.approximateLabel || existing?.approximateLabel === true,
    });
  }
  return Array.from(values.values());
}

export function removeLeadingCustomerFieldLabel(value: string): string {
  const parsed = parseCustomerFieldSegment(value);
  return parsed?.value ?? value;
}

export function truncateBeforeCustomerField(value: string): string {
  return clean(value.split(INLINE_FIELD_BOUNDARY_REGEX)[0] ?? value)
    .replace(/[,.;:\-\s]+$/gu, "")
    .trim();
}
