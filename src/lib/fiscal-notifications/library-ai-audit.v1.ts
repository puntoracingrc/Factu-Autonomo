import { containsInternalFiscalNotificationToken } from "./document-fact-observation.v1";
import type {
  FiscalNotificationDocumentLibraryLinkV1,
  FiscalNotificationDocumentLibraryViewModelV1,
} from "./structured-review-document-library.v1";

export const FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1 =
  "fiscal-notification-library-ai-audit.v1";
export const FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MODEL_V1 = "gpt-4o";
export const FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1 = 100;

export interface FiscalNotificationLibraryAiAuditFactV1 {
  readonly kind:
    "DATE" | "REFERENCE" | "PARTY" | "STATUS" | "DETAIL" | "OBLIGATION";
  readonly label: string;
  readonly value: string;
  readonly page: number;
}

export interface FiscalNotificationLibraryAiAuditInputV1 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1;
  readonly documents: readonly {
    readonly alias: string;
    readonly family: string;
    readonly type: string;
    readonly authority: string;
    readonly documentDate: string | null;
    readonly documentDateBasis: string | null;
    readonly pageCount: number;
    readonly reviewStatus: "PENDING" | "REVIEWED";
    readonly sourceFileAliases: readonly string[];
    readonly references: readonly {
      readonly label: string;
      readonly referenceAlias: string;
      readonly pages: readonly number[];
    }[];
    readonly facts: readonly FiscalNotificationLibraryAiAuditFactV1[];
    readonly amounts: readonly {
      readonly label: string;
      readonly amountCents: number;
      readonly currency: "EUR" | "UNKNOWN";
      readonly pages: readonly number[];
      readonly sourceReferenceAlias: string | null;
    }[];
    readonly installments: readonly {
      readonly label: string;
      readonly dueDate: string | null;
      readonly amountCents: number | null;
      readonly pages: readonly number[];
    }[];
    readonly explanation: {
      readonly whatItIs: string;
      readonly whyReceived: string;
      readonly result: string;
      readonly nextStep: string;
      readonly deadline: string;
    };
    readonly officialSources: readonly {
      readonly authority: "AEAT" | "BOE";
      readonly title: string;
    }[];
  }[];
  readonly relations: readonly {
    readonly alias: string;
    readonly sourceDocumentAlias: string;
    readonly targetDocumentAlias: string;
    readonly relationType: string;
    readonly label: string;
    readonly explanation: string;
    readonly status: "SUGGESTED" | "USER_CONFIRMED" | "SYSTEM_CONFIRMED_EXACT";
    readonly matches: readonly {
      readonly label: string;
      readonly referenceAlias: string;
      readonly sourcePages: readonly number[];
      readonly targetPages: readonly number[];
    }[];
  }[];
}

export interface FiscalNotificationLibraryAiAuditSessionSourceV1 {
  readonly key: string;
  readonly fileName: string;
  readonly documentIds: readonly string[];
}

export type FiscalNotificationLibraryAiAuditSeverityV1 =
  "HIGH" | "MEDIUM" | "LOW";

export interface FiscalNotificationLibraryAiAuditFindingV1 {
  readonly id: string;
  readonly severity: FiscalNotificationLibraryAiAuditSeverityV1;
  readonly scope: "DOCUMENT" | "RELATION" | "LIBRARY";
  readonly category:
    | "INTERNAL_CONSISTENCY"
    | "DATE_OR_REFERENCE"
    | "RELATION_EVIDENCE"
    | "EMPTY_OR_INCOMPLETE_CARD"
    | "INTERNAL_METADATA"
    | "OTHER";
  readonly documentAliases: readonly string[];
  readonly relationAliases: readonly string[];
  readonly title: string;
  readonly detail: string;
  readonly recommendation: string;
  readonly evidence: readonly {
    readonly label: string;
    readonly value: string;
    readonly pages: readonly number[];
  }[];
}

export interface FiscalNotificationLibraryAiAuditResultV1 {
  readonly schemaVersion: typeof FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1;
  readonly summary: string;
  readonly documentsReviewed: number;
  readonly relationsReviewed: number;
  readonly findings: readonly FiscalNotificationLibraryAiAuditFindingV1[];
}

const SENSITIVE_LABEL =
  /\b(?:nif|nie|cif|iban|cuenta bancaria|domicilio|direccion|dirección|telefono|teléfono|correo)\b/iu;
