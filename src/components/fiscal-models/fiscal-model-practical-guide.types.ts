export interface FiscalModelPracticalGuideV1 {
  readonly code: "01C" | "04";
  readonly intro: readonly string[];
  readonly notices: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
  }[];
  readonly actions: readonly {
    readonly label: string;
    readonly sourceId?: string;
    readonly href?: string;
    readonly primary?: boolean;
  }[];
  readonly quickSummaryTitle: string;
  readonly quickFacts: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly sections: readonly {
    readonly id: string;
    readonly title: string;
    readonly intro?: readonly string[];
    readonly cards?: readonly {
      readonly title: string;
      readonly paragraphs?: readonly string[];
      readonly bullets?: readonly string[];
    }[];
    readonly note?: string;
    readonly accordions?: readonly {
      readonly question: string;
      readonly paragraphs: readonly string[];
      readonly bullets?: readonly string[];
    }[];
  }[];
  readonly fillingTitle: string;
  readonly fillingSteps: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
    readonly bullets?: readonly string[];
  }[];
  readonly afterTitle: string;
  readonly afterSteps: readonly {
    readonly title: string;
    readonly description: string;
  }[];
  readonly comparison: {
    readonly title: string;
    readonly current: { readonly title: string; readonly description: string };
    readonly related: {
      readonly title: string;
      readonly description: string;
      readonly href:
        "/consultor-fiscal/modelos/01" | "/consultor-fiscal/modelos/05";
      readonly label: string;
    };
    readonly conclusion: string;
  };
  readonly pdfNotice: readonly string[];
  readonly documents: readonly {
    readonly label: string;
    readonly sourceId: string;
  }[];
  readonly officialLinks: readonly {
    readonly label: string;
    readonly sourceId?: string;
    readonly href?: string;
  }[];
  readonly legalLinks: readonly {
    readonly label: string;
    readonly sourceId: string;
  }[];
  readonly faq: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
  readonly sourceIds: readonly string[];
}
