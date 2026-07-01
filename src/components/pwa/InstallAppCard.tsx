"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isInstalledMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppCard() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const canInstall = Boolean(installPrompt) && !installed;

  useEffect(() => {
    setInstalled(isInstalledMode());

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
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

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
            Añade Factura Autónomo al móvil, Windows o Mac con su icono propio.
          </p>
        </div>
      </div>

      {installed ? (
        <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          App instalada en este dispositivo
        </p>
      ) : canInstall ? (
        <Button onClick={() => void installApp()}>
          <Download className="h-4 w-4" />
          Instalar app
        </Button>
      ) : null}
    </Card>
  );
}