const SENSITIVE_VALUE =
  /\b(?:ES\d{22}|[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{8})\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu;
const PHONE_VALUE = /(?:\+?34[\s.-]*)?[6789]\d{2}(?:[\s.-]?\d{3}){2}/u;
const LABELED_PERSONAL_VALUE =
  /\b(?:nif|nie|cif|iban|cuenta bancaria|domicilio|direccion|dirección|telefono|teléfono|correo(?: electrónico)?)\s*[:\-]\s*[^.;\n]+/iu;
const STREET_ADDRESS_VALUE =
  /\b(?:c\/?|calle|avenida|avda\.?|plaza|paseo|carretera|camino)\s+[\p{L}\dºª.' -]{3,80}(?=[,.;\n]|$)/iu;
const LABELED_PERSON_NAME_VALUE =
  /\b(?:nombre(?: y apellidos)?|interesad[oa]|destinatari[oa]|obligad[oa](?: tributari[oa])?|deudor(?:a)?|pagador(?:a)?|representante)\s*[:\-]\s*[\p{L}'-]+(?:\s+[\p{L}'-]+){1,5}/iu;
const PROTECTED_REFERENCE_VALUES = new Set([
  "referencia protegida",
  "no indicada",
  "no identificado",
]);

export function projectFiscalNotificationLibraryAiAuditInputV1(
  viewModel: FiscalNotificationDocumentLibraryViewModelV1,
  sessionSources: readonly FiscalNotificationLibraryAiAuditSessionSourceV1[] = [],
): FiscalNotificationLibraryAiAuditInputV1 {
  if (viewModel.status === "BLOCKED") {
    throw new Error("La biblioteca de documentos no está disponible.");
  }
  if (viewModel.documents.length === 0) {
    throw new Error("No hay fichas guardadas para revisar.");
  }
  if (
    viewModel.documents.length >
    FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1
  ) {
    throw new Error(
      `La revisión admite hasta ${FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1} fichas por ejecución.`,
    );
  }

  const documentAliases = new Map(
    viewModel.documents.map((document, index) => [
      document.key,
      `DOC-${String(index + 1).padStart(3, "0")}`,
    ]),
  );
  const summaries = new Map(
    viewModel.groups.flatMap((group) =>
      group.summaries.map((summary) => [summary.key, summary] as const),
    ),
  );
  const referenceAliases = createReferenceAliases(viewModel);
  const partyAliases = createPartyAliases(viewModel);
  const aliasReplacements = createAuditAliasReplacements(
    viewModel,
    referenceAliases,
    partyAliases,
  );
  const sourceFileAliases = createSourceFileAliases(sessionSources);

  const documents = viewModel.documents.map((document) => {
    const summary = summaries.get(document.key);
    const facts = document.orderedFacts.flatMap(
      (fact): FiscalNotificationLibraryAiAuditFactV1[] => {
        if (fact.semantic === "PARTY") {
          const alias = partyAliases.get(partyIdentity(fact.value));
          const label = cleanStructuralLabel(fact.label, 180);
          return alias && label
            ? [
                Object.freeze({
                  kind: "PARTY" as const,
                  label,
                  value: alias,
                  page: fact.pageNumber,
                }),
              ]
            : [];
        }
        if (
          fact.semantic === "MASKED_VALUE" ||
          fact.semantic === "MONEY" ||
          !isSafeAuditText(fact.label)
        ) {
          return [];
        }
        if (fact.semantic === "REFERENCE") {
          const alias = referenceAliases.get(referenceIdentity(fact.value));
          return alias
            ? [
                Object.freeze({
                  kind: "REFERENCE" as const,
                  label: fact.label,
                  value: alias,
                  page: fact.pageNumber,
                }),
              ]
            : [];
        }
        if (!isSupportedFactKind(fact.semantic)) {
          return [];
        }
        const value = safeAuditContentText(
          fact.value,
          "Dato observado omitido para proteger la identidad.",
          600,
          aliasReplacements,
        );
        return [
          Object.freeze({
            kind: fact.semantic,
            label: fact.label,
            value,
            page: fact.pageNumber,
          }),
        ];
      },
    );

    return Object.freeze({
      alias: documentAliases.get(document.key)!,
      family: safeAuditText(summary?.familyLabel, "Documento fiscal", 180),
      type: safeAuditText(summary?.typeLabel, "Documento fiscal", 180),
      authority: safeAuditText(document.authority, "No identificado", 160),
      documentDate: document.documentDate,
      documentDateBasis: document.documentDateBasis
        ? safeAuditText(document.documentDateBasis, "Fecha documental", 80)
        : null,
      pageCount: document.pageCount,
      reviewStatus: document.reviewStatus,
      sourceFileAliases: Object.freeze(
        sourceFileAliases.get(document.key) ?? [],
      ),
      references: Object.freeze(
        document.references.flatMap((reference) => {
          const referenceAlias = referenceAliases.get(
            referenceIdentity(reference.value),
          );
          const label = cleanStructuralLabel(reference.label, 180);
          if (!referenceAlias || !label) return [];
          const pages = document.orderedFacts
            .filter(
              (fact) =>
                fact.semantic === "REFERENCE" &&
                referenceIdentity(fact.value) ===
                  referenceIdentity(reference.value),
            )
            .map((fact) => fact.pageNumber);
          return [
            Object.freeze({
              label,
              referenceAlias,
              pages: Object.freeze([...new Set(pages)].sort((a, b) => a - b)),
            }),
          ];
        }),
      ),
      facts: Object.freeze(facts),
      amounts: Object.freeze(
        document.money.flatMap((money) =>
          isSafeAuditText(money.label)
            ? [
                Object.freeze({
                  label: money.label,
                  amountCents: money.amountCents,
                  currency: money.currency,
                  pages: Object.freeze([...money.pageNumbers]),
                  sourceReferenceAlias: money.sourceReference
                    ? (referenceAliases.get(
                        referenceIdentity(money.sourceReference),
                      ) ?? null)
                    : null,
                }),
              ]
            : [],
        ),
      ),
      installments: Object.freeze(
        document.installments.flatMap((installment) =>
          isSafeAuditText(installment.label)
            ? [
                Object.freeze({
                  label: installment.label,
                  dueDate: installment.dueDate,
                  amountCents: installment.amountCents,
                  pages: Object.freeze([...installment.pageNumbers]),
                }),
              ]
            : [],
        ),
      ),
      explanation: Object.freeze({
        whatItIs: safeAuditContentText(
          document.explanation.whatItIs,
          "Explicación no disponible.",
          900,
          aliasReplacements,
        ),
        whyReceived: safeAuditContentText(
          document.explanation.whyReceived,
          "Motivo no identificado.",
          900,
          aliasReplacements,
        ),
        result: safeAuditContentText(
          document.explanation.result,
          "Resultado pendiente de revisión.",
          900,
          aliasReplacements,
        ),
        nextStep: safeAuditContentText(
          `${document.explanation.nextStep.title}. ${document.explanation.nextStep.detail}`,
          "Siguiente paso pendiente de revisión.",
          1_200,
          aliasReplacements,
        ),
        deadline: safeAuditContentText(
          `${document.explanation.deadline.title}. ${document.explanation.deadline.detail}`,
          "Plazo pendiente de revisión.",
          1_200,
          aliasReplacements,
        ),
      }),
      officialSources: Object.freeze(
        document.explanation.officialSources.flatMap((source) => {
          const title = cleanStructuralLabel(source.title, 240);
          return title
            ? [Object.freeze({ authority: source.authority, title })]
            : [];
        }),
      ),
    });
  });

  const links = uniqueLinks(viewModel);
  const relations = links.flatMap((link, index) => {
    const sourceDocumentAlias = documentAliases.get(link.fromDocumentId);
    const targetDocumentAlias = documentAliases.get(link.toDocumentId);
    if (!sourceDocumentAlias || !targetDocumentAlias) return [];
    return [
      Object.freeze({
        alias: `REL-${String(index + 1).padStart(3, "0")}`,
        sourceDocumentAlias,
        targetDocumentAlias,
        relationType: link.relationType,
        label: safeAuditText(link.label, "Relación documental", 180),
        explanation: safeAuditContentText(
          link.explanation,
          "Justificación pendiente de revisión.",
          700,
          aliasReplacements,
        ),
        status: link.relationStatus,
        matches: Object.freeze(
          link.matches.flatMap((match) => {
            const referenceAlias = referenceAliases.get(
              referenceIdentity(match.value),
            );
            return referenceAlias
              ? [
                  Object.freeze({
                    label: match.label,
                    referenceAlias,
                    sourcePages: Object.freeze([...match.sourcePageNumbers]),
                    targetPages: Object.freeze([...match.targetPageNumbers]),
                  }),
                ]
              : [];
          }),
        ),
      }),
    ];
  });

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    documents: Object.freeze(documents),
    relations: Object.freeze(relations),
  });
}

