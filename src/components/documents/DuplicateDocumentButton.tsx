"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { buildDuplicatedDocumentDraft } from "@/lib/document-duplication";
import { showFactuToast } from "@/lib/factu/occasional";
import type { Document } from "@/lib/types";

interface DuplicateDocumentButtonProps {
  doc: Document;
  basePath: string;
}

export function DuplicateDocumentButton({
  doc,
  basePath,
}: DuplicateDocumentButtonProps) {
  const router = useRouter();
  const { addDocument } = useAppStore();
  const [busy, setBusy] = useState(false);

  function handleDuplicate() {
    if (busy) return;

    setBusy(true);
    try {
      const duplicate = addDocument(buildDuplicatedDocumentDraft(doc));
      showFactuToast(`${doc.number} duplicado como ${duplicate.number}.`, 4000);
      router.push(`${basePath}/${duplicate.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <IconActionButton
      label="Duplicar"
      tooltip="Duplicar con número nuevo"
      onClick={handleDuplicate}
      disabled={busy}
      className="bg-slate-100 text-slate-700 hover:bg-slate-200"
    >
      <Copy className={`h-5 w-5 ${busy ? "animate-pulse" : ""}`} />
    </IconActionButton>
  );
}
