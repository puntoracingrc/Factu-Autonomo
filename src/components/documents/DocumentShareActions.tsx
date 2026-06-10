"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { useAppStore } from "@/context/AppStore";
import {
  hasClientEmail,
  hasClientPhone,
  shareDocumentByEmail,
  shareDocumentByWhatsApp,
} from "@/lib/share";
import type { BusinessProfile, Document } from "@/lib/types";

interface DocumentShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
}

export function DocumentShareActions({
  doc,
  profile,
  markSentOnShare = true,
}: DocumentShareActionsProps) {
  const { updateDocument } = useAppStore();
  const [busy, setBusy] = useState<"email" | "whatsapp" | null>(null);

  const canEmail = hasClientEmail(doc);
  const canWhatsApp = hasClientPhone(doc);

  function markSentIfNeeded() {
    if (!markSentOnShare || doc.status !== "borrador") return;
    updateDocument({
      ...doc,
      status: "enviado",
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleEmail() {
    if (!canEmail || busy) return;
    setBusy("email");
    try {
      await shareDocumentByEmail(doc, profile);
      markSentIfNeeded();
    } finally {
      setBusy(null);
    }
  }

  async function handleWhatsApp() {
    if (!canWhatsApp || busy) return;
    setBusy("whatsapp");
    try {
      await shareDocumentByWhatsApp(doc, profile);
      markSentIfNeeded();
    } finally {
      setBusy(null);
    }
  }

  const emailTooltip = canEmail
    ? `Enviar por email a ${doc.client.email}`
    : "Añade el email del cliente para enviar";
  const whatsappTooltip = canWhatsApp
    ? `Enviar por WhatsApp a ${doc.client.phone}`
    : "Añade el teléfono del cliente para enviar";

  return (
    <>
      <IconActionButton
        label="Email"
        tooltip={emailTooltip}
        onClick={() => void handleEmail()}
        disabled={!canEmail || busy !== null}
        className={
          canEmail
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }
      >
        <Mail className={`h-5 w-5 ${busy === "email" ? "animate-pulse" : ""}`} />
      </IconActionButton>
      <IconActionButton
        label="WhatsApp"
        tooltip={whatsappTooltip}
        onClick={() => void handleWhatsApp()}
        disabled={!canWhatsApp || busy !== null}
        className={
          canWhatsApp
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
