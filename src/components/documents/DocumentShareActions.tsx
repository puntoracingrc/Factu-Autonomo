"use client";

import { useMemo, useState, type ReactNode } from "react";
import { LoaderCircle, Mail, MessageCircle } from "lucide-react";
import { IconActionButton } from "@/components/ui/IconAction";
import { SendMethodChooserModal } from "@/components/documents/SendMethodChooserModal";
import { useAppStore } from "@/context/AppStore";
import { useCloudSync } from "@/context/CloudSyncContext";
import { useDemoWorkspaceMode } from "@/hooks/useDemoWorkspaceMode";
import {
  DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS,
  DOCUMENT_EMAIL_METHOD_OPTIONS,
  DOCUMENT_WHATSAPP_CONCRETE_METHOD_OPTIONS,
  DOCUMENT_WHATSAPP_METHOD_OPTIONS,
  normalizeAppPreferences,
} from "@/lib/app-preferences";
import { documentWithCurrentCustomerContact } from "@/lib/document-client-contact";
import { shareDocumentWithIntegrity } from "@/lib/document-integrity/share-flow";
import { showFactuToast } from "@/lib/factu/occasional";
import {
  canShareDocumentPdfNatively,
  hasClientEmail,
  hasClientPhone,
  NativeDocumentShareUnavailableError,
  openDocumentEmailMessage,
  openWhatsAppDocumentMessage,
  reserveExternalShareWindow,
  shareDocumentByEmail,
  shareDocumentByWhatsApp,
} from "@/lib/share";
import type { DocumentPdfOptions } from "@/lib/pdf";
import type {
  BusinessProfile,
  Document,
  DocumentEmailSendPreference,
  DocumentWhatsAppSendPreference,
} from "@/lib/types";

type ShareChannel = "email" | "whatsapp";
type ConcreteEmailMethod = Exclude<DocumentEmailSendPreference, "ask">;
type ConcreteWhatsAppMethod = Exclude<DocumentWhatsAppSendPreference, "ask">;

interface DocumentShareActionsProps {
  doc: Document;
  profile: BusinessProfile;
  markSentOnShare?: boolean;
  pdfOptions?: DocumentPdfOptions;
  variant?: "icons" | "menu";
  onActionInvoked?: () => void;
}

function methodLabel(
  channel: ShareChannel,
  method: DocumentEmailSendPreference | DocumentWhatsAppSendPreference,
): string {
  const options =
    channel === "email"
      ? DOCUMENT_EMAIL_METHOD_OPTIONS
      : DOCUMENT_WHATSAPP_METHOD_OPTIONS;
  return (
    options.find((option) => option.value === method)?.label ?? "Preguntar"
  );
}

function postShareHint(channel: ShareChannel, method: string): string | null {
  if (channel === "email" && method === "gmail") {
    return "Gmail abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  if (channel === "email" && method === "mailto") {
    return "Correo abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  if (channel === "whatsapp" && method === "direct") {
    return "WhatsApp abierto. PDF descargado: selecciónalo desde Descargas para adjuntarlo.";
  }
  return null;
}

function externalOpenError(channel: ShareChannel): string {
  return channel === "email"
    ? "No se pudo abrir el correo. Revisa si el navegador ha bloqueado la ventana emergente."
    : "No se pudo abrir WhatsApp. Revisa si el navegador ha bloqueado la ventana emergente.";
}

