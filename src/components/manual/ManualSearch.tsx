"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { buildManualHref } from "@/lib/manual/return-url";
import type { ManualSection } from "@/lib/manual/types";

interface ManualSearchProps {
  sections: ManualSection[];
  returnTo?: string | null;
}

function normalizeSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function sectionSearchText(section: ManualSection): string {
  return [
    section.title,
    section.summary,
    ...(section.intro ?? []),
    ...section.steps.flatMap((step) => [
      step.title,
      ...step.paragraphs,
      step.tip ?? "",
    ]),
  ].join(" ");
}

export function ManualSearch({ sections, returnTo }: ManualSearchProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);

  const results = useMemo(() => {
    if (!normalizedQuery) return sections;
    return sections.filter((section) =>
      normalizeSearch(sectionSearchText(section)).includes(normalizedQuery),
    );
  }, [normalizedQuery, sections]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en el manual"
          className="pl-11"
          aria-label="Buscar en el manual"
        />
      </div>

      {normalizedQuery ? (
        <p className="text-sm text-slate-500">
          {results.length === 0
            ? "No hay resultados en el manual actual."
            : `${results.length} resultado(s) en el manual actual.`}
        </p>
      ) : null}

      <div className="space-y-3">
        {results.map((section) => (
          <Link
            key={section.slug}
            href={buildManualHref(`/ayuda/${section.slug}`, returnTo)}
          >
            <Card className="flex items-center justify-between gap-4 transition-colors hover:bg-slate-50">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">
                  Sección {section.order}
                </p>
                <p className="font-bold text-slate-900">{section.title}</p>
                <p className="mt-1 text-sm text-slate-600">{section.summary}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {section.steps.length} paso
                  {section.steps.length === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