export function parseFiscalNotificationLibraryAiAuditInputV1(
  value: unknown,
): FiscalNotificationLibraryAiAuditInputV1 | null {
  if (!isRecord(value)) return null;
  if (
    value.schemaVersion !==
      FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1 ||
    !Array.isArray(value.documents) ||
    value.documents.length === 0 ||
    value.documents.length >
      FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_MAX_DOCUMENTS_V1 ||
    !Array.isArray(value.relations) ||
    value.relations.length > 500
  ) {
    return null;
  }
  const serialized = JSON.stringify(value);
  if (
    serialized.length > 1_000_000 ||
    containsInternalFiscalNotificationToken(serialized)
  ) {
    return null;
  }

  const documents = value.documents.map(parseAuditDocument);
  if (documents.some((document) => document === null)) return null;
  const aliases = new Set(documents.map((document) => document!.alias));
  if (aliases.size !== documents.length) return null;
  const relations = value.relations.map((relation) =>
    parseAuditRelation(relation, aliases),
  );
  if (relations.some((relation) => relation === null)) return null;

  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    documents: Object.freeze(
      documents as NonNullable<(typeof documents)[number]>[],
    ),
    relations: Object.freeze(
      relations as NonNullable<(typeof relations)[number]>[],
    ),
  });
}

