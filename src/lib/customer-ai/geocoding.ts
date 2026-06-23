import { getStreetType } from "../customer-address";
import type { CustomerTextExtractPayload } from "./schema";

interface PostalCodeLookupInput {
  streetType?: string | null;
  address?: string | null;
  city?: string | null;
}

interface GoogleGeocodeResponse {
  status?: string;
  error_message?: string;
  results?: Array<{
    partial_match?: boolean;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

type FetchLike = typeof fetch;

function clean(value?: string | null): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function geocodingApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_GEOCODING_API_KEY?.trim() ||
    null
  );
}

function buildAddressQuery(input: PostalCodeLookupInput): string | null {
  const address = clean(input.address);
  const city = clean(input.city);
  if (!address || !city) return null;

  const streetType = getStreetType(input.streetType)?.label;
  return [streetType, address, city, "España"].filter(Boolean).join(", ");
}

function componentValue(
  components: NonNullable<GoogleGeocodeResponse["results"]>[number]["address_components"],
  type: string,
): string | null {
  return (
    components?.find((component) => component.types.includes(type))?.long_name ??
    null
  );
}

function extractPostalCode(
  result: NonNullable<GoogleGeocodeResponse["results"]>[number],
  city: string,
): string | null {
  const components = result.address_components ?? [];
  const postalCode = componentValue(components, "postal_code");
  if (!postalCode || !/^\d{5}$/.test(postalCode)) return null;

  const country = componentValue(components, "country");
  if (country && !["espana", "spain"].includes(normalizeForCompare(country))) {
    return null;
  }

  const expectedCity = normalizeForCompare(city);
  const localityCandidates = [
    componentValue(components, "locality"),
    componentValue(components, "postal_town"),
    componentValue(components, "administrative_area_level_2"),
    componentValue(components, "administrative_area_level_3"),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeForCompare);

  const cityMatches = localityCandidates.some(
    (candidate) =>
      candidate === expectedCity ||
      candidate.includes(expectedCity) ||
      expectedCity.includes(candidate),
  );

  if (localityCandidates.length > 0 && !cityMatches) return null;
  if (!cityMatches && result.partial_match) return null;
  return postalCode;
}

export async function lookupPostalCodeFromAddress(
  input: PostalCodeLookupInput,
  options: { apiKey?: string | null; fetchImpl?: FetchLike } = {},
): Promise<string | null> {
  const apiKey = options.apiKey ?? geocodingApiKey();
  if (!apiKey) return null;

  const query = buildAddressQuery(input);
  if (!query) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("region", "es");
  url.searchParams.set("language", "es");
  url.searchParams.set("components", "country:ES");
  url.searchParams.set("key", apiKey);

  const fetchImpl = options.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(2500) });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const body = (await response.json().catch(() => null)) as
    | GoogleGeocodeResponse
    | null;
  if (!body || body.status !== "OK" || !body.results?.length) return null;

  for (const result of body.results.slice(0, 3)) {
    const postalCode = extractPostalCode(result, clean(input.city));
    if (postalCode) return postalCode;
  }

  return null;
}

export async function enrichCustomerPostalCode(
  payload: CustomerTextExtractPayload,
): Promise<CustomerTextExtractPayload> {
  if (payload.customer.postalCode) return payload;

  const postalCode = await lookupPostalCodeFromAddress({
    streetType: payload.customer.streetType,
    address: payload.customer.address,
    city: payload.customer.city,
  });

  if (!postalCode) return payload;

  return {
    ...payload,
    customer: {
      ...payload.customer,
      postalCode,
    },
    warnings: [
      ...payload.warnings,
      "Código postal localizado a partir de la dirección. Revísalo antes de guardar.",
    ],
  };
}
