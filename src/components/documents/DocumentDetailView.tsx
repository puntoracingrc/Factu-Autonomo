"use client";

import { DocumentForm } from "@/components/forms/DocumentForm";
import { DocumentReadOnlyActions } from "@/components/documents/DocumentReadOnlyActions";
import { PageHeader } from "@/components/ui/Card";
import { useAppStore } from "@/context/AppStore";
import {
  getDocumentReadOnlyMessage,
  isDocumentEditable,
} from "@/lib/documents";
import type { Document, DocumentType } from "@/lib/types";

interface DocumentDetailViewProps {
  doc: Document | undefined;
  type: DocumentType;
  listHref: string;
  notFoundMessage: string;
}

export function DocumentDetailView({
  doc,
  type,
  listHref,
  notFoundMessage,
}: DocumentDetailViewProps) {
  const { data } = useAppStore();

  if (!doc || doc.type !== type) {
    return <p className="text-slate-500">{notFoundMessage}</p>;
  }

  if (!isDocumentEditable(doc)) {
    return (
      <div>
        <PageHeader title={doc.number} subtitle={doc.client.name} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-slate-600">{getDocumentReadOnlyMessage(doc)}</p>
          <DocumentReadOnlyActions
            doc={doc}
            profile={data.profile}
            listHref={listHref}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Editar ${doc.number}`} subtitle={doc.client.name} />
      <DocumentForm type={type} existing={doc} />
    </div>
  );
}
