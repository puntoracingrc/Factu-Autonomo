"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCloudSync } from "@/context/CloudSyncContext";
import { buildManualHref } from "@/lib/manual/return-url";
import { hasPrivatePreviewAccess } from "@/lib/private-preview-access";
import type { ManualSection } from "@/lib/manual/types";

interface ManualSectionNavigationProps {
  previous?: ManualSection;
  next?: ManualSection;
  publicPrevious?: ManualSection;
  publicNext?: ManualSection;
  returnTo?: string | null;
}

export function ManualSectionNavigation({
  previous,
  next,
  publicPrevious,
  publicNext,
  returnTo,
}: ManualSectionNavigationProps) {
  const { user } = useCloudSync();
  const privatePreviewAccess = hasPrivatePreviewAccess(user?.email);
  const visiblePrevious = privatePreviewAccess ? previous : publicPrevious;
  const visibleNext = privatePreviewAccess ? next : publicNext;

  return (
    <nav className="mt-8 grid gap-3 sm:grid-cols-2">
      {visiblePrevious ? (
        <Link
          href={buildManualHref(`/ayuda/${visiblePrevious.slug}`, returnTo)}
          className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Anterior
          </p>
          <p className="mt-1 flex items-center gap-1 font-semibold text-slate-900">
            <ChevronLeft className="h-4 w-4" />
            {visiblePrevious.title}
          </p>
        </Link>
      ) : (
        <div />
      )}
      {visibleNext ? (
        <Link
          href={buildManualHref(`/ayuda/${visibleNext.slug}`, returnTo)}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-right transition-colors hover:bg-slate-50 sm:col-start-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Siguiente
          </p>
          <p className="mt-1 flex items-center justify-end gap-1 font-semibold text-slate-900">
            {visibleNext.title}
            <ChevronRight className="h-4 w-4" />
          </p>
        </Link>
      ) : null}
    </nav>
  );
}
