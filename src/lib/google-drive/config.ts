export function getGoogleDriveClientId(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    ""
  );
}

export function isGoogleDriveBackupEnabled(): boolean {
  return Boolean(getGoogleDriveClientId());
}
