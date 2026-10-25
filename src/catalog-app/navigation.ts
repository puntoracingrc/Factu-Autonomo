export interface CatalogLocation {
  view: "products" | "families";
  query: string;
  family: string;
  subfamily: string;
  browseFamily: string;
  familyQuery: string;
  familyLimit: number;
  scrollY: number;
}

// Memory only: a company/session change discards the complete navigation trail.
export class CatalogBackStack<T extends CatalogLocation> {
  private pages: T[] = [];

  get available(): boolean {
    return this.pages.length > 0;
  }

  push(page: T): void {
    this.pages.push(page);
    if (this.pages.length > 50) this.pages.shift();
  }

  pop(): T | undefined {
    return this.pages.pop();
  }

  reset(): void {
    this.pages = [];
  }
}
