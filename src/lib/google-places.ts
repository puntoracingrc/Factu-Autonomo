import type { GooglePlacesSettings } from "./types";

export const GOOGLE_PLACES_ADDRESS_FILL_CREDIT_COST = 1;

export interface GooglePlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GooglePlaceAddressSuggestion {
  address: string;
  postalCode: string;
  city: string;
  province?: string;
  country?: string;
  formattedAddress?: string;
}

export function normalizeGooglePlacesSettings(
  settings?: Partial<GooglePlacesSettings>,
): GooglePlacesSettings {
  return {
    enabled: Boolean(settings?.enabled),
  };
}

function findComponent(
  components: GooglePlaceAddressComponent[],
  type: string,
): GooglePlaceAddressComponent | undefined {
  return components.find((component) => component.types.includes(type));
}

function componentLongName(
  components: GooglePlaceAddressComponent[],
  type: string,
): string {
  return findComponent(components, type)?.long_name.trim() ?? "";
}

function fallbackAddress(formattedAddress: string): string {
  return formattedAddress
    .split(",")
    .slice(0, 2)
    .join(",")
    .trim();
}

export function parseGooglePlaceAddress(
  components: GooglePlaceAddressComponent[] = [],
  formattedAddress = "",
): GooglePlaceAddressSuggestion {
  const route = componentLongName(components, "route");
  const streetNumber = componentLongName(components, "street_number");
  const postalCode = componentLongName(components, "postal_code");
  const city =
    componentLongName(components, "locality") ||
    componentLongName(components, "postal_town") ||
    componentLongName(components, "administrative_area_level_2") ||
    componentLongName(components, "administrative_area_level_1");
  const province =
    componentLongName(components, "administrative_area_level_2") ||
    componentLongName(components, "administrative_area_level_1");
  const country = componentLongName(components, "country");
  const address = [route, streetNumber].filter(Boolean).join(", ");

  return {
    address: address || fallbackAddress(formattedAddress),
    postalCode,
    city,
    province: province || undefined,
    country: country || undefined,
    formattedAddress: formattedAddress.trim() || undefined,
  };
}
