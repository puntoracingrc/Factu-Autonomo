"use client";

import { useState } from "react";
import { Mail, MessageCircle } from "lucide-react";
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

  return (
    <>
      <button
        type="button"
        onClick={() => void handleEmail()}
        disabled={!canEmail || busy !== null}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl ${
          canEmail
            ? "bg-violet-50 text-violet-700 hover:bg-violet-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }`}
        title={
          canEmail
            ? `Enviar por email a ${doc.client.email}`
            : "Añade el email del cliente para enviar"
        }
      >
        <Mail className={`h-5 w-5 ${busy === "email" ? "animate-pulse" : ""}`} />
      </button>
      <button
        type="button"
        onClick={() => void handleWhatsApp()}
        disabled={!canWhatsApp || busy !== null}
        className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl ${
          canWhatsApp
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "cursor-not-allowed bg-slate-100 text-slate-300"
        }`}
        title={
          canWhatsApp
            ? `Enviar por WhatsApp a ${doc.client.phone}`
            : "Añade el teléfono del cliente para enviar"
        }
      >
        <MessageCircle
          className={`h-5 w-5 ${busy === "whatsapp" ? "animate-pulse" : ""}`}
        />
      </button>
    </>
  );
}
