import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CATALOG_SCHEMA = "fiscal-watch-sources.v1";
const STATE_SCHEMA = "fiscal-watch-source-state.v1";
const SNAPSHOT_SCHEMA = "fiscal-watch-source-snapshot.v1";
const SUPPORTED_FORMATS = new Set(["RSS", "BOE_JSON", "HTML", "ICS"]);
const SUPPORTED_MODES = new Set(["APPEND_ONLY", "FUTURE_SNAPSHOT"]);
const MAX_SOURCES = 32;
const MAX_XML_BLOCKS = 10_000;
const MAX_XML_BLOCK_CODE_UNITS = 256_000;
const MAX_ICS_LINE_CODE_UNITS = 64 * 1024;
const SOURCE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOE_ID_PATTERN = /^BOE-[A-Z]-\d{4}-\d{1,8}$/;
const ACTIVE_ELEMENTS = [
  "script",
  "style",
  "noscript",
  "template",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
];
const DEFAULT_CATALOG_PATH = fileURLToPath(
  new URL("../../config/fiscal-watch/sources.v1.json", import.meta.url),
);
export const FISCAL_WATCH_PARSER_CONTRACT_VERSION =
  "fiscal-watch-parser.2026-07-13.v2";

export class FiscalWatchError extends Error {
  constructor(code, message = code, options = {}) {
    super(message, options);
    this.name = "FiscalWatchError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new FiscalWatchError(code, message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function truncateCodePoints(value, maximum) {
  const points = Array.from(value);
  return points.length <= maximum ? value : points.slice(0, maximum).join("");
}

function decodeEntities(value) {
  const named = new Map([
    ["amp", "&"],
    ["lt", "<"],
    ["gt", ">"],
    ["quot", '"'],
    ["apos", "'"],
    ["nbsp", " "],
  ]);
  return value.replace(
    /&(?:#(\d{1,7})|#x([\da-f]{1,6})|([a-z]{2,12}));/gi,
    (match, decimal, hexadecimal, name) => {
      if (name) return named.get(name.toLowerCase()) ?? match;
      const codePoint = Number.parseInt(decimal ?? hexadecimal, decimal ? 10 : 16);
      if (
        !Number.isInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0x10ffff ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff)
      ) {
        return "�";
      }
      return String.fromCodePoint(codePoint);
    },
  );
}

export function stripActiveContent(value) {
  let result = String(value ?? "").replace(/<!--(?:[\s\S]*?)-->/g, " ");
  for (const tag of ACTIVE_ELEMENTS) {
    const closed = new RegExp(
      `<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>`,
      "gi",
    );
    const incomplete = new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*$`, "gi");
    result = result.replace(closed, "\n").replace(incomplete, "\n");
  }
  return result;
}

export function normalizePlainText(value, maximumCodePoints = 12_000) {
  const withoutActive = stripActiveContent(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(
      /<\s*\/?\s*(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]*>/g, " ");
  const decodedMarkup = stripActiveContent(decodeEntities(withoutActive))
    .replace(
      /<\s*\/?\s*(?:address|article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi,
      "\n",
    )
    .replace(/<[^>]*>/g, " ");
  const decoded = decodedMarkup
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
  return truncateCodePoints(decoded, maximumCodePoints);
}

function madridDateParts(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: value.year, month: value.month, day: value.day };
}

function resolveSourceUrl(source, now) {
  if (source.url) return source.url;
  const { year, month, day } = madridDateParts(now);
  return source.urlTemplate
    .replace("{date}", `${year}${month}${day}`)
    .replace("{year}", year);
}

function validateBoeUrl(url, kind) {
  if (url.hostname !== "www.boe.es") return false;
  if (url.pathname === "/rss/canal_leg.php") {
    return (
      kind === "source" &&
      url.searchParams.size === 2 &&
      url.searchParams.get("c") === "128" &&
      url.searchParams.get("l") === "l"
    );
  }
  if (/^\/datosabiertos\/api\/boe\/sumario\/\d{8}$/.test(url.pathname)) {
    return kind === "source" && url.search === "";
  }
  if (
    [
      "/alertas/alerta.php",
      "/datosabiertos/api/api.php",
    ].includes(url.pathname)
  ) {
    return kind === "page" && url.search === "";
  }
  if (url.pathname === "/diario_boe/txt.php") {
    return (
      kind === "item" &&
      url.searchParams.size === 1 &&
      BOE_ID_PATTERN.test(url.searchParams.get("id") ?? "")
    );
  }
  if (url.pathname === "/buscar/doc.php") {
    return (
      kind === "item" &&
      url.searchParams.size === 1 &&
      /^DOUE-(?:L|Z)-\d{4}-\d{1,8}$/.test(url.searchParams.get("id") ?? "")
    );
  }
  return false;
}

function validateAeatUrl(url, kind) {
  if (url.hostname !== "sede.agenciatributaria.gob.es") return false;
  if (!url.pathname.startsWith("/Sede/") || url.search !== "") return false;
  if (kind === "source") {
    return /\.(?:html|xml)$/.test(url.pathname);
  }
  return kind === "page" || kind === "item";
}

function validateCalendarUrl(url, kind) {
  return (
    kind === "source" &&
    url.hostname === "calendar.google.com" &&
    url.search === "" &&
    /^\/calendar\/ical\/[A-Za-z0-9%._-]+\/public\/basic\.ics$/.test(
      url.pathname,
    )
  );
}

export function validateOfficialSourceUrl(value, kind = "source") {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("URL_NOT_ALLOWED", "URL oficial no válida.");
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.hash !== ""
  ) {
    fail("URL_NOT_ALLOWED", "URL oficial fuera de la allowlist.");
  }
  if (
    !validateBoeUrl(url, kind) &&
    !validateAeatUrl(url, kind) &&
    !validateCalendarUrl(url, kind)
  ) {
    fail("URL_NOT_ALLOWED", "URL oficial fuera de la allowlist.");
  }
  return url;
}

function positiveInteger(value, name, maximum) {
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    fail("INVALID_CATALOG", `Límite inválido: ${name}.`);
  }
  return value;
}

export function validateFiscalWatchCatalog(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_CATALOG", "Catálogo ausente.");
  }
  if (
    value.schemaVersion !== CATALOG_SCHEMA ||
    typeof value.catalogVersion !== "string" ||
    !/^[A-Za-z0-9._-]+$/.test(value.catalogVersion) ||
    value.parserContractVersion !== FISCAL_WATCH_PARSER_CONTRACT_VERSION ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.reviewedAt) ||
    value.timeZone !== "Europe/Madrid" ||
    !Array.isArray(value.sources) ||
    value.sources.length === 0 ||
    value.sources.length > MAX_SOURCES
  ) {
    fail("INVALID_CATALOG", "Contrato de catálogo no reconocido.");
  }
  const limits = {
    timeoutMs: positiveInteger(value.limits?.timeoutMs, "timeoutMs", 30_000),
    maxResponseBytes: positiveInteger(
      value.limits?.maxResponseBytes,
      "maxResponseBytes",
      8 * 1024 * 1024,
    ),
    maxItemsPerSource: positiveInteger(
      value.limits?.maxItemsPerSource,
      "maxItemsPerSource",
      10_000,
    ),
    maxTrackedItems: positiveInteger(
      value.limits?.maxTrackedItems,
      "maxTrackedItems",
      1_000,
    ),
    maxTextCodePoints: positiveInteger(
      value.limits?.maxTextCodePoints,
      "maxTextCodePoints",
      50_000,
    ),
    futureHorizonDays: positiveInteger(
      value.limits?.futureHorizonDays,
      "futureHorizonDays",
      1_095,
    ),
  };
  const ids = new Set();
  const sources = value.sources.map((source) => {
    if (
      !source ||
      typeof source !== "object" ||
      !SOURCE_ID_PATTERN.test(source.id ?? "") ||
      ids.has(source.id) ||
      !["BOE", "AEAT"].includes(source.authority) ||
      typeof source.label !== "string" ||
      source.label.trim().length < 3 ||
      source.label.length > 160 ||
      !SUPPORTED_FORMATS.has(source.format) ||
      !SUPPORTED_MODES.has(source.mode) ||
      !Array.isArray(source.acceptedMimeTypes) ||
      source.acceptedMimeTypes.length === 0 ||
      source.acceptedMimeTypes.some(
        (mime) => typeof mime !== "string" || !/^[a-z]+\/[a-z0-9.+-]+$/.test(mime),
      ) ||
      Boolean(source.url) === Boolean(source.urlTemplate)
    ) {
      fail("INVALID_CATALOG", "Fuente inválida o duplicada.");
    }
    ids.add(source.id);
    const sampleUrl = source.urlTemplate
      ? source.urlTemplate.replace("{date}", "20260713").replace("{year}", "2026")
      : source.url;
    if (
      source.urlTemplate &&
      !source.urlTemplate.includes("{date}") &&
      !source.urlTemplate.includes("{year}")
    ) {
      fail("INVALID_CATALOG", "Plantilla oficial no reconocida.");
    }
    validateOfficialSourceUrl(sampleUrl, "source");
    validateOfficialSourceUrl(source.officialPageUrl, "page");
    if (
      source.emptyHttpStatuses !== undefined &&
      (!Array.isArray(source.emptyHttpStatuses) ||
        source.emptyHttpStatuses.some((status) => status !== 404))
    ) {
      fail("INVALID_CATALOG", "Estado HTTP vacío no permitido.");
    }
    if (
      source.titleFilterTerms !== undefined &&
      (source.format !== "BOE_JSON" ||
        !Array.isArray(source.titleFilterTerms) ||
        source.titleFilterTerms.length === 0 ||
        source.titleFilterTerms.length > 32 ||
        source.titleFilterTerms.some(
          (term) =>
            typeof term !== "string" ||
            term.length < 3 ||
            term.length > 40 ||
            term !== term.toLowerCase(),
        ))
    ) {
      fail("INVALID_CATALOG", "Filtro BOE no válido.");
    }
    if (
      source.format === "BOE_JSON" &&
      (source.structuralFilter?.publicationPrefix !== "BOE-A-" ||
        source.structuralFilter?.sectionCode !== "1" ||
        source.structuralFilter?.sectionName !== "I. Disposiciones generales")
    ) {
      fail("INVALID_CATALOG", "Clasificación estructural BOE no válida.");
    }
    if (source.format !== "BOE_JSON" && source.structuralFilter !== undefined) {
      fail("INVALID_CATALOG", "Clasificación estructural inesperada.");
    }
    if (
      (source.format === "HTML" &&
        (typeof source.expectedHeading !== "string" ||
          source.expectedHeading.length < 3 ||
          source.expectedHeading.length > 120)) ||
      (source.format !== "HTML" && source.expectedHeading !== undefined)
    ) {
      fail("INVALID_CATALOG", "Sentinela HTML no válido.");
    }
    return Object.freeze({
      ...source,
      label: source.label.trim(),
      acceptedMimeTypes: Object.freeze([...source.acceptedMimeTypes]),
      emptyHttpStatuses: Object.freeze([...(source.emptyHttpStatuses ?? [])]),
      titleFilterTerms: Object.freeze([...(source.titleFilterTerms ?? [])]),
      ...(source.expectedHeading ? { expectedHeading: source.expectedHeading } : {}),
      ...(source.structuralFilter
        ? { structuralFilter: Object.freeze({ ...source.structuralFilter }) }
        : {}),
    });
  });
  const catalog = {
    schemaVersion: CATALOG_SCHEMA,
    catalogVersion: value.catalogVersion,
    parserContractVersion: value.parserContractVersion,
    reviewedAt: value.reviewedAt,
    timeZone: "Europe/Madrid",
    limits: Object.freeze(limits),
    sources: Object.freeze(sources),
  };
  return Object.freeze(catalog);
}

export async function loadFiscalWatchCatalog(path = DEFAULT_CATALOG_PATH) {
  let value;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new FiscalWatchError("INVALID_CATALOG", "No se pudo leer el catálogo.", {
      cause: error,
    });
  }
  return validateFiscalWatchCatalog(value);
}

function mimeMatches(contentType, acceptedMimeTypes) {
  const mime = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  return Boolean(mime && acceptedMimeTypes.includes(mime));
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // El cuerpo no confiable queda descartado.
  }
}

function responseCharset(contentType) {
  const match = /(?:^|;)\s*charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType ?? "");
  const charset = (match?.[1] ?? "utf-8").toLowerCase();
  if (["utf-8", "utf8"].includes(charset)) return "utf-8";
  if (["iso-8859-1", "latin1", "latin-1", "windows-1252", "cp1252"].includes(charset)) {
    return "windows-1252";
  }
  fail("CHARSET_MISMATCH", "Charset oficial no permitido.");
}

async function readBoundedBody(response, limit, controller) {
  const advertised = response.headers.get("content-length");
  if (advertised !== null) {
    if (!/^\d+$/.test(advertised) || Number(advertised) > limit) {
      await cancelBody(response);
      controller.abort();
      fail("RESPONSE_TOO_LARGE", "Respuesta oficial fuera de límites.");
    }
  }
  if (!response.body) fail("INVALID_RESPONSE", "Respuesta oficial sin cuerpo.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder(
    responseCharset(response.headers.get("content-type")),
    { fatal: true },
  );
  const chunks = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limit) {
        try {
          await reader.cancel();
        } catch {
          // Abortar también cancela el stream.
        }
        controller.abort();
        fail("RESPONSE_TOO_LARGE", "Respuesta oficial fuera de límites.");
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
    return { body: chunks.join(""), receivedBytes: received };
  } catch (error) {
    if (error instanceof FiscalWatchError) throw error;
    fail("INVALID_ENCODING", "La fuente oficial no es UTF-8 válida.");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Reader ya cancelado.
    }
  }
}

export async function fetchOfficialSource(
  source,
  limits,
  { fetchImpl = fetch, now = () => new Date(), sourceUrl = null } = {},
) {
  const requestedUrl = validateOfficialSourceUrl(
    sourceUrl ?? resolveSourceUrl(source, now()),
    "source",
  );
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, limits.timeoutMs);
  try {
    const response = await fetchImpl(requestedUrl, {
      method: "GET",
      headers: {
        Accept: source.acceptedMimeTypes.join(", "),
        "User-Agent": "FactuAutonomo-FiscalWatch/1.0 (+official-source-monitor)",
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (response.redirected || response.url && response.url !== requestedUrl.href) {
      await cancelBody(response);
      fail("REDIRECT_BLOCKED", "La fuente intentó redirigir la petición.");
    }
    if (source.emptyHttpStatuses.includes(response.status)) {
      await cancelBody(response);
      return {
        body: "",
        fetchedAt: now().toISOString(),
        httpStatus: response.status,
        contentType: null,
        receivedBytes: 0,
        resolvedUrl: requestedUrl.href,
        emptyPublication: true,
      };
    }
    if (!response.ok) {
      await cancelBody(response);
      fail("HTTP_FAILURE", `La fuente respondió HTTP ${response.status}.`);
    }
    if (!mimeMatches(response.headers.get("content-type"), source.acceptedMimeTypes)) {
      await cancelBody(response);
      fail("MIME_MISMATCH", "MIME oficial inesperado.");
    }
    const { body, receivedBytes } = await readBoundedBody(
      response,
      limits.maxResponseBytes,
      controller,
    );
    return {
      body,
      fetchedAt: now().toISOString(),
      httpStatus: response.status,
      contentType: response.headers.get("content-type")?.split(";", 1)[0] ?? null,
      receivedBytes,
      resolvedUrl: requestedUrl.href,
      emptyPublication: false,
    };
  } catch (error) {
    if (error instanceof FiscalWatchError) throw error;
    fail(timedOut ? "TIMEOUT" : "NETWORK_FAILURE", "No se pudo consultar la fuente.");
  } finally {
    clearTimeout(timer);
  }
}

function xmlTag(block, names) {
  for (const name of names) {
    const pattern = new RegExp(
      `<(?:[A-Za-z][\\w.-]*:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z][\\w.-]*:)?${name}\\s*>`,
      "i",
    );
    const match = pattern.exec(block);
    if (match) return normalizePlainText(match[1]);
  }
  return "";
}

function xmlLink(block) {
  const atom = /<(?:[A-Za-z][\w.-]*:)?link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*\/?\s*>/i.exec(
    block,
  );
  return atom?.[1] ?? xmlTag(block, ["link"]);
}

function optionalOfficialItemUrl(value, source) {
  if (!value) return source.officialPageUrl;
  try {
    const decoded = decodeEntities(value).trim();
    const absolute = decoded.startsWith("/")
      ? new URL(
          decoded,
          source.authority === "BOE"
            ? "https://www.boe.es"
            : "https://sede.agenciatributaria.gob.es",
        ).href
      : decoded;
    return validateOfficialSourceUrl(absolute, "item").href;
  } catch {
    fail("UNSAFE_ITEM_URL", `Enlace no permitido en ${source.id}.`);
  }
}

function createItem({ key, title, officialUrl, publishedAt, effectiveDate = null, semantic }, limits) {
  const safeKey = truncateCodePoints(normalizePlainText(key, 512), 512);
  const safeTitle = truncateCodePoints(normalizePlainText(title, 500), 500);
  if (!safeKey || !safeTitle) fail("INVALID_ITEM", "Entrada oficial incompleta.");
  const normalizedSemantic = normalizePlainText(semantic, limits.maxTextCodePoints);
  return {
    key: safeKey,
    title: safeTitle,
    officialUrl,
    publishedAt: publishedAt ? truncateCodePoints(normalizePlainText(publishedAt, 80), 80) : null,
    effectiveDate,
    excerpt: truncateCodePoints(normalizedSemantic, 600),
    digest: sha256(canonicalJson([safeKey, safeTitle, normalizedSemantic])),
  };
}

function itemEvidence(item) {
  if (!item) return null;
  return {
    title: item.title,
    effectiveDate: item.effectiveDate ?? null,
    excerpt: item.excerpt ?? "",
  };
}

function parseRss(body, source, limits) {
  const safeBody = stripActiveContent(body);
  if (!/<(?:rss|feed)\b/i.test(safeBody)) {
    fail("INVALID_RSS", "Documento RSS/Atom no reconocido.");
  }
  const blocks = [];
  const pattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  let match;
  while ((match = pattern.exec(safeBody))) {
    if (match[2].length > MAX_XML_BLOCK_CODE_UNITS) fail("INVALID_RSS", "Entrada RSS excesiva.");
    blocks.push(match[2]);
    if (blocks.length > MAX_XML_BLOCKS || blocks.length > limits.maxItemsPerSource) {
      fail("TOO_MANY_ITEMS", "RSS fuera de límites.");
    }
  }
  return blocks.map((block) => {
    const title = xmlTag(block, ["title"]);
    const link = xmlLink(block);
    const publishedAt = xmlTag(block, ["pubDate", "published", "updated", "date"]);
    const description = xmlTag(block, ["description", "summary", "content"]);
    const key = xmlTag(block, ["guid", "id"]) || link || sha256(`${title}\n${publishedAt}`);
    return createItem(
      {
        key,
        title,
        officialUrl: optionalOfficialItemUrl(link, source),
        publishedAt,
        semantic: `${title}\n${publishedAt}\n${description}`,
      },
      limits,
    );
  });
}

function boeCollection(value, label, { allowEmpty = true } = {}) {
  const entries = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  if ((!allowEmpty && entries.length === 0) || entries.length > 10_000) {
    fail("INVALID_JSON_STRUCTURE", `Colección BOE no válida: ${label}.`);
  }
  return entries;
}

function matchesBoeTaxTitle(title, terms) {
  const searchableTitle = normalizePlainText(title, 1_000)
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const searchableTokens = searchableTitle.replace(/[^a-z0-9]+/g, " ").trim();
  const searchableTerms = searchableTokens
    .replace(/(?:^| )agencia tributaria(?: |$)/g, " ")
    .trim();
  return terms.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (term.includes(" ")) return searchableTerms.includes(term);
    if (term.length <= 4) {
      return new RegExp(`(?:^| )${escaped}(?: |$)`).test(searchableTerms);
    }
    return new RegExp(`(?:^| )${escaped}`).test(searchableTerms);
  });
}

function parseBoeJson(body, source, limits) {
  let value;
  try {
    value = JSON.parse(body);
  } catch {
    fail("INVALID_JSON", "JSON oficial no válido.");
  }
  const status = value?.status?.codigo ?? value?.status?.code;
  if (String(status) !== "200") {
    fail("INVALID_JSON_STATUS", "Estado interno BOE no válido.");
  }
  const byId = new Map();
  const filter = source.structuralFilter;
  const diaries = boeCollection(value?.data?.sumario?.diario, "diario", {
    allowEmpty: false,
  });
  for (const diary of diaries) {
    for (const section of boeCollection(diary.seccion, "seccion", { allowEmpty: false })) {
      if (section.codigo !== filter.sectionCode) continue;
      if (normalizePlainText(section.nombre, 160) !== filter.sectionName) {
        fail("INVALID_JSON_STRUCTURE", "Clasificación BOE no reconocida.");
      }
      for (const department of boeCollection(section.departamento, "departamento", {
        allowEmpty: false,
      })) {
        for (const heading of boeCollection(department.epigrafe, "epigrafe", {
          allowEmpty: false,
        })) {
          for (const candidate of boeCollection(heading.item, "item", {
            allowEmpty: false,
          })) {
            const id = candidate.identificador ?? candidate.id;
            if (
              typeof id !== "string" ||
              !id.startsWith(filter.publicationPrefix) ||
              !BOE_ID_PATTERN.test(id)
            ) {
              fail("INVALID_JSON_STRUCTURE", "Identificador BOE-A no válido.");
            }
            const title = candidate.titulo ?? candidate.texto;
            if (typeof title !== "string" || !title.trim()) {
              fail("INVALID_JSON_STRUCTURE", "Disposición BOE sin título.");
            }
            if (!matchesBoeTaxTitle(title, source.titleFilterTerms)) continue;
            const link = candidate.url_html ?? candidate.urlHtml ?? candidate.url;
            const officialUrl =
              typeof link === "string" && link.trim()
                ? optionalOfficialItemUrl(link, source)
                : validateOfficialSourceUrl(
                    `https://www.boe.es/diario_boe/txt.php?id=${encodeURIComponent(id)}`,
                    "item",
                  ).href;
            byId.set(
              id,
              createItem(
                {
                  key: id,
                  title,
                  officialUrl,
                  publishedAt: candidate.fecha_publicacion ?? candidate.fecha ?? null,
                  semantic: canonicalJson(candidate),
                },
                limits,
              ),
            );
          }
        }
      }
    }
  }
  if (byId.size > limits.maxItemsPerSource) fail("TOO_MANY_ITEMS", "BOE fuera de límites.");
  return [...byId.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function parseHtml(body, source, limits) {
  if (!/<(?:!doctype\s+html|html|main|body)\b/i.test(body)) {
    fail("INVALID_HTML", "HTML oficial no reconocido.");
  }
  let heading = null;
  const headings = body.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1\s*>/gi);
  for (const candidate of headings) {
    const id = /\bid\s*=\s*(["'])js-nombre-canal\1/i.test(candidate[1]);
    if (id) {
      heading = normalizePlainText(candidate[2], 160);
      break;
    }
  }
  if (heading !== source.expectedHeading) {
    fail("INVALID_HTML", "La página oficial no contiene su sentinela esperada.");
  }
  const withoutChrome = stripActiveContent(body)
    .replace(/<\s*(header|nav|footer)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "\n");
  const semantic = normalizePlainText(withoutChrome, limits.maxTextCodePoints);
  if (!semantic) fail("INVALID_HTML", "HTML oficial sin contenido legible.");
  return [
    createItem(
      {
        key: source.id,
        title: source.label,
        officialUrl: source.officialPageUrl,
        officialUrlKind: "page",
        publishedAt: null,
        semantic,
      },
      limits,
    ),
  ];
}

function unfoldIcs(body) {
  const physical = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = [];
  for (const line of physical) {
    if (line.length > MAX_ICS_LINE_CODE_UNITS) fail("INVALID_ICS", "Línea ICS excesiva.");
    if (/^[ \t]/.test(line)) {
      if (!lines.length) fail("INVALID_ICS", "Plegado ICS inválido.");
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeIcs(value) {
  return value.replace(/\\([nN,;\\])/g, (_match, escaped) =>
    escaped === "n" || escaped === "N" ? "\n" : escaped,
  );
}

function dateOnlyFromCompact(value) {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function addDateOnlyDays(value, days) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear().toString().padStart(4, "0")}-${(date.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getUTCDate().toString().padStart(2, "0")}`;
}

function madridDateOnly(value) {
  const { year, month, day } = madridDateParts(value);
  return `${year}-${month}-${day}`;
}

function madridDateOnlyFromUtcTimestamp(value) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    return null;
  }
  return madridDateOnly(date);
}

function parseIcs(body, source, limits, fetchedAt) {
  const lines = unfoldIcs(body);
  if (!lines.includes("BEGIN:VCALENDAR") || !lines.includes("END:VCALENDAR")) {
    fail("INVALID_ICS", "Calendario ICS no reconocido.");
  }
  const items = [];
  let rawEventCount = 0;
  let properties = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      if (properties) fail("INVALID_ICS", "Evento ICS anidado.");
      properties = new Map();
      continue;
    }
    if (line === "END:VEVENT") {
      if (!properties) fail("INVALID_ICS", "Cierre ICS inesperado.");
      rawEventCount += 1;
      if (rawEventCount > limits.maxItemsPerSource) {
        fail("TOO_MANY_ITEMS", "ICS fuera de límites.");
      }
      const uid = properties.get("UID")?.[0];
      const summary = properties.get("SUMMARY")?.[0];
      const start = properties.get("DTSTART")?.[0];
      if (!uid || !summary || !start) fail("INVALID_ICS", "Evento ICS incompleto.");
      const sourceDateOnly = properties.get("__DTSTART_DATE_ONLY")?.[0] === "true";
      const effectiveDate = sourceDateOnly
        ? dateOnlyFromCompact(start)
        : madridDateOnlyFromUtcTimestamp(start);
      if (!effectiveDate) {
        fail(
          "INVALID_ICS",
          "El calendario debe usar fecha completa o instante UTC estricto.",
        );
      }
      const horizonStart = madridDateOnly(new Date(fetchedAt));
      const horizonEnd = addDateOnlyDays(horizonStart, limits.futureHorizonDays);
      if (effectiveDate < horizonStart || effectiveDate > horizonEnd) {
        properties = null;
        continue;
      }
      const semantic = [
        start,
        properties.get("DTEND")?.[0] ?? "",
        unescapeIcs(summary),
        unescapeIcs(properties.get("DESCRIPTION")?.[0] ?? ""),
        properties.get("STATUS")?.[0] ?? "",
        properties.get("LAST-MODIFIED")?.[0] ?? "",
      ].join("\n");
      items.push(
        createItem(
          {
            key: unescapeIcs(uid),
            title: unescapeIcs(summary),
            officialUrl: source.officialPageUrl,
            publishedAt: properties.get("LAST-MODIFIED")?.[0] ?? null,
            effectiveDate,
            semantic,
          },
          limits,
        ),
      );
      if (items.length > limits.maxItemsPerSource) fail("TOO_MANY_ITEMS", "ICS fuera de límites.");
      properties = null;
      continue;
    }
    if (!properties) continue;
    if (/^BEGIN:|^END:/.test(line)) fail("INVALID_ICS", "Componente ICS no permitido.");
    const separator = line.indexOf(":");
    if (separator <= 0) fail("INVALID_ICS", "Propiedad ICS inválida.");
    const name = line.slice(0, separator).split(";", 1)[0].toUpperCase();
    if (!/^[A-Z0-9-]+$/.test(name)) fail("INVALID_ICS", "Propiedad ICS inválida.");
    const values = properties.get(name) ?? [];
    values.push(line.slice(separator + 1));
    properties.set(name, values);
    if (name === "DTSTART") {
      const parameters = line.slice(0, separator).split(";").slice(1).map((entry) => entry.toUpperCase());
      properties.set("__DTSTART_DATE_ONLY", [String(parameters.includes("VALUE=DATE"))]);
    }
  }
  if (properties) fail("INVALID_ICS", "Evento ICS sin cerrar.");
  if (rawEventCount === 0) fail("EMPTY_SOURCE", "La fuente oficial no contiene entradas.");
  const unique = new Set();
  for (const item of items) {
    if (unique.has(item.key)) fail("DUPLICATE_ITEM", "UID ICS duplicado.");
    unique.add(item.key);
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
}

export function parseSourceSnapshot(source, fetched, limits) {
  let items;
  if (fetched.emptyPublication) {
    items = [];
  } else if (source.format === "RSS") {
    items = parseRss(fetched.body, source, limits);
  } else if (source.format === "BOE_JSON") {
    items = parseBoeJson(fetched.body, source, limits);
  } else if (source.format === "HTML") {
    items = parseHtml(fetched.body, source, limits);
  } else if (source.format === "ICS") {
    items = parseIcs(fetched.body, source, limits, fetched.fetchedAt);
  } else {
    fail("UNSUPPORTED_FORMAT", "Formato oficial no soportado.");
  }
  if (!fetched.emptyPublication && source.format === "RSS" && items.length === 0) {
    fail("EMPTY_SOURCE", "La fuente oficial no contiene entradas.");
  }
  const sorted = [...items].sort((a, b) => a.key.localeCompare(b.key));
  const keys = new Set();
  for (const item of sorted) {
    if (keys.has(item.key)) fail("DUPLICATE_ITEM", "Clave oficial duplicada.");
    keys.add(item.key);
  }
  return {
    schemaVersion: SNAPSHOT_SCHEMA,
    sourceId: source.id,
    mode: source.mode,
    fetchedAt: fetched.fetchedAt,
    itemCount: sorted.length,
    semanticHash: sha256(canonicalJson(sorted.map(({ key, digest }) => [key, digest]))),
    items: sorted,
    complete: true,
    emptyPublication: fetched.emptyPublication,
  };
}

function validPreviousState(
  previous,
  source,
  catalogVersion,
  parserContractVersion,
) {
  return (
    previous &&
    previous.schemaVersion === STATE_SCHEMA &&
    previous.sourceId === source.id &&
    previous.mode === source.mode &&
    previous.catalogVersion === catalogVersion &&
    previous.parserContractVersion === parserContractVersion &&
    previous.snapshot &&
    typeof previous.snapshot.semanticHash === "string"
  );
}

function compactSnapshot(snapshot, maxTrackedItems, previous) {
  if (
    snapshot.itemCount > maxTrackedItems ||
    previous?.snapshot?.tracking === "AGGREGATE"
  ) {
    return {
      semanticHash: snapshot.semanticHash,
      itemCount: snapshot.itemCount,
      tracking: "AGGREGATE",
      items: [],
    };
  }
  return {
    semanticHash: snapshot.semanticHash,
    itemCount: snapshot.itemCount,
    tracking: "ITEMS",
    items: snapshot.items.map((item) => ({ ...item, missingChecks: 0 })),
  };
}

export function compareSourceSnapshots(
  source,
  previous,
  snapshot,
  {
    maxTrackedItems = 500,
    baselineAccepted = false,
    hasOpenReview = false,
    catalogVersion = "test-catalog.v1",
    parserContractVersion = "test-parser.v1",
  } = {},
) {
  const checkedAt = snapshot.fetchedAt;
  if (
    !validPreviousState(
      previous,
      source,
      catalogVersion,
      parserContractVersion,
    )
  ) {
    return {
      state: {
        schemaVersion: STATE_SCHEMA,
        sourceId: source.id,
        mode: source.mode,
        catalogVersion,
        parserContractVersion,
        status: "BASELINE_REVIEW_REQUIRED",
        initializedAt: checkedAt,
        lastCheckedAt: checkedAt,
        lastSuccessAt: checkedAt,
        snapshot: compactSnapshot(snapshot, maxTrackedItems, null),
      },
      changes: [],
    };
  }

  const changes = [];
  let nextSnapshot;
  const unchanged = previous.snapshot.semanticHash === snapshot.semanticHash;
  if (previous.snapshot.tracking === "AGGREGATE" || snapshot.itemCount > maxTrackedItems) {
    nextSnapshot = compactSnapshot(snapshot, maxTrackedItems, previous);
    if (!unchanged) {
      changes.push({
        type: "SOURCE_CONTENT_CHANGED",
        key: source.id,
        title: source.label,
        officialUrl: source.officialPageUrl,
        officialUrlKind: "page",
        beforeDigest: previous.snapshot.semanticHash,
        afterDigest: snapshot.semanticHash,
      });
    }
  } else {
    const oldByKey = new Map(previous.snapshot.items.map((item) => [item.key, item]));
    const currentByKey = new Map(snapshot.items.map((item) => [item.key, item]));
    const tracked = [];
    for (const current of snapshot.items) {
      const old = oldByKey.get(current.key);
      if (!old) {
        changes.push({
          type: "ADDED",
          key: current.key,
          title: current.title,
          officialUrl: current.officialUrl,
          beforeDigest: null,
          afterDigest: current.digest,
          before: null,
          after: itemEvidence(current),
        });
      } else if (old.digest !== current.digest) {
        changes.push({
          type: "CONTENT_CHANGED",
          key: current.key,
          title: current.title,
          officialUrl: current.officialUrl,
          beforeDigest: old.digest,
          afterDigest: current.digest,
          before: itemEvidence(old),
          after: itemEvidence(current),
        });
      } else if ((old.missingChecks ?? 0) > 0) {
        changes.push({
          type: "REAPPEARED",
          key: current.key,
          title: current.title,
          officialUrl: current.officialUrl,
          beforeDigest: old.digest,
          afterDigest: current.digest,
          before: itemEvidence(old),
          after: itemEvidence(current),
        });
      }
      tracked.push({ ...current, missingChecks: 0 });
    }
    if (source.mode === "FUTURE_SNAPSHOT") {
      const today = madridDateOnly(new Date(snapshot.fetchedAt));
      for (const old of previous.snapshot.items) {
        if (currentByKey.has(old.key)) continue;
        if (old.effectiveDate && old.effectiveDate < today) continue;
        const missingChecks = Math.min(2, (old.missingChecks ?? 0) + 1);
        tracked.push({ ...old, missingChecks });
        if (missingChecks === 2 && (old.missingChecks ?? 0) < 2) {
          changes.push({
            type: "NO_LONGER_PRESENT",
            key: old.key,
            title: old.title,
            officialUrl: old.officialUrl,
            beforeDigest: old.digest,
            afterDigest: null,
            before: itemEvidence(old),
            after: null,
          });
        }
      }
    }
    if (tracked.length > maxTrackedItems) {
      nextSnapshot = {
        semanticHash: snapshot.semanticHash,
        itemCount: snapshot.itemCount,
        tracking: "AGGREGATE",
        items: [],
      };
      if (changes.length === 0 && !unchanged) {
        changes.push({
          type: "SOURCE_CONTENT_CHANGED",
          key: source.id,
          title: source.label,
          officialUrl: source.officialPageUrl,
          officialUrlKind: "page",
          beforeDigest: previous.snapshot.semanticHash,
          afterDigest: snapshot.semanticHash,
        });
      }
    } else {
      nextSnapshot = {
        semanticHash: snapshot.semanticHash,
        itemCount: snapshot.itemCount,
        tracking: "ITEMS",
        items: tracked.sort((a, b) => a.key.localeCompare(b.key)),
      };
    }
  }

  const status =
    changes.length > 0 || hasOpenReview
      ? "PENDING_REVIEW"
      : previous.status === "BASELINE_REVIEW_REQUIRED" && !baselineAccepted
        ? "BASELINE_REVIEW_REQUIRED"
        : "HEALTHY";
  return {
    state: {
      schemaVersion: STATE_SCHEMA,
      sourceId: source.id,
      mode: source.mode,
      catalogVersion,
      parserContractVersion,
      status,
      initializedAt: previous.initializedAt,
      lastCheckedAt: checkedAt,
      lastSuccessAt: checkedAt,
      snapshot: nextSnapshot,
    },
    changes,
  };
}

function degradedState(source, previous, checkedAt, error, catalog) {
  const compatiblePrevious = validPreviousState(
    previous,
    source,
    catalog.catalogVersion,
    catalog.parserContractVersion,
  )
    ? previous
    : null;
  return {
    schemaVersion: STATE_SCHEMA,
    sourceId: source.id,
    mode: source.mode,
    catalogVersion: catalog.catalogVersion,
    parserContractVersion: catalog.parserContractVersion,
    status: "DEGRADED",
    initializedAt: compatiblePrevious?.initializedAt ?? checkedAt,
    lastCheckedAt: checkedAt,
    lastSuccessAt: compatiblePrevious?.lastSuccessAt ?? null,
    snapshot: compatiblePrevious?.snapshot ?? null,
    failure: { code: error instanceof FiscalWatchError ? error.code : "UNEXPECTED_FAILURE" },
  };
}

function boeBackfillDates(nowValue, lastSuccessAt = null) {
  const today = madridDateOnly(nowValue);
  const boundedStart = addDateOnlyDays(today, -6);
  let start = boundedStart;
  if (validPreviousInstant(lastSuccessAt)) {
    const recoveryStart = addDateOnlyDays(
      madridDateOnly(new Date(lastSuccessAt)),
      -1,
    );
    if (recoveryStart > start) start = recoveryStart;
  }
  if (start > today) start = today;
  const dates = [];
  for (let value = start; value <= today; value = addDateOnlyDays(value, 1)) {
    dates.push(value);
  }
  return dates;
}

function validPreviousInstant(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

async function fetchSnapshotForRun(
  source,
  previous,
  catalog,
  { fetchImpl, nowValue, checkedAt },
) {
  if (source.id !== "boe-daily-summary-api") {
    const fetched = await fetchOfficialSource(source, catalog.limits, {
      fetchImpl,
      now: () => nowValue,
    });
    return parseSourceSnapshot(source, fetched, catalog.limits);
  }
  const byKey = new Map();
  for (const dateOnly of boeBackfillDates(nowValue, previous?.lastSuccessAt ?? null)) {
    const sourceUrl = source.urlTemplate.replace("{date}", dateOnly.replaceAll("-", ""));
    const fetched = await fetchOfficialSource(source, catalog.limits, {
      fetchImpl,
      now: () => nowValue,
      sourceUrl,
    });
    const daily = parseSourceSnapshot(source, fetched, catalog.limits);
    for (const item of daily.items) {
      const existing = byKey.get(item.key);
      if (existing && existing.digest !== item.digest) {
        fail("DUPLICATE_ITEM", "Una publicación BOE cambió dentro del backfill.");
      }
      byKey.set(item.key, item);
    }
  }
  const items = [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));
  return {
    schemaVersion: SNAPSHOT_SCHEMA,
    sourceId: source.id,
    mode: source.mode,
    fetchedAt: checkedAt,
    itemCount: items.length,
    semanticHash: sha256(canonicalJson(items.map(({ key, digest }) => [key, digest]))),
    items,
    complete: true,
    emptyPublication: items.length === 0,
  };
}

export async function runFiscalWatch({
  catalog,
  previousStates = new Map(),
  baselineAcceptedSourceIds = new Set(),
  openReviewSourceIds = new Set(),
  fetchImpl = fetch,
  now = () => new Date(),
} = {}) {
  const nowValue = now();
  const checkedAt = nowValue.toISOString();
  const results = [];
  for (const source of catalog.sources) {
    const previous = previousStates.get(source.id) ?? null;
    const compatiblePrevious = validPreviousState(
      previous,
      source,
      catalog.catalogVersion,
      catalog.parserContractVersion,
    )
      ? previous
      : null;
    try {
      const snapshot = await fetchSnapshotForRun(source, compatiblePrevious, catalog, {
        fetchImpl,
        nowValue,
        checkedAt,
      });
      const compared = compareSourceSnapshots(source, compatiblePrevious, snapshot, {
        maxTrackedItems: catalog.limits.maxTrackedItems,
        baselineAccepted: baselineAcceptedSourceIds.has(source.id),
        hasOpenReview: openReviewSourceIds.has(source.id),
        catalogVersion: catalog.catalogVersion,
        parserContractVersion: catalog.parserContractVersion,
      });
      results.push({
        sourceId: source.id,
        label: source.label,
        authority: source.authority,
        officialPageUrl: source.officialPageUrl,
        ok: true,
        status: compared.state.status,
        itemCount: snapshot.itemCount,
        state: compared.state,
        changes: compared.changes,
      });
    } catch (error) {
      const state = degradedState(source, compatiblePrevious, checkedAt, error, catalog);
      results.push({
        sourceId: source.id,
        label: source.label,
        authority: source.authority,
        officialPageUrl: source.officialPageUrl,
        ok: false,
        status: "DEGRADED",
        itemCount: previous?.snapshot?.itemCount ?? 0,
        state,
        changes: [],
        failureCode: state.failure.code,
      });
    }
  }
  const degradedCount = results.filter((result) => !result.ok).length;
  const changeCount = results.reduce((total, result) => total + result.changes.length, 0);
  const hasPendingReview = results.some((result) => result.status === "PENDING_REVIEW");
  const hasBaselineReview = results.some(
    (result) => result.status === "BASELINE_REVIEW_REQUIRED",
  );
  return {
    schemaVersion: "fiscal-watch-run.v1",
    catalogVersion: catalog.catalogVersion,
    parserContractVersion: catalog.parserContractVersion,
    checkedAt,
    status:
      degradedCount > 0
        ? "DEGRADED"
        : changeCount > 0 || hasPendingReview
          ? "PENDING_REVIEW"
          : hasBaselineReview
            ? "BASELINE_REVIEW_REQUIRED"
            : "HEALTHY",
    degradedCount,
    changeCount,
    sourceCount: results.length,
    results,
  };
}

export const __test = Object.freeze({
  canonicalJson,
  decodeEntities,
  resolveSourceUrl,
  boeBackfillDates,
  sha256,
});
