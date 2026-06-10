export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getEmailFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim();
  if (explicit) return explicit;

  const address =
    process.env.EMAIL_FROM_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_VERIFACTU_DEVELOPER_EMAIL?.trim() ||
    "hola@tudominio.com";
  const name =
    process.env.EMAIL_FROM_NAME?.trim() || "Factu - Facturación Autónomos";

  return `${name} <${address}>`;
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://factu-autonomo.vercel.app"
  );
}
