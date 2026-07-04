"use client";

import { useMemo, useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
import { showFactuToast } from "@/lib/factu/occasional";
import {
  hasClientEmail,
  hasClientPhone,
  shareDocumentByEmail,
  shareDocumentByWhatsApp,
} from "@/lib/share";
import { shareDocumentWithIntegrity } from "@/lib/document-integrity/share-flow";
import type { BusinessProfile, Document } from "@/lib/types";
import type { DocumentPdfOptions } from "@/lib/pdf";

interface DocumentShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
  pdfOptions?: DocumentPdfOptions;
}

export function DocumentShareActions({
  doc,
  profile,
  markSentOnShare = true,
  pdfOptions,
}: DocumentShareActionsProps) {
  const { data, issueDocument, markDocumentSent } = useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [busy, setBusy] = useState<"email" | "whatsapp" | null>(null);
  const contactDoc = useMemo(
    () => documentWithCurrentCustomerContact(doc, data.customers),
    [data.customers, doc],
  );

  const canEmail = hasClientEmail(contactDoc);
  const canWhatsApp = hasClientPhone(contactDoc);
  const accountCanShare = Boolean(user && emailConfirmed);

  async function handleEmail() {
    if (!canEmail || busy) return;
    if (!user) {
      showFactuToast(
        "Inicia sesión para enviar documentos reales a clientes.",
        5000,
      );
      return;
    }
    if (!emailConfirmed) {
      showFactuToast(
        "Confirma tu email para enviar documentos reales a clientes.",
        5000,
      );
      return;
    }
    if (demoMode) {
      showFactuToast(
        "En modo demo no se envían documentos. Crea una cuenta real para enviar facturas.",
        5000,
      );
      return;
    }
    setBusy("email");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: (current) =>
          shareDocumentByEmail(
            documentWithCurrentCustomerContact(current, data.customers),
            profile,
            pdfOptions,
          ),
      });
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsApp() {
    if (!canWhatsApp || busy) return;
    if (!user) {
      showFactuToast(
        "Inicia sesión para compartir documentos reales con clientes.",
        5000,
      );
      return;
    }
    if (!emailConfirmed) {
      showFactuToast(
        "Confirma tu email para compartir documentos reales con clientes.",
        5000,
      );
      return;
    }
    if (demoMode) {
      showFactuToast(
        "En modo demo no se comparten documentos por WhatsApp.",
        5000,
      );
      return;
    }
    setBusy("whatsapp");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: (current) =>
          shareDocumentByWhatsApp(
            documentWithCurrentCustomerContact(current, data.customers),
            profile,
            pdfOptions,
          ),
      });
    } finally {
      setBusy(null);
    }
  }

  const emailTooltip = demoMode
    ? "En demo no se envían documentos"
    : !user
      ? "Inicia sesión para enviar documentos"
      : !emailConfirmed
        ? "Confirma tu email para enviar documentos"
        : canEmail
          ? `Enviar por email a ${contactDoc.client.email}`
          : "Añade el email del cliente para enviar";
  const whatsappTooltip = demoMode
    ? "En demo no se comparten documentos"
    : !user
      ? "Inicia sesión para compartir documentos"
      : !emailConfirmed
        ? "Confirma tu email para compartir documentos"
        : canWhatsApp
          ? `Enviar por WhatsApp a ${contactDoc.client.phone}`
          : "Añade el teléfono del cliente para enviar";

  return (
    <>
      <IconActionButton
        label="Email"
        tooltip={emailTooltip}
        onClick={() => void handleEmail()}
        disabled={!canEmail || busy !== null || demoMode || !accountCanShare}
        className={
          canEmail && !demoMode && accountCanShare
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }
      >
        <Mail
          className={`h-5 w-5 ${busy === "email" ? "animate-pulse" : ""}`}
        />
      </IconActionButton>
      <IconActionButton
        label="WhatsApp"
        tooltip={whatsappTooltip}
        onClick={() => void handleWhatsApp()}
        disabled={!canWhatsApp || busy !== null || demoMode || !accountCanShare}
        className={
          canWhatsApp && !demoMode && accountCanShare
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }
      >
        <MessageCircle
          className={`h-5 w-5 ${busy === "whatsapp" ? "animate-pulse" : ""}`}
        />
      </IconActionButton>
    </>
  );
}
