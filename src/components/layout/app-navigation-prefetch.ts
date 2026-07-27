export const APP_NAVIGATION_PREFETCH_DELAY_MS = 90;

export const APP_NAVIGATION_PREFETCH_HREFS = [
  "/",
  "/clientes",
  "/presupuestos",
  "/facturas",
  "/recibos",
  "/gastos",
  "/proveedores",
  "/productos",
  "/rentabilidad-real",
] as const;

type NavigationConnectionInfo = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NavigationConnectionInfo;
  mozConnection?: NavigationConnectionInfo;
  webkitConnection?: NavigationConnectionInfo;
};

const prefetchHrefSet = new Set<string>(APP_NAVIGATION_PREFETCH_HREFS);

export function getNavigationConnectionInfo(
  navigatorLike: Navigator,
): NavigationConnectionInfo | undefined {
  const connectionNavigator = navigatorLike as NavigatorWithConnection;
  return (
    connectionNavigator.connection ??
    connectionNavigator.mozConnection ??
    connectionNavigator.webkitConnection
  );
}

export function canPrefetchForNavigationConnection(
  connection?: NavigationConnectionInfo,
): boolean {
  const effectiveType = connection?.effectiveType?.toLowerCase();
  return !(
    connection?.saveData ||
    effectiveType === "slow-2g" ||
    effectiveType === "2g"
  );
}

export function shouldPrefetchAppNavigationHref(
  href: string,
  currentPathname: string,
  connection?: NavigationConnectionInfo,
): boolean {
  if (href === currentPathname) return false;
  if (!prefetchHrefSet.has(href)) return false;
  return canPrefetchForNavigationConnection(connection);
}
