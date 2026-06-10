"use client";

import { Field, Select } from "@/components/ui/Field";
import {
  defaultPhraseForType,
  normalizeDocumentPhrases,
  phrasePreview,
  phrasesForType,
} from "@/lib/document-phrases";
import type { DocumentPhrasesSettings, DocumentType } from "@/lib/types";

interface DocumentPhrasePickerProps {
  documentType: DocumentType;
  settings?: DocumentPhrasesSettings | null;
  onSelect: (text: string) => void;
}

export function DocumentPhrasePicker({
  documentType,
  settings,
  onSelect,
}: DocumentPhrasePickerProps) {
  const normalized = normalizeDocumentPhrases(settings);
  const phrases = phrasesForType(normalized, documentType);
  const defaultPhrase = defaultPhraseForType(normalized, documentType);

  if (phrases.length === 0) return null;

  return (
    <Field
      label="Frase guardada"
      hint={
        defaultPhrase
          ? "Opcional. La predeterminada ya está en las notas; puedes cambiarla aquí."
          : "Opcional. Elige un texto configurado en Ajustes."
      }
    >
      <Select
        defaultValue=""
        onChange={(e) => {
          const phrase = phrases.find((item) => item.id === e.target.value);
          if (phrase) onSelect(phrase.text);
          e.target.value = "";
        }}
      >
        <option value="">Elegir otra frase…</option>
        {phrases.map((phrase) => (
          <option key={phrase.id} value={phrase.id}>
            {phrase.id === defaultPhrase?.id ? "★ " : ""}
            {phrasePreview(phrase.text)}
          </option>
        ))}
      </Select>
    </Field>
  );
}
