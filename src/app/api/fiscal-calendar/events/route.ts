import { NextResponse } from "next/server";
import {
  AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE,
  FISCAL_CALENDAR_TIME_ZONE,
  fiscalCalendarCategoryOptions,
  parseFiscalCalendarCategories,
} from "@/lib/fiscal-calendar/catalog";
import { resolveFiscalCalendarConfig } from "@/lib/fiscal-calendar/config";
import { createFiscalCalendarDateRange } from "@/lib/fiscal-calendar/dates";
import {
  FiscalCalendarProviderError,
  FiscalCalendarValidationError,
} from "@/lib/fiscal-calendar/errors";
import { getFiscalCalendarService } from "@/lib/fiscal-calendar/service";
import type { FiscalCalendarResponseData } from "@/lib/fiscal-calendar/types";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function json(body: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(body, init);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function queryFromRequest(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("calendarId")) {
    throw new FiscalCalendarValidationError(
      "No se admiten identificadores de calendario externos.",
    );
  }
  const startDate = url.searchParams.get("from")?.trim() ?? "";
  const endDateInclusive = url.searchParams.get("to")?.trim() ?? "";
  if (!startDate || !endDateInclusive) {
    throw new FiscalCalendarValidationError(
      "Indica las fechas inicial y final del calendario.",
    );
  }

  const rawCategories = url.searchParams
    .getAll("categories")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    range: createFiscalCalendarDateRange(startDate, endDateInclusive),
    categories: parseFiscalCalendarCategories(rawCategories),
  };
}

function providerFailureResponse(error: FiscalCalendarProviderError) {
  const status = error.code === "FORBIDDEN" ? 502 : 503;
  const response = json(
    {
      error:
        "No se pudo consultar ahora el calendario de la Agencia Tributaria. Inténtalo de nuevo en unos instantes.",
      retryable: error.retryable,
    },
    { status },
  );
  if (error.retryable) response.headers.set("Retry-After", "30");
  return response;
}

export async function GET(request: Request) {
  const config = resolveFiscalCalendarConfig();
  if (!config.enabled) {
    return json({ error: "El calendario fiscal no está disponible." }, { status: 404 });
  }

  const rateLimit = await checkRateLimit(request, {
    namespace: "fiscal_calendar_events",
    limit: 120,
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) {
    const response = rateLimitExceededResponse(rateLimit);
    for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  }

  try {
    const { range, categories } = queryFromRequest(request);
    const result = await getFiscalCalendarService(config).listEvents(
      range,
      categories,
    );
    const data: FiscalCalendarResponseData = {
      ...result,
      categories: fiscalCalendarCategoryOptions(),
      officialSource: AEAT_FISCAL_CALENDAR_OFFICIAL_SOURCE,
      timeZone: FISCAL_CALENDAR_TIME_ZONE,
      generalInformationOnly: true,
      modelPageLinks: [],
    };
    return json({ data });
  } catch (error) {
    if (error instanceof FiscalCalendarValidationError) {
      return json({ error: error.message }, { status: 400 });
    }
    if (error instanceof FiscalCalendarProviderError) {
      return providerFailureResponse(error);
    }
    return json(
      {
        error:
          "No se pudo cargar el calendario fiscal. Inténtalo de nuevo.",
        retryable: true,
      },
      { status: 500 },
    );
  }
}