export function parseFiscalNotificationLibraryAiAuditResultV1(
  value: unknown,
  input: FiscalNotificationLibraryAiAuditInputV1,
): FiscalNotificationLibraryAiAuditResultV1 | null {
  if (!isRecord(value)) return null;
  const summary = cleanOutputText(value.summary, 900);
  if (
    value.schemaVersion !==
      FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1 ||
    !summary ||
    value.documentsReviewed !== input.documents.length ||
    value.relationsReviewed !== input.relations.length ||
    !Array.isArray(value.findings) ||
    value.findings.length > 60
  ) {
    return null;
  }
  const documentAliases = new Set(input.documents.map((item) => item.alias));
  const relationAliases = new Set(input.relations.map((item) => item.alias));
  const findings = value.findings.map((finding) =>
    parseFinding(finding, documentAliases, relationAliases),
  );
  if (findings.some((finding) => finding === null)) return null;
  return Object.freeze({
    schemaVersion: FISCAL_NOTIFICATION_LIBRARY_AI_AUDIT_SCHEMA_VERSION_V1,
    summary,
    documentsReviewed: input.documents.length,
    relationsReviewed: input.relations.length,
    findings: Object.freeze(
      findings as FiscalNotificationLibraryAiAuditFindingV1[],
    ),
  });
}

function createReferenceAliases(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
): ReadonlyMap<string, string> {
  const identities = new Set<string>();
  for (const document of viewModel.documents) {
    for (const reference of document.references) {
      addReferenceIdentity(identities, reference.value, reference.label);
    }
    for (const fact of document.orderedFacts) {
      if (fact.semantic === "REFERENCE") {
        addReferenceIdentity(identities, fact.value, fact.label);
      }
    }
    for (const money of document.money) {
      if (money.sourceReference) {
        addReferenceIdentity(identities, money.sourceReference);
      }
    }
  }
  for (const link of uniqueLinks(viewModel)) {
    for (const match of link.matches) {
      addReferenceIdentity(identities, match.value, match.label);
    }
  }
  return new Map(
    [...identities]
      .sort()
      .map((identity, index) => [
        identity,
        `REF-${String(index + 1).padStart(3, "0")}`,
      ]),
  );
}

function createPartyAliases(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
): ReadonlyMap<string, string> {
  const identities = new Set<string>();
  for (const document of viewModel.documents) {
    if (document.subjectName && cleanAuditText(document.subjectName, 600)) {
      identities.add(partyIdentity(document.subjectName));
    }
    for (const fact of document.orderedFacts) {
      if (
        (fact.semantic === "PARTY" || isPartyFactLabel(fact.label)) &&
        cleanAuditText(fact.value, 600) &&
        !containsInternalFiscalNotificationToken(fact.value)
      ) {
        identities.add(partyIdentity(fact.value));
      }
    }
  }
  return new Map(
    [...identities]
      .sort()
      .map((identity, index) => [
        identity,
        `PARTY-${String(index + 1).padStart(3, "0")}`,
      ]),
  );
}

function createAuditAliasReplacements(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
  referenceAliases: ReadonlyMap<string, string>,
  partyAliases: ReadonlyMap<string, string>,
): readonly { readonly value: string; readonly alias: string }[] {
  const replacements = new Map<string, string>();
  for (const document of viewModel.documents) {
    if (document.subjectName) {
      const alias = partyAliases.get(partyIdentity(document.subjectName));
      if (alias) replacements.set(document.subjectName.trim(), alias);
    }
    for (const reference of document.references) {
      const alias = referenceAliases.get(referenceIdentity(reference.value));
      if (alias) replacements.set(reference.value.trim(), alias);
    }
    for (const fact of document.orderedFacts) {
      if (fact.semantic === "REFERENCE") {
        const alias = referenceAliases.get(referenceIdentity(fact.value));
        if (alias) replacements.set(fact.value.trim(), alias);
      }
      if (fact.semantic === "PARTY" || isPartyFactLabel(fact.label)) {
        const alias = partyAliases.get(partyIdentity(fact.value));
        if (alias) replacements.set(fact.value.trim(), alias);
      }
    }
    for (const money of document.money) {
      if (!money.sourceReference) continue;
      const alias = referenceAliases.get(
        referenceIdentity(money.sourceReference),
      );
      if (alias) replacements.set(money.sourceReference.trim(), alias);
    }
  }
  for (const link of uniqueLinks(viewModel)) {
    for (const match of link.matches) {
      const alias = referenceAliases.get(referenceIdentity(match.value));
      if (alias) replacements.set(match.value.trim(), alias);
    }
  }
  return Object.freeze(
    [...replacements.entries()]
      .filter(([value]) => value.length >= 2)
      .sort(([left], [right]) => right.length - left.length)
      .map(([value, alias]) => Object.freeze({ value, alias })),
  );
}

