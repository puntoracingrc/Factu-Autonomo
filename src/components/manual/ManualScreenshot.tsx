"use client";

import Image from "next/image";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ImageIcon } from "lucide-react";
import type { ManualScreenshotReviewStatus } from "@/lib/manual/screenshot-contracts";
import type { ManualScreenshot as ManualScreenshotType } from "@/lib/manual/types";

interface ManualScreenshotProps {
  screenshot: ManualScreenshotType;
  reviewStatus: ManualScreenshotReviewStatus;
  approved: boolean;
  validUntil?: string;
}

const getServerApproval = () => false;

export function ManualScreenshot({
  screenshot,
  reviewStatus,
  approved,
  validUntil,
}: ManualScreenshotProps) {
  const [missing, setMissing] = useState(false);
  const expiresAt = validUntil ? Date.parse(validUntil) : Number.NaN;
  const subscribeToExpiry = useCallback(
    (onStoreChange: () => void) => {
      if (!approved || !Number.isFinite(expiresAt)) return () => undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        const remaining = expiresAt - Date.now() + 1;
        if (remaining <= 0) {
          onStoreChange();
          return;
        }
        timer = setTimeout(schedule, Math.min(remaining, 2_147_000_000));
      };
      schedule();
      return () => {
        if (timer) clearTimeout(timer);
      };
    },
    [approved, expiresAt],
  );
  const getRuntimeApproval = useCallback(
    () => approved && Number.isFinite(expiresAt) && Date.now() <= expiresAt,
    [approved, expiresAt],
  );
  const runtimeApproved = useSyncExternalStore(
    subscribeToExpiry,
    getRuntimeApproval,
    getServerApproval,
  );
  const withheld = !runtimeApproved;

  if (missing || withheld) {
    const statusLabel = missing
      ? "Captura no disponible"
      : reviewStatus === "known-defect"
        ? "Captura retirada por estar desactualizada"
        : reviewStatus === "reviewed"
          ? "Captura retirada: revisión caducada o inválida"
          : "Captura pendiente de revisión";
    return (
      <figure className="my-4">
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-600">
              {statusLabel}
            </p>
            <p className="text-xs text-slate-500">{screenshot.alt}</p>
          </div>
        </div>
        {screenshot.caption && (
          <figcaption className="mt-2 text-center text-xs text-slate-500">
            {screenshot.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure className="my-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={screenshot.src}
          alt={screenshot.alt}
          width={720}
          height={1280}
          className="h-auto w-full"
          onError={() => setMissing(true)}
          unoptimized
        />
      </div>
      {(screenshot.caption || screenshot.alt) && (
        <figcaption className="mt-2 text-center text-xs text-slate-500">
          {screenshot.caption ?? screenshot.alt}
        </figcaption>
      )}
    </figure>
  );
}
