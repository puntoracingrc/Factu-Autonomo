export function getGoogleAuthClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