function isPartyFactLabel(value: string): boolean {
  return /\b(?:nombre|apellidos|interesad[oa]|destinatari[oa]|obligad[oa](?: tributari[oa])?|deudor(?:a)?|pagador(?:a)?|representante)\b/iu.test(
    value,
  );
}

function partyIdentity(value: string): string {
  return value.trim().toLocaleLowerCase("es-ES").replace(/\s+/gu, " ");
}

function createSourceFileAliases(
  sources: readonly FiscalNotificationLibraryAiAuditSessionSourceV1[],
): ReadonlyMap<string, readonly string[]> {
  const result = new Map<string, string[]>();
  sources.forEach((source, index) => {
    const alias = `FILE-${String(index + 1).padStart(3, "0")}`;
    for (const documentId of source.documentIds) {
      result.set(documentId, [
        ...new Set([...(result.get(documentId) ?? []), alias]),
      ]);
    }
  });
  return result;
}

function addReferenceIdentity(
  target: Set<string>,
  value: string,
  label?: string,
): void {
  const identity = referenceIdentity(value);
  if (
    identity &&
    !PROTECTED_REFERENCE_VALUES.has(identity) &&
    isSafeAuditText(value) &&
    (label === undefined || isSafeAuditText(label))
  ) {
    target.add(identity);
  }
}

function referenceIdentity(value: string): string {
  return value.trim().toLocaleLowerCase("es-ES").replace(/\s+/gu, " ");
}

