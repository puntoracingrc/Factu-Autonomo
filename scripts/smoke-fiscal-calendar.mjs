const enabled = process.env.FISCAL_CALENDAR_ENABLED === "true";
const liveTest = process.env.FISCAL_CALENDAR_LIVE_TEST === "true";
const hasApiKey = Boolean(process.env.GOOGLE_CALENDAR_API_KEY?.trim());

if (!enabled || !liveTest || !hasApiKey) {
  console.log(
    "Smoke AEAT omitido: requiere FISCAL_CALENDAR_ENABLED=true, GOOGLE_CALENDAR_API_KEY y FISCAL_CALENDAR_LIVE_TEST=true.",
  );
  process.exit(0);
}

function madridDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addUtcDays(dateOnly, days) {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return [
    result.getUTCFullYear().toString().padStart(4, "0"),
    (result.getUTCMonth() + 1).toString().padStart(2, "0"),
    result.getUTCDate().toString().padStart(2, "0"),
  ].join("-");
}

const from = madridDate();
const to = addUtcDays(from, 365);
const parameters = new URLSearchParams({ from, to, categories: "iva" });
const response = await fetch(
  `http://localhost:3000/api/fiscal-calendar/events?${parameters}`,
  {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  },
);

if (!response.ok) {
  throw new Error(`El smoke local del calendario devolvió HTTP ${response.status}.`);
}

const body = await response.json();
if (body?.data?.providerMode !== "google-calendar") {
  throw new Error("El smoke no utilizó Google Calendar como proveedor.");
}
if (!Array.isArray(body?.data?.events)) {
  throw new Error("El smoke no devolvió la colección de eventos esperada.");
}
if (body.data.events.some((event) => event?.category !== "iva")) {
  throw new Error("El smoke devolvió una categoría distinta de IVA.");
}

console.log(
  `Smoke AEAT IVA correcto: ${body.data.events.length} eventos, consulta ${body.data.fetchedAt}.`,
);
