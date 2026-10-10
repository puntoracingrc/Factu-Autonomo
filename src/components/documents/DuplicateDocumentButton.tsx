"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useCentralSharedBusinessMutations } from "@/hooks/useCentralSharedBusinessMutations";
import { useCentralQuoteCreate } from "@/hooks/useCentralQuoteCreate";
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
  const { saveDraft } = useCentralSharedBusinessMutations();
  const { createQuote } = useCentralQuoteCreate();
  const [busy, setBusy] = useState(false);

  async function handleDuplicate() {
    if (busy) return;

    setBusy(true);
    try {
      const draft = buildDuplicatedDocumentDraft(doc);
      const now = new Date().toISOString();
      const result =
        draft.type === "presupuesto"
          ? await createQuote({ ...draft, type: "presupuesto" })
          : await saveDraft({
              ...draft,
              id: crypto.randomUUID(),
              number: "BORRADOR",
              createdAt: now,
              updatedAt: now,
            });
      if (!result.ok) throw new Error(result.error);
      const duplicate = "document" in result ? result.document : result.value;
      showFactuToast(`${doc.number} duplicado como ${duplicate.number}.`, 4000);
      router.push(`${basePath}/${duplicate.id}`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el duplicado.",
      );
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