function uniqueLinks(
  viewModel: Extract<
    FiscalNotificationDocumentLibraryViewModelV1,
    { readonly status: "READY" }
  >,
): readonly FiscalNotificationDocumentLibraryLinkV1[] {
  const links = new Map<string, FiscalNotificationDocumentLibraryLinkV1>();
  for (const group of viewModel.groups) {
    for (const link of group.links) links.set(link.key, link);
  }
  return [...links.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

function isSupportedFactKind(
  value: unknown,
): value is FiscalNotificationLibraryAiAuditFactV1["kind"] {
  return (
    value === "REFERENCE" ||
    value === "DATE" ||
    value === "PARTY" ||
    value === "STATUS" ||
    value === "DETAIL" ||
    value === "OBLIGATION"
  );
}

function isSafeAuditText(value: string): boolean {
  return (
    cleanAuditText(value, 600) !== null &&
    !containsInternalFiscalNotificationToken(value) &&
    !SENSITIVE_LABEL.test(value) &&
    !containsDirectPersonalData(value)
  );
}

function isSafeAuditContentOutput(value: string): boolean {
  return (
    cleanAuditText(value, 1_200) !== null &&
    !containsInternalFiscalNotificationToken(value) &&
    !containsDirectPersonalData(value)
  );
}

function safeAuditContentText(
  value: unknown,
  fallback: string,
  maxLength: number,
  aliasReplacements: readonly {
    readonly value: string;
    readonly alias: string;
  }[],
): string {
  const clean = cleanAuditText(value, maxLength);
  if (!clean || containsInternalFiscalNotificationToken(clean)) return fallback;

  let protectedText = clean;
  for (const replacement of aliasReplacements) {
    protectedText = protectedText.replace(
      new RegExp(escapeRegExp(replacement.value), "giu"),
      replacement.alias,
    );
  }
  protectedText = protectedText
    .replace(
      new RegExp(LABELED_PERSONAL_VALUE.source, "giu"),
      "dato personal seudonimizado",
    )
    .replace(
      new RegExp(LABELED_PERSON_NAME_VALUE.source, "giu"),
      "sujeto seudonimizado",
    )
    .replace(
      new RegExp(STREET_ADDRESS_VALUE.source, "giu"),
      "dirección seudonimizada",
    )
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, "correo seudonimizado")
    .replace(
      /(?:\+?34[\s.-]*)?[6789]\d{2}(?:[\s.-]?\d{3}){2}/gu,
      "teléfono seudonimizado",
    )
    .replace(
      /\b(?:ES\d{22}|[XYZ]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{8})\b/giu,
      "identificador seudonimizado",
    );
  const bounded = cleanAuditText(protectedText, maxLength);
  return bounded &&
    !containsInternalFiscalNotificationToken(bounded) &&
    !containsDirectPersonalData(bounded)
    ? bounded
    : fallback;
}

function containsDirectPersonalData(value: string): boolean {
  return (
    SENSITIVE_VALUE.test(value) ||
    PHONE_VALUE.test(value) ||
    LABELED_PERSONAL_VALUE.test(value) ||
    STREET_ADDRESS_VALUE.test(value) ||
    LABELED_PERSON_NAME_VALUE.test(value)
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function cleanStructuralLabel(
  value: unknown,
  maxLength: number,
): string | null {
  const clean = cleanAuditText(value, maxLength);
  return clean &&
    !containsInternalFiscalNotificationToken(clean) &&
    !containsDirectPersonalData(clean)
    ? clean
    : null;
}

function cleanAuditText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean.length > 0 && clean.length <= maxLength ? clean : null;
}

function safeAuditText(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  const clean = cleanAuditText(value, maxLength);
  return clean && isSafeAuditText(clean) ? clean : fallback;
}

function cleanOutputText(value: unknown, maxLength: number): string | null {
  const clean = cleanAuditText(value, maxLength);
  return clean && !containsInternalFiscalNotificationToken(clean)
    ? clean
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAlias(
  value: unknown,
  prefix: "DOC" | "REL" | "REF" | "PARTY" | "FILE",
): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^${prefix}-\\d{3}$`, "u").test(value)
  );
}

function parsePages(value: unknown, maximum = 80): readonly number[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  if (
    !value.every(
      (item) =>
        Number.isSafeInteger(item) &&
        (item as number) >= 1 &&
        (item as number) <= 10_000,
    )
  ) {
    return null;
  }
  return Object.freeze([...(value as number[])]);
}

function parseAuditDocument(
  value: unknown,
): FiscalNotificationLibraryAiAuditInputV1["documents"][number] | null {
  if (!isRecord(value) || !isAlias(value.alias, "DOC")) return null;
  const family = cleanAuditText(value.family, 180);
  const type = cleanAuditText(value.type, 180);
  const authority = cleanAuditText(value.authority, 180);
  if (
    !family ||
    !type ||
    !authority ||
    !isSafeAuditText(family) ||
    !isSafeAuditText(type) ||
    !isSafeAuditText(authority) ||
    (value.documentDate !== null &&
      (typeof value.documentDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/u.test(value.documentDate))) ||
    (value.documentDateBasis !== null &&
      (typeof value.documentDateBasis !== "string" ||
        !cleanAuditText(value.documentDateBasis, 80) ||
        !isSafeAuditText(value.documentDateBasis))) ||
    !Number.isSafeInteger(value.pageCount) ||
    (value.pageCount as number) < 1 ||
    (value.reviewStatus !== "PENDING" && value.reviewStatus !== "REVIEWED") ||
    !Array.isArray(value.sourceFileAliases) ||
    value.sourceFileAliases.length > 8 ||
    !value.sourceFileAliases.every((alias) => isAlias(alias, "FILE")) ||
    new Set(value.sourceFileAliases).size !== value.sourceFileAliases.length ||
    !Array.isArray(value.references) ||
    value.references.length > 80 ||
    !Array.isArray(value.facts) ||
    value.facts.length > 160 ||
    !Array.isArray(value.amounts) ||
    value.amounts.length > 100 ||
    !Array.isArray(value.installments) ||
    value.installments.length > 120 ||
    !isRecord(value.explanation) ||
    !Array.isArray(value.officialSources) ||
    value.officialSources.length > 30
  ) {
    return null;
  }
  const references = value.references.map(parseAuditReference);
  const facts = value.facts.map(parseAuditFact);
  const amounts = value.amounts.map(parseAuditAmount);
  const installments = value.installments.map(parseAuditInstallment);
  const explanation = parseAuditExplanation(value.explanation);
  const officialSources = value.officialSources.map(parseAuditOfficialSource);
  if (
    references.some((item) => item === null) ||
    facts.some((item) => item === null) ||
    amounts.some((item) => item === null) ||
    installments.some((item) => item === null) ||
    !explanation ||
    officialSources.some((item) => item === null)
  ) {
    return null;
  }
  return Object.freeze({
    alias: value.alias,
    family,
    type,
    authority,
    documentDate: value.documentDate as string | null,
    documentDateBasis: value.documentDateBasis as string | null,
    pageCount: value.pageCount as number,
    reviewStatus: value.reviewStatus,
    sourceFileAliases: Object.freeze([
      ...(value.sourceFileAliases as string[]),
    ]),
    references: Object.freeze(
      references as NonNullable<(typeof references)[number]>[],
    ),
    facts: Object.freeze(facts as FiscalNotificationLibraryAiAuditFactV1[]),
    amounts: Object.freeze(amounts as NonNullable<(typeof amounts)[number]>[]),
    installments: Object.freeze(
      installments as NonNullable<(typeof installments)[number]>[],
    ),
    explanation,
    officialSources: Object.freeze(
      officialSources as NonNullable<(typeof officialSources)[number]>[],
    ),
  });
}

function parseAuditReference(
  value: unknown,
):
  | FiscalNotificationLibraryAiAuditInputV1["documents"][number]["references"][number]
  | null {
  if (!isRecord(value)) return null;
  const label = cleanStructuralLabel(value.label, 180);
  const pages = parsePages(value.pages);
  if (!label || !isAlias(value.referenceAlias, "REF") || !pages) return null;
  return Object.freeze({
    label,
    referenceAlias: value.referenceAlias,
    pages,
  });
}

function parseAuditFact(
  value: unknown,
): FiscalNotificationLibraryAiAuditFactV1 | null {
  if (!isRecord(value) || !isSupportedFactKind(value.kind)) return null;
  const label = cleanAuditText(value.label, 180);
  const factValue = cleanAuditText(value.value, 600);
  if (
    !label ||
    !factValue ||
    (value.kind === "PARTY"
      ? !cleanStructuralLabel(label, 180)
      : !isSafeAuditText(label)) ||
    (value.kind === "REFERENCE"
      ? !isAlias(factValue, "REF")
      : value.kind === "PARTY"
        ? !isAlias(factValue, "PARTY")
        : !isSafeAuditContentOutput(factValue)) ||
    !Number.isSafeInteger(value.page) ||
    (value.page as number) < 1
  ) {
    return null;
  }
  return Object.freeze({
    kind: value.kind,
    label,
    value: factValue,
    page: value.page as number,
  });
}

function parseAuditAmount(
  value: unknown,
):
  | FiscalNotificationLibraryAiAuditInputV1["documents"][number]["amounts"][number]
  | null {
  if (!isRecord(value)) return null;
  const label = cleanAuditText(value.label, 180);
  const pages = parsePages(value.pages);
  if (
    !label ||
    !isSafeAuditText(label) ||
    !Number.isSafeInteger(value.amountCents) ||
    (value.currency !== "EUR" && value.currency !== "UNKNOWN") ||
    !pages ||
    (value.sourceReferenceAlias !== null &&
      !isAlias(value.sourceReferenceAlias, "REF"))
  ) {
    return null;
  }
  return Object.freeze({
    label,
    amountCents: value.amountCents as number,
    currency: value.currency,
    pages,
    sourceReferenceAlias: value.sourceReferenceAlias as string | null,
  });
}

function parseAuditInstallment(
  value: unknown,
):
  | FiscalNotificationLibraryAiAuditInputV1["documents"][number]["installments"][number]
  | null {
  if (!isRecord(value)) return null;
  const label = cleanAuditText(value.label, 180);
  const pages = parsePages(value.pages);
  if (
    !label ||
    !isSafeAuditText(label) ||
    (value.dueDate !== null &&
      (typeof value.dueDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/u.test(value.dueDate))) ||
    (value.amountCents !== null && !Number.isSafeInteger(value.amountCents)) ||
    !pages
  ) {
    return null;
  }
  return Object.freeze({
    label,
    dueDate: value.dueDate as string | null,
    amountCents: value.amountCents as number | null,
    pages,
  });
}

function parseAuditExplanation(
  value: Record<string, unknown>,
):
  | FiscalNotificationLibraryAiAuditInputV1["documents"][number]["explanation"]
  | null {
  const whatItIs = cleanAuditText(value.whatItIs, 900);
  const whyReceived = cleanAuditText(value.whyReceived, 900);
  const result = cleanAuditText(value.result, 900);
  const nextStep = cleanAuditText(value.nextStep, 1_200);
  const deadline = cleanAuditText(value.deadline, 1_200);
  if (
    !whatItIs ||
    !whyReceived ||
    !result ||
    !nextStep ||
    !deadline ||
    ![whatItIs, whyReceived, result, nextStep, deadline].every(
      isSafeAuditContentOutput,
    )
  ) {
    return null;
  }
  return Object.freeze({ whatItIs, whyReceived, result, nextStep, deadline });
}

function parseAuditOfficialSource(
  value: unknown,
):
  | FiscalNotificationLibraryAiAuditInputV1["documents"][number]["officialSources"][number]
  | null {
  if (!isRecord(value)) return null;
  const title = cleanStructuralLabel(value.title, 240);
  if ((value.authority !== "AEAT" && value.authority !== "BOE") || !title) {
    return null;
  }
  return Object.freeze({ authority: value.authority, title });
}

function parseAuditRelation(
  value: unknown,
  documentAliases: ReadonlySet<string>,
): FiscalNotificationLibraryAiAuditInputV1["relations"][number] | null {
  if (!isRecord(value) || !isAlias(value.alias, "REL")) return null;
  const relationType = cleanAuditText(value.relationType, 120);
  const label = cleanAuditText(value.label, 180);
  const explanation = cleanAuditText(value.explanation, 700);
  if (
    !isAlias(value.sourceDocumentAlias, "DOC") ||
    !documentAliases.has(value.sourceDocumentAlias) ||
    !isAlias(value.targetDocumentAlias, "DOC") ||
    !documentAliases.has(value.targetDocumentAlias) ||
    !relationType ||
    !label ||
    !explanation ||
    !isSafeAuditText(relationType) ||
    !isSafeAuditText(label) ||
    !isSafeAuditContentOutput(explanation) ||
    (value.status !== "SUGGESTED" &&
      value.status !== "USER_CONFIRMED" &&
      value.status !== "SYSTEM_CONFIRMED_EXACT") ||
    !Array.isArray(value.matches) ||
    value.matches.length > 20
  ) {
    return null;
  }
  const matches = value.matches.map((match) => {
    if (!isRecord(match)) return null;
    const matchLabel = cleanAuditText(match.label, 180);
    const sourcePages = parsePages(match.sourcePages);
    const targetPages = parsePages(match.targetPages);
    if (
      !matchLabel ||
      !isSafeAuditText(matchLabel) ||
      !isAlias(match.referenceAlias, "REF") ||
      !sourcePages ||
      !targetPages
    ) {
      return null;
    }
    return Object.freeze({
      label: matchLabel,
      referenceAlias: match.referenceAlias,
      sourcePages,
      targetPages,
    });
  });
  if (matches.some((match) => match === null)) return null;
  return Object.freeze({
    alias: value.alias,
    sourceDocumentAlias: value.sourceDocumentAlias,
    targetDocumentAlias: value.targetDocumentAlias,
    relationType,
    label,
    explanation,
    status: value.status,
    matches: Object.freeze(matches as NonNullable<(typeof matches)[number]>[]),
  });
}

function parseFinding(
  value: unknown,
  documentAliases: ReadonlySet<string>,
  relationAliases: ReadonlySet<string>,
): FiscalNotificationLibraryAiAuditFindingV1 | null {
  if (!isRecord(value)) return null;
  const id = cleanOutputText(value.id, 80);
  const title = cleanOutputText(value.title, 180);
  const detail = cleanOutputText(value.detail, 900);
  const recommendation = cleanOutputText(value.recommendation, 700);
  const severity = isAuditSeverity(value.severity) ? value.severity : null;
  const scope = isAuditScope(value.scope) ? value.scope : null;
  const category = isAuditCategory(value.category) ? value.category : null;
  if (
    !id ||
    !title ||
    !detail ||
    !recommendation ||
    !severity ||
    !scope ||
    !category ||
    !Array.isArray(value.documentAliases) ||
    value.documentAliases.length > 12 ||
    !value.documentAliases.every(
      (alias) => typeof alias === "string" && documentAliases.has(alias),
    ) ||
    !Array.isArray(value.relationAliases) ||
    value.relationAliases.length > 12 ||
    !value.relationAliases.every(
      (alias) => typeof alias === "string" && relationAliases.has(alias),
    ) ||
    !Array.isArray(value.evidence) ||
    value.evidence.length > 8
  ) {
    return null;
  }
  const evidence = value.evidence.map((item) => {
    if (!isRecord(item)) return null;
    const label = cleanOutputText(item.label, 180);
    const evidenceValue = cleanOutputText(item.value, 400);
    const pages = parsePages(item.pages);
    return label && evidenceValue && pages
      ? Object.freeze({ label, value: evidenceValue, pages })
      : null;
  });
  if (evidence.some((item) => item === null)) return null;
  return Object.freeze({
    id,
    severity,
    scope,
    category,
    documentAliases: Object.freeze([...(value.documentAliases as string[])]),
    relationAliases: Object.freeze([...(value.relationAliases as string[])]),
    title,
    detail,
    recommendation,
    evidence: Object.freeze(
      evidence as NonNullable<(typeof evidence)[number]>[],
    ),
  });
}

function isAuditSeverity(
  value: unknown,
): value is FiscalNotificationLibraryAiAuditSeverityV1 {
  return value === "HIGH" || value === "MEDIUM" || value === "LOW";
}

function isAuditScope(
  value: unknown,
): value is FiscalNotificationLibraryAiAuditFindingV1["scope"] {
  return value === "DOCUMENT" || value === "RELATION" || value === "LIBRARY";
}

function isAuditCategory(
  value: unknown,
): value is FiscalNotificationLibraryAiAuditFindingV1["category"] {
  return (
    value === "INTERNAL_CONSISTENCY" ||
    value === "DATE_OR_REFERENCE" ||
    value === "RELATION_EVIDENCE" ||
    value === "EMPTY_OR_INCOMPLETE_CARD" ||
    value === "INTERNAL_METADATA" ||
    value === "OTHER"
  );
}
