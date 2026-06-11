"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import type { ManualScreenshot as ManualScreenshotType } from "@/lib/manual/types";

interface ManualScreenshotProps {
  screenshot: ManualScreenshotType;
}

export function ManualScreenshot({ screenshot }: ManualScreenshotProps) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <figure className="my-4">
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
              <ImageIcon className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Captura pendiente</p>
            <p className="text-xs text-slate-500">{screenshot.alt}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-400">
              public{screenshot.src}
            </p>
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
