export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

const DEFAULT_EMAIL_FROM_ADDRESS = "hola@mail.facturacion-autonomos.app";
const DEFAULT_EMAIL_FROM_NAME = "Factu - Facturación Autónomos";

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim());
}

function isValidFromValue(value: string): boolean {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return isValidEmailAddress(match?.[1] ?? trimmed);
}

function formatFromAddress(name: string, address: string): string {
  return `${name.trim() || DEFAULT_EMAIL_FROM_NAME} <${address}>`;
}

function validEmailDomain(value: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(
    value,
  );
}

export function getEmailFromAddressForDomain(domain: string): string {
  const normalized = domain.trim().toLowerCase().replace(/\.+$/g, "");
  if (!validEmailDomain(normalized)) {
    return formatFromAddress(DEFAULT_EMAIL_FROM_NAME, DEFAULT_EMAIL_FROM_ADDRESS);
  }
  return formatFromAddress(DEFAULT_EMAIL_FROM_NAME, `hola@${normalized}`);
}

export function getEmailFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit && isValidFromValue(explicit)) return explicit;

  const addressCandidates = [
    process.env.EMAIL_FROM_ADDRESS?.trim(),
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL?.trim(),
    DEFAULT_EMAIL_FROM_ADDRESS,
  ];
  const address =
    addressCandidates.find(
      (candidate): candidate is string =>
        Boolean(candidate && isValidEmailAddress(candidate)),
    ) ?? DEFAULT_EMAIL_FROM_ADDRESS;
  const name = process.env.EMAIL_FROM_NAME?.trim() || DEFAULT_EMAIL_FROM_NAME;

  return formatFromAddress(name, address);
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://facturacion-autonomos.app"
  );
}