export function DocumentShareActions({
  doc,
  profile,
  markSentOnShare = true,
  pdfOptions,
  variant = "icons",
  onActionInvoked,
}: DocumentShareActionsProps) {
  const { data, issueDocument, markDocumentSent, updateProfile } =
    useAppStore();
  const { user, emailConfirmed } = useCloudSync();
  const demoMode = useDemoWorkspaceMode();
  const [busy, setBusy] = useState<ShareChannel | null>(null);
  const [chooser, setChooser] = useState<ShareChannel | null>(null);
  const [rememberMethod, setRememberMethod] = useState(true);
  const appPreferences = normalizeAppPreferences(data.profile.appPreferences);
  const contactDoc = useMemo(
    () => documentWithCurrentCustomerContact(doc, data.customers),
    [data.customers, doc],
  );

  const canEmail = hasClientEmail(contactDoc);
  const canWhatsApp = hasClientPhone(contactDoc);
  const accountCanShare = Boolean(user && emailConfirmed);

  function showBlockedMessage(channel: ShareChannel): boolean {
    if (!user) {
      showFactuToast(
        channel === "email"
          ? "Inicia sesión para enviar documentos reales a clientes."
          : "Inicia sesión para compartir documentos reales con clientes.",
        5000,
      );
      return true;
    }
    if (!emailConfirmed) {
      showFactuToast(
        channel === "email"
          ? "Confirma tu email para enviar documentos reales a clientes."
          : "Confirma tu email para compartir documentos reales con clientes.",
        5000,
      );
      return true;
    }
    if (demoMode) {
      showFactuToast(
        channel === "email"
          ? "En modo demo no se envían documentos. Crea una cuenta real para enviar facturas."
          : "En modo demo no se comparten documentos por WhatsApp.",
        5000,
      );
      return true;
    }
    return false;
  }

  function saveEmailMethod(method: ConcreteEmailMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentEmailMethod: method,
      }),
    });
  }

  function saveWhatsAppMethod(method: ConcreteWhatsAppMethod) {
    updateProfile({
      ...data.profile,
      appPreferences: normalizeAppPreferences({
        ...appPreferences,
        documentWhatsAppMethod: method,
      }),
    });
  }

  async function runEmail(method: ConcreteEmailMethod) {
    if (!canEmail || busy) return;
    if (method === "native" && !canShareDocumentPdfNatively()) {
      setRememberMethod(true);
      setChooser("email");
      showFactuToast(
        "Compartir del dispositivo no está disponible aquí. Elige Gmail o Correo del dispositivo.",
        5000,
      );
      return;
    }
    const useExternalClient = method === "gmail" || method === "mailto";
    const externalWindow = useExternalClient
      ? reserveExternalShareWindow()
      : null;
    if (useExternalClient && !externalWindow) {
      showFactuToast(externalOpenError("email"), 5000);
      return;
    }
    setBusy("email");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: async (current) => {
          const currentDoc = documentWithCurrentCustomerContact(
            current,
            data.customers,
          );
          if (useExternalClient) {
            const opened = openDocumentEmailMessage(
              currentDoc,
              profile,
              method,
              externalWindow,
            );
            if (!opened) throw new Error("email_open_failed");
            const { downloadDocumentPdf } = await import("@/lib/pdf");
            await downloadDocumentPdf(current, profile, pdfOptions);
            return;
          }
          await shareDocumentByEmail(currentDoc, profile, pdfOptions, method);
        },
      });
      const hint = postShareHint("email", method);
      if (hint) showFactuToast(hint, 5000);
    } catch (error) {
      externalWindow?.close();
      if (error instanceof NativeDocumentShareUnavailableError) {
        setRememberMethod(true);
        setChooser("email");
        showFactuToast(
          "El dispositivo no pudo compartir el PDF. Elige Gmail o Correo del dispositivo.",
          5000,
        );
        return;
      }
      showFactuToast(externalOpenError("email"), 5000);
    } finally {
      setBusy(null);
    }
  }

  async function runWhatsApp(method: ConcreteWhatsAppMethod) {
    if (!canWhatsApp || busy) return;
    const useDirect = method === "direct";
    const externalWindow = useDirect ? reserveExternalShareWindow() : null;
    if (useDirect && !externalWindow) {
      showFactuToast(externalOpenError("whatsapp"), 5000);
      return;
    }
    setBusy("whatsapp");
    try {
      await shareDocumentWithIntegrity({
        doc,
        issueDocument,
        markDocumentSent,
        markSentOnShare,
        share: async (current) => {
          const currentDoc = documentWithCurrentCustomerContact(
            current,
            data.customers,
          );
          if (useDirect) {
            const opened = openWhatsAppDocumentMessage(
              currentDoc,
              profile,
              externalWindow,
            );
            if (!opened) throw new Error("whatsapp_open_failed");
            const { downloadDocumentPdf } = await import("@/lib/pdf");
            await downloadDocumentPdf(current, profile, pdfOptions);
            return;
          }
          await shareDocumentByWhatsApp(
            currentDoc,
            profile,
            pdfOptions,
            method,
          );
        },
      });
      const hint = postShareHint("whatsapp", method);
      if (hint) showFactuToast(hint, 5000);
    } catch {
      externalWindow?.close();
      showFactuToast(externalOpenError("whatsapp"), 5000);
    } finally {
      setBusy(null);
    }
  }

  function handleEmail() {
    if (!canEmail || busy) return;
    if (showBlockedMessage("email")) {
      onActionInvoked?.();
      return;
    }
    if (appPreferences.documentEmailMethod === "ask") {
      setRememberMethod(true);
      setChooser("email");
      return;
    }
    onActionInvoked?.();
    void runEmail(appPreferences.documentEmailMethod);
  }

  function handleWhatsApp() {
    if (!canWhatsApp || busy) return;
    if (showBlockedMessage("whatsapp")) {
      onActionInvoked?.();
      return;
    }
    if (appPreferences.documentWhatsAppMethod === "ask") {
      setRememberMethod(true);
      setChooser("whatsapp");
      return;
    }
    onActionInvoked?.();
    void runWhatsApp(appPreferences.documentWhatsAppMethod);
  }

  function closeChooser() {
    if (busy) return;
    setChooser(null);
  }

  async function chooseEmailMethod(method: ConcreteEmailMethod) {
    if (rememberMethod) saveEmailMethod(method);
    setChooser(null);
    onActionInvoked?.();
    await runEmail(method);
  }

  async function chooseWhatsAppMethod(method: ConcreteWhatsAppMethod) {
    if (rememberMethod) saveWhatsAppMethod(method);
    setChooser(null);
    onActionInvoked?.();
    await runWhatsApp(method);
  }

  const emailTooltip = demoMode
    ? "En demo no se envían documentos"
    : !user
      ? "Inicia sesión para enviar documentos"
      : !emailConfirmed
        ? "Confirma tu email para enviar documentos"
        : canEmail
          ? `Enviar por ${methodLabel("email", appPreferences.documentEmailMethod)} a ${contactDoc.client.email}`
          : "Añade el email del cliente para enviar";
  const whatsappTooltip = demoMode
    ? "En demo no se comparten documentos"
    : !user
      ? "Inicia sesión para compartir documentos"
      : !emailConfirmed
        ? "Confirma tu email para compartir documentos"
        : canWhatsApp
          ? `Enviar por ${methodLabel("whatsapp", appPreferences.documentWhatsAppMethod)} a ${contactDoc.client.phone}`
        : "Añade el teléfono del cliente para enviar";

  const emailDisabled = !canEmail || busy !== null || demoMode || !accountCanShare;
  const whatsappDisabled =
    !canWhatsApp || busy !== null || demoMode || !accountCanShare;

  function MenuActionButton({
    title,
    description,
    icon,
    disabled,
    onClick,
    tone,
  }: {
    title: string;
    description: string;
    icon: ReactNode;
    disabled: boolean;
    onClick: () => void;
    tone: "violet" | "green";
  }) {
    const activeClass =
      tone === "green"
        ? "text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/30"
        : "text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30";

    return (
      <button
        type="button"
        role={variant === "menu" ? "menuitem" : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
          disabled
            ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
            : activeClass
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </span>
        {busy === "email" && title === "Email" ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
        ) : busy === "whatsapp" && title === "WhatsApp" ? (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
        ) : null}
      </button>
    );
  }

  if (variant === "menu") {
    return (
      <>
        <MenuActionButton
          title="Email"
          description={emailTooltip}
          icon={<Mail className="h-5 w-5" />}
          disabled={emailDisabled}
          onClick={handleEmail}
          tone="violet"
        />
        <MenuActionButton
          title="WhatsApp"
          description={whatsappTooltip}
          icon={<MessageCircle className="h-5 w-5" />}
          disabled={whatsappDisabled}
          onClick={handleWhatsApp}
          tone="green"
        />
        <SendMethodChooserModal
          open={chooser !== null}
          title={
            chooser === "email" ? "Enviar por email" : "Enviar por WhatsApp"
          }
          description={`${contactDoc.number} · ${contactDoc.client.name}`}
          options={
            chooser === "email"
              ? DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS
              : DOCUMENT_WHATSAPP_CONCRETE_METHOD_OPTIONS
          }
          rememberMethod={rememberMethod}
          onRememberMethodChange={setRememberMethod}
          onChoose={(method) =>
            chooser === "email"
              ? void chooseEmailMethod(method as ConcreteEmailMethod)
              : void chooseWhatsAppMethod(method as ConcreteWhatsAppMethod)
          }
          onClose={closeChooser}
          busy={busy !== null}
          testId="document-send-method-modal"
        />
      </>
    );
  }

  return (
    <>
      <IconActionButton
        label="Email"
        tooltip={emailTooltip}
        onClick={handleEmail}
        disabled={emailDisabled}
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
        onClick={handleWhatsApp}
        disabled={whatsappDisabled}
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
      <SendMethodChooserModal
        open={chooser !== null}
        title={
          chooser === "email" ? "Enviar por email" : "Enviar por WhatsApp"
        }
        description={`${contactDoc.number} · ${contactDoc.client.name}`}
        options={
          chooser === "email"
            ? DOCUMENT_EMAIL_CONCRETE_METHOD_OPTIONS
            : DOCUMENT_WHATSAPP_CONCRETE_METHOD_OPTIONS
        }
        rememberMethod={rememberMethod}
        onRememberMethodChange={setRememberMethod}
        onChoose={(method) =>
          chooser === "email"
            ? void chooseEmailMethod(method as ConcreteEmailMethod)
            : void chooseWhatsAppMethod(method as ConcreteWhatsAppMethod)
        }
        onClose={closeChooser}
        busy={busy !== null}
        testId="document-send-method-modal"
      />
    </>
  );
}
