"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { getDocumentLinkBadges } from "@/lib/document-links";
import type { Document } from "@/lib/types";

const TONE_CLASSES = {
  blue: "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100",
  green: "border-green-100 bg-green-50 text-green-700 hover:bg-green-100",
};

export function DocumentLinkBadges({
  document,
  documents,
}: {
  document: Document;
  documents: Document[];
}) {
  const badges = getDocumentLinkBadges(document, documents);
  if (badges.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {badges.map((badge) => {
        const className = `inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors ${TONE_CLASSES[badge.tone]}`;
        const content = (
          <>
            <Link2 className="h-3.5 w-3.5" />
            {badge.label}
          </>
        );

        return badge.href ? (
          <Link
            key={badge.id}
            href={badge.href}
            className={className}
            aria-label={`Abrir ${badge.label}`}
            title={`Abrir ${badge.label}`}
          >
            {content}
          </Link>
        ) : (
          <span key={badge.id} className={className}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
