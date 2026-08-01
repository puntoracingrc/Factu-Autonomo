"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Download,
  MonitorSmartphone,
  MoreVertical,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallPlatform = "ios" | "android" | "desktop" | "other";

function isInstalledMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectInstallPlatform(): InstallPlatform {
  const userAgent = navigator.userAgent.toLowerCase();
  const isTouchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(userAgent) || isTouchMac) return "ios";
  if (/android/.test(userAgent)) return "android";
  if (/windows|macintosh|linux|cros/.test(userAgent)) return "desktop";
  return "other";
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("other");
  const canInstall = Boolean(installPrompt) && !installed;

  useEffect(() => {
    setInstalled(isInstalledMode());
    setPlatform(detectInstallPlatform());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt().catch(() => undefined);
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  const manualInstallHint =
    platform === "ios"
      ? {
          Icon: Share2,
          title: "En iPhone o iPad",
          body: "Abre esta web en Safari, toca Compartir y elige Añadir a pantalla de inicio.",
        }
      : platform === "android"
        ? {
            Icon: MoreVertical,
            title: "En Android",
            body: "Abre Chrome, toca el menú y elige Instalar app o Añadir a pantalla de inicio.",
          }
        : {
            Icon: MonitorSmartphone,
            title: "En ordenador",
            body: "Chrome y Edge muestran la opción Instalar app en la barra de direcciones o en el menú del navegador.",
          };
  const ManualIcon = manualInstallHint.Icon;

  return (
    <Card className="mb-6 space-y-4 border-blue-200 bg-blue-50/50">
      <div className="flex items-start gap-3">
        <Image
          src="/brand/app-icon.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-contain drop-shadow-sm"
        />
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <MonitorSmartphone className="h-5 w-5 text-blue-700" />
            Instalar app
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Añade Facturación Autónomos al móvil, Windows o Mac con su icono propio.
          </p>
        </div>
      </div>

      {installed ? (
        <p
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4" />
          App instalada en este dispositivo
        </p>
      ) : canInstall ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-slate-600">
            Este navegador ya permite instalarla como aplicación.
          </p>
          <Button onClick={() => void installApp()}>
            <Download className="h-4 w-4" />
            Instalar app
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-white/80 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <ManualIcon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {manualInstallHint.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {manualInstallHint.body}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
