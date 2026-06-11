export interface ManualScreenshot {
  /** Ruta en `public/`, p. ej. `/ayuda/capturas/facturas-listado.png` */
  src: string;
  alt: string;
  caption?: string;
}

export interface ManualStep {
  title: string;
  paragraphs: string[];
  screenshot?: ManualScreenshot;
  tip?: string;
}

export interface ManualSection {
  slug: string;
  title: string;
  summary: string;
  order: number;
  intro?: string[];
  steps: ManualStep[];
}
