import type { CentralBusinessBootstrapCentralRow } from "./bootstrap-preview";

export const CENTRAL_BUSINESS_BOOTSTRAP_PAGE_SIZE = 1_000;
export const CENTRAL_BUSINESS_BOOTSTRAP_MAX_CENTRAL_ENTITIES = 5_000;

export interface CentralBusinessBootstrapPageRange {
  from: number;
  to: number;
}

export async function listAllCentralBusinessBootstrapEntities(input: {
  loadPage(
    range: CentralBusinessBootstrapPageRange,
  ): Promise<CentralBusinessBootstrapCentralRow[] | null>;
  pageSize?: number;
  maxEntities?: number;
}): Promise<CentralBusinessBootstrapCentralRow[] | null> {
  const pageSize =
    input.pageSize ?? CENTRAL_BUSINESS_BOOTSTRAP_PAGE_SIZE;
  const maxEntities =
    input.maxEntities ?? CENTRAL_BUSINESS_BOOTSTRAP_MAX_CENTRAL_ENTITIES;
  if (
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    !Number.isSafeInteger(maxEntities) ||
    maxEntities < 1
  ) {
    return null;
  }

  const entities: CentralBusinessBootstrapCentralRow[] = [];
  for (let from = 0; from <= maxEntities; from += pageSize) {
    const page = await input.loadPage({
      from,
      to: from + pageSize - 1,
    });
    if (page === null || page.length > pageSize) return null;
    entities.push(...page);
    if (entities.length > maxEntities) return null;
    if (page.length < pageSize) return entities;
  }

  return null;
}
