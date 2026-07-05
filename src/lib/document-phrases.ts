import type { DocumentPhrasesSettings, DocumentPhrase, DocumentType } from "./types";

export const DOCUMENT_PHRASE_TYPE_LABELS: Record<DocumentType, string> = {
  factura: "Facturas",
  presupuesto: "Presupuestos",
  recibo: "Recibos",
};

export const EMPTY_DOCUMENT_PHRASES: DocumentPhrasesSettings = {
  phrases: [],
  defaultPhraseId: {},
};

interface NormalizeDocumentPhrasesOptions {
  keepEmpty?: boolean;
}

function newPhraseId(): string {
  return crypto.randomUUID();
}

export function normalizeDocumentPhrases(
  settings?: Partial<DocumentPhrasesSettings> | null,
  options: NormalizeDocumentPhrasesOptions = {},
): DocumentPhrasesSettings {
  const phrases = (settings?.phrases ?? [])
    .map((phrase) => {
      const text = phrase.text ?? "";
      return {
        id: phrase.id || newPhraseId(),
        text: options.keepEmpty ? text : text.trim(),
        documentType: phrase.documentType,
      };
    })
    .filter((phrase) => options.keepEmpty || phrase.text.length > 0);

  const phraseIds = new Set(phrases.map((phrase) => phrase.id));
  const defaultPhraseId: Partial<Record<DocumentType, string>> = {};

  for (const type of Object.keys(
    settings?.defaultPhraseId ?? {},
  ) as DocumentType[]) {
    const id = settings?.defaultPhraseId?.[type];
    if (!id || !phraseIds.has(id)) continue;
    const phrase = phrases.find((item) => item.id === id);
    if (phrase?.documentType === type) {
      defaultPhraseId[type] = id;
    }
  }

  return { phrases, defaultPhraseId };
}

export function phrasesForType(
  settings: DocumentPhrasesSettings,
  type: DocumentType,
): DocumentPhrase[] {
  return settings.phrases.filter((phrase) => phrase.documentType === type);
}

export function defaultPhraseForType(
  settings: DocumentPhrasesSettings,
  type: DocumentType,
): DocumentPhrase | undefined {
  const id = settings.defaultPhraseId[type];
  if (!id) return undefined;
  return settings.phrases.find(
    (phrase) => phrase.id === id && phrase.documentType === type,
  );
}

export function phrasePreview(text: string, max = 72): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function addDocumentPhrase(
  settings: DocumentPhrasesSettings,
  type: DocumentType,
  text = "",
): DocumentPhrasesSettings {
  const phrase: DocumentPhrase = {
    id: newPhraseId(),
    text,
    documentType: type,
  };
  const next = {
    ...settings,
    phrases: [...settings.phrases, phrase],
  };
  if (!settings.defaultPhraseId[type] && phrase.text) {
    return setDefaultDocumentPhrase(next, type, phrase.id);
  }
  return next;
}

export function updateDocumentPhrase(
  settings: DocumentPhrasesSettings,
  phraseId: string,
  text: string,
): DocumentPhrasesSettings {
  return {
    ...settings,
    phrases: settings.phrases.map((phrase) =>
      phrase.id === phraseId ? { ...phrase, text } : phrase,
    ),
  };
}

export function removeDocumentPhrase(
  settings: DocumentPhrasesSettings,
  phraseId: string,
): DocumentPhrasesSettings {
  const removed = settings.phrases.find((phrase) => phrase.id === phraseId);
  const phrases = settings.phrases.filter((phrase) => phrase.id !== phraseId);
  const defaultPhraseId = { ...settings.defaultPhraseId };
  if (removed && defaultPhraseId[removed.documentType] === phraseId) {
    delete defaultPhraseId[removed.documentType];
  }
  return { phrases, defaultPhraseId };
}

export function setDefaultDocumentPhrase(
  settings: DocumentPhrasesSettings,
  type: DocumentType,
  phraseId: string,
): DocumentPhrasesSettings {
  const phrase = settings.phrases.find((item) => item.id === phraseId);
  if (!phrase || phrase.documentType !== type || !phrase.text.trim()) {
    return settings;
  }
  return {
    ...settings,
    defaultPhraseId: {
      ...settings.defaultPhraseId,
      [type]: phraseId,
    },
  };
}

export function clearDefaultDocumentPhrase(
  settings: DocumentPhrasesSettings,
  type: DocumentType,
): DocumentPhrasesSettings {
  const defaultPhraseId = { ...settings.defaultPhraseId };
  delete defaultPhraseId[type];
  return { ...settings, defaultPhraseId };
}
