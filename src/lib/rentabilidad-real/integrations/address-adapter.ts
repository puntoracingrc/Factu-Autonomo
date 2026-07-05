import type { BusinessProfile, Customer, Supplier } from "@/lib/types";
import type { ProfitabilityAddressSource } from "./types";

export function mapExistingCustomerAddressToProfitabilityLocation(
  customer: Customer,
): ProfitabilityAddressSource | null {
  if (!customer.address && !customer.city && !customer.postalCode) return null;

  return {
    sourceType: "customer",
    sourceId: customer.id,
    label: customer.name,
    address: customer.address,
    city: customer.city,
    postalCode: customer.postalCode,
    sourceLink: {
      sourceType: "customer",
      sourceId: customer.id,
      label: `Cliente ${customer.name}`,
      href: "/clientes",
    },
  };
}

export function mapExistingSupplierAddressToProfitabilityLocation(
  supplier: Supplier,
): ProfitabilityAddressSource | null {
  if (!supplier.address && !supplier.city && !supplier.postalCode) return null;

  return {
    sourceType: "supplier",
    sourceId: supplier.id,
    label: supplier.name,
    address: supplier.address,
    city: supplier.city,
    postalCode: supplier.postalCode,
    sourceLink: {
      sourceType: "supplier",
      sourceId: supplier.id,
      label: `Proveedor ${supplier.name}`,
      href: "/proveedores",
    },
  };
}

export function mapExistingProfileAddressToProfitabilityLocation(
  profile: BusinessProfile,
): ProfitabilityAddressSource | null {
  if (!profile.address && !profile.city && !profile.postalCode) return null;

  return {
    sourceType: "profile",
    label: profile.commercialName || profile.name || "Perfil fiscal",
    address: profile.address,
    city: profile.city,
    postalCode: profile.postalCode,
    sourceLink: {
      sourceType: "profile",
      label: "Perfil fiscal",
      href: "/configuracion",
    },
  };
}
