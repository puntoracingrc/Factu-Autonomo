"use client";

import { useState } from "react";
import { BookmarkPlus, Star } from "lucide-react";
import { Select, Textarea } from "@/components/ui/Field";
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
  value: string;
  onChange: (text: string) => void;
  onSave: (text: string, makeDefault: boolean) => void;
  label?: string;
  placeholder?: string;
}

export function DocumentPhrasePicker({
  documentType,
  settings,
  value,
  onChange,
  onSave,
  label = "Notas (opcional)",
  placeholder = "Condiciones de pago, garantía...",
}: DocumentPhrasePickerProps) {
  const [makeDefault, setMakeDefault] = useState(false);
  const normalized = normalizeDocumentPhrases(settings);
  const phrases = phrasesForType(normalized, documentType);
  const defaultPhrase = defaultPhraseForType(normalized, documentType);
  const trimmedValue = value.trim();
  const matchingPhrase = phrases.find(
    (phrase) => phrase.text.trim() === trimmedValue,
  );
  const isCurrentDefault = matchingPhrase?.id === defaultPhrase?.id;
  const textareaId = `document-notes-${documentType}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor={textareaId}
          className="text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
        {phrases.length > 0 && (
          <Select
            aria-label="Elegir otra frase"
            className="!min-h-9 w-full text-sm sm:w-auto sm:max-w-md"
            defaultValue=""
            onChange={(e) => {
              const phrase = phrases.find((item) => item.id === e.target.value);
              if (phrase) onChange(phrase.text);
              setMakeDefault(false);
              e.target.value = "";
            }}
          >
            <option value="">Elegir otra…</option>
            {phrases.map((phrase) => (
              <option key={phrase.id} value={phrase.id}>
                {phrase.id === defaultPhrase?.id ? "★ " : ""}
                {phrasePreview(phrase.text)}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Textarea
        id={textareaId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setMakeDefault(false);
        }}
        placeholder={placeholder}
      />
      {trimmedValue && !isCurrentDefault && (
        <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
          {!matchingPhrase && (
            <label className="flex cursor-pointer items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Dejar como predeterminada
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              onSave(trimmedValue, matchingPhrase ? true : makeDefault);
              setMakeDefault(false);
            }}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {matchingPhrase ? (
              <Star className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {matchingPhrase ? "Usar como predeterminada" : "Guardar frase"}
          </button>
        </div>
      )}
    </div>
  );
}
