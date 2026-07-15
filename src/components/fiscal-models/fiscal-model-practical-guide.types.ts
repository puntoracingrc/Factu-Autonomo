export type FiscalModelGuideInternalHrefV1 =
  | "/consultor-fiscal/modelos"
  | "/consultor-fiscal/modelos/01"
  | "/consultor-fiscal/modelos/030"
  | "/consultor-fiscal/modelos/035"
  | "/consultor-fiscal/modelos/036"
  | "/consultor-fiscal/modelos/037"
  | "/consultor-fiscal/modelos/04"
  | "/consultor-fiscal/modelos/05"
  | "/consultor-fiscal/modelos/06"
  | "/consultor-fiscal/modelos/100"
  | "/consultor-fiscal/modelos/111"
  | "/consultor-fiscal/modelos/115"
  | "/consultor-fiscal/modelos/117"
  | "/consultor-fiscal/modelos/121"
  | "/consultor-fiscal/modelos/122"
  | "/consultor-fiscal/modelos/123"
  | "/consultor-fiscal/modelos/124"
  | "/consultor-fiscal/modelos/126"
  | "/consultor-fiscal/modelos/128"
  | "/consultor-fiscal/modelos/130"
  | "/consultor-fiscal/modelos/131"
  | "/consultor-fiscal/modelos/140"
  | "/consultor-fiscal/modelos/143"
  | "/consultor-fiscal/modelos/172"
  | "/consultor-fiscal/modelos/173"
  | "/consultor-fiscal/modelos/180"
  | "/consultor-fiscal/modelos/184"
  | "/consultor-fiscal/modelos/189"
  | "/consultor-fiscal/modelos/190"
  | "/consultor-fiscal/modelos/193"
  | "/consultor-fiscal/modelos/194"
  | "/consultor-fiscal/modelos/196"
  | "/consultor-fiscal/modelos/200"
  | "/consultor-fiscal/modelos/202"
  | "/consultor-fiscal/modelos/210"
  | "/consultor-fiscal/modelos/211"
  | "/consultor-fiscal/modelos/216"
  | "/consultor-fiscal/modelos/232"
  | "/consultor-fiscal/modelos/233"
  | "/consultor-fiscal/modelos/296"
  | "/consultor-fiscal/modelos/303"
  | "/consultor-fiscal/modelos/308"
  | "/consultor-fiscal/modelos/347"
  | "/consultor-fiscal/modelos/309"
  | "/consultor-fiscal/modelos/341"
  | "/consultor-fiscal/modelos/349"
  | "/consultor-fiscal/modelos/360"
  | "/consultor-fiscal/modelos/361"
  | "/consultor-fiscal/modelos/369"
  | "/consultor-fiscal/modelos/390"
  | "/consultor-fiscal/modelos/576"
  | "/consultor-fiscal/modelos/714"
  | "/consultor-fiscal/modelos/718"
  | "/consultor-fiscal/modelos/720"
  | "/consultor-fiscal/modelos/721"
  | "/consultor-fiscal/modelos/840"
  | "/consultor-fiscal/modelos/848";

export interface FiscalModelPracticalGuideV1 {
  readonly code:
    | "01C"
    | "030"
    | "035"
    | "036"
    | "037"
    | "04"
    | "05"
    | "06"
    | "100"
    | "111"
    | "115"
    | "121"
    | "122"
    | "123"
    | "130"
    | "131"
    | "140"
    | "143"
    | "145"
    | "180"
    | "184"
    | "190"
    | "193"
    | "200"
    | "202"
    | "216"
    | "232"
    | "296"
    | "303"
    | "308"
    | "309"
    | "341"
    | "347"
    | "349"
    | "360"
    | "361"
    | "369"
    | "390"
    | "714"
    | "718"
    | "720"
    | "721"
    | "840";
  readonly effectiveYear?: number;
  readonly taxPeriodYear?: number;
  readonly filingYear?: number;
  readonly lastVerifiedAt?: string;
  readonly requiresAnnualReview?: boolean;
  readonly externalActionNotice?: string;
  readonly intro: readonly string[];
  readonly notices: readonly {
    readonly title: string;
    readonly paragraphs: readonly string[];
  }[];
  readonly actions: readonly {
    readonly label: string;
    readonly sourceId?: string;
    readonly href?: string;
    readonly internalHref?: FiscalModelGuideInternalHrefV1;
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
      readonly links?: readonly {
        readonly label: string;
        readonly href: FiscalModelGuideInternalHrefV1;
      }[];
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
      readonly href: FiscalModelGuideInternalHrefV1;
      readonly label: string;
    };
    readonly additional?: readonly {
      readonly title: string;
      readonly description: string;
      readonly href: FiscalModelGuideInternalHrefV1;
      readonly label: string;
    }[];
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
  readonly actionGroups?: readonly {
    readonly title: string;
    readonly description?: string;
    readonly links: readonly {
      readonly label: string;
      readonly sourceId?: string;
      readonly href?: string;
    }[];
  }[];
  readonly legalLinks: readonly {
    readonly label: string;
    readonly sourceId?: string;
    readonly href?: string;
  }[];
  readonly faq: readonly {
    readonly question: string;
    readonly answer: string;
  }[];
  readonly sourceIds: readonly string[];
}
